import { useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Info,
  Plus,
  type LucideIcon,
} from "lucide-react-native";
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

import { formatMoney } from "@/lib/finance/calculations";
import { getCurrencyDecimalDigits, toMinorUnits } from "@/lib/finance/currency";
import { isValidCurrencyAmountInput } from "@/lib/finance/currency-input";

import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";
import { AppIcon } from "@/components/ui/app-icon";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { DatePickerField } from "@/components/ui/date-picker-field";

import { getCountryByCode } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useCategoryStore } from "@/stores/use-category-store";
import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

type NewTransactionType = "expense" | "income" | "transfer";
type TransferRateMode = "manual" | "actual";

const transactionTypeOptions: {
  labelKey: string;
  value: NewTransactionType;
}[] = [
  {
    labelKey: "transactions.add.type.expense",
    value: "expense",
  },
  {
    labelKey: "transactions.add.type.income",
    value: "income",
  },
  {
    labelKey: "transactions.add.type.transfer",
    value: "transfer",
  },
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
  const { t } = useTranslation();

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
  // The finance store preserves accounts from different workspaces.
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

  // Translate account types using the existing Home translations.
  const formatAccountType = (accountType: string) => {
    const accountTypeKey = accountType === "e-wallet" ? "eWallet" : accountType;

    return t(`home.accountTypes.${accountTypeKey}`, {
      defaultValue: accountType,
    });
  };

  // Options for the selection sheets.
  const accountOptions: SheetOption[] = sourceAccounts.map((account) => ({
    id: account.id,
    label: account.name,
    description: `${formatAccountType(account.type)} · ${account.currency}`,
    leading: (
      <AppIcon
        name={account.icon ?? "wallet"}
        color={account.color ?? colors.primary}
        size={40}
        iconSize={20}
      />
    ),
  }));

  const destinationOptions: SheetOption[] = destinationAccounts.map(
    (account) => ({
      id: account.id,
      label: account.name,
      description: `${formatAccountType(account.type)} · ${account.currency}`,
      leading: (
        <AppIcon
          name={account.icon ?? "wallet"}
          color={account.color ?? colors.primary}
          size={40}
          iconSize={20}
        />
      ),
    }),
  );

  const categoryOptions: SheetOption[] = availableCategories.map(
    ({ id, name, icon, isDefault }) => ({
      id,
      label: name,
      description: t(
        isDefault
          ? "transactions.add.defaultCategory"
          : "transactions.add.customCategory",
      ),
      leading: (
        <AppIcon
          name={icon ?? "ellipsis"}
          color={colors.primary}
          size={40}
          iconSize={20}
          shape="circle"
        />
      ),
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

  // Translated segmented control options.
  const typeSegments: SegmentOption<NewTransactionType>[] =
    transactionTypeOptions.map((option) => ({
      label: t(option.labelKey),
      value: option.value,
      ...typeMeta[option.value],
    }));

  const rateModeSegments: SegmentOption<TransferRateMode>[] = [
    {
      label: t("transactions.add.rateMode.manual"),
      value: "manual",
    },
    {
      label: t("transactions.add.rateMode.actual"),
      value: "actual",
    },
  ];

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
        Alert.alert(
          t("transactions.add.alerts.noWorkspaceTitle"),
          t("transactions.add.alerts.noWorkspaceMessage"),
        );
        return;
      }

      if (!selectedAccount) {
        Alert.alert(
          t("transactions.add.alerts.accountRequiredTitle"),
          t("transactions.add.alerts.accountRequiredMessage"),
        );
        return;
      }

      if (!categoryId) {
        Alert.alert(
          t("transactions.add.alerts.categoryRequiredTitle"),
          t("transactions.add.alerts.categoryRequiredMessage"),
        );
        return;
      }

      if (parsedAmount === null) {
        Alert.alert(
          t("transactions.add.alerts.invalidAmountTitle"),
          t("transactions.add.alerts.invalidAmountMessage"),
        );
        return;
      }

      if (!isValidDate(date)) {
        Alert.alert(
          t("transactions.add.alerts.invalidDateTitle"),
          t("transactions.add.alerts.invalidDateMessage"),
        );
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

        Alert.alert(
          t("transactions.add.alerts.transactionAddedTitle"),
          t("transactions.add.alerts.transactionAddedMessage"),
          [
            {
              text: t("transactions.add.alerts.ok"),
              onPress: () => router.back(),
            },
          ],
        );
      } catch (error) {
        console.error("Failed to create transaction:", error);

        Alert.alert(
          t("transactions.add.alerts.transactionFailedTitle"),
          error instanceof Error
            ? error.message
            : t("transactions.add.alerts.genericError"),
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    // Transfer validation.
    if (!fromWorkspace || !toWorkspace) {
      Alert.alert(
        t("transactions.add.alerts.workspaceRequiredTitle"),
        t("transactions.add.alerts.workspaceRequiredMessage"),
      );
      return;
    }

    if (!selectedAccount) {
      Alert.alert(
        t("transactions.add.alerts.sourceAccountRequiredTitle"),
        t("transactions.add.alerts.sourceAccountRequiredMessage"),
      );
      return;
    }

    if (!selectedDestinationAccount) {
      Alert.alert(
        t("transactions.add.alerts.destinationAccountRequiredTitle"),
        t("transactions.add.alerts.destinationAccountRequiredMessage"),
      );
      return;
    }

    if (selectedAccount.id === selectedDestinationAccount.id) {
      Alert.alert(
        t("transactions.add.alerts.invalidTransferTitle"),
        t("transactions.add.alerts.invalidTransferMessage"),
      );
      return;
    }

    if (
      selectedAccount.workspaceId !== fromWorkspaceId ||
      selectedDestinationAccount.workspaceId !== toWorkspaceId
    ) {
      Alert.alert(
        t("transactions.add.alerts.invalidAccountTitle"),
        t("transactions.add.alerts.invalidAccountMessage"),
      );
      return;
    }

    if (parsedAmountSent === null) {
      Alert.alert(
        t("transactions.add.alerts.invalidAmountTitle"),
        t("transactions.add.alerts.invalidCurrencyAmountMessage", {
          currency: fromCurrency,
        }),
      );
      return;
    }

    if (finalAmountReceived === null || finalAmountReceived <= 0) {
      Alert.alert(
        t("transactions.add.alerts.invalidReceivedAmountTitle"),
        rateMode === "manual"
          ? t("transactions.add.alerts.invalidExchangeRateMessage")
          : t("transactions.add.alerts.invalidReceivedAmountMessage", {
              currency: toCurrency,
            }),
      );
      return;
    }

    if (effectiveExchangeRate === null) {
      Alert.alert(
        t("transactions.add.alerts.invalidEffectiveRateTitle"),
        t("transactions.add.alerts.invalidEffectiveRateMessage"),
      );
      return;
    }

    if (!isValidDate(date)) {
      Alert.alert(
        t("transactions.add.alerts.invalidDateTitle"),
        t("transactions.add.alerts.invalidDateMessage"),
      );
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

      Alert.alert(
        t("transactions.add.alerts.transferAddedTitle"),
        t("transactions.add.alerts.transferAddedMessage"),
        [
          {
            text: t("transactions.add.alerts.ok"),
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Failed to create transfer:", error);

      Alert.alert(
        t("transactions.add.alerts.transferFailedTitle"),
        error instanceof Error
          ? error.message
          : t("transactions.add.alerts.genericError"),
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
      ? t("transactions.add.savingsTransfer")
      : t("transactions.add.savingTransaction")
    : type === "transfer"
      ? t("transactions.add.saveTransfer")
      : type === "income"
        ? t("transactions.add.saveIncome")
        : t("transactions.add.saveExpense");

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
          {/* Transaction type */}
          <SegmentedControl
            options={typeSegments}
            value={type}
            onChange={handleTypeChange}
          />

          {isTransfer ? (
            <>
              {/* From */}
              <View style={styles.group}>
                <SectionHeader
                  title={t("transactions.add.from")}
                  icon={<ArrowUpRight size={14} color={colors.danger} />}
                  iconBackground={colors.dangerLight}
                />

                <View style={styles.card}>
                  <SelectRow
                    context={t("transactions.add.from")}
                    label={t("transactions.add.workspace")}
                    value={fromWorkspace?.name}
                    placeholder={t("transactions.add.sourceWorkspace")}
                    hint={
                      fromWorkspace?.currency_code ??
                      t("transactions.add.chooseWorkspace")
                    }
                    leading={
                      <WorkspaceAvatar
                        countryCode={fromWorkspace?.country_code}
                      />
                    }
                    onPress={() => setFromWorkspaceModalVisible(true)}
                  />

                  <View style={styles.divider} />

                  <SelectRow
                    context={t("transactions.add.from")}
                    label={t("transactions.add.account")}
                    value={selectedAccount?.name}
                    placeholder={t("transactions.add.selectAccount")}
                    hint={
                      selectedAccount
                        ? `${formatAccountType(selectedAccount.type)} · ${selectedAccount.currency}`
                        : t("transactions.add.chooseSource")
                    }
                    leading={
                      selectedAccount ? (
                        <AppIcon
                          name={selectedAccount.icon ?? "wallet"}
                          color={selectedAccount.color ?? colors.primary}
                          size={40}
                          iconSize={20}
                        />
                      ) : (
                        <AppIcon name="wallet" size={40} iconSize={20} />
                      )
                    }
                    onPress={() => setAccountModalVisible(true)}
                  />
                </View>

                {showNoSourceAccounts && (
                  <InlineNotice text={t("transactions.add.noSourceAccounts")} />
                )}
              </View>

              {/* To */}
              <View style={styles.group}>
                <SectionHeader
                  title={t("transactions.add.to")}
                  icon={<ArrowDownLeft size={14} color={colors.success} />}
                  iconBackground={colors.successLight}
                />

                <View style={styles.card}>
                  <SelectRow
                    context={t("transactions.add.to")}
                    label={t("transactions.add.workspace")}
                    value={toWorkspace?.name}
                    placeholder={t("transactions.add.destinationWorkspace")}
                    hint={
                      toWorkspace?.currency_code ??
                      t("transactions.add.chooseWorkspace")
                    }
                    leading={
                      <WorkspaceAvatar
                        countryCode={toWorkspace?.country_code}
                      />
                    }
                    onPress={() => setToWorkspaceModalVisible(true)}
                  />

                  <View style={styles.divider} />

                  <SelectRow
                    context={t("transactions.add.to")}
                    label={t("transactions.add.account")}
                    value={selectedDestinationAccount?.name}
                    placeholder={t("transactions.add.selectDestinationAccount")}
                    hint={
                      selectedDestinationAccount
                        ? `${formatAccountType(selectedDestinationAccount.type)} · ${selectedDestinationAccount.currency}`
                        : t("transactions.add.chooseDestination")
                    }
                    leading={
                      selectedDestinationAccount ? (
                        <AppIcon
                          name={selectedDestinationAccount.icon ?? "wallet"}
                          color={
                            selectedDestinationAccount.color ?? colors.primary
                          }
                          size={40}
                          iconSize={20}
                        />
                      ) : (
                        <AppIcon name="wallet" size={40} iconSize={20} />
                      )
                    }
                    onPress={() => setDestinationModalVisible(true)}
                  />
                </View>

                {showNoDestinationAccounts && (
                  <InlineNotice
                    text={t("transactions.add.noDestinationAccounts")}
                  />
                )}
              </View>

              {/* Amount sent */}
              <FormCard
                title={t("transactions.add.amountSent")}
                currency={fromCurrency}
              >
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
                    ? t("transactions.add.amountPreview", {
                        amount: formatMoney(parsedAmountSent, fromCurrency),
                      })
                    : t("transactions.add.enterAmountToSend", {
                        currency: fromCurrency,
                      })}
                </Text>
              </FormCard>

              {/* Exchange rate */}
              <FormCard title={t("transactions.add.exchangeRate")}>
                <SegmentedControl
                  options={rateModeSegments}
                  value={rateMode}
                  onChange={handleRateModeChange}
                />

                {rateMode === "manual" ? (
                  <>
                    <Text style={styles.helperText}>
                      {t("transactions.add.enterExchangeRate", {
                        toCurrency,
                        fromCurrency,
                      })}
                    </Text>

                    <TextInput
                      value={exchangeRate}
                      onChangeText={(value) => {
                        if (/^\d*\.?\d{0,10}$/.test(value)) {
                          setExchangeRate(value);
                        }
                      }}
                      placeholder={t(
                        "transactions.add.exchangeRatePlaceholder",
                      )}
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
                    {t("transactions.add.actualReceivedDescription")}
                  </Text>
                )}
              </FormCard>

              {/* Amount received */}
              <FormCard
                title={t("transactions.add.amountReceived")}
                currency={toCurrency}
              >
                {rateMode === "manual" ? (
                  <>
                    {calculatedReceivedMinor !== null ? (
                      <Text style={styles.calculatedAmount}>
                        {formatMoney(calculatedReceivedMinor, toCurrency)}
                      </Text>
                    ) : (
                      <Text style={styles.calculatedPlaceholder}>
                        {t("transactions.add.enterAmountAndRate")}
                      </Text>
                    )}

                    <Text style={styles.helperText}>
                      {t("transactions.add.calculatedFromRate")}
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
                        ? t("transactions.add.amountPreview", {
                            amount: formatMoney(
                              parsedActualReceived,
                              toCurrency,
                            ),
                          })
                        : t("transactions.add.enterReceivedAmount", {
                            currency: toCurrency,
                          })}
                    </Text>
                  </>
                )}
              </FormCard>

              {/* Effective rate */}
              {effectiveExchangeRate !== null && (
                <View style={styles.rateBanner}>
                  <Text style={styles.rateBannerTitle}>
                    {t("transactions.add.effectiveRate")}
                  </Text>

                  <Text style={styles.rateBannerValue}>
                    {`1 ${fromCurrency} = ${effectiveExchangeRate.toLocaleString(
                      "en",
                      { maximumFractionDigits: 10 },
                    )} ${toCurrency}`}
                  </Text>

                  <Text style={styles.rateBannerHelper}>
                    {t("transactions.add.effectiveRateDescription")}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Amount */}
              <FormCard
                title={t("transactions.add.amount")}
                currency={currency}
              >
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
                    ? t("transactions.add.amountPreview", {
                        amount: formatMoney(parsedAmount, currency),
                      })
                    : t("transactions.add.enterAmount", { currency })}
                </Text>

                <View style={styles.divider} />

                <View style={styles.noteRow}>
                  <Info size={14} color={colors.textSecondary} />
                  <Text style={styles.helperText}>
                    {t("transactions.add.workspaceCurrencyNote")}
                  </Text>
                </View>
              </FormCard>

              {/* Details */}
              <View style={styles.group}>
                <SectionHeader title={t("transactions.add.details")} />

                <View style={styles.card}>
                  <SelectRow
                    label={t("transactions.add.account")}
                    value={selectedAccount?.name}
                    placeholder={t("transactions.add.selectAccount")}
                    hint={
                      selectedAccount
                        ? `${formatAccountType(selectedAccount.type)} · ${selectedAccount.currency}`
                        : t("transactions.add.chooseSource")
                    }
                    leading={
                      selectedAccount ? (
                        <AppIcon
                          name={selectedAccount.icon ?? "wallet"}
                          color={selectedAccount.color ?? colors.primary}
                          size={40}
                          iconSize={20}
                        />
                      ) : (
                        <AppIcon name="wallet" size={40} iconSize={20} />
                      )
                    }
                    onPress={() => setAccountModalVisible(true)}
                  />

                  <View style={styles.divider} />

                  <SelectRow
                    label={t("transactions.add.category")}
                    value={selectedCategory?.name}
                    placeholder={t("transactions.add.selectCategory")}
                    hint={
                      selectedCategory
                        ? selectedCategory.isDefault
                          ? t("transactions.add.defaultCategory")
                          : t("transactions.add.customCategory")
                        : t("transactions.add.chooseCategory", {
                            type: t(
                              `transactions.add.type.${type}`,
                            ).toLowerCase(),
                          })
                    }
                    leading={
                      selectedCategory ? (
                        <AppIcon
                          name={selectedCategory.icon ?? "ellipsis"}
                          color={colors.primary}
                          size={40}
                          iconSize={20}
                          shape="circle"
                        />
                      ) : (
                        <AppIcon
                          name="ellipsis"
                          size={40}
                          iconSize={20}
                          shape="circle"
                        />
                      )
                    }
                    onPress={() => setCategoryModalVisible(true)}
                  />
                </View>

                {showNoSourceAccounts && (
                  <InlineNotice text={t("transactions.add.noSourceAccounts")} />
                )}

                {showNoCategories && (
                  <InlineNotice text={t("transactions.add.noCategories")} />
                )}
              </View>
            </>
          )}

          {/* Date */}
          <DatePickerField
            label={t("transactions.add.date")}
            value={date}
            onChange={setDate}
          />

          {/* Description */}
          <View style={styles.group}>
            <SectionHeader title={t("transactions.add.description")} />

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={
                isTransfer
                  ? t("transactions.add.descriptionTransferPlaceholder")
                  : t("transactions.add.descriptionPlaceholder")
              }
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.descriptionInput]}
              maxLength={150}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.helperText}>
              {t("transactions.add.descriptionHint")}
            </Text>
          </View>
        </KeyboardAwareScrollView>

        {/* Save button */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={saveDisabled}
            accessibilityRole="button"
            accessibilityState={{
              disabled: saveDisabled,
              busy: saving,
            }}
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

      {/* Selection sheets */}

      <OptionSheet
        visible={fromWorkspaceModalVisible}
        onClose={() => setFromWorkspaceModalVisible(false)}
        title={t("transactions.add.sheets.fromWorkspaceTitle")}
        subtitle={t("transactions.add.sheets.fromWorkspaceSubtitle")}
        options={workspaceOptions}
        selectedId={fromWorkspaceId}
        emptyText={t("transactions.add.noWorkspaces")}
        onSelect={(id) => {
          setFromWorkspaceId(id);
          setAccountId("");
          setFromWorkspaceModalVisible(false);
        }}
      />

      <OptionSheet
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        title={
          isTransfer
            ? t("transactions.add.sheets.fromAccountTitle")
            : t("transactions.add.sheets.selectAccountTitle")
        }
        subtitle={t("transactions.add.sheets.accountSubtitle")}
        options={accountOptions}
        selectedId={accountId}
        emptyText={
          accountsLoading
            ? t("transactions.add.loadingAccounts")
            : t("transactions.add.noAccounts")
        }
        onSelect={(id) => {
          setAccountId(id);
          setAccountModalVisible(false);
        }}
      />

      <OptionSheet
        visible={toWorkspaceModalVisible}
        onClose={() => setToWorkspaceModalVisible(false)}
        title={t("transactions.add.sheets.toWorkspaceTitle")}
        subtitle={t("transactions.add.sheets.toWorkspaceSubtitle")}
        options={workspaceOptions}
        selectedId={toWorkspaceId}
        emptyText={t("transactions.add.noWorkspaces")}
        onSelect={(id) => {
          setToWorkspaceId(id);
          setDestinationAccountId("");
          setToWorkspaceModalVisible(false);
        }}
      />

      <OptionSheet
        visible={destinationModalVisible}
        onClose={() => setDestinationModalVisible(false)}
        title={t("transactions.add.sheets.toAccountTitle")}
        subtitle={t("transactions.add.sheets.destinationAccountSubtitle")}
        options={destinationOptions}
        selectedId={destinationAccountId}
        emptyText={
          accountsLoading
            ? t("transactions.add.loadingAccounts")
            : t("transactions.add.noDestinationAccounts")
        }
        onSelect={(id) => {
          setDestinationAccountId(id);
          setDestinationModalVisible(false);
        }}
      />

      <OptionSheet
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title={t("transactions.add.sheets.categoryTitle")}
        subtitle={t("transactions.add.sheets.categorySubtitle")}
        options={categoryOptions}
        selectedId={categoryId}
        emptyText={t("transactions.add.noCategories")}
        onSelect={(id) => {
          setCategoryId(id);
          setCategoryModalVisible(false);
        }}
      />
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* Segment configuration                                                     */
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

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                      */
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

function WorkspaceAvatar({ countryCode }: { countryCode?: string | null }) {
  const flag = countryCode ? getCountryByCode(countryCode)?.flag : undefined;

  return flag ? (
    <View style={[styles.iconTile, { backgroundColor: colors.background }]}>
      <Text style={styles.flag}>{flag}</Text>
    </View>
  ) : (
    <AppIcon
      name="globe"
      color={colors.primary}
      size={40}
      iconSize={20}
      backgroundColor={colors.background}
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
  context?: string;
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
/* Styles                                                                     */
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
