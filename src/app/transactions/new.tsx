import { useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Info,
  Plus,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
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
import {
  TransactionFormCard,
  TransactionInlineNotice,
  TransactionOptionSheet,
  TransactionSectionHeader,
  TransactionSegmentedControl,
  TransactionSelectRow,
  TransactionWorkspaceAvatar,
} from "@/components/transactions";
import { AppIcon } from "@/components/ui/app-icon";
import { DatePickerField } from "@/components/ui/date-picker-field";
import type {
  TransactionSegmentOption,
  TransactionSheetOption,
} from "@/types/transaction";

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
  { labelKey: "transactions.add.type.expense", value: "expense" },
  { labelKey: "transactions.add.type.income", value: "income" },
  { labelKey: "transactions.add.type.transfer", value: "transfer" },
];

function parseAmountToMinor(value: string, currency: string) {
  if (!isValidCurrencyAmountInput(value, currency)) return null;
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
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

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );

  const accounts = useFinanceStore((state) => state.accounts);
  const accountsLoading = useFinanceStore((state) => state.accountsLoading);
  const fetchAccounts = useFinanceStore((state) => state.fetchAccounts);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const addTransfer = useFinanceStore((state) => state.addTransfer);

  const categories = useCategoryStore((state) => state.categories);
  const categoriesLoading = useCategoryStore(
    (state) => state.categoriesLoading,
  );
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  const activeWorkspace = workspaces.find(
    (item) => item.id === activeWorkspaceId,
  );
  const currency = activeWorkspace?.currency_code ?? "MYR";

  const [type, setType] = useState<NewTransactionType>("expense");
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  const [fromWorkspaceId, setFromWorkspaceId] = useState(
    activeWorkspaceId ?? "",
  );
  const [toWorkspaceId, setToWorkspaceId] = useState(activeWorkspaceId ?? "");

  const [amountSent, setAmountSent] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [rateMode, setRateMode] = useState<TransferRateMode>("manual");

  const [date, setDate] = useState(getTodayDate);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [destinationModalVisible, setDestinationModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [fromWorkspaceModalVisible, setFromWorkspaceModalVisible] =
    useState(false);
  const [toWorkspaceModalVisible, setToWorkspaceModalVisible] = useState(false);

  useEffect(() => {
    workspaces.forEach((workspace) => {
      void fetchAccounts(workspace.id);
    });
  }, [workspaces, fetchAccounts]);

  useEffect(() => {
    if (categories.length === 0 && !categoriesLoading) {
      void fetchCategories();
    }
  }, [categories.length, categoriesLoading, fetchCategories]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setFromWorkspaceId((current) => current || activeWorkspaceId);
    setToWorkspaceId((current) => current || activeWorkspaceId);
  }, [activeWorkspaceId]);

  const fromWorkspace = workspaces.find((item) => item.id === fromWorkspaceId);
  const toWorkspace = workspaces.find((item) => item.id === toWorkspaceId);

  const availableCategories = useMemo(() => {
    if (type === "transfer") return [];
    return categories.filter(
      (category) => category.type === type && !category.isArchived,
    );
  }, [categories, type]);

  const selectedCategory = availableCategories.find(
    (category) => category.id === categoryId,
  );

  const sourceAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.workspaceId ===
          (type === "transfer" ? fromWorkspaceId : activeWorkspaceId),
      ),
    [accounts, type, fromWorkspaceId, activeWorkspaceId],
  );

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

  const fromCurrency =
    selectedAccount?.currency ?? fromWorkspace?.currency_code ?? "MYR";
  const toCurrency =
    selectedDestinationAccount?.currency ?? toWorkspace?.currency_code ?? "MYR";

  const formatAccountType = (accountType: string) => {
    const key = accountType === "e-wallet" ? "eWallet" : accountType;
    return t(`home.accountTypes.${key}`, { defaultValue: accountType });
  };

  const accountOptions: TransactionSheetOption[] = sourceAccounts.map(
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

  const destinationOptions: TransactionSheetOption[] = destinationAccounts.map(
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

  const categoryOptions: TransactionSheetOption[] = availableCategories.map(
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

  const workspaceOptions: TransactionSheetOption[] = workspaces.map(
    (workspace) => ({
      id: workspace.id,
      label: workspace.name,
      description: `${workspace.country_code} · ${workspace.currency_code}`,
      leading: (
        <TransactionWorkspaceAvatar countryCode={workspace.country_code} />
      ),
    }),
  );

  const parsedAmount = parseAmountToMinor(amount, currency);
  const parsedAmountSent = parseAmountToMinor(amountSent, fromCurrency);
  const parsedExchangeRate = Number(exchangeRate);
  const isValidExchangeRate =
    Number.isFinite(parsedExchangeRate) && parsedExchangeRate > 0;

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

  const parsedActualReceived =
    selectedDestinationAccount && rateMode === "actual"
      ? parseAmountToMinor(amountReceived, toCurrency)
      : null;

  const finalAmountReceived =
    rateMode === "manual" ? calculatedReceivedMinor : parsedActualReceived;

  const effectiveExchangeRate =
    parsedAmountSent !== null && finalAmountReceived !== null
      ? calculateEffectiveRate(
          parsedAmountSent,
          finalAmountReceived,
          fromCurrency,
          toCurrency,
        )
      : null;

  const typeSegments: TransactionSegmentOption<NewTransactionType>[] =
    transactionTypeOptions.map((option) => ({
      label: t(option.labelKey),
      value: option.value,
      ...typeMeta[option.value],
    }));

  const rateModeSegments: TransactionSegmentOption<TransferRateMode>[] = [
    { label: t("transactions.add.rateMode.manual"), value: "manual" },
    { label: t("transactions.add.rateMode.actual"), value: "actual" },
  ];

  const handleTypeChange = (nextType: NewTransactionType) => {
    setType(nextType);
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
          <TransactionSegmentedControl
            options={typeSegments}
            value={type}
            onChange={handleTypeChange}
          />

          {isTransfer ? (
            <>
              <View style={styles.group}>
                <TransactionSectionHeader
                  title={t("transactions.add.from")}
                  icon={<ArrowUpRight size={14} color={colors.danger} />}
                  iconBackground={colors.dangerLight}
                />
                <View style={styles.card}>
                  <TransactionSelectRow
                    context={t("transactions.add.from")}
                    label={t("transactions.add.workspace")}
                    value={fromWorkspace?.name}
                    placeholder={t("transactions.add.sourceWorkspace")}
                    hint={
                      fromWorkspace?.currency_code ??
                      t("transactions.add.chooseWorkspace")
                    }
                    leading={
                      <TransactionWorkspaceAvatar
                        countryCode={fromWorkspace?.country_code}
                      />
                    }
                    onPress={() => setFromWorkspaceModalVisible(true)}
                  />
                  <View style={styles.divider} />
                  <TransactionSelectRow
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
                      <AppIcon
                        name={selectedAccount?.icon ?? "wallet"}
                        color={selectedAccount?.color ?? colors.primary}
                        size={40}
                        iconSize={20}
                      />
                    }
                    onPress={() => setAccountModalVisible(true)}
                  />
                </View>
                {showNoSourceAccounts ? (
                  <TransactionInlineNotice
                    text={t("transactions.add.noSourceAccounts")}
                  />
                ) : null}
              </View>

              <View style={styles.group}>
                <TransactionSectionHeader
                  title={t("transactions.add.to")}
                  icon={<ArrowDownLeft size={14} color={colors.success} />}
                  iconBackground={colors.successLight}
                />
                <View style={styles.card}>
                  <TransactionSelectRow
                    context={t("transactions.add.to")}
                    label={t("transactions.add.workspace")}
                    value={toWorkspace?.name}
                    placeholder={t("transactions.add.destinationWorkspace")}
                    hint={
                      toWorkspace?.currency_code ??
                      t("transactions.add.chooseWorkspace")
                    }
                    leading={
                      <TransactionWorkspaceAvatar
                        countryCode={toWorkspace?.country_code}
                      />
                    }
                    onPress={() => setToWorkspaceModalVisible(true)}
                  />
                  <View style={styles.divider} />
                  <TransactionSelectRow
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
                      <AppIcon
                        name={selectedDestinationAccount?.icon ?? "wallet"}
                        color={
                          selectedDestinationAccount?.color ?? colors.primary
                        }
                        size={40}
                        iconSize={20}
                      />
                    }
                    onPress={() => setDestinationModalVisible(true)}
                  />
                </View>
                {showNoDestinationAccounts ? (
                  <TransactionInlineNotice
                    text={t("transactions.add.noDestinationAccounts")}
                  />
                ) : null}
              </View>

              <TransactionFormCard
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
              </TransactionFormCard>

              <TransactionFormCard title={t("transactions.add.exchangeRate")}>
                <TransactionSegmentedControl
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
                    {isValidExchangeRate ? (
                      <Text style={styles.helperText}>
                        {`1 ${fromCurrency} = ${parsedExchangeRate.toLocaleString(
                          "en",
                          { maximumFractionDigits: 10 },
                        )} ${toCurrency}`}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.helperText}>
                    {t("transactions.add.actualReceivedDescription")}
                  </Text>
                )}
              </TransactionFormCard>

              <TransactionFormCard
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
              </TransactionFormCard>

              {effectiveExchangeRate !== null ? (
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
              ) : null}
            </>
          ) : (
            <>
              <TransactionFormCard
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
              </TransactionFormCard>

              <View style={styles.group}>
                <TransactionSectionHeader
                  title={t("transactions.add.details")}
                />
                <View style={styles.card}>
                  <TransactionSelectRow
                    label={t("transactions.add.account")}
                    value={selectedAccount?.name}
                    placeholder={t("transactions.add.selectAccount")}
                    hint={
                      selectedAccount
                        ? `${formatAccountType(selectedAccount.type)} · ${selectedAccount.currency}`
                        : t("transactions.add.chooseSource")
                    }
                    leading={
                      <AppIcon
                        name={selectedAccount?.icon ?? "wallet"}
                        color={selectedAccount?.color ?? colors.primary}
                        size={40}
                        iconSize={20}
                      />
                    }
                    onPress={() => setAccountModalVisible(true)}
                  />
                  <View style={styles.divider} />
                  <TransactionSelectRow
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
                      <AppIcon
                        name={selectedCategory?.icon ?? "ellipsis"}
                        color={colors.primary}
                        size={40}
                        iconSize={20}
                        shape="circle"
                      />
                    }
                    onPress={() => setCategoryModalVisible(true)}
                  />
                </View>
                {showNoSourceAccounts ? (
                  <TransactionInlineNotice
                    text={t("transactions.add.noSourceAccounts")}
                  />
                ) : null}
                {showNoCategories ? (
                  <TransactionInlineNotice
                    text={t("transactions.add.noCategories")}
                  />
                ) : null}
              </View>
            </>
          )}

          <DatePickerField
            label={t("transactions.add.date")}
            value={date}
            onChange={setDate}
          />

          <View style={styles.group}>
            <TransactionSectionHeader
              title={t("transactions.add.description")}
            />
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

      <TransactionOptionSheet
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
      <TransactionOptionSheet
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
      <TransactionOptionSheet
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
      <TransactionOptionSheet
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
      <TransactionOptionSheet
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  group: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
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
  helperText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
  inputOnCard: { backgroundColor: colors.background },
  descriptionInput: {
    minHeight: 96,
    paddingTop: spacing.md,
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
});
