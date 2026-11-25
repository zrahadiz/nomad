import {
  ArrowDown,
  Check,
  ChevronDown,
  Info,
  RefreshCw,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { SafeScreen } from "@/components/layout/safe-screen";

import { countries } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useCurrencyConverterStore } from "@/stores/use-currency-converter-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

const HOW_IT_WORKS = [
  "howItWorks.points.originalAmounts",
  "howItWorks.points.secondaryAmounts",
  "howItWorks.points.rateUpdates",
  "howItWorks.points.workspaceConfig",
];

export default function CurrencyConverterScreen() {
  const { t, i18n } = useTranslation();

  const activeWorkspace = useWorkspaceStore((state) =>
    state.workspaces.find(
      (workspace) => workspace.id === state.activeWorkspaceId,
    ),
  );

  const converter = useCurrencyConverterStore((state) => state.converter);
  const loading = useCurrencyConverterStore((state) => state.loading);
  const saving = useCurrencyConverterStore((state) => state.saving);
  const error = useCurrencyConverterStore((state) => state.error);
  const loadedWorkspaceId = useCurrencyConverterStore(
    (state) => state.loadedWorkspaceId,
  );

  const fetchConverter = useCurrencyConverterStore(
    (state) => state.fetchConverter,
  );
  const saveConverter = useCurrencyConverterStore(
    (state) => state.saveConverter,
  );
  const deleteConverter = useCurrencyConverterStore(
    (state) => state.deleteConverter,
  );

  const [targetCurrencyCode, setTargetCurrencyCode] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  const activeConverter =
    converter?.workspaceId === activeWorkspace?.id ? converter : null;

  const currencyOptions = useMemo(() => {
    const uniqueCurrencies = new Map<string, { code: string; name: string }>();

    countries.forEach((country) => {
      if (!uniqueCurrencies.has(country.currencyCode)) {
        uniqueCurrencies.set(country.currencyCode, {
          code: country.currencyCode,
          name: country.currencyName,
        });
      }
    });

    return Array.from(uniqueCurrencies.values()).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }, []);

  const availableCurrencies = currencyOptions.filter(
    (currency) => currency.code !== activeWorkspace?.currency_code,
  );

  const selectedCurrency = currencyOptions.find(
    (currency) => currency.code === targetCurrencyCode,
  );

  useEffect(() => {
    if (!activeWorkspace?.id) return;

    void fetchConverter(activeWorkspace.id);
  }, [activeWorkspace?.id, fetchConverter]);

  useEffect(() => {
    if (loadedWorkspaceId !== activeWorkspace?.id) return;

    if (activeConverter) {
      setTargetCurrencyCode(activeConverter.targetCurrencyCode);
      setExchangeRate(String(activeConverter.exchangeRate));
    } else {
      setTargetCurrencyCode("");
      setExchangeRate("");
    }
  }, [
    activeConverter?.id,
    activeConverter?.targetCurrencyCode,
    activeConverter?.exchangeRate,
    loadedWorkspaceId,
    activeWorkspace?.id,
  ]);

  async function handleSave() {
    if (!activeWorkspace) {
      Alert.alert(
        t("currency.alerts.noWorkspace.title"),
        t("currency.alerts.noWorkspace.message"),
      );
      return;
    }

    if (!targetCurrencyCode) {
      Alert.alert(
        t("currency.alerts.selectCurrency.title"),
        t("currency.alerts.selectCurrency.message"),
      );
      return;
    }

    const rate = Number(exchangeRate.trim());

    if (!exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
      Alert.alert(
        t("currency.alerts.invalidRate.title"),
        t("currency.alerts.invalidRate.message"),
      );
      return;
    }

    try {
      await saveConverter({
        workspaceId: activeWorkspace.id,
        targetCurrencyCode,
        exchangeRate: rate,
        rateSource: "manual",
      });

      Alert.alert(
        t("currency.alerts.saveSuccess.title"),
        t("currency.alerts.saveSuccess.message"),
      );
    } catch (saveError) {
      Alert.alert(
        t("currency.alerts.saveFailed.title"),
        saveError instanceof Error ? saveError.message : t("common.tryAgain"),
      );
    }
  }

  function handleDisable() {
    if (!activeWorkspace || !activeConverter) return;

    Alert.alert(
      t("currency.alerts.disableConfirm.title"),
      t("currency.alerts.disableConfirm.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("currency.actions.disable"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConverter(activeWorkspace.id);
              setTargetCurrencyCode("");
              setExchangeRate("");
              Alert.alert(
                t("currency.alerts.disableSuccess.title"),
                t("currency.alerts.disableSuccess.message"),
              );
            } catch (deleteError) {
              Alert.alert(
                t("currency.alerts.disableFailed.title"),
                deleteError instanceof Error
                  ? deleteError.message
                  : t("common.tryAgain"),
              );
            }
          },
        },
      ],
    );
  }

  function handleRetry() {
    if (activeWorkspace?.id) {
      void fetchConverter(activeWorkspace.id);
    }
  }

  const formatUpdatedAt = (value: string) => {
    return new Date(value).toLocaleString(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const isLoadingState = loading && loadedWorkspaceId === activeWorkspace?.id;
  const isErrorState =
    !isLoadingState && !!error && loadedWorkspaceId === activeWorkspace?.id;
  const showForm = !!activeWorkspace && !isLoadingState && !isErrorState;

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!activeWorkspace ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>
                {t("currency.empty.noWorkspace.title")}
              </Text>
              <Text style={styles.description}>
                {t("currency.empty.noWorkspace.description")}
              </Text>
            </View>
          ) : (
            <>
              {/* Context: which workspace this applies to */}
              <View style={styles.workspaceCard}>
                <Text style={styles.sectionLabel}>
                  {t("currency.activeWorkspace").toUpperCase()}
                </Text>
                <Text style={styles.workspaceName}>{activeWorkspace.name}</Text>
                <Text style={styles.description}>
                  {t("currency.workspaceDescription")}
                </Text>
              </View>

              {isLoadingState ? (
                <View style={[styles.stateCard, styles.stateCardCenter]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.description}>
                    {t("currency.loading")}
                  </Text>
                </View>
              ) : isErrorState ? (
                <View style={styles.stateCard}>
                  <Text style={[styles.stateTitle, styles.errorTitle]}>
                    {t("currency.errors.loadTitle")}
                  </Text>
                  <Text style={styles.description}>{error}</Text>
                  <Pressable
                    onPress={handleRetry}
                    accessibilityRole="button"
                    style={styles.retryButton}
                  >
                    <RefreshCw size={16} color={colors.primary} />
                    <Text style={styles.retryText}>{t("common.tryAgain")}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* 1. Currency pair */}
                  <View style={styles.card}>
                    <View style={styles.cardHeading}>
                      <Text style={styles.cardTitle}>
                        {t("currency.settings.title")}
                      </Text>

                      <View
                        style={[
                          styles.statusBadge,
                          activeConverter
                            ? styles.enabledBadge
                            : styles.disabledBadge,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            activeConverter
                              ? styles.enabledDot
                              : styles.disabledDot,
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            activeConverter
                              ? styles.enabledText
                              : styles.disabledText,
                          ]}
                        >
                          {activeConverter
                            ? t("currency.status.enabled")
                            : t("currency.status.disabled")}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>
                      {t("currency.primaryCurrency")}
                    </Text>
                    <View style={styles.currencyField}>
                      <View style={styles.codeChip}>
                        <Text style={styles.codeChipText}>
                          {activeWorkspace.currency_code}
                        </Text>
                      </View>
                      <Text style={styles.fieldDescription}>
                        {t("currency.primaryCurrencyDescription")}
                      </Text>
                    </View>

                    <View style={styles.exchangeArrow}>
                      <View style={styles.arrowLine} />
                      <View style={styles.arrowCircle}>
                        <ArrowDown size={14} color={colors.textSecondary} />
                      </View>
                      <View style={styles.arrowLine} />
                    </View>

                    <Text style={styles.inputLabel}>
                      {t("currency.secondaryCurrency")}
                    </Text>
                    <Pressable
                      style={[
                        styles.currencySelector,
                        currencyPickerVisible && styles.currencySelectorOpen,
                      ]}
                      onPress={() =>
                        setCurrencyPickerVisible((value) => !value)
                      }
                      disabled={saving}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: currencyPickerVisible }}
                    >
                      <Text
                        style={
                          selectedCurrency
                            ? styles.currencyCode
                            : styles.placeholderText
                        }
                        numberOfLines={1}
                      >
                        {selectedCurrency
                          ? `${selectedCurrency.code} · ${selectedCurrency.name}`
                          : t("currency.selectCurrency")}
                      </Text>
                      <ChevronDown
                        size={20}
                        color={colors.textSecondary}
                        style={
                          currencyPickerVisible ? styles.chevronOpen : undefined
                        }
                      />
                    </Pressable>

                    {currencyPickerVisible && (
                      <View style={styles.currencyList}>
                        <ScrollView
                          nestedScrollEnabled
                          style={styles.currencyListScroll}
                          keyboardShouldPersistTaps="handled"
                        >
                          {availableCurrencies.map((currency) => {
                            const selected =
                              targetCurrencyCode === currency.code;

                            return (
                              <Pressable
                                key={currency.code}
                                style={[
                                  styles.currencyOption,
                                  selected && styles.currencyOptionSelected,
                                ]}
                                onPress={() => {
                                  setTargetCurrencyCode(currency.code);
                                  setCurrencyPickerVisible(false);
                                }}
                              >
                                <View style={styles.currencyOptionInfo}>
                                  <Text style={styles.currencyOptionCode}>
                                    {currency.code}
                                  </Text>
                                  <Text style={styles.currencyOptionName}>
                                    {currency.name}
                                  </Text>
                                </View>
                                {selected && (
                                  <Check size={18} color={colors.primary} />
                                )}
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* 2. Exchange rate */}
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {t("currency.exchangeRate.title")}
                    </Text>
                    <Text style={styles.rateDescription}>
                      {t("currency.exchangeRate.description")}
                    </Text>

                    <View style={styles.rateInputRow}>
                      <Text style={styles.ratePrefix}>
                        1 {activeWorkspace.currency_code} =
                      </Text>
                      <TextInput
                        value={exchangeRate}
                        onChangeText={setExchangeRate}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                        style={styles.rateInput}
                        editable={!saving}
                      />
                      {targetCurrencyCode ? (
                        <View style={styles.codeChip}>
                          <Text style={styles.codeChipText}>
                            {targetCurrencyCode}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {!targetCurrencyCode && (
                      <Text style={styles.rateTarget}>
                        {t("currency.exchangeRate.selectTarget")}
                      </Text>
                    )}

                    <View style={styles.manualNotice}>
                      <Info size={16} color={colors.primary} />

                      <View style={styles.manualNoticeBody}>
                        <Text style={styles.manualNoticeTitle}>
                          {t("currency.exchangeRate.manualTitle")}
                        </Text>
                        <Text style={styles.manualNoticeText}>
                          {t("currency.exchangeRate.manualDescription")}
                        </Text>
                      </View>
                    </View>

                    {activeConverter && (
                      <Text style={styles.updatedAt}>
                        {t("currency.lastUpdated")}:{" "}
                        {formatUpdatedAt(activeConverter.lastUpdatedAt)}
                      </Text>
                    )}
                  </View>

                  {/* 3. Explanation */}
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>
                      {t("currency.howItWorks.title")}
                    </Text>

                    {HOW_IT_WORKS.map((point) => (
                      <View key={t(`currency.${point}`)} style={styles.infoRow}>
                        <Text style={styles.infoText}>•</Text>
                        <Text style={[styles.infoText, styles.infoTextFlex]}>
                          {t(`currency.${point}`)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Disable: secondary, destructive, kept away from Save */}
                  {activeConverter && (
                    <Pressable
                      onPress={handleDisable}
                      style={({ pressed }) => [
                        styles.disableButton,
                        pressed && styles.disableButtonPressed,
                        saving && styles.disabledButton,
                      ]}
                      disabled={saving}
                      accessibilityRole="button"
                    >
                      <Text style={styles.disableButtonText}>
                        {t("currency.actions.disableConverter")}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </>
          )}
        </KeyboardAwareScrollView>

        {/* Save: pinned, only when the form is showing */}
        {showForm && (
          <View style={styles.footer}>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                (saving || loading) && styles.disabledButton,
              ]}
              disabled={saving || loading}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving || loading, busy: saving }}
            >
              {saving ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {activeConverter
                    ? t("currency.actions.saveChanges")
                    : t("currency.actions.enableConverter")}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },

  /* Workspace context */
  workspaceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },

  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },

  workspaceName: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  description: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },

  /* Cards */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },

  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },

  enabledBadge: {
    backgroundColor: colors.successLight,
  },

  disabledBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },

  enabledDot: {
    backgroundColor: colors.success,
  },

  disabledDot: {
    backgroundColor: colors.textSecondary,
  },

  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  enabledText: {
    color: colors.success,
  },

  disabledText: {
    color: colors.textSecondary,
  },

  inputLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  /* Primary currency */
  currencyField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  codeChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  codeChipText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },

  fieldDescription: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  exchangeArrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  arrowLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Secondary currency picker */
  currencySelector: {
    minHeight: 52,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  currencySelectorOpen: {
    borderColor: colors.primary,
  },

  chevronOpen: {
    transform: [{ rotate: "180deg" }],
  },

  currencyCode: {
    flex: 1,
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  placeholderText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  currencyList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },

  currencyListScroll: {
    maxHeight: 240,
  },

  currencyOption: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  currencyOptionSelected: {
    backgroundColor: colors.primaryLight,
  },

  currencyOptionInfo: {
    flex: 1,
    gap: 2,
  },

  currencyOptionCode: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  currencyOptionName: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  /* Exchange rate */
  rateDescription: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },

  rateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 60,
  },

  ratePrefix: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  rateInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    paddingVertical: spacing.sm,
  },

  rateTarget: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    textAlign: "right",
  },

  manualNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  manualNoticeBody: {
    flex: 1,
    gap: spacing.xs,
  },

  manualNoticeTitle: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },

  manualNoticeText: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },

  updatedAt: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    textAlign: "center",
  },

  /* How it works */
  infoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  infoTitle: {
    color: colors.primaryDark,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },

  infoRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  infoText: {
    color: colors.primaryDark,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },

  infoTextFlex: {
    flex: 1,
  },

  /* Disable */
  disableButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },

  disableButtonPressed: {
    opacity: 0.8,
  },

  disableButtonText: {
    color: colors.danger,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  /* Save bar */
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  saveButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },

  saveButtonPressed: {
    backgroundColor: colors.primaryDark,
  },

  disabledButton: {
    opacity: 0.5,
  },

  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  /* Loading / error / empty */
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },

  stateCardCenter: {
    alignItems: "center",
    padding: spacing.xl,
  },

  stateTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  errorTitle: {
    color: colors.danger,
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
  },

  retryText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
