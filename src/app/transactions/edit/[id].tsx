import { useLocalSearchParams, useRouter } from "expo-router";

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

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Info,
  Save,
  Tag,
  Wallet,
} from "lucide-react-native";

import { AccountIcon } from "@/components/accounts/account-icon";
import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { DatePickerField } from "@/components/ui/date-picker-field";
import type { accountIconName } from "@/constants/account-options";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { isValidCurrencyAmountInput } from "@/lib/finance/currency-input";
import { useCategoryStore } from "@/stores/use-category-store";
import { useFinanceStore } from "@/stores/use-finance-store";

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

  // Options for the selection sheets.
  const accountOptions: SheetOption[] = availableAccounts.map((account) => ({
    id: account.id,
    label: account.name,
    description: `${formatAccountType(account.type)} · ${account.currency}`,
    leading: <AccountAvatar account={account} />,
  }));

  const categoryOptions: SheetOption[] = availableCategories.map(
    (category) => ({
      id: category.id,
      label: category.name,
      description: category.isArchived
        ? "Currently assigned · Archived"
        : category.isDefault
          ? "Default category"
          : "Custom category",
      leading: <LetterAvatar text={category.name} />,
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

  const handleAmountChange = (value: string) => {
    if (isValidCurrencyAmountInput(value, currency)) {
      setAmount(value);
    }
  };

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
          <Text style={styles.stateDescription}>Loading transaction...</Text>
        </View>
      </SafeScreen>
    );
  }

  // Transaction not found
  if (!transaction) {
    return (
      <StateScreen
        icon={<Wallet size={32} color={colors.textSecondary} />}
        title="Transaction not found"
        description="This transaction may have been deleted or is no longer available."
        onBack={() => router.back()}
      />
    );
  }

  // Transfers cannot be edited individually.
  if (!isEditable) {
    return (
      <StateScreen
        icon={<ArrowLeftRight size={32} color={colors.textSecondary} />}
        title="Transfer cannot be edited here"
        description="Transfer records are linked to another transaction and must be managed together."
        onBack={() => router.back()}
      />
    );
  }

  const isIncome = transaction.type === "income";
  const TypeIcon = isIncome ? ArrowDownLeft : ArrowUpRight;
  const tone = isIncome ? typeTones.income : typeTones.expense;

  // Shown only when the amount differs from what was saved.
  const amountChanged =
    parsedAmount !== null && parsedAmount !== transaction.amountMinor;

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header: the tinted icon shows what you're editing (the type can't change) */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.backButton}
              hitSlop={8}
            >
              <ArrowLeft size={22} color={colors.text} />
            </Pressable>

            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: tone.background },
                ]}
              >
                <TypeIcon size={16} color={tone.color} />
              </View>

              <Text style={styles.headerTitle}>Edit {transaction.type}</Text>
            </View>

            {/* Keeps the title centered */}
            <View style={styles.headerSpacer} />
          </View>

          {/* Amount first: the main thing people come here to change */}
          <FormCard title="Amount" currency={currency}>
            <AmountInput
              value={amount}
              onChangeText={handleAmountChange}
              currency={currency}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={styles.amountInput}
            />

            <Text style={styles.helperText}>
              {parsedAmount !== null
                ? `Preview: ${formatCurrency(parsedAmount, currency)}`
                : `Enter the amount in ${currency}.`}
            </Text>

            {amountChanged && (
              <Text style={styles.helperText}>
                {`Originally ${formatCurrency(transaction.amountMinor, currency)}`}
              </Text>
            )}

            <View style={styles.divider} />

            <View style={styles.noteRow}>
              <Info size={14} color={colors.textSecondary} />

              <Text style={styles.helperText}>
                The currency is determined by your account and workspace.
              </Text>
            </View>
          </FormCard>

          {/* Details */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Details</Text>

            <View style={styles.card}>
              <SelectRow
                label="Account"
                value={selectedAccount?.name}
                placeholder="Select an account"
                hint={
                  selectedAccount
                    ? `${formatAccountType(selectedAccount.type)} · ${selectedAccount.currency}`
                    : "Choose an account for this transaction"
                }
                leading={
                  selectedAccount ? (
                    <AccountAvatar account={selectedAccount} />
                  ) : (
                    <IconTile>
                      <Wallet size={20} color={colors.primary} />
                    </IconTile>
                  )
                }
                onPress={() => setAccountModalVisible(true)}
              />

              <View style={styles.divider} />

              <SelectRow
                label="Category"
                value={selectedCategory?.name}
                placeholder="Select a category"
                hint={
                  selectedCategory
                    ? selectedCategory.isArchived
                      ? "Currently assigned · Archived"
                      : selectedCategory.isDefault
                        ? "Default category"
                        : "Custom category"
                    : `Choose an ${transaction.type} category`
                }
                leading={
                  selectedCategory ? (
                    <LetterAvatar text={selectedCategory.name} />
                  ) : (
                    <IconTile>
                      <Tag size={20} color={colors.primary} />
                    </IconTile>
                  )
                }
                onPress={() => setCategoryModalVisible(true)}
              />
            </View>

            {availableAccounts.length === 0 && !accountsLoading && (
              <InlineNotice text="No accounts are available in this workspace." />
            )}

            {availableCategories.length === 0 && !categoriesLoading && (
              <InlineNotice text="No categories available for this transaction type." />
            )}
          </View>

          {/* Date */}
          <DatePickerField label="Date" value={date} onChange={setDate} />

          {/* Description */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Description</Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Lunch with friends"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.descriptionInput]}
              maxLength={150}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.helperText}>
              Optional, up to 150 characters.
            </Text>
          </View>
        </KeyboardAwareScrollView>

        {/* Save: always visible, outside the scroll area */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave, busy: saving }}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              !canSave && styles.disabledButton,
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Save size={20} color={colors.textOnPrimary} />
            )}

            <Text style={styles.saveButtonText}>
              {saving ? "Saving changes..." : "Save changes"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Selection sheets */}
      <OptionSheet
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        title="Select account"
        subtitle="Choose an account in this workspace."
        options={accountOptions}
        selectedId={accountId}
        emptyText={
          accountsLoading ? "Loading accounts..." : "No accounts available."
        }
        onSelect={(optionId) => {
          setAccountId(optionId);
          setAccountModalVisible(false);
        }}
      />

      <OptionSheet
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title="Select category"
        subtitle={`Choose a category for this ${transaction.type}.`}
        options={categoryOptions}
        selectedId={categoryId}
        emptyText={
          categoriesLoading
            ? "Loading categories..."
            : "No categories available."
        }
        onSelect={(optionId) => {
          setCategoryId(optionId);
          setCategoryModalVisible(false);
        }}
      />
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const typeTones = {
  expense: { color: colors.danger, background: colors.dangerLight },
  income: { color: colors.success, background: colors.successLight },
};

