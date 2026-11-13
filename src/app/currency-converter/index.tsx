import { router } from "expo-router";
import { ArrowLeft, Check, ChevronDown, RefreshCw } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
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

import { countries } from "@/constants/countries";
import { colors, radius, spacing } from "@/constants/theme";
import { useCurrencyConverterStore } from "@/stores/use-currency-converter-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

export default function CurrencyConverterScreen() {
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
      Alert.alert("No workspace", "Please select a workspace first.");
      return;
    }

    if (!targetCurrencyCode) {
      Alert.alert("Select currency", "Please choose a secondary currency.");
      return;
    }

    const rate = Number(exchangeRate.trim());

    if (!exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
      Alert.alert(
        "Invalid exchange rate",
        "Please enter an exchange rate greater than zero.",
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

      Alert.alert("Success", "Currency converter settings have been saved.");
    } catch (saveError) {
      Alert.alert(
        "Unable to save",
        saveError instanceof Error ? saveError.message : "Please try again.",
      );
    }
  }

  function handleDisable() {
    if (!activeWorkspace || !activeConverter) return;

    Alert.alert(
      "Disable currency converter?",
      "Secondary currency values will no longer appear in this workspace. Your original transaction amounts will remain unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConverter(activeWorkspace.id);
              setTargetCurrencyCode("");
              setExchangeRate("");
              Alert.alert("Success", "Currency converter has been disabled.");
            } catch (deleteError) {
              Alert.alert(
                "Unable to disable",
                deleteError instanceof Error
                  ? deleteError.message
                  : "Please try again.",
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
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <ArrowLeft color={colors.text} size={22} />
        </Pressable>

        <Text style={styles.headerTitle}>Currency Converter</Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!activeWorkspace ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No workspace selected</Text>
            <Text style={styles.description}>
              Create or select a workspace before configuring its secondary
              currency.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.workspaceCard}>
              <Text style={styles.sectionLabel}>ACTIVE WORKSPACE</Text>
              <Text style={styles.workspaceName}>{activeWorkspace.name}</Text>
              <Text style={styles.description}>
                Configure how amounts in this workspace are displayed in another
                currency.
              </Text>
            </View>

            {loading && loadedWorkspaceId !== activeWorkspace.id ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.description}>
                  Loading converter settings...
                </Text>
              </View>
            ) : error && loadedWorkspaceId === activeWorkspace.id ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>
                  Couldn't load converter settings
                </Text>
                <Text style={styles.description}>{error}</Text>
                <Pressable onPress={handleRetry} style={styles.retryButton}>
                  <RefreshCw size={16} color={colors.primary} />
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeading}>
                    <Text style={styles.cardTitle}>Currency settings</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        activeConverter
                          ? styles.enabledBadge
                          : styles.disabledBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          activeConverter
                            ? styles.enabledText
                            : styles.disabledText,
                        ]}
                      >
                        {activeConverter ? "Enabled" : "Not enabled"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Primary currency</Text>
                  <View style={styles.currencyField}>
                    <Text style={styles.currencyCode}>
                      {activeWorkspace.currency_code}
                    </Text>
                    <Text style={styles.fieldDescription}>
                      Workspace's original currency
                    </Text>
                  </View>

                  <View style={styles.exchangeArrow}>
                    <View style={styles.arrowLine} />
                    <Text style={styles.arrowText}>↓</Text>
                    <View style={styles.arrowLine} />
                  </View>

                  <Text style={styles.inputLabel}>Secondary currency</Text>
                  <Pressable
                    style={styles.currencySelector}
                    onPress={() => setCurrencyPickerVisible((value) => !value)}
                    disabled={saving}
                  >
                    <View>
                      <Text
                        style={
                          selectedCurrency
                            ? styles.currencyCode
                            : styles.placeholderText
                        }
                      >
                        {selectedCurrency
                          ? `${selectedCurrency.code} · ${selectedCurrency.name}`
                          : "Select a currency"}
                      </Text>
                    </View>
                    <ChevronDown size={20} color={colors.textSecondary} />
                  </Pressable>

                  {currencyPickerVisible && (
                    <View style={styles.currencyList}>
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.currencyListScroll}
                        keyboardShouldPersistTaps="handled"
                      >
                        {availableCurrencies.map((currency) => (
                          <Pressable
                            key={currency.code}
                            style={styles.currencyOption}
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
                            {targetCurrencyCode === currency.code && (
                              <Check size={18} color={colors.primary} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.divider} />

                  <Text style={styles.inputLabel}>Exchange rate</Text>
                  <Text style={styles.rateDescription}>
                    Enter how much secondary currency equals one unit of primary
                    currency.
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
                  </View>

                  <Text style={styles.rateTarget}>
                    {targetCurrencyCode || "Select secondary currency"}
                  </Text>

                  <View style={styles.manualNotice}>
                    <Text style={styles.manualNoticeTitle}>
                      Manual exchange rate
                    </Text>
                    <Text style={styles.manualNoticeText}>
                      This rate will be used to calculate secondary currency
                      displays throughout this workspace. Automatic rate updates
                      will be added separately.
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleSave}
                    style={[
                      styles.saveButton,
                      (saving || loading) && styles.disabledButton,
                    ]}
                    disabled={saving || loading}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {activeConverter ? "Save Changes" : "Enable Converter"}
                      </Text>
                    )}
                  </Pressable>

                  {activeConverter && (
                    <>
                      <Text style={styles.updatedAt}>
                        Last updated:{" "}
                        {formatUpdatedAt(activeConverter.lastUpdatedAt)}
                      </Text>

                      <Pressable
                        onPress={handleDisable}
                        style={styles.disableButton}
                        disabled={saving}
                      >
                        <Text style={styles.disableButtonText}>
                          Disable Converter
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>How it works</Text>
                  <Text style={styles.infoText}>
                    • Original amounts are always stored in the primary
                    currency.
                  </Text>
                  <Text style={styles.infoText}>
                    • Secondary amounts are calculated when displayed.
                  </Text>
                  <Text style={styles.infoText}>
                    • Changing the rate updates converted displays across this
                    workspace.
                  </Text>
                  <Text style={styles.infoText}>
                    • Each workspace has its own converter configuration.
                  </Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  workspaceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  workspaceName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  enabledBadge: {
    backgroundColor: colors.primaryLight,
  },
  disabledBadge: {
    backgroundColor: colors.background,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  enabledText: {
    color: colors.primary,
  },
  disabledText: {
    color: colors.textSecondary,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  currencyField: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  currencyCode: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  fieldDescription: {
    color: colors.textSecondary,
    fontSize: 11,
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
  arrowText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  currencySelector: {
    minHeight: 52,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  currencyList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  currencyListScroll: {
    maxHeight: 220,
  },
  currencyOption: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currencyOptionInfo: {
    gap: 2,
  },
  currencyOptionCode: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  currencyOptionName: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  rateDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  rateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  ratePrefix: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  rateInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  rateTarget: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "right",
  },
  manualNotice: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  manualNoticeTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  manualNoticeText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  updatedAt: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
  },
  disableButton: {
    alignItems: "center",
    padding: spacing.sm,
  },
  disableButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "700",
  },
  infoText: {
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 18,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700",
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
    fontSize: 13,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
});
