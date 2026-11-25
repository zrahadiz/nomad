import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react-native";

import { useTranslation } from "react-i18next";

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuthStore } from "@/stores/use-auth-store";
import { useBudgetStore } from "@/stores/use-budget-store";
import { useCategoryStore } from "@/stores/use-category-store";
import { useCurrencyConverterStore } from "@/stores/use-currency-converter-store";
import { useFinanceStore } from "@/stores/use-finance-store";
import { useProfileStore } from "@/stores/use-profile-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";

import {
  formatMoney,
  getAccountBalance,
  getWorkspaceBalance,
} from "@/lib/finance/calculations";

import { formatConvertedMoney } from "@/lib/finance/currency-converter";

import { getCountryByCode } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";

import { TransactionList } from "@/components/transactions/transaction-list";

import { WorkspaceGate } from "@/components/feedbacks/workspace-gate";
import { SafeScreen } from "@/components/layout/safe-screen";
import { AppIcon } from "@/components/ui/app-icon";
import { BottomSheetModal } from "@/components/ui/bottom-modal";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function getCountryFlag(countryCode: string): string {
  return getCountryByCode(countryCode)?.flag ?? "🌍";
}

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "U";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatAccountType(type: string, t: (key: string) => string): string {
  const key = type === "e-wallet" ? "eWallet" : type;

  return t(`home.accountTypes.${key}`);
}

/* -------------------------------------------------------------------------- */
/* Small presentational pieces                                                 */
/* (move into /components/home/* when you're happy with the layout)            */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  title,
  action,
  caption,
  onPress,
}: {
  title: string;
  action?: string;
  caption?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {action ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={8}
          style={styles.sectionAction}
        >
          <Text style={styles.sectionActionText}>{action}</Text>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>
      ) : caption ? (
        <Text style={styles.sectionCaption}>{caption}</Text>
      ) : null}
    </View>
  );
}

