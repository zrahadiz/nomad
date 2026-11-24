import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Info, Wallet } from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { AccountIcon } from "@/components/accounts/account-icon";
import { AccountIconPicker } from "@/components/accounts/account-icon-picker";
import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";

import {
  accountColors,
  accountIcons,
  type accountIconName,
} from "@/constants/account-options";
import { colors, radius, spacing, typography } from "@/constants/theme";

import { formatMoney, getAccountBalance } from "@/lib/finance/calculations";
import { getCurrencyDecimalDigits, toMinorUnits } from "@/lib/finance/currency";
import { isValidCurrencyAmountInput } from "@/lib/finance/currency-input";

import { useFinanceStore } from "@/stores/use-finance-store";

import type { accountType, updateAccountInput } from "@/types/finances";

const accountTypeOptions: { label: string; value: accountType }[] = [
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
  { label: "E-wallet", value: "e-wallet" },
  { label: "Other", value: "other" },
];

const accountTypeTranslationKeys: Partial<Record<accountType, string>> = {
  cash: "accounts.list.typeCash",
  bank: "accounts.list.typeBank",
  "e-wallet": "accounts.list.typeEwallet",
  other: "accounts.list.typeOther",
};

function parseAmountToMinor(value: string, currency: string) {
  if (!isValidCurrencyAmountInput(value, currency)) return null;
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return null;
  try {
    return toMinorUnits(amount, currency);
  } catch {
    return null;
  }
}

