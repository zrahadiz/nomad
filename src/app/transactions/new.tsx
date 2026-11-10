import { useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
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

import { SafeScreen } from "@/components/layout/safe-screen";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { colors, radius, spacing } from "@/constants/theme";
import { useCategoryStore } from "@/stores/use-category-store";
import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { financialCategory } from "@/types/finances";

type NewTransactionType = "expense" | "income" | "transfer";
type TransferRateMode = "manual" | "actual";

type SelectionOption = {
  id: string;
  label: string;
  description?: string;
  icon?: string | null;
};

const transactionTypeOptions: {
  label: string;
  value: NewTransactionType;
}[] = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Transfer", value: "transfer" },
];

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
  const fromDecimals = getCurrencyDecimals(fromCurrency);
  const toDecimals = getCurrencyDecimals(toCurrency);

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
  const fromDecimals = getCurrencyDecimals(fromCurrency);
  const toDecimals = getCurrencyDecimals(toCurrency);

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

  // Selection options.
  const accountOptions: SelectionOption[] = sourceAccounts.map((account) => ({
    id: account.id,
    label: account.name,
    description: `${account.type} · ${account.currency}`,
    icon: account.name.charAt(0).toUpperCase(),
  }));

  const destinationOptions: SelectionOption[] = destinationAccounts.map(
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
      description: category.isDefault ? "Default category" : "Custom category",
      icon: category.icon,
    }),
  );

  const workspaceOptions: SelectionOption[] = workspaces.map((workspace) => ({
    id: workspace.id,
    label: workspace.name,
    description: `${workspace.country_code} · ${workspace.currency_code}`,
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

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Transaction Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction type</Text>

          <View style={styles.typeContainer}>
            {transactionTypeOptions.map((option) => {
              const selected = type === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleTypeChange(option.value)}
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

        {/* Source Workspace */}
        {type === "transfer" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>From workspace</Text>

            <Pressable
              onPress={() => setFromWorkspaceModalVisible(true)}
              style={styles.selectionButton}
            >
              <View style={styles.selectionDetails}>
                <Text style={styles.selectionValue}>
                  {fromWorkspace?.name ?? "Select source workspace"}
                </Text>

                <Text style={styles.selectionDescription}>
                  {fromWorkspace?.currency_code ?? "Choose a workspace"}
                </Text>
              </View>

              <Text style={styles.selectionArrow}>›</Text>
            </Pressable>
          </View>
        )}

        {/* Source Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {type === "transfer" ? "From account" : "Account"}
          </Text>

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
                  : "Choose where the money comes from"}
              </Text>
            </View>

            <Text style={styles.selectionArrow}>›</Text>
          </Pressable>

          {sourceAccounts.length === 0 && !accountsLoading && (
            <Text style={styles.helperText}>
              No accounts available in this workspace. Please create an account
              first.
            </Text>
          )}
        </View>

        {/* Destination Workspace */}
        {type === "transfer" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To workspace</Text>

            <Pressable
              onPress={() => setToWorkspaceModalVisible(true)}
              style={styles.selectionButton}
            >
              <View style={styles.selectionDetails}>
                <Text style={styles.selectionValue}>
                  {toWorkspace?.name ?? "Select destination workspace"}
                </Text>

                <Text style={styles.selectionDescription}>
                  {toWorkspace?.currency_code ?? "Choose a workspace"}
                </Text>
              </View>

              <Text style={styles.selectionArrow}>›</Text>
            </Pressable>
          </View>
        )}

        {/* Destination Account */}
        {type === "transfer" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To account</Text>

            <Pressable
              onPress={() => setDestinationModalVisible(true)}
              style={styles.selectionButton}
            >
              <View style={styles.selectionDetails}>
                <Text style={styles.selectionValue}>
                  {selectedDestinationAccount?.name ??
                    "Select destination account"}
                </Text>

                <Text style={styles.selectionDescription}>
                  {selectedDestinationAccount
                    ? `${selectedDestinationAccount.type} · ${selectedDestinationAccount.currency}`
                    : "Choose where the money goes"}
                </Text>
              </View>

              <Text style={styles.selectionArrow}>›</Text>
            </Pressable>

            {destinationAccounts.length === 0 && !accountsLoading && (
              <Text style={styles.helperText}>
                No destination accounts available in this workspace.
              </Text>
            )}
          </View>
        )}

        {/* Category */}
        {type !== "transfer" && (
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
                    ? selectedCategory.isDefault
                      ? "Default category"
                      : "Custom category"
                    : `Choose an ${type} category`}
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
        )}

        {/* Normal Transaction Amount */}
        {type !== "transfer" && (
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
        )}

        {/* Transfer Amounts */}
        {type === "transfer" && (
          <>
            {/* Amount Sent */}
            <View style={styles.section}>
              <View style={styles.balanceHeader}>
                <Text style={styles.sectionTitle}>Amount sent</Text>
                <Text style={styles.currencyLabel}>{fromCurrency}</Text>
              </View>

              <TextInput
                value={amountSent}
                onChangeText={(value) => {
                  const cleaned = sanitizeAmountInput(value, fromCurrency);

                  if (cleaned !== null) {
                    setAmountSent(cleaned);
                  }
                }}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                style={styles.amountInput}
                keyboardType="decimal-pad"
              />

              <Text style={styles.helperText}>
                {parsedAmountSent !== null
                  ? `Preview: ${formatCurrency(parsedAmountSent, fromCurrency)}`
                  : `Enter the amount to send in ${fromCurrency}.`}
              </Text>
            </View>

            {/* Exchange Rate Mode */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exchange rate</Text>

              <View style={styles.rateModeContainer}>
                <Pressable
                  onPress={() => handleRateModeChange("manual")}
                  style={[
                    styles.rateModeOption,
                    rateMode === "manual" && styles.selectedRateModeOption,
                  ]}
                >
                  <Text
                    style={[
                      styles.rateModeText,
                      rateMode === "manual" && styles.selectedRateModeText,
                    ]}
                  >
                    Manual rate
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleRateModeChange("actual")}
                  style={[
                    styles.rateModeOption,
                    rateMode === "actual" && styles.selectedRateModeOption,
                  ]}
                >
                  <Text
                    style={[
                      styles.rateModeText,
                      rateMode === "actual" && styles.selectedRateModeText,
                    ]}
                  >
                    Actual received
                  </Text>
                </Pressable>
              </View>

              {rateMode === "manual" ? (
                <>
                  <Text style={styles.helperText}>
                    Enter how much {toCurrency} you receive for 1 {fromCurrency}
                    .
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
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                  />

                  {isValidExchangeRate && (
                    <Text style={styles.helperText}>
                      1 {fromCurrency} ={" "}
                      {parsedExchangeRate.toLocaleString("en", {
                        maximumFractionDigits: 10,
                      })}{" "}
                      {toCurrency}
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
            </View>

            {/* Amount Received */}
            <View style={styles.section}>
              <View style={styles.balanceHeader}>
                <Text style={styles.sectionTitle}>Amount received</Text>
                <Text style={styles.currencyLabel}>{toCurrency}</Text>
              </View>

              {rateMode === "manual" ? (
                <View style={styles.calculatedAmountContainer}>
                  <Text style={styles.calculatedAmount}>
                    {calculatedReceivedMinor !== null
                      ? formatCurrency(calculatedReceivedMinor, toCurrency)
                      : "Enter an amount and exchange rate"}
                  </Text>
                  <Text style={styles.helperText}>
                    Calculated from your exchange rate.
                  </Text>
                </View>
              ) : (
                <>
                  <TextInput
                    value={amountReceived}
                    onChangeText={(value) => {
                      const cleaned = sanitizeAmountInput(value, toCurrency);

                      if (cleaned !== null) {
                        setAmountReceived(cleaned);
                      }
                    }}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.amountInput}
                    keyboardType="decimal-pad"
                  />

                  <Text style={styles.helperText}>
                    {parsedActualReceived !== null
                      ? `Preview: ${formatCurrency(parsedActualReceived, toCurrency)}`
                      : `Enter the actual received amount in ${toCurrency}.`}
                  </Text>
                </>
              )}
            </View>

            {/* Effective Exchange Rate Preview */}
            {effectiveExchangeRate !== null && (
              <View style={styles.currencyInfo}>
                <View style={styles.currencyInfoText}>
                  <Text style={styles.currencyInfoTitle}>
                    Effective exchange rate
                  </Text>
                  <Text style={styles.helperText}>
                    Based on the actual sent and received amounts.
                  </Text>
                </View>

                <Text style={styles.currencyCode}>
                  {effectiveExchangeRate.toLocaleString("en", {
                    maximumFractionDigits: 10,
                  })}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Date */}
        <DatePickerField label="Date" value={date} onChange={setDate} />

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={
              type === "transfer"
                ? "e.g. Monthly savings transfer"
                : "e.g. Lunch with friends"
            }
            placeholderTextColor={colors.textSecondary}
            style={[styles.textInput, styles.descriptionInput]}
            maxLength={150}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.helperText}>Optional, up to 150 characters.</Text>
        </View>

        {/* Currency Information */}
        {type !== "transfer" && (
          <View style={styles.currencyInfo}>
            <View style={styles.currencyInfoText}>
              <Text style={styles.currencyInfoTitle}>Transaction currency</Text>
              <Text style={styles.helperText}>
                This transaction uses your workspace currency.
              </Text>
            </View>

            <Text style={styles.currencyCode}>{currency}</Text>
          </View>
        )}

        {/* Save */}
        <Pressable
          onPress={handleSave}
          disabled={saving || !canSave}
          style={[
            styles.saveButton,
            (saving || !canSave) && styles.disabledButton,
          ]}
        >
          <Plus size={20} color="#FFFFFF" />

          <Text style={styles.saveButtonText}>
            {saving
              ? type === "transfer"
                ? "Saving transfer..."
                : "Saving transaction..."
              : type === "transfer"
                ? "Add Transfer"
                : "Add Transaction"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>

      {/* Source Workspace Modal */}
      <BottomSheetModal
        visible={fromWorkspaceModalVisible}
        onClose={() => setFromWorkspaceModalVisible(false)}
        title="From workspace"
        subtitle="Choose where the money comes from."
      >
        {workspaceOptions.length === 0 ? (
          <Text style={styles.emptyOptions}>No workspaces available.</Text>
        ) : (
          workspaceOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => {
                setFromWorkspaceId(option.id);
                setAccountId("");
                setFromWorkspaceModalVisible(false);
              }}
              style={styles.modalOption}
            >
              <View style={styles.selectionDetails}>
                <Text style={styles.modalOptionLabel}>{option.label}</Text>
                <Text style={styles.modalOptionDescription}>
                  {option.description}
                </Text>
              </View>

              {fromWorkspaceId === option.id && (
                <Check size={19} color={colors.primary} />
              )}
            </Pressable>
          ))
        )}
      </BottomSheetModal>

      {/* Source Account Modal */}
      <BottomSheetModal
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        title={type === "transfer" ? "From account" : "Select account"}
        subtitle="Choose the account for this transaction."
      >
        {accountOptions.length === 0 ? (
          <Text style={styles.emptyOptions}>
            {accountsLoading
              ? "Loading accounts..."
              : "No accounts available in this workspace."}
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

      {/* Destination Workspace Modal */}
      <BottomSheetModal
        visible={toWorkspaceModalVisible}
        onClose={() => setToWorkspaceModalVisible(false)}
        title="To workspace"
        subtitle="Choose where the money goes."
      >
        {workspaceOptions.length === 0 ? (
          <Text style={styles.emptyOptions}>No workspaces available.</Text>
        ) : (
          workspaceOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => {
                setToWorkspaceId(option.id);
                setDestinationAccountId("");
                setToWorkspaceModalVisible(false);
              }}
              style={styles.modalOption}
            >
              <View style={styles.selectionDetails}>
                <Text style={styles.modalOptionLabel}>{option.label}</Text>
                <Text style={styles.modalOptionDescription}>
                  {option.description}
                </Text>
              </View>

              {toWorkspaceId === option.id && (
                <Check size={19} color={colors.primary} />
              )}
            </Pressable>
          ))
        )}
      </BottomSheetModal>

      {/* Destination Account Modal */}
      <BottomSheetModal
        visible={destinationModalVisible}
        onClose={() => setDestinationModalVisible(false)}
        title="To account"
        subtitle="Choose the account to transfer money to."
      >
        {destinationOptions.length === 0 ? (
          <Text style={styles.emptyOptions}>
            {accountsLoading
              ? "Loading accounts..."
              : "No destination accounts available in this workspace."}
          </Text>
        ) : (
          destinationOptions.map((option) => {
            const selected = option.id === destinationAccountId;

            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setDestinationAccountId(option.id);
                  setDestinationModalVisible(false);
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

      {/* Category Modal */}
      <BottomSheetModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title="Select category"
        subtitle="Choose a category for this transaction."
      >
        {categoryOptions.length === 0 ? (
          <Text style={styles.emptyOptions}>
            No categories available for this transaction type.
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

  section: {
    gap: spacing.md,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },

  typeContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  typeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
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

  rateModeContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  rateModeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  selectedRateModeOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  rateModeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  selectedRateModeText: {
    color: colors.primary,
    fontWeight: "600",
  },

  calculatedAmountContainer: {
    minHeight: 64,
    justifyContent: "center",
    gap: 4,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  calculatedAmount: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
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
});
