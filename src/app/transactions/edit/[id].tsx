import { useLocalSearchParams, useRouter } from "expo-router";

import { useEffect, useMemo, useState } from "react";
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

import { Check, Save, Wallet } from "lucide-react-native";

import { SafeScreen } from "@/components/layout/safe-screen";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { colors, radius, spacing } from "@/constants/theme";
import { useCategoryStore } from "@/stores/use-category-store";
import { useFinanceStore } from "@/stores/use-finance-store";
import type { financialCategory } from "@/types/finances";

type SelectionOption = {
  id: string;
  label: string;
  description?: string;
  icon?: string | null;
};

function getCurrencyDecimals(currency: string) {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

function formatCurrency(amountMinor: number, currency: string) {
  const decimals = getCurrencyDecimals(currency);

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amountMinor / 10 ** decimals);
}

function formatMinorToInput(amountMinor: number, currency: string) {
  const decimals = getCurrencyDecimals(currency);

  return (amountMinor / 10 ** decimals).toFixed(decimals);
}

function parseAmountToMinor(value: string, currency: string) {
  const decimals = getCurrencyDecimals(currency);
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const minorAmount = Math.round(amount * 10 ** decimals);

  if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) {
    return null;
  }

  return minorAmount;
}

function sanitizeAmountInput(value: string, currency: string) {
  const cleaned = value.replace(/,/g, "");
  const decimals = getCurrencyDecimals(currency);

  const pattern =
    decimals === 0 ? /^\d*$/ : new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`);

  return pattern.test(cleaned) ? cleaned : null;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
  );
}

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Finance store
  const transactions = useFinanceStore((state) => state.transactions);
  const accounts = useFinanceStore((state) => state.accounts);
  const accountsLoading = useFinanceStore((state) => state.accountsLoading);
  const fetchAccounts = useFinanceStore((state) => state.fetchAccounts);
  const editTransaction = useFinanceStore((state) => state.editTransaction);
  const transactionsLoading = useFinanceStore(
    (state) => state.transactionsLoading,
  );

  // Category store
  const categories = useCategoryStore((state) => state.categories);
  const categoriesLoading = useCategoryStore(
    (state) => state.categoriesLoading,
  );
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  const transaction = useMemo(
    () => transactions.find((item) => item.id === id),
    [transactions, id],
  );

  const isEditable =
    transaction?.type === "income" || transaction?.type === "expense";

  const currency = transaction?.currency ?? "MYR";

  // Form fields
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Initialize the form from the selected transaction.
  useEffect(() => {
    if (!transaction || initialized) return;

    setAccountId(transaction.accountId);
    setCategoryId(transaction.categoryId ?? "");
    setAmount(
      formatMinorToInput(transaction.amountMinor, transaction.currency),
    );
    setDate(transaction.date);
    setDescription(transaction.description ?? "");

    setInitialized(true);
  }, [transaction, initialized]);

  // Load accounts for the transaction's workspace.
  useEffect(() => {
    if (!transaction) return;

    void fetchAccounts(transaction.workspaceId);
  }, [transaction?.workspaceId, fetchAccounts]);

  // Load categories.
  useEffect(() => {
    if (categories.length === 0 && !categoriesLoading) {
      void fetchCategories();
    }
  }, [categories.length, categoriesLoading, fetchCategories]);

  // Only show accounts from the original workspace.
  const availableAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.workspaceId === transaction?.workspaceId,
      ),
    [accounts, transaction?.workspaceId],
  );

  // Show active categories of the correct type.
  // Keep the currently assigned category available if it has been archived.
  const availableCategories = useMemo(() => {
    if (!transaction) return [];

    return categories.filter(
      (category) =>
        category.type === transaction.type &&
        (!category.isArchived || category.id === transaction.categoryId),
    );
  }, [categories, transaction]);

  const selectedAccount = availableAccounts.find(
    (account) => account.id === accountId,
  );

  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );

  const accountOptions: SelectionOption[] = availableAccounts.map(
    (account) => ({
      id: account.id,
      label: account.name,
      description: `${account.type} · ${account.currency}`,
      icon: account.name.charAt(0).toUpperCase(),
    }),
  );

  const categoryOptions: SelectionOption[] = availableCategories.map(
    (category: financialCategory) => ({
      id: category.id,
      label: category.name,
      description: category.isArchived
        ? "Currently assigned · Archived"
        : category.isDefault
          ? "Default category"
          : "Custom category",
      icon: category.icon,
    }),
  );

  const parsedAmount = parseAmountToMinor(amount, currency);

  const canSave =
    Boolean(transaction) &&
    isEditable &&
    initialized &&
    Boolean(selectedAccount) &&
    Boolean(selectedCategory) &&
    parsedAmount !== null &&
    isValidDate(date) &&
    !saving;

  const handleSave = async () => {
    if (!transaction || !isEditable) return;

    if (!selectedAccount) {
      Alert.alert("Account required", "Please select an account.");
      return;
    }

    if (selectedAccount.workspaceId !== transaction.workspaceId) {
      Alert.alert(
        "Invalid account",
        "Please select an account from the original workspace.",
      );
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Category required", "Please select a category.");
      return;
    }

    if (selectedCategory.type !== transaction.type) {
      Alert.alert(
        "Invalid category",
        "Please select a category matching this transaction type.",
      );
      return;
    }

    if (
      selectedCategory.isArchived &&
      selectedCategory.id !== transaction.categoryId
    ) {
      Alert.alert("Archived category", "Please select an active category.");
      return;
    }

    if (parsedAmount === null) {
      Alert.alert(
        "Invalid amount",
        "Please enter an amount greater than zero.",
      );
      return;
    }

    if (!isValidDate(date)) {
      Alert.alert("Invalid date", "Please enter a valid date.");
      return;
    }

    try {
      setSaving(true);

      await editTransaction(transaction.id, {
        accountId: selectedAccount.id,
        categoryId: selectedCategory.id,
        amountMinor: parsedAmount,
        description: description.trim() || null,
        date,
      });

      router.replace({
        pathname: "/transactions/[id]",
        params: { id: transaction.id },
      });
    } catch (error) {
      console.error("Failed to update transaction:", error);

      Alert.alert(
        "Unable to update transaction",
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Loading transaction
  if (!transaction && transactionsLoading) {
    return (
      <SafeScreen backgroundColor={colors.background}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.helperText}>Loading transaction...</Text>
        </View>
      </SafeScreen>
    );
  }

  // Transaction not found
  if (!transaction) {
    return (
      <SafeScreen backgroundColor={colors.background}>
        <View style={styles.centerState}>
          <Wallet size={36} color={colors.textSecondary} />

          <Text style={styles.emptyTitle}>Transaction not found</Text>

          <Text style={styles.helperText}>
            This transaction may have been deleted or is no longer available.
          </Text>

          <Pressable onPress={() => router.back()} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  // Transfers cannot be edited individually.
  if (!isEditable) {
    return (
      <SafeScreen backgroundColor={colors.background}>
        <View style={styles.centerState}>
          <Wallet size={36} color={colors.textSecondary} />

          <Text style={styles.emptyTitle}>Transfer cannot be edited here</Text>

          <Text style={styles.helperText}>
            Transfer records are linked to another transaction and must be
            managed together.
          </Text>

          <Pressable onPress={() => router.back()} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Go back</Text>
          </Pressable>
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
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Edit {transaction.type}</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Pressable
            onPress={() => setAccountModalVisible(true)}
            style={styles.selectionButton}
          >
            <View style={styles.selectionDetails}>
              <Text style={styles.selectionValue}>
                {selectedAccount?.name ?? "Select an account"}
              </Text>

              <Text style={styles.selectionDescription}>
                {selectedAccount
                  ? `${selectedAccount.type} · ${selectedAccount.currency}`
                  : "Choose an account for this transaction"}
              </Text>
            </View>

            <Text style={styles.selectionArrow}>›</Text>
          </Pressable>

          {availableAccounts.length === 0 && !accountsLoading && (
            <Text style={styles.helperText}>
              No accounts are available in this workspace.
            </Text>
          )}
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>

          <Pressable
            onPress={() => setCategoryModalVisible(true)}
            style={styles.selectionButton}
          >
            <View style={styles.selectionDetails}>
              <Text style={styles.selectionValue}>
                {selectedCategory?.name ?? "Select a category"}
              </Text>

              <Text style={styles.selectionDescription}>
                {selectedCategory
                  ? selectedCategory.isArchived
                    ? "Currently assigned · Archived"
                    : selectedCategory.isDefault
                      ? "Default category"
                      : "Custom category"
                  : `Choose an ${transaction.type} category`}
              </Text>
            </View>

            <Text style={styles.selectionArrow}>›</Text>
          </Pressable>

          {availableCategories.length === 0 && !categoriesLoading && (
            <Text style={styles.helperText}>
              No categories available for this transaction type.
            </Text>
          )}
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <View style={styles.balanceHeader}>
            <Text style={styles.sectionTitle}>Amount</Text>
            <Text style={styles.currencyLabel}>{currency}</Text>
          </View>

          <TextInput
            value={amount}
            onChangeText={(value) => {
              const cleaned = sanitizeAmountInput(value, currency);

              if (cleaned !== null) {
                setAmount(cleaned);
              }
            }}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            style={styles.amountInput}
            keyboardType="decimal-pad"
          />

          <Text style={styles.helperText}>
            {parsedAmount !== null
              ? `Preview: ${formatCurrency(parsedAmount, currency)}`
              : `Enter the amount in ${currency}.`}
          </Text>
        </View>

        {/* Date */}
        <DatePickerField label="Date" value={date} onChange={setDate} />

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Lunch with friends"
            placeholderTextColor={colors.textSecondary}
            style={[styles.textInput, styles.descriptionInput]}
            maxLength={150}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.helperText}>Optional, up to 150 characters.</Text>
        </View>

        {/* Currency information */}
        <View style={styles.currencyInfo}>
          <View style={styles.currencyInfoText}>
            <Text style={styles.currencyInfoTitle}>Transaction currency</Text>

            <Text style={styles.helperText}>
              The currency is determined by your account and workspace.
            </Text>
          </View>

          <Text style={styles.currencyCode}>{currency}</Text>
        </View>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.disabledButton]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Save size={19} color="#FFFFFF" />
          )}

          <Text style={styles.saveButtonText}>
            {saving ? "Saving changes..." : "Save Changes"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>

      {/* Account modal */}
      <BottomSheetModal
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        title="Select account"
        subtitle="Choose an account in this workspace."
      >
        {accountOptions.length === 0 ? (
          <Text style={styles.emptyOptions}>
            {accountsLoading ? "Loading accounts..." : "No accounts available."}
          </Text>
        ) : (
          accountOptions.map((option) => {
            const selected = option.id === accountId;

            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setAccountId(option.id);
                  setAccountModalVisible(false);
                }}
                style={styles.modalOption}
              >
                <View style={styles.selectionDetails}>
                  <Text style={styles.modalOptionLabel}>{option.label}</Text>

                  <Text style={styles.modalOptionDescription}>
                    {option.description}
                  </Text>
                </View>

                {selected && <Check size={19} color={colors.primary} />}
              </Pressable>
            );
          })
        )}
      </BottomSheetModal>

      {/* Category modal */}
      <BottomSheetModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title="Select category"
        subtitle={`Choose a category for this ${transaction.type}.`}
      >
        {categoryOptions.length === 0 ? (
          <Text style={styles.emptyOptions}>
            {categoriesLoading
              ? "Loading categories..."
              : "No categories available."}
          </Text>
        ) : (
          categoryOptions.map((option) => {
            const selected = option.id === categoryId;

            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setCategoryId(option.id);
                  setCategoryModalVisible(false);
                }}
                style={styles.modalOption}
              >
                <View style={styles.selectionDetails}>
                  <Text style={styles.modalOptionLabel}>{option.label}</Text>

                  <Text style={styles.modalOptionDescription}>
                    {option.description}
                  </Text>
                </View>

                {selected && <Check size={19} color={colors.primary} />}
              </Pressable>
            );
          })
        )}
      </BottomSheetModal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    fontSize: 30,
    lineHeight: 34,
    color: colors.text,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    textTransform: "capitalize",
  },

  headerSpacer: {
    width: 40,
  },

  section: {
    gap: spacing.md,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },

  selectionButton: {
    minHeight: 64,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },

  selectionDetails: {
    flex: 1,
    gap: 4,
  },

  selectionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },

  selectionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  selectionArrow: {
    fontSize: 24,
    color: colors.textSecondary,
    paddingLeft: spacing.sm,
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

  amountInput: {
    height: 64,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 26,
    fontWeight: "600",
    color: colors.text,
  },

  textInput: {
    minHeight: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },

  descriptionInput: {
    minHeight: 90,
    paddingTop: spacing.md,
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
    gap: spacing.md,
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

  modalOption: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  modalOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },

  modalOptionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  emptyOptions: {
    paddingVertical: spacing.xl,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 13,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
