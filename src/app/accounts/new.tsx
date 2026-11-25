import { useRouter } from "expo-router";
import { Info, Plus } from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { AccountColorPicker } from "@/components/accounts/account-color-picker";
import { AccountIconPicker } from "@/components/accounts/account-icon-picker";
import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";

import {
  accountColors,
  accountIcons,
  type accountIconName,
} from "@/constants/account-options";
import { colors, radius, spacing, typography } from "@/constants/theme";

import { formatMoney } from "@/lib/finance/calculations";
import { getCurrencyDecimalDigits, toMinorUnits } from "@/lib/finance/currency";
import { isValidCurrencyAmountInput } from "@/lib/finance/currency-input";

import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

import { AppIcon } from "@/components/ui/app-icon";
import type { accountType } from "@/types/finances";

function parseAmountToMinor(value: string, currency: string) {
  if (!isValidCurrencyAmountInput(value, currency)) {
    return null;
  }

  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  try {
    return toMinorUnits(amount, currency);
  } catch {
    return null;
  }
}

export default function NewAccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );

  const addAccount = useFinanceStore((state) => state.addAccount);

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);

  const [name, setName] = useState("");
  const [type, setType] = useState<accountType>("bank");
  const [icon, setIcon] = useState<accountIconName>("wallet");
  const [color, setColor] = useState<string>(accountColors[0]);
  const [openingBalance, setOpeningBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const accountTypeOptions: { label: string; value: accountType }[] = [
    { label: t("accounts.list.typeCash"), value: "cash" },
    { label: t("accounts.list.typeBank"), value: "bank" },
    { label: t("accounts.list.typeEwallet"), value: "e-wallet" },
    { label: t("accounts.list.typeOther"), value: "other" },
  ];

  const currency = workspace?.currency_code ?? "MYR";
  const decimalDigits = getCurrencyDecimalDigits(currency);

  const selectedIconLabel = useMemo(
    () => accountIcons.find((item) => item.name === icon)?.label ?? "Account",
    [icon],
  );

  const parsedBalance = parseAmountToMinor(openingBalance, currency);

  const previewBalance =
    parsedBalance !== null
      ? formatMoney(parsedBalance, currency)
      : formatMoney(0, currency);

  const handleOpeningBalanceChange = (value: string) => {
    if (isValidCurrencyAmountInput(value, currency)) {
      setOpeningBalance(value);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!workspace) {
      Alert.alert(
        t("accounts.create.alerts.noWorkspaceTitle"),
        t("accounts.create.alerts.noWorkspaceMessage"),
      );
      return;
    }

    if (!trimmedName) {
      Alert.alert(
        t("accounts.create.alerts.nameRequiredTitle"),
        t("accounts.create.alerts.nameRequiredMessage"),
      );
      return;
    }

    if (parsedBalance === null) {
      Alert.alert(
        t("accounts.create.alerts.invalidBalanceTitle"),
        t("accounts.create.alerts.invalidBalanceMessage", {
          decimalDigits,
        }),
      );
      return;
    }

    try {
      setSaving(true);

      await addAccount({
        workspaceId: workspace.id,
        name: trimmedName,
        type,
        currency,
        initialBalanceMinor: parsedBalance,
        icon,
        color,
      });

      Alert.alert(
        t("accounts.create.alerts.successTitle"),
        t("accounts.create.alerts.successMessage"),
        [
          {
            text: t("common.done"),
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Failed to create account:", error);

      Alert.alert(
        t("accounts.create.alerts.failureTitle"),
        error instanceof Error
          ? error.message
          : t("accounts.create.alerts.failureMessage"),
      );
    } finally {
      setSaving(false);
    }
  };

  const typeLabel =
    accountTypeOptions.find((item) => item.value === type)?.label ?? "";

  const trimmedName = name.trim();
  const saveDisabled = saving || !workspace;

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 2. Name */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>
              {t("accounts.create.accountName")}
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("accounts.create.namePlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              maxLength={40}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* 3. Type */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>
              {t("accounts.create.accountType")}
            </Text>

            <SegmentedControl
              options={accountTypeOptions}
              value={type}
              onChange={setType}
            />
          </View>

          {/* 4. Appearance */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>
              {t("accounts.create.appearance")}
            </Text>

            <View style={[styles.card, styles.cardPadded]}>
              <Text style={styles.cardLabel}>
                {t("accounts.create.chooseIcon")}
              </Text>

              <AccountIconPicker
                value={icon}
                color={color}
                onChange={setIcon}
              />

              <View style={styles.divider} />

              <Text style={styles.cardLabel}>
                {t("accounts.create.chooseColor")}
              </Text>

              <AccountColorPicker value={color} onChange={setColor} />
            </View>
          </View>

          {/* 5. Opening balance */}
          <FormCard
            title={t("accounts.create.openingBalance")}
            currency={currency}
          >
            <AmountInput
              value={openingBalance}
              onChangeText={handleOpeningBalanceChange}
              currency={currency}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={styles.amountInput}
              returnKeyType="done"
            />

            <Text style={styles.helperText}>
              {t("accounts.create.preview", { amount: previewBalance })}
            </Text>

            <Text style={styles.helperText}>
              {t("accounts.create.balanceHelper", {
                decimalDigits,
                currency,
              })}
            </Text>

            <View style={styles.divider} />

            <View style={styles.noteRow}>
              <Info size={14} color={colors.textSecondary} />

              <Text style={styles.helperText}>
                {t("accounts.create.currencyNote", { currency })}
              </Text>
            </View>
          </FormCard>

          {/* 1. Live preview */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>
              {t("accounts.create.accountPreview")}
            </Text>

            <View style={styles.previewCard}>
              <AppIcon
                name={icon}
                color={color}
                size={56}
                iconSize={26}
                background
              />
              <View style={styles.flex}>
                <Text
                  style={[
                    styles.previewName,
                    !trimmedName && styles.previewNamePlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {trimmedName || t("accounts.create.accountNameFallback")}
                </Text>

                <Text style={styles.previewType} numberOfLines={1}>
                  {t("accounts.create.selectedIconAndType", {
                    icon: selectedIconLabel,
                    type: typeLabel,
                  })}
                </Text>
              </View>

              <View style={styles.previewBalanceContainer}>
                <Text style={styles.previewBalanceLabel}>
                  {t("accounts.create.openingBalance")}
                </Text>

                <Text style={styles.previewBalance} numberOfLines={1}>
                  {previewBalance}
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>

        {/* Save: always visible, outside the scroll area */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={saveDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: saveDisabled, busy: saving }}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              saveDisabled && styles.disabledButton,
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Plus size={20} color={colors.textOnPrimary} />
            )}

            <Text style={styles.saveButtonText}>
              {saving
                ? t("accounts.create.creatingAccount")
                : t("accounts.create.createAccount")}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* -------------------------------------------------------------------------- */

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              style={[
                styles.segmentText,
                selected && styles.segmentTextSelected,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FormCard({
  title,
  currency,
  children,
}: {
  title: string;
  currency?: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.card, styles.cardPadded]}>
      <View style={styles.formCardHeader}>
        <Text style={styles.cardLabel}>{title}</Text>

        {currency ? (
          <View style={styles.currencyChip}>
            <Text style={styles.currencyChipText}>{currency}</Text>
          </View>
        ) : null}
      </View>

      {children}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

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
    gap: spacing.xl,
  },

  group: {
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  /* Preview */
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  previewName: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  previewNamePlaceholder: {
    color: colors.textSecondary,
    fontWeight: typography.weight.regular,
  },

  previewType: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: 2,
  },

  previewBalanceContainer: {
    flexShrink: 0,
    maxWidth: "40%",
    alignItems: "flex-end",
    gap: 2,
  },

  previewBalanceLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  previewBalance: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  /* Inputs */
  input: {
    minHeight: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typography.size.md,
  },

  /* Segmented control */
  segmented: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },

  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },

  segmentSelected: {
    backgroundColor: colors.primaryLight,
  },

  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  segmentTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },

  /* Cards */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  cardPadded: {
    padding: spacing.md,
    gap: spacing.md,
  },

  cardLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  formCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  currencyChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },

  currencyChipText: {
    color: colors.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  /* Amount */
  amountInput: {
    height: 56,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    color: colors.text,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
  },

  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  helperText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: 18,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
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
});