function FlowStat({
  label,
  amount,
  amountColor,
  direction,
  tone,
  secondary,
}: {
  label: string;
  amount: string;
  amountColor: string;
  direction: "in" | "out";
  tone: "success" | "danger" | "neutral";
  secondary?: ReactNode;
}) {
  const iconColor =
    tone === "success"
      ? colors.success
      : tone === "danger"
        ? colors.danger
        : colors.textSecondary;

  const bubbleColor =
    tone === "success"
      ? colors.successLight
      : tone === "danger"
        ? colors.dangerLight
        : colors.background;

  return (
    <View style={styles.flowStat}>
      <View style={[styles.flowIcon, { backgroundColor: bubbleColor }]}>
        {direction === "in" ? (
          <ArrowDownLeft size={16} color={iconColor} />
        ) : (
          <ArrowUpRight size={16} color={iconColor} />
        )}
      </View>

      <View style={styles.flowStatText}>
        <Text style={styles.flowLabel}>{label}</Text>

        <Text
          style={[styles.flowAmount, { color: amountColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {amount}
        </Text>

        {secondary}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen                                                                      */
/* -------------------------------------------------------------------------- */

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [workspaceSheetVisible, setWorkspaceSheetVisible] = useState(false);

  /* ---------------------------------- Stores --------------------------------- */

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const setActiveWorkspace = useWorkspaceStore(
    (state) => state.setActiveWorkspace,
  );
  const removeWorkspace = useWorkspaceStore((state) => state.removeWorkspace);

  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);

  const profile = useProfileStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);

  const converter = useCurrencyConverterStore((state) => state.converter);
  const loadedConverterWorkspaceId = useCurrencyConverterStore(
    (state) => state.loadedWorkspaceId,
  );
  const fetchConverter = useCurrencyConverterStore(
    (state) => state.fetchConverter,
  );

  const budgetOverview = useBudgetStore((state) => state.overview);
  const budgetLoading = useBudgetStore((state) => state.loading);
  const budgetError = useBudgetStore((state) => state.error);
  const loadedBudgetWorkspaceId = useBudgetStore(
    (state) => state.loadedWorkspaceId,
  );
  const loadedBudgetMonth = useBudgetStore((state) => state.loadedBudgetMonth);
  const fetchBudgetOverview = useBudgetStore(
    (state) => state.fetchBudgetOverview,
  );

  const categories = useCategoryStore((state) => state.categories);
  const categoriesLoading = useCategoryStore(
    (state) => state.categoriesLoading,
  );
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  /* ------------------------------- Derived state ------------------------------ */

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);
  const currency = workspace?.currency_code ?? "MYR";
  const initials = getInitials(profile?.full_name || user?.email);

  const activeConverter =
    loadedConverterWorkspaceId === activeWorkspaceId ? converter : null;

  const formatCurrency = (amountMinor: number) =>
    formatMoney(amountMinor, currency);

  // Converted amount, always prefixed with "≈" so it's clearly not the real figure.
  const renderSecondaryAmount = (
    amountMinor: number,
    textStyle: TextStyle = styles.secondaryAmount,
  ) => {
    const formatted = formatConvertedMoney(
      amountMinor,
      currency,
      activeConverter,
    );

    if (!formatted) return null;

    return <Text style={textStyle}>≈ {formatted}</Text>;
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const budgetMonth = `${monthPrefix}-01`;

  const greeting =
    now.getHours() < 12
      ? t("home.greeting.morning")
      : now.getHours() < 18
        ? t("home.greeting.afternoon")
        : t("home.greeting.evening");

  const workspaceAccounts = useMemo(
    () =>
      accounts.filter((account) => account.workspaceId === activeWorkspaceId),
    [accounts, activeWorkspaceId],
  );

  const displayedAccounts = workspaceAccounts.slice(0, 3);

  const totalBalanceMinor = useMemo(
    () =>
      activeWorkspaceId
        ? getWorkspaceBalance(activeWorkspaceId, accounts, transactions)
        : 0,
    [activeWorkspaceId, accounts, transactions],
  );

  // One pass instead of four separate filter/reduce passes.
  const monthStats = useMemo(() => {
    const stats = { income: 0, expenses: 0, transferIn: 0, transferOut: 0 };

    for (const item of transactions) {
      if (item.workspaceId !== activeWorkspaceId) continue;
      if (!item.date.startsWith(monthPrefix)) continue;

      if (item.type === "income") stats.income += item.amountMinor;
      else if (item.type === "expense") stats.expenses += item.amountMinor;
      else if (item.type === "transfer_in")
        stats.transferIn += item.amountMinor;
      else if (item.type === "transfer_out")
        stats.transferOut += item.amountMinor;
    }

    return stats;
  }, [activeWorkspaceId, transactions, monthPrefix]);

  const netCashFlowMinor = monthStats.income - monthStats.expenses;
  const netSign = netCashFlowMinor > 0 ? "+" : netCashFlowMinor < 0 ? "−" : "";
  const netColor =
    netCashFlowMinor > 0
      ? colors.success
      : netCashFlowMinor < 0
        ? colors.danger
        : colors.text;

  const recentTransactions = useMemo(
    () =>
      transactions
        .filter((item) => item.workspaceId === activeWorkspaceId)
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        )
        .slice(0, 3),
    [activeWorkspaceId, transactions],
  );

  // Reactive version (the old one read useBudgetStore.getState() in render).
  const hasCurrentBudget =
    budgetOverview !== null &&
    loadedBudgetWorkspaceId === activeWorkspaceId &&
    loadedBudgetMonth === budgetMonth;

  const budgetAmountLimit = hasCurrentBudget
    ? budgetOverview.budget.amountLimit
    : 0;
  const budgetAmountSpent = hasCurrentBudget ? budgetOverview.amountSpent : 0;
  const budgetRemaining = hasCurrentBudget ? budgetOverview.remainingAmount : 0;

  const progressPercentage =
    budgetAmountLimit > 0
      ? Math.round((budgetAmountSpent / budgetAmountLimit) * 100)
      : 0;

  const budgetStatus =
    progressPercentage >= 100
      ? "over"
      : progressPercentage >= 80
        ? "warning"
        : "normal";

  const budgetStatusColor =
    budgetStatus === "over"
      ? colors.danger
      : budgetStatus === "warning"
        ? colors.warning
        : colors.primary;

  const budgetStatusBackground =
    budgetStatus === "over"
      ? colors.dangerLight
      : budgetStatus === "warning"
        ? colors.warningLight
        : colors.primaryLight;

  /* --------------------------------- Effects --------------------------------- */

  useEffect(() => {
    if (!activeWorkspaceId) return;
    void fetchConverter(activeWorkspaceId);
  }, [activeWorkspaceId, fetchConverter]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
  }, [activeWorkspaceId, budgetMonth, fetchBudgetOverview]);

  useEffect(() => {
    if (categories.length === 0 && !categoriesLoading) {
      void fetchCategories();
    }
  }, [categories.length, categoriesLoading, fetchCategories]);

  /* -------------------------------- Handlers --------------------------------- */

  function handleDeleteWorkspace(id: string, name: string) {
    Alert.alert(
      t("home.alerts.deleteWorkspaceTitle"),
      t("home.alerts.deleteWorkspaceMessage", { name }),
      [
        {
          text: t("home.alerts.cancel"),
          style: "cancel",
        },
        {
          text: t("home.alerts.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await removeWorkspace(id);
            } catch (error) {
              console.error("Failed to delete workspace:", error);

              Alert.alert(
                t("home.alerts.deleteFailedTitle"),
                t("home.alerts.deleteFailedMessage"),
              );
            }
          },
        },
      ],
      { cancelable: true },
    );
  }

  /* ---------------------------------- Render --------------------------------- */

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top"]}>
      <WorkspaceGate>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header ----------------------------------------------------------- */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
            </View>

            <Pressable
              style={styles.avatar}
              accessibilityRole="button"
              accessibilityLabel={t("home.accessibility.openProfile")}
              onPress={() => router.push("/(tabs)/settings")}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </Pressable>
          </View>

          {/* 2. Workspace selector ---------------------------------------------- */}
          <View style={styles.workspaceContainer}>
            <Pressable
              style={styles.workspaceSelector}
              accessibilityRole="button"
              accessibilityLabel={t("home.accessibility.selectWorkspace", {
                name: workspace?.name ?? t("home.workspaceFallback"),
              })}
              accessibilityHint={t("home.accessibility.selectWorkspaceHint")}
              onPress={() => setWorkspaceSheetVisible(true)}
            >
              <Text style={styles.workspaceFlag}>
                {getCountryFlag(workspace?.country_code ?? "")}
              </Text>

              <View style={styles.workspaceInfo}>
                <Text style={styles.workspaceLabel}>{t("home.workspace")}</Text>
                <Text style={styles.workspaceName} numberOfLines={1}>
                  {workspace?.name ?? t("home.workspaceFallback")}
                </Text>
              </View>

              <View style={styles.currencyChip}>
                <Text style={styles.currencyChipText}>{currency}</Text>
              </View>

              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.currencyButton,
                pressed && styles.currencyButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("home.accessibility.convertCurrency")}
              accessibilityHint={t("home.accessibility.convertCurrencyHint")}
              onPress={() => router.push("/currency-converter")}
            >
              <CircleDollarSign size={22} color={colors.primary} />
            </Pressable>
          </View>

          {/* 3. Overview: balance + monthly cash flow ---------------------------------------------- */}
          <View style={styles.overviewCard}>
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View style={styles.balanceLabelRow}>
                  <Wallet size={18} color={colors.textOnPrimaryMuted} />
                  <Text style={styles.balanceLabel}>
                    {t("home.totalBalance")}
                  </Text>
                </View>

                <View style={styles.balanceBadge}>
                  <Text style={styles.balanceBadgeText}>{currency}</Text>
                </View>
              </View>

              <Text
                style={styles.balanceAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(totalBalanceMinor)}
              </Text>

              {renderSecondaryAmount(
                totalBalanceMinor,
                styles.secondaryBalanceAmount,
              )}

              <Text style={styles.balanceCaption}>
                {t("home.acrossAccounts")}
              </Text>
            </View>

            <View style={styles.cashFlowSection}>
              <View style={styles.cashFlowHeader}>
                <Text style={styles.cashFlowTitle}>
                  {t("home.cashFlow.title")}
                </Text>
                <Text style={styles.cardCaption}>
                  {t("home.cashFlow.thisMonth")}
                </Text>
              </View>

              <View style={styles.flowRow}>
                <FlowStat
                  label={t("home.cashFlow.income")}
                  direction="in"
                  tone="success"
                  amountColor={colors.success}
                  amount={formatCurrency(monthStats.income)}
                  secondary={renderSecondaryAmount(monthStats.income)}
                />

                <FlowStat
                  label={t("home.cashFlow.expenses")}
                  direction="out"
                  tone="danger"
                  amountColor={colors.danger}
                  amount={formatCurrency(monthStats.expenses)}
                  secondary={renderSecondaryAmount(monthStats.expenses)}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.flowRow}>
                <FlowStat
                  label={t("home.cashFlow.transferIn")}
                  direction="in"
                  tone="neutral"
                  amountColor={colors.text}
                  amount={`+ ${formatCurrency(monthStats.transferIn)}`}
                  secondary={renderSecondaryAmount(monthStats.transferIn)}
                />

                <FlowStat
                  label={t("home.cashFlow.transferOut")}
                  direction="out"
                  tone="neutral"
                  amountColor={colors.text}
                  amount={`− ${formatCurrency(monthStats.transferOut)}`}
                  secondary={renderSecondaryAmount(monthStats.transferOut)}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.netRow}>
                <Text style={styles.netLabel}> {t("home.cashFlow.net")}</Text>

                <View style={styles.netValueContainer}>
                  <Text style={[styles.netAmount, { color: netColor }]}>
                    {netSign}
                    {formatCurrency(Math.abs(netCashFlowMinor))}
                  </Text>

                  {renderSecondaryAmount(Math.abs(netCashFlowMinor))}
                </View>
              </View>
            </View>
          </View>

          {/* 4. Accounts --------------------------------------------------------- */}
          <SectionHeading
            title={t("home.accounts.title")}
            action={
              workspaceAccounts.length > 0
                ? t("home.accounts.viewAll", {
                    count: workspaceAccounts.length,
                  })
                : undefined
            }
            onPress={() => router.push("/accounts/list")}
          />

          <View style={styles.listCard}>
            {workspaceAccounts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {t("home.accounts.emptyTitle")}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {t("home.accounts.emptyDescription")}
                </Text>
              </View>
            ) : (
              displayedAccounts.map((account, index) => {
                const accountBalance = getAccountBalance(account, transactions);

                return (
                  <View key={account.id}>
                    {index > 0 && <View style={styles.divider} />}

                    <View style={styles.accountRow}>
                      <AppIcon
                        name={account.icon ?? "wallet"}
                        color={account.color ?? colors.primary}
                        size={44}
                        iconSize={21}
                        background
                      />

                      <View style={styles.rowDetails}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {account.name}
                        </Text>
                        <Text style={styles.rowCaption}>
                          {formatAccountType(account.type, t)}
                        </Text>
                      </View>

                      <View style={styles.rowAmountContainer}>
                        <Text style={styles.rowAmount}>
                          {formatCurrency(accountBalance)}
                        </Text>
                        {renderSecondaryAmount(
                          accountBalance,
                          styles.secondaryAmount,
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <Pressable
              style={styles.accountAddButton}
              accessibilityRole="button"
              onPress={() => router.push("/accounts/new")}
            >
              <Plus size={18} color={colors.primary} />
              <Text style={styles.accountAddButtonText}>
                {t("home.accounts.add")}
              </Text>
            </Pressable>
          </View>

          {/* 7. Monthly budget --------------------------------------------------- */}
          <SectionHeading
            title={t("home.budget.title")}
            action={hasCurrentBudget ? t("home.budget.view") : undefined}
            onPress={() => router.push("/(tabs)/budget")}
          />

          <View style={styles.card}>
            {budgetLoading && !hasCurrentBudget ? (
              <Text style={styles.cardCaption}>{t("home.budget.loading")}</Text>
            ) : budgetError && !hasCurrentBudget ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {t("home.budget.unableToLoad")}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {t("home.budget.tryAgain")}
                </Text>

                <Pressable
                  style={styles.smallButton}
                  accessibilityRole="button"
                  onPress={() => {
                    if (activeWorkspaceId) {
                      void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
                    }
                  }}
                >
                  <Text style={styles.smallButtonText}>
                    {" "}
                    {t("home.budget.retry")}
                  </Text>
                </Pressable>
              </View>
            ) : !hasCurrentBudget ? (
              <View style={styles.emptyState}>
                <Wallet size={28} color={colors.primary} />
                <Text style={styles.emptyTitle}>
                  {t("home.budget.noBudget")}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {t("home.budget.createDescription")}
                </Text>

                <Pressable
                  style={styles.smallButton}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/budget/new",
                      params: { month: budgetMonth },
                    })
                  }
                >
                  <Plus size={17} color={colors.textOnPrimary} />
                  <Text style={styles.smallButtonText}>
                    {t("home.budget.create")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.budgetTopRow}>
                  <View style={styles.budgetTopText}>
                    <Text style={styles.cardEyebrow}>
                      {t("home.budget.totalSpent")}
                    </Text>

                    <Text style={styles.spentAmount}>
                      {formatCurrency(budgetAmountSpent)}
                    </Text>

                    {renderSecondaryAmount(budgetAmountSpent)}
                  </View>

                  <View
                    style={[
                      styles.budgetBadge,
                      { backgroundColor: budgetStatusBackground },
                    ]}
                  >
                    <Text
                      style={[
                        styles.budgetBadgeText,
                        { color: budgetStatusColor },
                      ]}
                    >
                      {t("home.budget.used", {
                        percentage: progressPercentage,
                      })}
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.progressTrack}
                  accessibilityRole="progressbar"
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: Math.min(progressPercentage, 100),
                  }}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(progressPercentage, 100)}%`,
                        backgroundColor: budgetStatusColor,
                      },
                    ]}
                  />
                </View>

                <View style={styles.budgetBottomRow}>
                  <View>
                    <Text style={styles.cardCaption}>
                      {t("home.budget.monthlyLimit")}
                    </Text>
                    <Text style={styles.budgetValue}>
                      {formatCurrency(budgetAmountLimit)}
                    </Text>
                    {renderSecondaryAmount(budgetAmountLimit)}
                  </View>

                  <View style={styles.alignEnd}>
                    <Text style={styles.cardCaption}>
                      {budgetRemaining < 0
                        ? t("home.budget.overBudget")
                        : t("home.budget.remaining")}
                    </Text>
                    <Text
                      style={[
                        styles.budgetValue,
                        {
                          color:
                            budgetRemaining < 0
                              ? colors.danger
                              : colors.primary,
                        },
                      ]}
                    >
                      {formatCurrency(Math.abs(budgetRemaining))}
                    </Text>
                    {renderSecondaryAmount(Math.abs(budgetRemaining))}
                  </View>
                </View>

                {budgetStatus !== "normal" && (
                  <View
                    style={[
                      styles.statusBanner,
                      { backgroundColor: budgetStatusBackground },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBannerText,
                        { color: budgetStatusColor },
                      ]}
                    >
                      {budgetStatus === "warning"
                        ? t("home.budget.warningMessage")
                        : t("home.budget.overMessage")}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* 8. Recent transactions --------------------------------------------- */}
          <SectionHeading
            title={t("home.recentTransactions.title")}
            action={t("home.recentTransactions.seeAll")}
            onPress={() => router.push("/transactions")}
          />

          <View style={styles.listCard}>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptySubtitle}>
                  {t("home.recentTransactions.empty")}
                </Text>
              </View>
            ) : (
              <TransactionList
                transactions={recentTransactions}
                accounts={accounts}
                primaryCurrency={currency}
                converter={activeConverter}
                showDate
                onTransactionPress={(item) =>
                  router.push({
                    pathname: "/transactions/[id]",
                    params: { id: item.id },
                  })
                }
              />
            )}
          </View>

          <Text style={styles.footerNote}>{t("home.footerNote")}</Text>

          {/* Workspace sheet ------------------------------------------------------ */}
          <BottomSheetModal
            visible={workspaceSheetVisible}
            onClose={() => setWorkspaceSheetVisible(false)}
            title={t("home.workspaceSheet.title")}
            subtitle={t("home.workspaceSheet.subtitle")}
          >
            {workspaces.map((item) => {
              const isActive = item.id === activeWorkspaceId;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.workspaceOption,
                    isActive && styles.workspaceOptionActive,
                  ]}
                >
                  <Pressable
                    style={styles.workspaceOptionContent}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${item.name}, ${item.currency_code}${
                      isActive
                        ? `, ${t("home.workspaceSheet.currentlySelected")}`
                        : ""
                    }`}
                    onPress={() => {
                      setActiveWorkspace(item.id);
                      setWorkspaceSheetVisible(false);
                    }}
                  >
                    <View style={styles.workspaceOptionFlag}>
                      <Text style={styles.workspaceOptionFlagText}>
                        {getCountryFlag(item.country_code ?? "")}
                      </Text>
                    </View>

                    <View style={styles.rowDetails}>
                      <Text style={styles.workspaceOptionName}>
                        {item.name}
                      </Text>
                      <Text style={styles.rowCaption}>
                        {item.currency_code}
                      </Text>
                    </View>

                    {isActive && <Check size={20} color={colors.primary} />}
                  </Pressable>

                  <View style={styles.workspaceActions}>
                    <Pressable
                      style={styles.workspaceActionButton}
                      accessibilityRole="button"
                      accessibilityLabel={t("home.workspaceSheet.edit", {
                        name: item.name,
                      })}
                      hitSlop={6}
                      onPress={() => {
                        setWorkspaceSheetVisible(false);
                        router.push({
                          pathname: "/workspaces/edit",
                          params: { id: item.id },
                        });
                      }}
                    >
                      <Pencil size={17} color={colors.textSecondary} />
                    </Pressable>

                    <Pressable
                      style={styles.workspaceActionButton}
                      accessibilityRole="button"
                      accessibilityLabel={t("home.workspaceSheet.delete", {
                        name: item.name,
                      })}
                      hitSlop={6}
                      onPress={() => handleDeleteWorkspace(item.id, item.name)}
                    >
                      <Trash2 size={17} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <Pressable
              style={styles.addWorkspaceButton}
              accessibilityRole="button"
              onPress={() => {
                setWorkspaceSheetVisible(false);
                router.push("/workspaces/new");
              }}
            >
              <Plus size={20} color={colors.primary} />
              <Text style={styles.addWorkspaceButtonText}>
                {t("home.workspaceSheet.add")}
              </Text>
            </Pressable>
          </BottomSheetModal>
        </ScrollView>
      </WorkspaceGate>
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  headerText: {
    flex: 1,
  },

  greeting: {
    color: colors.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: radius.full,
  },

  avatarText: {
    color: colors.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  workspaceContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },

  /* Workspace selector */
  workspaceSelector: {
    flex: 1, // fine here: the parent is a row with a defined width
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },

  currencyButton: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },

  currencyButtonPressed: {
    backgroundColor: colors.primaryLight,
  },

  workspaceFlag: {
    fontSize: 28,
  },

  workspaceInfo: {
    flex: 1,
    gap: 2,
  },

  workspaceLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.8,
  },

  workspaceName: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
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

  /* Hero */
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  balanceCard: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
  },

  cashFlowSection: {
    padding: spacing.lg,
    gap: spacing.lg,
  },

  cashFlowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cashFlowTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  balanceLabel: {
    color: colors.textOnPrimaryMuted,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
  },

  balanceBadge: {
    backgroundColor: colors.onPrimarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },

  balanceBadgeText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  balanceAmount: {
    color: colors.textOnPrimary,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    marginTop: spacing.lg,
  },

  secondaryBalanceAmount: {
    color: colors.textOnPrimaryMuted,
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },

  balanceCaption: {
    color: colors.textOnPrimaryMuted,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
    opacity: 0.8,
  },

  actionLabel: {
    color: colors.text,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    textAlign: "center",
  },

  actionLabelPrimary: {
    color: colors.textOnPrimary,
  },

  /* Section heading */
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: -spacing.xs,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  sectionCaption: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },

  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  sectionActionText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  /* Cards */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },

  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },

  cardCaption: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  cardEyebrow: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.6,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  secondaryAmount: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginTop: 2,
  },

  alignEnd: {
    alignItems: "flex-end",
  },

  /* Accounts / generic rows */
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  rowDetails: {
    flex: 1,
    gap: 2,
  },

  rowTitle: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  rowCaption: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  rowAmountContainer: {
    alignItems: "flex-end",
  },

  rowAmount: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  accountAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  accountAddButtonText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  /* Cash flow */
  flowRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },

  flowStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },

  flowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  flowStatText: {
    flex: 1,
  },

  flowLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  flowAmount: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },

  netRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  netLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  netValueContainer: {
    alignItems: "flex-end",
  },

  netAmount: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  /* Budget */
  budgetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  budgetTopText: {
    flex: 1,
  },

  spentAmount: {
    color: colors.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    marginTop: spacing.xs,
  },

  budgetBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  budgetBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },

  budgetBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  budgetValue: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xs,
  },

  statusBanner: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  statusBannerText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },

  /* Empty states + small button */
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    textAlign: "center",
  },

  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: "center",
  },

  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },

  smallButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  footerNote: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },

  /* Workspace sheet */
  workspaceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },

  workspaceOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  workspaceOptionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  workspaceOptionFlag: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  workspaceOptionFlagText: {
    fontSize: 24,
  },

  workspaceOptionName: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  workspaceActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },

  workspaceActionButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },

  addWorkspaceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 52,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
  },

  addWorkspaceButtonText: {
    color: colors.primary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