export default function EditAccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const editAccount = useFinanceStore((state) => state.editAccount);
  const adjustAccountBalance = useFinanceStore(
    (state) => state.adjustAccountBalance,
  );
  const transactions = useFinanceStore((state) => state.transactions);
  const transactionsWorkspaceId = useFinanceStore(
    (state) => state.transactionsWorkspaceId,
  );
  const transactionsLoading = useFinanceStore(
    (state) => state.transactionsLoading,
  );
  const transactionsError = useFinanceStore((state) => state.transactionsError);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);

  const account = accounts.find((item) => item.id === id);
  const currency = account?.currency ?? "MYR";

  const [name, setName] = useState("");
  const [type, setType] = useState<accountType>("bank");
  const [icon, setIcon] = useState<accountIconName>("wallet");
  const [color, setColor] = useState<string>(accountColors[0]);
  const [currentBalanceInput, setCurrentBalanceInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const transactionsReady =
    !!account &&
    transactionsWorkspaceId === account.workspaceId &&
    !transactionsLoading &&
    !transactionsError;

  const currentBalanceMinor = useMemo(() => {
    if (!account || !transactionsReady) return 0;
    return getAccountBalance(account, transactions);
  }, [account, transactions, transactionsReady]);

  const selectedIconLabel = useMemo(
    () =>
      accountIcons.find((item) => item.name === icon)?.label ??
      t("accounts.create.accountNameFallback"),
    [icon, t],
  );

  const parsedBalance = parseAmountToMinor(currentBalanceInput, currency);
  const previewBalance = formatMoney(parsedBalance ?? 0, currency);
  const actualCurrentBalance = formatMoney(currentBalanceMinor, currency);

  const handleCurrentBalanceChange = (value: string) => {
    if (isValidCurrencyAmountInput(value, currency))
      setCurrentBalanceInput(value);
  };

  useEffect(() => {
    if (
      account &&
      transactionsWorkspaceId !== account.workspaceId &&
      !transactionsLoading
    ) {
      fetchTransactions(account.workspaceId);
    }
  }, [
    account,
    transactionsWorkspaceId,
    transactionsLoading,
    fetchTransactions,
  ]);

  useEffect(() => {
    if (!account || !transactionsReady || initialized) return;
    const decimals = getCurrencyDecimalDigits(currency);
    setName(account.name);
    setType(account.type);
    setIcon((account.icon ?? "wallet") as accountIconName);
    setColor(account.color ?? accountColors[0]);
    setCurrentBalanceInput(
      (currentBalanceMinor / 10 ** decimals).toFixed(decimals),
    );
    setInitialized(true);
  }, [account, currency, currentBalanceMinor, transactionsReady, initialized]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!account) {
      Alert.alert(
        t("accounts.edit.alerts.notFoundTitle"),
        t("accounts.edit.alerts.notFoundMessage"),
      );
      return;
    }
    if (!trimmedName) {
      Alert.alert(
        t("accounts.edit.alerts.nameRequiredTitle"),
        t("accounts.edit.alerts.nameRequiredMessage"),
      );
      return;
    }
    if (!transactionsReady || !initialized) {
      Alert.alert(
        t("accounts.edit.alerts.transactionsNotReadyTitle"),
        t("accounts.edit.alerts.transactionsNotReadyMessage"),
      );
      return;
    }
    if (parsedBalance === null) {
      Alert.alert(
        t("accounts.edit.alerts.invalidBalanceTitle"),
        t("accounts.edit.alerts.invalidBalanceMessage"),
      );
      return;
    }

    const updates: updateAccountInput = {
      name: trimmedName,
      type,
      icon,
      color,
    };

    try {
      setSaving(true);
      await editAccount(account.id, updates);
      await adjustAccountBalance(account.id, parsedBalance);
      Alert.alert(
        t("accounts.edit.alerts.updatedTitle"),
        t("accounts.edit.alerts.updatedMessage"),
        [{ text: t("common.done"), onPress: () => router.back() }],
      );
    } catch (error) {
      console.error("Failed to update account:", error);
      Alert.alert(
        t("accounts.edit.alerts.updateFailedTitle"),
        error instanceof Error
          ? error.message
          : t("accounts.edit.alerts.genericError"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!account) {
    return (
      <StateScreen
        icon={<Wallet size={32} color={colors.textSecondary} />}
        title={t("accounts.edit.states.notFoundTitle")}
        description={t("accounts.edit.states.notFoundDescription")}
        actionLabel={t("common.goBack")}
        onAction={() => router.back()}
      />
    );
  }

  if (transactionsError && !transactionsLoading) {
    return (
      <StateScreen
        icon={<Wallet size={32} color={colors.danger} />}
        title={t("accounts.edit.states.balanceErrorTitle")}
        description={transactionsError}
        actionLabel={t("common.tryAgain")}
        onAction={() => fetchTransactions(account.workspaceId)}
      />
    );
  }

  if (!initialized || transactionsLoading) {
    return (
      <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateDescription}>
            {t("accounts.edit.states.loading")}
          </Text>
        </View>
      </SafeScreen>
    );
  }

  const typeLabel = t(
    accountTypeTranslationKeys[type] ?? "accounts.list.typeOther",
  );
  const trimmedName = name.trim();
  const saveDisabled = saving || !account || !initialized || !transactionsReady;
  const adjustment =
    parsedBalance !== null ? parsedBalance - currentBalanceMinor : 0;

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <View style={styles.group}>
            <Text style={styles.sectionTitle}>
              {t("accounts.create.accountType")}
            </Text>
            <SegmentedControl
              options={accountTypeOptions.map((option) => ({
                ...option,
                label: t(
                  accountTypeTranslationKeys[option.value] ??
                    "accounts.list.typeOther",
                ),
              }))}
              value={type}
              onChange={setType}
            />
          </View>

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

          <FormCard
            title={t("accounts.edit.currentBalance")}
            currency={currency}
          >
            <View style={styles.recordedRow}>
              <Text style={styles.helperText}>
                {t("accounts.edit.recordedBalance")}
              </Text>
              <Text style={styles.recordedValue}>{actualCurrentBalance}</Text>
            </View>
            <View style={styles.divider} />
            <AmountInput
              value={currentBalanceInput}
              onChangeText={handleCurrentBalanceChange}
              currency={currency}
              placeholder={
                getCurrencyDecimalDigits(currency) === 0 ? "0" : "0.00"
              }
              placeholderTextColor={colors.textSecondary}
              style={styles.amountInput}
              returnKeyType="done"
            />
            <Text style={styles.helperText}>
              {t("accounts.edit.newBalance", { amount: previewBalance })}
            </Text>
            {adjustment !== 0 && (
              <View style={styles.adjustBanner}>
                <Info size={16} color={colors.primary} />
                <Text style={styles.adjustText}>
                  {t("accounts.edit.adjustmentNotice", {
                    sign: adjustment > 0 ? "+" : "−",
                    amount: formatMoney(Math.abs(adjustment), currency),
                  })}
                </Text>
              </View>
            )}
            <Text style={styles.helperText}>
              {t("accounts.edit.balanceHelper")}
            </Text>
            <View style={styles.divider} />
            <View style={styles.noteRow}>
              <Info size={14} color={colors.textSecondary} />
              <Text style={styles.helperText}>
                {t("accounts.create.currencyNote", { currency })}
              </Text>
            </View>
          </FormCard>

          <View style={styles.group}>
            <Text style={styles.sectionTitle}>
              {t("accounts.create.accountPreview")}
            </Text>
            <View style={styles.previewCard}>
              <AccountIcon name={icon} color={color} size={56} iconSize={26} />
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
                  {t("accounts.edit.currentBalance")}
                </Text>
                <Text style={styles.previewBalance} numberOfLines={1}>
                  {previewBalance}
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>

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
              <Check size={20} color={colors.textOnPrimary} />
            )}
            <Text style={styles.saveButtonText}>
              {saving
                ? t("accounts.edit.savingChanges")
                : t("accounts.edit.saveChanges")}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeScreen>
  );
}

function StateScreen({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.centerState}>
        <View style={styles.stateIcon}>{icon}</View>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateDescription}>{description}</Text>
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
}

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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl },
  group: { gap: spacing.sm },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
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
  segmentSelected: { backgroundColor: colors.primaryLight },
  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  segmentTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardPadded: { padding: spacing.md, gap: spacing.md },
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
  divider: { height: 1, backgroundColor: colors.border },
  recordedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  recordedValue: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  amountInput: {
    height: 56,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    color: colors.text,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
  },
  adjustBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },
  adjustText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },
  noteRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  helperText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },
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
  saveButtonPressed: { backgroundColor: colors.primaryDark },
  disabledButton: { opacity: 0.5 },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    textAlign: "center",
  },
  stateDescription: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  primaryButtonPressed: { backgroundColor: colors.primaryDark },
  primaryButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