function formatAccountType(type: string): string {
  if (type === "e-wallet") return "E-wallet";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* Same family as the Add Transaction screen: move these into one shared      */
/* file (e.g. /components/transactions/form-parts.tsx) and import them in both.*/
/* -------------------------------------------------------------------------- */

type SheetOption = {
  id: string;
  label: string;
  description?: string;
  leading?: ReactNode;
};

function StateScreen({
  icon,
  title,
  description,
  onBack,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <SafeScreen backgroundColor={colors.background}>
      <View style={styles.centerState}>
        <View style={styles.stateIcon}>{icon}</View>

        <Text style={styles.stateTitle}>{title}</Text>

        <Text style={styles.stateDescription}>{description}</Text>

        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
}

function CurrencyChip({ code }: { code: string }) {
  return (
    <View style={styles.currencyChip}>
      <Text style={styles.currencyChipText}>{code}</Text>
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
    <View style={[styles.card, styles.formCard]}>
      <View style={styles.formCardHeader}>
        <Text style={styles.formCardTitle}>{title}</Text>
        {currency ? <CurrencyChip code={currency} /> : null}
      </View>

      {children}
    </View>
  );
}

function IconTile({ children }: { children: ReactNode }) {
  return <View style={styles.iconTile}>{children}</View>;
}

function LetterAvatar({ text }: { text: string }) {
  return (
    <IconTile>
      <Text style={styles.letter}>{text.charAt(0).toUpperCase()}</Text>
    </IconTile>
  );
}

function AccountAvatar({
  account,
}: {
  account: { icon?: string | null; color?: string | null };
}) {
  return (
    <AccountIcon
      name={(account.icon ?? "wallet") as accountIconName}
      color={account.color ?? colors.primary}
      size={40}
      iconSize={20}
    />
  );
}

function SelectRow({
  label,
  value,
  placeholder,
  hint,
  leading,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder: string;
  hint?: string;
  leading: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? placeholder}`}
      style={({ pressed }) => [
        styles.selectRow,
        pressed && styles.selectRowPressed,
      ]}
    >
      {leading}

      <View style={styles.flex}>
        <Text style={styles.eyebrow}>{label}</Text>

        <Text
          style={[styles.selectValue, !value && styles.selectPlaceholder]}
          numberOfLines={1}
        >
          {value ?? placeholder}
        </Text>

        {hint ? (
          <Text style={styles.selectHint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>

      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

function InlineNotice({ text }: { text: string }) {
  return (
    <View style={styles.notice}>
      <Info size={16} color={colors.warning} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

function OptionSheet({
  visible,
  onClose,
  title,
  subtitle,
  options,
  selectedId,
  emptyText,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  options: SheetOption[];
  selectedId: string;
  emptyText: string;
  onSelect: (id: string) => void;
}) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    >
      {options.length === 0 ? (
        <Text style={styles.emptyOptions}>{emptyText}</Text>
      ) : (
        options.map((option) => {
          const selected = option.id === selectedId;

          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.sheetOption,
                selected && styles.sheetOptionSelected,
                pressed && !selected && styles.selectRowPressed,
              ]}
            >
              {option.leading}

              <View style={styles.flex}>
                <Text style={styles.sheetOptionLabel} numberOfLines={1}>
                  {option.label}
                </Text>

                {option.description ? (
                  <Text style={styles.sheetOptionDescription}>
                    {option.description}
                  </Text>
                ) : null}
              </View>

              {selected && <Check size={20} color={colors.primary} />}
            </Pressable>
          );
        })
      )}
    </BottomSheetModal>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },

  /* Header */
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
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    textTransform: "capitalize",
  },

  headerSpacer: {
    width: 40,
  },

  /* Sections and cards */
  group: {
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  formCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  formCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  formCardTitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
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

  descriptionInput: {
    minHeight: 96,
    paddingTop: spacing.md,
  },

  /* Selection rows */
  selectRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },

  selectRowPressed: {
    backgroundColor: colors.background,
  },

  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  letter: {
    color: colors.primary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },

  eyebrow: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  selectValue: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },

  selectPlaceholder: {
    color: colors.textSecondary,
    fontWeight: typography.weight.regular,
  },

  selectHint: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: 2,
  },

  /* Notice */
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
  },

  noticeText: {
    flex: 1,
    color: colors.text,
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

  /* Sheets */
  sheetOption: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },

  sheetOptionSelected: {
    backgroundColor: colors.primaryLight,
  },

  sheetOptionLabel: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  sheetOptionDescription: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: 2,
  },

  emptyOptions: {
    paddingVertical: spacing.xl,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  /* Loading / not found / transfer */
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
