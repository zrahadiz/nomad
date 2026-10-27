import { useRouter } from "expo-router";
import type { ComponentRef } from "react";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { colors, radius, spacing, typography } from "@/constants/theme";
import { transactionCategories } from "@/constants/transaction-categories";
import {
  parseAmountToMinor,
  sanitizeAmountInput,
} from "@/lib/finance/amount-input";

import { getCurrencyDecimalDigits } from "@/lib/finance/currency";

import { useFinanceStore } from "@/stores/use-finance-store";
import type { transactionType } from "@/types/finances";
import { SelectSheet } from "../ui/select-sheet";

import { DatePickerField } from "@/components/ui/date-picker-field";

type formType = Extract<transactionType, "income" | "expense">;

const categories = {
  expense: [
    { id: "food", name: "Food & Drinks" },
    { id: "transport", name: "Transportation" },
    { id: "shopping", name: "Shopping" },
    { id: "housing", name: "Housing" },
    { id: "education", name: "Education" },
    { id: "other-expense", name: "Other" },
  ],
  income: [
    { id: "salary", name: "Salary" },
    { id: "allowance", name: "Allowance" },
    { id: "freelance", name: "Freelance" },
    { id: "other-income", name: "Other" },
  ],
} as const;

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function TransactionForm() {
  const router = useRouter();
  const amountRef = useRef<ComponentRef<typeof TextInput>>(null);
  const descriptionRef = useRef<ComponentRef<typeof TextInput>>(null);
  const dateRef = useRef<ComponentRef<typeof TextInput>>(null);

  const activeWorkspaceId = useFinanceStore((state) => state.activeWorkspaceId);
  const accounts = useFinanceStore((state) => state.accounts);
  const workspaces = useFinanceStore((state) => state.workspaces);
  const addTransaction = useFinanceStore((state) => state.addTransaction);

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);
  const currency = workspace?.currency ?? "MYR";
  const decimalDigits = getCurrencyDecimalDigits(currency);

  const availableAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.workspaceId === activeWorkspaceId &&
          account.currency === workspace?.currency,
      ),
    [accounts, activeWorkspaceId, workspace?.currency],
  );

  const [type, setType] = useState<formType>("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(availableAccounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState<string>("food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getLocalDate);
  const [saving, setSaving] = useState(false);

  const selectedCategoryId = categories[type].some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : categories[type][0].id;

  function changeType(nextType: formType) {
    setType(nextType);
    setCategoryId(categories[nextType][0].id);
  }

  const selectedAccountId = availableAccounts.some(
    (account) => account.id === accountId,
  )
    ? accountId
    : (availableAccounts[0]?.id ?? "");

  function handleSave() {
    if (saving) return;

    const amountMinor = parseAmountToMinor(amount, currency);

    if (amountMinor === null) {
      Alert.alert(
        "Invalid amount",
        "Enter an amount greater than zero, with up to two decimal places.",
      );
      return;
    }

    if (!selectedAccountId) {
      Alert.alert("Account required", "Please select an account.");
      return;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const year = match ? Number(match[1]) : 0;
    const month = match ? Number(match[2]) : 0;
    const day = match ? Number(match[3]) : 0;
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      !match ||
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() + 1 !== month ||
      parsedDate.getUTCDate() !== day
    ) {
      Alert.alert("Invalid date", "Use a valid YYYY-MM-DD date.");
      return;
    }

    setSaving(true);

    try {
      addTransaction({
        workspaceId: activeWorkspaceId,
        accountId: selectedAccountId,
        type,
        categoryId: selectedCategoryId,
        amountMinor,
        description,
        date,
      });

      router.dismissTo("/transactions");
    } catch (error) {
      Alert.alert(
        "Unable to save transaction",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 48 }]}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>New transaction</Text>
      <Text style={styles.subtitle}>
        Record your money, one transaction at a time.
      </Text>

      {/* Transaction type */}
      <View style={styles.segment}>
        {(["expense", "income"] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => changeType(item)}
            style={[
              styles.segmentButton,
              type === item && styles.segmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                type === item && styles.segmentTextActive,
              ]}
            >
              {item === "expense" ? "Expense" : "Income"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Amount */}
      <View style={styles.amountCard}>
        <Text style={styles.label}>AMOUNT</Text>

        <View style={styles.amountRow}>
          <Text style={styles.currency}>{workspace?.currency ?? "MYR"}</Text>

          <TextInput
            ref={amountRef}
            value={amount}
            onChangeText={(value) => {
              setAmount(sanitizeAmountInput(value, currency));
            }}
            placeholder={decimalDigits === 0 ? "0" : "0.00"}
            placeholderTextColor={colors.textSecondary}
            keyboardType={decimalDigits === 0 ? "number-pad" : "decimal-pad"}
            style={styles.amountInput}
            accessibilityLabel={`Transaction amount in ${currency}`}
          />
        </View>
      </View>

      {/* Account */}
      <SelectSheet
        label="Account"
        value={selectedAccountId}
        options={availableAccounts.map((account) => ({
          id: account.id,
          name: account.name,
        }))}
        onChange={setAccountId}
        placeholder="Select an account"
      />

      {/* Category */}
      <SelectSheet
        label="Category"
        value={selectedCategoryId}
        options={transactionCategories[type]}
        onChange={setCategoryId}
        placeholder="Select a category"
      />

      {/* Date */}
      <DatePickerField label="Date" value={date} onChange={setDate} />

      {/* Description */}
      <Text style={styles.fieldLabel}>Description (optional)</Text>

      <TextInput
        ref={descriptionRef}
        value={description}
        onChangeText={setDescription}
        placeholder="What was this transaction for?"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        maxLength={120}
        returnKeyType="done"
      />

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
      >
        <Text style={styles.saveButtonText}>
          {saving ? "Saving..." : "Save transaction"}
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  heading: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.primaryLight,
    padding: spacing.xs,
    borderRadius: radius.lg,
  },
  segmentButton: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  currency: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  amountInput: {
    flex: 1,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    padding: 0,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.sm,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    color: colors.text,
    fontSize: typography.size.sm,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  category: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categorySelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  categoryTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.text,
    fontSize: typography.size.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
