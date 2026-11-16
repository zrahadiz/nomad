import { useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Globe,
  Info,
  Plus,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
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

import { getCurrencyDecimalDigits, toMinorUnits } from "@/lib/finance/currency";

import { formatMoney } from "@/lib/finance/calculations";
import { isValidCurrencyAmountInput } from "@/lib/finance/currency-input";

import { AccountIcon } from "@/components/accounts/account-icon";
import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { DatePickerField } from "@/components/ui/date-picker-field";

import type { accountIconName } from "@/constants/account-options";
import { getCountryByCode } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useCategoryStore } from "@/stores/use-category-store";
import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

type NewTransactionType = "expense" | "income" | "transfer";
type TransferRateMode = "manual" | "actual";

const transactionTypeOptions: {
  label: string;
  value: NewTransactionType;
}[] = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Transfer", value: "transfer" },
];

function parseAmountToMinor(value: string, currency: string) {
  if (!isValidCurrencyAmountInput(value, currency)) {
    return null;
  }

  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  try {
    const amountMinor = toMinorUnits(amount, currency);

    return amountMinor > 0 ? amountMinor : null;
  } catch {
    return null;
  }
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

// Calculate the amount received from the amount sent and exchange rate.
// Exchange rate means destination major currency per source major currency.
function calculateReceivedMinor(
  amountSentMinor: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number,
) {
  const fromDecimals = getCurrencyDecimalDigits(fromCurrency);
  const toDecimals = getCurrencyDecimalDigits(toCurrency);

  const amountSentMajor = amountSentMinor / 10 ** fromDecimals;

  const amountReceivedMinor = Math.round(
    amountSentMajor * exchangeRate * 10 ** toDecimals,
  );

  if (!Number.isSafeInteger(amountReceivedMinor) || amountReceivedMinor <= 0) {
    return null;
  }

  return amountReceivedMinor;
}

// Calculate the effective rate using the actual sent and received amounts.
function calculateEffectiveRate(
  amountSentMinor: number,
  amountReceivedMinor: number,
  fromCurrency: string,
  toCurrency: string,
) {
  const fromDecimals = getCurrencyDecimalDigits(fromCurrency);
  const toDecimals = getCurrencyDecimalDigits(toCurrency);

  const amountSentMajor = amountSentMinor / 10 ** fromDecimals;
  const amountReceivedMajor = amountReceivedMinor / 10 ** toDecimals;

  if (amountSentMajor <= 0) return null;

  const rate = amountReceivedMajor / amountSentMajor;

  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export default function NewTransactionScreen() {
  const router = useRouter();

  // Workspace store
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );

  // Finance store
  const accounts = useFinanceStore((state) => state.accounts);
  const accountsLoading = useFinanceStore((state) => state.accountsLoading);
  const fetchAccounts = useFinanceStore((state) => state.fetchAccounts);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const addTransfer = useFinanceStore((state) => state.addTransfer);

  // Category store
  const categories = useCategoryStore((state) => state.categories);
  const categoriesLoading = useCategoryStore(
    (state) => state.categoriesLoading,
  );
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  const activeWorkspace = workspaces.find(
    (item) => item.id === activeWorkspaceId,
  );

  const currency = activeWorkspace?.currency_code ?? "MYR";

  // Transaction fields
  const [type, setType] = useState<NewTransactionType>("expense");

  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [amount, setAmount] = useState("");

  // Transfer workspace fields
  const [fromWorkspaceId, setFromWorkspaceId] = useState(
    activeWorkspaceId ?? "",
  );
  const [toWorkspaceId, setToWorkspaceId] = useState(activeWorkspaceId ?? "");

  // Transfer amount and exchange rate fields
  const [amountSent, setAmountSent] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [rateMode, setRateMode] = useState<TransferRateMode>("manual");

  // Common fields
  const [date, setDate] = useState(getTodayDate);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Selection modal states
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [destinationModalVisible, setDestinationModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const [fromWorkspaceModalVisible, setFromWorkspaceModalVisible] =
    useState(false);
  const [toWorkspaceModalVisible, setToWorkspaceModalVisible] = useState(false);

  // Load accounts from all available workspaces.
  // The finance store now preserves accounts from different workspaces.
  useEffect(() => {
    workspaces.forEach((workspace) => {
      void fetchAccounts(workspace.id);
    });
  }, [workspaces, fetchAccounts]);

  // Load categories.
  useEffect(() => {
    if (categories.length === 0 && !categoriesLoading) {
      void fetchCategories();
    }
  }, [categories.length, categoriesLoading, fetchCategories]);

  // Initialize transfer workspaces from the active workspace.
  useEffect(() => {
    if (!activeWorkspaceId) return;

    setFromWorkspaceId((current) => current || activeWorkspaceId);
    setToWorkspaceId((current) => current || activeWorkspaceId);
  }, [activeWorkspaceId]);

  // Selected workspaces.
  const fromWorkspace = workspaces.find((item) => item.id === fromWorkspaceId);

  const toWorkspace = workspaces.find((item) => item.id === toWorkspaceId);

  // Available categories.
  const availableCategories = useMemo(() => {
    if (type === "transfer") return [];

    return categories.filter(
      (category) => category.type === type && !category.isArchived,
    );
  }, [categories, type]);

  const selectedCategory = availableCategories.find(
    (category) => category.id === categoryId,
  );

  // Source accounts.
  // Income and expenses use the active workspace.
  // Transfers use the selected source workspace.
  const sourceAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.workspaceId ===
          (type === "transfer" ? fromWorkspaceId : activeWorkspaceId),
      ),
    [accounts, type, fromWorkspaceId, activeWorkspaceId],
  );

  // Destination accounts for transfers.
  const destinationAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.workspaceId === toWorkspaceId && account.id !== accountId,
      ),
    [accounts, toWorkspaceId, accountId],
  );

  const selectedAccount = sourceAccounts.find(
    (account) => account.id === accountId,
  );

  const selectedDestinationAccount = destinationAccounts.find(
    (account) => account.id === destinationAccountId,
  );

  // Currency for each side of a transfer.
  const fromCurrency =
    selectedAccount?.currency ?? fromWorkspace?.currency_code ?? "MYR";

  const toCurrency =
    selectedDestinationAccount?.currency ?? toWorkspace?.currency_code ?? "MYR";

  // Options for the selection sheets.
  const accountOptions: SheetOption[] = sourceAccounts.map((account) => ({
    id: account.id,
    label: account.name,
    description: `${formatAccountType(account.type)} · ${account.currency}`,
    leading: <AccountAvatar account={account} />,
  }));

  const destinationOptions: SheetOption[] = destinationAccounts.map(
    (account) => ({
      id: account.id,
      label: account.name,
      description: `${formatAccountType(account.type)} · ${account.currency}`,
      leading: <AccountAvatar account={account} />,
    }),
  );

  const categoryOptions: SheetOption[] = availableCategories.map(
    (category) => ({
      id: category.id,
      label: category.name,
      description: category.isDefault ? "Default category" : "Custom category",
      leading: <LetterAvatar text={category.name} />,
    }),
  );

  const workspaceOptions: SheetOption[] = workspaces.map((workspace) => ({
    id: workspace.id,
    label: workspace.name,
    description: `${workspace.country_code} · ${workspace.currency_code}`,
    leading: <WorkspaceAvatar countryCode={workspace.country_code} />,
  }));

  // Normal transaction amount.
  const parsedAmount = parseAmountToMinor(amount, currency);

  // Transfer amount sent.
  const parsedAmountSent = parseAmountToMinor(amountSent, fromCurrency);

  // Manual exchange rate.
  const parsedExchangeRate = Number(exchangeRate);

  const isValidExchangeRate =
    Number.isFinite(parsedExchangeRate) && parsedExchangeRate > 0;

  // Calculate the received amount when using a manual exchange rate.
  const calculatedReceivedMinor = useMemo(() => {
    if (
      !selectedAccount ||
      !selectedDestinationAccount ||
      parsedAmountSent === null ||
      !isValidExchangeRate
    ) {
      return null;
    }

    return calculateReceivedMinor(
      parsedAmountSent,
      fromCurrency,
      toCurrency,
      parsedExchangeRate,
    );
  }, [
    selectedAccount,
    selectedDestinationAccount,
    parsedAmountSent,
    isValidExchangeRate,
    parsedExchangeRate,
    fromCurrency,
    toCurrency,
  ]);

  // Actual received amount is entered by the user.
  const parsedActualReceived =
    selectedDestinationAccount && rateMode === "actual"
      ? parseAmountToMinor(amountReceived, toCurrency)
      : null;

  // Final amount received, depending on the selected mode.
  const finalAmountReceived =
    rateMode === "manual" ? calculatedReceivedMinor : parsedActualReceived;

  // Effective exchange rate based on the final amounts.
  const effectiveExchangeRate =
    parsedAmountSent !== null && finalAmountReceived !== null
      ? calculateEffectiveRate(
          parsedAmountSent,
          finalAmountReceived,
          fromCurrency,
          toCurrency,
        )
      : null;

  const handleTypeChange = (nextType: NewTransactionType) => {
    setType(nextType);

    // Reset fields that are specific to the previous transaction type.
    setCategoryId("");
    setAccountId("");
    setDestinationAccountId("");

    setAmount("");
    setAmountSent("");
    setAmountReceived("");
    setExchangeRate("");

    if (nextType === "transfer" && activeWorkspaceId) {
      setFromWorkspaceId(activeWorkspaceId);
      setToWorkspaceId(activeWorkspaceId);
    }
  };

  const handleRateModeChange = (nextMode: TransferRateMode) => {
    setRateMode(nextMode);

    setAmountReceived("");
    setExchangeRate("");
  };

  const handleSave = async () => {
    if (type !== "transfer") {
      if (!activeWorkspaceId || !activeWorkspace) {
        Alert.alert("No active workspace", "Please select a workspace first.");
        return;
      }

      if (!selectedAccount) {
        Alert.alert("Account required", "Please select an account.");
        return;
      }

      if (!categoryId) {
        Alert.alert("Category required", "Please select a category.");
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

        await addTransaction({
          workspaceId: activeWorkspaceId,
          accountId,
          type,
          categoryId,
          amountMinor: parsedAmount,
          description: description.trim() || null,
          date,
        });

        Alert.alert("Transaction added", "Your transaction has been saved.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } catch (error) {
        console.error("Failed to create transaction:", error);

        Alert.alert(
          "Unable to add transaction",
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    // Transfer validation.
    if (!fromWorkspace || !toWorkspace) {
      Alert.alert(
        "Workspace required",
        "Please select both source and destination workspaces.",
      );
      return;
    }

    if (!selectedAccount) {
      Alert.alert(
        "Source account required",
        "Please select the account to transfer money from.",
      );
      return;
    }

    if (!selectedDestinationAccount) {
      Alert.alert(
        "Destination account required",
        "Please select the account to transfer money to.",
      );
      return;
    }

    if (selectedAccount.id === selectedDestinationAccount.id) {
      Alert.alert(
        "Invalid transfer",
        "The source and destination accounts must be different.",
      );
      return;
    }

    if (
      selectedAccount.workspaceId !== fromWorkspaceId ||
      selectedDestinationAccount.workspaceId !== toWorkspaceId
    ) {
      Alert.alert(
        "Invalid account selection",
        "Please select accounts belonging to the selected workspaces.",
      );
      return;
    }

    if (parsedAmountSent === null) {
      Alert.alert(
        "Invalid amount",
        `Please enter a valid amount in ${fromCurrency}.`,
      );
      return;
    }

    if (finalAmountReceived === null || finalAmountReceived <= 0) {
      Alert.alert(
        "Invalid received amount",
        rateMode === "manual"
          ? "Please enter a valid exchange rate."
          : `Please enter the amount received in ${toCurrency}.`,
      );
      return;
    }

    if (effectiveExchangeRate === null) {
      Alert.alert(
        "Invalid exchange rate",
        "Unable to calculate the effective exchange rate.",
      );
      return;
    }

    if (!isValidDate(date)) {
      Alert.alert("Invalid date", "Please enter a valid date.");
      return;
    }

    try {
      setSaving(true);

      await addTransfer({
        fromWorkspaceId,
        fromAccountId: selectedAccount.id,

        toWorkspaceId,
        toAccountId: selectedDestinationAccount.id,

        amountSentMinor: parsedAmountSent,
        amountReceivedMinor: finalAmountReceived,

        // Persist the effective rate based on the actual amounts.
        exchangeRate: effectiveExchangeRate,

        exchangeRateSource: rateMode,

        description: description.trim() || null,
        transferDate: date,
      });

      Alert.alert("Transfer added", "Your transfer has been saved.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Failed to create transfer:", error);

      Alert.alert(
        "Unable to create transfer",
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    type === "transfer"
      ? Boolean(fromWorkspace && toWorkspace)
      : Boolean(activeWorkspace);

  const isTransfer = type === "transfer";
  const saveDisabled = saving || !canSave;

  const saveLabel = saving
    ? isTransfer
      ? "Saving transfer..."
      : "Saving transaction..."
    : type === "transfer"
      ? "Add transfer"
      : type === "income"
        ? "Add income"
        : "Add expense";

  const showNoSourceAccounts = sourceAccounts.length === 0 && !accountsLoading;
  const showNoDestinationAccounts =
    destinationAccounts.length === 0 && !accountsLoading;
  const showNoCategories =
    availableCategories.length === 0 && !categoriesLoading;

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Transaction type ------------------------------------------------ */}
          <SegmentedControl
            options={typeSegments}
            value={type}
            onChange={handleTypeChange}
          />

          {isTransfer ? (
            <>
              {/* 2. From ------------------------------------------------------- */}
              <View style={styles.group}>
                <SectionHeader
                  title="From"
                  icon={<ArrowUpRight size={14} color={colors.danger} />}
                  iconBackground={colors.dangerLight}
                />

                <View style={styles.card}>
                  <SelectRow
                    context="From"
                    label="Workspace"
                    value={fromWorkspace?.name}
                    placeholder="Select source workspace"
                    hint={fromWorkspace?.currency_code ?? "Choose a workspace"}
                    leading={
                      <WorkspaceAvatar
                        countryCode={fromWorkspace?.country_code}
                      />
                    }
                    onPress={() => setFromWorkspaceModalVisible(true)}
                  />

                  <View style={styles.divider} />

                  <SelectRow
                    context="From"
                    label="Account"
                    value={selectedAccount?.name}
                    placeholder="Select an account"
                    hint={
                      selectedAccount
                        ? `${formatAccountType(selectedAccount.type)} · ${selectedAccount.currency}`
                        : "Choose where the money comes from"
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
                </View>

                {showNoSourceAccounts && (
                  <InlineNotice text="No accounts available in this workspace. Please create an account first." />
                )}
              </View>

              {/* 3. To --------------------------------------------------------- */}
              <View style={styles.group}>
                <SectionHeader
                  title="To"
                  icon={<ArrowDownLeft size={14} color={colors.success} />}
                  iconBackground={colors.successLight}
                />

                <View style={styles.card}>
                  <SelectRow
                    context="To"
                    label="Workspace"
                    value={toWorkspace?.name}
                    placeholder="Select destination workspace"
                    hint={toWorkspace?.currency_code ?? "Choose a workspace"}
                    leading={
                      <WorkspaceAvatar
                        countryCode={toWorkspace?.country_code}
                      />
                    }
                    onPress={() => setToWorkspaceModalVisible(true)}
                  />

                  <View style={styles.divider} />

                  <SelectRow
                    context="To"
                    label="Account"
                    value={selectedDestinationAccount?.name}
                    placeholder="Select destination account"
                    hint={
                      selectedDestinationAccount
                        ? `${formatAccountType(selectedDestinationAccount.type)} · ${selectedDestinationAccount.currency}`
                        : "Choose where the money goes"
                    }
                    leading={
                      selectedDestinationAccount ? (
                        <AccountAvatar account={selectedDestinationAccount} />
                      ) : (
                        <IconTile>
                          <Wallet size={20} color={colors.primary} />
                        </IconTile>
                      )
                    }
                    onPress={() => setDestinationModalVisible(true)}
                  />
                </View>

                {showNoDestinationAccounts && (
                  <InlineNotice text="No destination accounts available in this workspace." />
                )}
              </View>

              {/* 4. Amount sent ------------------------------------------------ */}
              <FormCard title="Amount sent" currency={fromCurrency}>
                <AmountInput
                  value={amountSent}
                  currency={fromCurrency}
                  onChangeText={setAmountSent}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.amountInput}
                />

                <Text style={styles.helperText}>
                  {parsedAmountSent !== null
                    ? `Preview: ${formatMoney(parsedAmountSent, fromCurrency)}`
                    : `Enter the amount to send in ${fromCurrency}.`}
                </Text>
              </FormCard>

              {/* 5. Exchange rate ---------------------------------------------- */}
              <FormCard title="Exchange rate">
                <SegmentedControl
                  options={rateModeSegments}
                  value={rateMode}
                  onChange={handleRateModeChange}
                />

                {rateMode === "manual" ? (
                  <>
                    <Text style={styles.helperText}>
                      {`Enter how much ${toCurrency} you receive for 1 ${fromCurrency}.`}
                    </Text>

                    <TextInput
                      value={exchangeRate}
                      onChangeText={(value) => {
                        if (/^\d*\.?\d{0,10}$/.test(value)) {
                          setExchangeRate(value);
                        }
                      }}
                      placeholder="e.g. 3900"
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.input, styles.inputOnCard]}
                      keyboardType="decimal-pad"
                    />

                    {isValidExchangeRate && (
                      <Text style={styles.helperText}>
                        {`1 ${fromCurrency} = ${parsedExchangeRate.toLocaleString(
                          "en",
                          { maximumFractionDigits: 10 },
                        )} ${toCurrency}`}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.helperText}>
                    Enter the exact amount that will arrive in the destination
                    account. The effective exchange rate will be calculated
                    automatically.
                  </Text>
                )}
              </FormCard>

              {/* 6. Amount received -------------------------------------------- */}
              <FormCard title="Amount received" currency={toCurrency}>
                {rateMode === "manual" ? (
                  <>
                    {calculatedReceivedMinor !== null ? (
                      <Text style={styles.calculatedAmount}>
                        {formatMoney(calculatedReceivedMinor, toCurrency)}
                      </Text>
                    ) : (
                      <Text style={styles.calculatedPlaceholder}>
                        Enter an amount and exchange rate
                      </Text>
                    )}

                    <Text style={styles.helperText}>
                      Calculated from your exchange rate.
                    </Text>
                  </>
                ) : (
                  <>
                    <AmountInput
                      value={amountReceived}
                      currency={toCurrency}
                      onChangeText={setAmountReceived}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.amountInput}
                    />

                    <Text style={styles.helperText}>
                      {parsedActualReceived !== null
                        ? `Preview: ${formatMoney(parsedActualReceived, toCurrency)}`
                        : `Enter the actual received amount in ${toCurrency}.`}
                    </Text>
                  </>
                )}
              </FormCard>

              {/* 7. Effective rate --------------------------------------------- */}
              {effectiveExchangeRate !== null && (
                <View style={styles.rateBanner}>
                  <Text style={styles.rateBannerTitle}>
                    Effective exchange rate
                  </Text>

                  <Text style={styles.rateBannerValue}>
                    {`1 ${fromCurrency} = ${effectiveExchangeRate.toLocaleString(
                      "en",
                      { maximumFractionDigits: 10 },
                    )} ${toCurrency}`}
                  </Text>

                  <Text style={styles.rateBannerHelper}>
                    Based on the actual sent and received amounts.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* 2. Amount first: the main thing the user came to enter --------- */}
              <FormCard title="Amount" currency={currency}>
                <AmountInput
                  value={amount}
                  currency={currency}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.amountInput}
                />

                <Text style={styles.helperText}>
                  {parsedAmount !== null
                    ? `Preview: ${formatMoney(parsedAmount, currency)}`
                    : `Enter the amount in ${currency}.`}
                </Text>

                <View style={styles.divider} />

                <View style={styles.noteRow}>
                  <Info size={14} color={colors.textSecondary} />
                  <Text style={styles.helperText}>
                    This transaction uses your workspace currency.
                  </Text>
                </View>
              </FormCard>

              {/* 3. Details ---------------------------------------------------- */}
              <View style={styles.group}>
                <SectionHeader title="Details" />

                <View style={styles.card}>
                  <SelectRow
                    label="Account"
                    value={selectedAccount?.name}
                    placeholder="Select an account"
                    hint={
                      selectedAccount
                        ? `${formatAccountType(selectedAccount.type)} · ${selectedAccount.currency}`
                        : "Choose where the money comes from"
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
                        ? selectedCategory.isDefault
                          ? "Default category"
                          : "Custom category"
                        : `Choose an ${type} category`
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

                {showNoSourceAccounts && (
                  <InlineNotice text="No accounts available in this workspace. Please create an account first." />
                )}

                {showNoCategories && (
                  <InlineNotice text="No categories available for this transaction type." />
                )}
              </View>
            </>
          )}

          {/* Date ------------------------------------------------------------- */}
          <DatePickerField label="Date" value={date} onChange={setDate} />

          {/* Description ------------------------------------------------------ */}
          <View style={styles.group}>
            <SectionHeader title="Description" />

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={
                isTransfer
                  ? "e.g. Monthly savings transfer"
                  : "e.g. Lunch with friends"
              }
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

        {/* Save: always visible, outside the scroll area -------------------------- */}
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

            <Text style={styles.saveButtonText}>{saveLabel}</Text>
          </Pressable>
        </View>
      </View>

      {/* Selection sheets ------------------------------------------------------- */}
      <OptionSheet
        visible={fromWorkspaceModalVisible}
        onClose={() => setFromWorkspaceModalVisible(false)}
        title="From workspace"
        subtitle="Choose where the money comes from."
        options={workspaceOptions}
        selectedId={fromWorkspaceId}
        emptyText="No workspaces available."
        onSelect={(id) => {
          setFromWorkspaceId(id);
          setAccountId("");
          setFromWorkspaceModalVisible(false);
        }}
      />

      <OptionSheet
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        title={isTransfer ? "From account" : "Select account"}
        subtitle="Choose the account for this transaction."
        options={accountOptions}
        selectedId={accountId}
        emptyText={
          accountsLoading
            ? "Loading accounts..."
            : "No accounts available in this workspace."
        }
        onSelect={(id) => {
          setAccountId(id);
          setAccountModalVisible(false);
        }}
      />

      <OptionSheet
        visible={toWorkspaceModalVisible}
        onClose={() => setToWorkspaceModalVisible(false)}
        title="To workspace"
        subtitle="Choose where the money goes."
        options={workspaceOptions}
        selectedId={toWorkspaceId}
        emptyText="No workspaces available."
        onSelect={(id) => {
          setToWorkspaceId(id);
          setDestinationAccountId("");
          setToWorkspaceModalVisible(false);
        }}
      />

      <OptionSheet
        visible={destinationModalVisible}
        onClose={() => setDestinationModalVisible(false)}
        title="To account"
        subtitle="Choose the account to transfer money to."
        options={destinationOptions}
        selectedId={destinationAccountId}
        emptyText={
          accountsLoading
            ? "Loading accounts..."
            : "No destination accounts available in this workspace."
        }
        onSelect={(id) => {
          setDestinationAccountId(id);
          setDestinationModalVisible(false);
        }}
      />

      <OptionSheet
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title="Select category"
        subtitle="Choose a category for this transaction."
        options={categoryOptions}
        selectedId={categoryId}
        emptyText="No categories available for this transaction type."
        onSelect={(id) => {
          setCategoryId(id);
          setCategoryModalVisible(false);
        }}
      />
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* Segment configuration                                                       */
/* -------------------------------------------------------------------------- */

const typeMeta: Record<
  NewTransactionType,
  { icon: LucideIcon; color: string; background: string }
> = {
  expense: {
    icon: ArrowUpRight,
    color: colors.danger,
    background: colors.dangerLight,
  },
  income: {
    icon: ArrowDownLeft,
    color: colors.success,
    background: colors.successLight,
  },
  transfer: {
    icon: ArrowLeftRight,
    color: colors.primary,
    background: colors.primaryLight,
  },
};

const typeSegments: SegmentOption<NewTransactionType>[] =
  transactionTypeOptions.map((option) => ({
    ...option,
    ...typeMeta[option.value],
  }));

const rateModeSegments: SegmentOption<TransferRateMode>[] = [
  { label: "Manual rate", value: "manual" },
  { label: "Actual received", value: "actual" },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatAccountType(type: string): string {
  if (type === "e-wallet") return "E-wallet";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* (move into /components/transactions/* when you're happy with the layout)    */
/* -------------------------------------------------------------------------- */

type SheetOption = {
  id: string;
  label: string;
  description?: string;
  leading?: ReactNode;
};

type SegmentOption<T extends string> = {
  label: string;
  value: T;
  icon?: LucideIcon;
  color?: string;
  background?: string;
};

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected
          ? (option.color ?? colors.primary)
          : colors.textSecondary;
        const Icon = option.icon;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              selected && {
                backgroundColor: option.background ?? colors.primaryLight,
              },
            ]}
          >
            {Icon ? <Icon size={16} color={color} /> : null}

            <Text
              style={[
                styles.segmentText,
                selected && styles.segmentTextSelected,
                { color },
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

function SectionHeader({
  title,
  icon,
  iconBackground,
}: {
  title: string;
  icon?: ReactNode;
  iconBackground?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon ? (
        <View style={[styles.sectionIcon, { backgroundColor: iconBackground }]}>
          {icon}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
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

function IconTile({
  children,
  background = colors.primaryLight,
}: {
  children: ReactNode;
  background?: string;
}) {
  return (
    <View style={[styles.iconTile, { backgroundColor: background }]}>
      {children}
    </View>
  );
}

function LetterAvatar({ text }: { text: string }) {
  return (
    <IconTile>
      <Text style={styles.letter}>{text.charAt(0).toUpperCase()}</Text>
    </IconTile>
  );
}

function WorkspaceAvatar({ countryCode }: { countryCode?: string | null }) {
  const flag = countryCode ? getCountryByCode(countryCode)?.flag : undefined;

  return (
    <IconTile background={colors.background}>
      {flag ? (
        <Text style={styles.flag}>{flag}</Text>
      ) : (
        <Globe size={20} color={colors.primary} />
      )}
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
  context,
  label,
  value,
  placeholder,
  hint,
  leading,
  onPress,
}: {
  context?: string; // read out by screen readers only ("From" + "Account")
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
      accessibilityLabel={`${context ? `${context} ` : ""}${label}: ${
        value ?? placeholder
      }`}
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

// One sheet for all five pickers (the old screen repeated this block five times).
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
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },

  group: {
    gap: spacing.sm,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },

  segmentText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  segmentTextSelected: {
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

  calculatedAmount: {
    color: colors.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },

  calculatedPlaceholder: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
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

  inputOnCard: {
    backgroundColor: colors.background,
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
    alignItems: "center",
    justifyContent: "center",
  },

  flag: {
    fontSize: 20,
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

  /* Effective rate banner */
  rateBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },

  rateBannerTitle: {
    color: colors.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },

  rateBannerValue: {
    color: colors.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  rateBannerHelper: {
    color: colors.primary,
    fontSize: typography.size.caption,
    opacity: 0.8,
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
});
