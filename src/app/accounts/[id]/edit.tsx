import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";

import {
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
import { colors, radius, spacing } from "@/constants/theme";

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
      <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Account not found</Text>
          <Text style={styles.helperText}>
            This account may have been deleted or is no longer available.
          </Text>

          <Pressable style={styles.saveButton} onPress={() => router.back()}>
            <Text style={styles.saveButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  if (transactionsError && !transactionsLoading) {
    return (
      <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>
            Unable to load account balance
          </Text>

          <Text style={styles.helperText}>{transactionsError}</Text>

          <Pressable
            style={styles.saveButton}
            onPress={() => fetchTransactions(account.workspaceId)}
          >
            <Text style={styles.saveButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  if (!initialized || transactionsLoading) {
    return (
      <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>
            Loading account information...
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Account Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account name</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Maybank Savings"
            placeholderTextColor={colors.textSecondary}
            style={styles.textInput}
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Account Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account type</Text>

          <View style={styles.typeContainer}>
            {accountTypeOptions.map((option) => {
              const selected = type === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={[
                    styles.typeOption,
                    selected && styles.selectedTypeOption,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      selected && styles.selectedTypeText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Account Icon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose an icon</Text>

          <AccountIconPicker value={icon} color={color} onChange={setIcon} />
        </View>

        {/* Account Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a color</Text>

          <AccountColorPicker value={color} onChange={setColor} />
        </View>

        {/* Current Balance */}
        <View style={styles.section}>
          <View style={styles.balanceHeader}>
            <Text style={styles.sectionTitle}>Current balance</Text>
            <Text style={styles.currencyLabel}>{currency}</Text>
          </View>

          <Text style={styles.helperText}>
            Recorded balance: {actualCurrentBalance}
          </Text>

          <AmountInput
            value={currentBalanceInput}
            onChangeText={handleCurrentBalanceChange}
            currency={currency}
            placeholder={
              getCurrencyDecimalDigits(currency) === 0 ? "0" : "0.00"
            }
            placeholderTextColor={colors.textSecondary}
            style={styles.textInput}
            returnKeyType="done"
          />

          <Text style={styles.previewBalance}>
            New balance: {previewBalance}
          </Text>

          <Text style={styles.helperText}>
            Enter the actual amount currently available in this account. Nomad
            will record the difference as a balance adjustment without changing
            your opening balance.
          </Text>
        </View>

        {/* Workspace Currency */}
        <View style={styles.currencyInfo}>
          <View style={styles.currencyInfoText}>
            <Text style={styles.currencyInfoTitle}>Account currency</Text>
            <Text style={styles.helperText}>
              This account uses your workspace currency.
            </Text>
          </View>

          <Text style={styles.currencyCode}>{currency}</Text>
        </View>

        {/* Account Preview */}
        <Text style={styles.sectionTitle}>Account Preview</Text>

        <View style={styles.previewCard}>
          <AccountIcon name={icon} color={color} size={56} iconSize={26} />

          <View style={styles.previewDetails}>
            <Text style={styles.previewName}>
              {name.trim() || "Account name"}
            </Text>

            <Text style={styles.previewType}>
              {selectedIconLabel} ·{" "}
              {accountTypeOptions.find((item) => item.value === type)?.label}
            </Text>
          </View>

          <View style={styles.previewBalanceContainer}>
            <Text style={styles.previewBalanceLabel}>Current balance</Text>
            <Text style={styles.previewBalance}>{previewBalance}</Text>
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={saving || !account || !initialized || !transactionsReady}
          style={[
            styles.saveButton,
            (saving || !account || !initialized || !transactionsReady) &&
              styles.disabledButton,
          ]}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {saving ? "Saving changes..." : "Save Changes"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewDetails: {
    flex: 1,
    gap: 4,
  },
  previewName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  previewType: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  previewBalanceContainer: {
    alignItems: "flex-end",
    gap: 4,
  },
  previewBalanceLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  previewBalance: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  textInput: {
    height: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedTypeOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  selectedTypeText: {
    color: colors.primary,
    fontWeight: "600",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currencyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  currencyInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },
  currencyInfoText: {
    flex: 1,
    gap: 4,
  },
  currencyInfoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  currencyCode: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  saveButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
