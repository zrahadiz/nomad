import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Info, Wallet } from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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

const accountTypeOptions: {
  label: string;
  value: accountType;
}[] = [
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
  { label: "E-wallet", value: "e-wallet" },
  { label: "Other", value: "other" },
];

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

export default function EditAccountScreen() {
  const router = useRouter();

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
    () => accountIcons.find((item) => item.name === icon)?.label ?? "Account",
    [icon],
  );

  const parsedBalance = parseAmountToMinor(currentBalanceInput, currency);

  const previewBalance = formatMoney(parsedBalance ?? 0, currency);
  const actualCurrentBalance = formatMoney(currentBalanceMinor, currency);

  const handleCurrentBalanceChange = (value: string) => {
    if (isValidCurrencyAmountInput(value, currency)) {
      setCurrentBalanceInput(value);
    }
  };

  // Load transactions if the account's workspace is not currently loaded.
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

  // Initialize the form only after the account's transactions are available.
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
      Alert.alert("Account not found", "This account may have been deleted.");
      return;
    }

    if (!trimmedName) {
      Alert.alert("Account name required", "Please enter an account name.");
      return;
    }

    if (!transactionsReady || !initialized) {
      Alert.alert(
        "Transactions not ready",
        "Please wait until your account transactions have loaded.",
      );
      return;
    }

    if (parsedBalance === null) {
      Alert.alert(
        "Invalid current balance",
        "Please enter a valid non-negative amount.",
      );
      return;
    }

    // Only update account metadata.
    // The opening balance must remain unchanged.
    const updates: updateAccountInput = {
      name: trimmedName,
      type,
      icon,
      color,
    };

    try {
      setSaving(true);

      await editAccount(account.id, updates);

      // Record a balance adjustment only if the desired balance differs.
      await adjustAccountBalance(account.id, parsedBalance);

      Alert.alert("Account updated", "Your account has been updated.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Failed to update account:", error);

      Alert.alert(
        "Unable to update account",
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!account) {
    return (
      <StateScreen
        icon={<Wallet size={32} color={colors.textSecondary} />}
        title="Account not found"
        description="This account may have been deleted or is no longer available."
        actionLabel="Go back"
        onAction={() => router.back()}
      />
    );
  }

  if (transactionsError && !transactionsLoading) {
    return (
      <StateScreen
        icon={<Wallet size={32} color={colors.danger} />}
        title="Unable to load account balance"
        description={transactionsError}
        actionLabel="Try again"
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
            Loading account information...
          </Text>
        </View>
      </SafeScreen>
    );
  }

  const typeLabel =
    accountTypeOptions.find((item) => item.value === type)?.label ?? "";

  const trimmedName = name.trim();

  const saveDisabled = saving || !account || !initialized || !transactionsReady;

  // What saving will record as a balance adjustment (new balance minus recorded balance).
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
          {/* 2. Name */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Account name</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Maybank Savings"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              maxLength={40}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* 3. Type */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Account type</Text>

            <SegmentedControl
              options={accountTypeOptions}
              value={type}
              onChange={setType}
            />
          </View>

          {/* 4. Appearance: icon and color together, since they style the same thing */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Appearance</Text>

            <View style={[styles.card, styles.cardPadded]}>
              <Text style={styles.cardLabel}>Choose an icon</Text>

              <AccountIconPicker
                value={icon}
                color={color}
                onChange={setIcon}
              />

              <View style={styles.divider} />

              <Text style={styles.cardLabel}>Choose a color</Text>

              <AccountColorPicker value={color} onChange={setColor} />
            </View>
          </View>

          {/* 5. Current balance */}
          <FormCard title="Current balance" currency={currency}>
            <View style={styles.recordedRow}>
              <Text style={styles.helperText}>Recorded balance</Text>

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

            <Text style={styles.helperText}>New balance: {previewBalance}</Text>

            {adjustment !== 0 && (
              <View style={styles.adjustBanner}>
                <Info size={16} color={colors.primary} />

                <Text style={styles.adjustText}>
                  {`Saving will record a balance adjustment of ${
                    adjustment > 0 ? "+" : "−"
                  }${formatMoney(Math.abs(adjustment), currency)}.`}
                </Text>
              </View>
            )}

            <Text style={styles.helperText}>
              Enter the actual amount currently available in this account. Nomad
              will record the difference as a balance adjustment without
              changing your opening balance.
            </Text>

            <View style={styles.divider} />

            <View style={styles.noteRow}>
              <Info size={14} color={colors.textSecondary} />

              <Text style={styles.helperText}>
                {`Account currency: ${currency}. This account uses your workspace currency.`}
              </Text>
            </View>
          </FormCard>
          {/* 1. Live preview: updates as you type and pick, so it stays at the top */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Account Preview</Text>

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
                  {trimmedName || "Account name"}
                </Text>

                <Text style={styles.previewType} numberOfLines={1}>
                  {selectedIconLabel} · {typeLabel}
                </Text>
              </View>

              <View style={styles.previewBalanceContainer}>
                <Text style={styles.previewBalanceLabel}>Current balance</Text>

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
              <Check size={20} color={colors.textOnPrimary} />
            )}

            <Text style={styles.saveButtonText}>
              {saving ? "Saving changes..." : "Save changes"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* Same family as the Add Account screen: move them into one shared file.      */
/* -------------------------------------------------------------------------- */

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
    borderRadius: radius.lg,
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

  /* Balance */
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

  /* Loading / error / not found */
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

  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },

  primaryButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
