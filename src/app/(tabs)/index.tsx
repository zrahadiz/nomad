import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react-native";

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

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
  getMonthlySpending,
  getWorkspaceBalance,
} from "@/lib/finance/calculations";

import { formatConvertedMoney } from "@/lib/finance/currency-converter";

import { getCountryByCode } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";

import { AccountIcon } from "@/components/accounts/account-icon";
import { TransactionList } from "@/components/transactions/transaction-list";
import type { accountIconName } from "@/constants/account-options";

import { WorkspaceGate } from "@/components/feedbacks/workspace-gate";
import { SafeScreen } from "@/components/layout/safe-screen";
import { BottomSheetModal } from "@/components/ui/bottom-modal";

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

function SectionHeading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
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
          style={styles.sectionAction}
        >
          <Text style={styles.sectionActionText}>{action}</Text>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const [workspaceSheetVisible, setWorkspaceSheetVisible] = useState(false);

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

  const workspaceAccounts = useMemo(
    () =>
      accounts.filter((account) => account.workspaceId === activeWorkspaceId),
    [accounts, activeWorkspaceId],
  );

  const displayedAccounts = workspaceAccounts.slice(0, 3);

  const profile = useProfileStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);

  // Currency converter
  const converter = useCurrencyConverterStore((state) => state.converter);
  const loadedConverterWorkspaceId = useCurrencyConverterStore(
    (state) => state.loadedWorkspaceId,
  );
  const fetchConverter = useCurrencyConverterStore(
    (state) => state.fetchConverter,
  );

  useEffect(() => {
    if (!activeWorkspaceId) return;

    void fetchConverter(activeWorkspaceId);
  }, [activeWorkspaceId, fetchConverter]);

  const activeConverter =
    loadedConverterWorkspaceId === activeWorkspaceId ? converter : null;

  const budgetOverview = useBudgetStore((state) => state.overview);
  const budgetLoading = useBudgetStore((state) => state.loading);
  const budgetError = useBudgetStore((state) => state.error);
  const fetchBudgetOverview = useBudgetStore(
    (state) => state.fetchBudgetOverview,
  );

  const categories = useCategoryStore((state) => state.categories);
  const categoriesLoading = useCategoryStore(
    (state) => state.categoriesLoading,
  );
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);

  const currency = workspace?.currency_code ?? "MYR";

  const initials = getInitials(profile?.full_name || user?.email);

  const formatCurrency = (amountMinor: number) =>
    formatMoney(amountMinor, currency);

  const formatSecondaryCurrency = (amountMinor: number) =>
    formatConvertedMoney(amountMinor, currency, activeConverter);

  const renderSecondaryAmount = (
    amountMinor: number,
    textStyle: TextStyle = styles.secondaryAmount,
    prefix = "",
  ) => {
    const formattedAmount = formatSecondaryCurrency(amountMinor);

    if (!formattedAmount) return null;

    return (
      <Text style={textStyle}>
        {prefix}
        {formattedAmount}
      </Text>
    );
  };

  const totalBalanceMinor = useMemo(
    () =>
      activeWorkspaceId
        ? getWorkspaceBalance(activeWorkspaceId, accounts, transactions)
        : 0,
    [activeWorkspaceId, accounts, transactions],
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const currentBudgetMonth = `${currentMonthPrefix}-01`;

  useEffect(() => {
    if (!activeWorkspaceId) return;

    void fetchBudgetOverview(activeWorkspaceId, currentBudgetMonth);
  }, [activeWorkspaceId, currentBudgetMonth, fetchBudgetOverview]);

  const monthlyIncomeMinor = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            item.workspaceId === activeWorkspaceId &&
            item.type === "income" &&
            item.date.startsWith(currentMonthPrefix),
        )
        .reduce((total, item) => total + item.amountMinor, 0),
    [activeWorkspaceId, transactions, currentMonthPrefix],
  );

  const monthlyExpensesMinor = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            item.workspaceId === activeWorkspaceId &&
            item.type === "expense" &&
            item.date.startsWith(currentMonthPrefix),
        )
        .reduce((total, item) => total + item.amountMinor, 0),
    [activeWorkspaceId, transactions, currentMonthPrefix],
  );

  const netCashFlowMinor = monthlyIncomeMinor - monthlyExpensesMinor;

  const monthlyTransferInMinor = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            item.workspaceId === activeWorkspaceId &&
            item.type === "transfer_in" &&
            item.date.startsWith(currentMonthPrefix),
        )
        .reduce((total, item) => total + item.amountMinor, 0),
    [activeWorkspaceId, transactions, currentMonthPrefix],
  );

  const monthlyTransferOutMinor = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            item.workspaceId === activeWorkspaceId &&
            item.type === "transfer_out" &&
            item.date.startsWith(currentMonthPrefix),
        )
        .reduce((total, item) => total + item.amountMinor, 0),
    [activeWorkspaceId, transactions, currentMonthPrefix],
  );

  const monthlySpentMinor = useMemo(
    () =>
      activeWorkspaceId
        ? getMonthlySpending(
            activeWorkspaceId,
            transactions,
            currentYear,
            currentMonth,
          )
        : 0,
    [activeWorkspaceId, transactions, currentYear, currentMonth],
  );

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

  const hasCurrentBudget =
    budgetOverview !== null &&
    useBudgetStore.getState().loadedWorkspaceId === activeWorkspaceId &&
    useBudgetStore.getState().loadedBudgetMonth === currentBudgetMonth;

  const budgetAmountLimit = hasCurrentBudget
    ? budgetOverview.budget.amountLimit
    : 0;

  const budgetAmountSpent = hasCurrentBudget ? budgetOverview.amountSpent : 0;

  const budgetRemaining = hasCurrentBudget ? budgetOverview.remainingAmount : 0;

  const budgetProgress =
    budgetAmountLimit > 0 ? budgetAmountSpent / budgetAmountLimit : 0;

  const progressPercentage = Math.round(budgetProgress * 100);

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
      ? "#FCEDEA"
      : budgetStatus === "warning"
        ? "#FFF5E5"
        : colors.primaryLight;

  useEffect(() => {
    if (categories.length === 0 && !categoriesLoading) {
      void fetchCategories();
    }
  }, [categories.length, categoriesLoading, fetchCategories]);

  function handleDeleteWorkspace(id: string, name: string) {
    Alert.alert(
      "Delete workspace?",
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeWorkspace(id);
            } catch (error) {
              console.error("Failed to delete workspace:", error);

              Alert.alert(
                "Unable to delete workspace",
                "Something went wrong. Please try again.",
              );
            }
          },
        },
      ],
      { cancelable: true },
    );
  }

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top"]}>
      <WorkspaceGate>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good morning 👋</Text>
              <Text style={styles.subtitle}>
                Your money, wherever life takes you.
              </Text>
            </View>

            <Pressable
              style={styles.avatar}
              accessibilityRole="button"
              accessibilityLabel="Open profile settings"
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

          {/* Currency converter shortcut */}
          <Pressable
            style={styles.converterShortcut}
            accessibilityRole="button"
            onPress={() => router.push("/currency-converter")}
          >
            <Text style={styles.converterShortcutText}>Currency Converter</Text>
            <ChevronRight size={18} color={colors.primary} />
          </Pressable>

          {/* Workspace selector */}
          <Pressable
            style={styles.countrySelector}
            accessibilityRole="button"
            accessibilityLabel={`Select workspace. Current workspace: ${
              workspace?.name ?? "Workspace"
            }`}
            accessibilityHint="Opens a list of your financial workspaces"
            onPress={() => setWorkspaceSheetVisible(true)}
          >
            <Text style={styles.countryFlag}>
              {getCountryFlag(workspace?.country_code ?? "")}
            </Text>

            <View style={styles.countryInfo}>
              <Text style={styles.countryLabel}>YOUR WORKSPACE</Text>

              <Text style={styles.countryName}>
                {workspace?.name ?? "Workspace"}
              </Text>
            </View>

            <ChevronDown size={20} color={colors.textSecondary} />
          </Pressable>

          {/* Total balance */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceLabelRow}>
                <Wallet size={18} color="#DCE8DD" />
                <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
              </View>

              <View style={styles.currencyBadge}>
                <Text style={styles.currencyBadgeText}>{currency}</Text>
              </View>
            </View>

            <Text style={styles.balanceAmount}>
              {formatCurrency(totalBalanceMinor)}
            </Text>

            {renderSecondaryAmount(
              totalBalanceMinor,
              styles.secondaryBalanceAmount,
            )}

            <Text style={styles.balanceCaption}>Across your accounts</Text>

            <View style={styles.balanceFooter}>
              <View style={styles.balanceFooterRow}>
                <View style={styles.balanceFooterItem}>
                  <View style={styles.balanceFooterLabelRow}>
                    <ArrowDownLeft size={14} color="#DCE8DD" />
                    <Text style={styles.balanceFooterLabel}>INCOME</Text>
                  </View>

                  <Text style={styles.balanceFooterValue}>
                    + {formatCurrency(monthlyIncomeMinor)}
                  </Text>

                  {renderSecondaryAmount(
                    monthlyIncomeMinor,
                    styles.secondaryFooterValue,
                    "+ ",
                  )}
                </View>

                <View style={styles.balanceFooterItem}>
                  <View style={styles.balanceFooterLabelRow}>
                    <ArrowUpRight size={14} color="#DCE8DD" />
                    <Text style={styles.balanceFooterLabel}>SPENDING</Text>
                  </View>

                  <Text style={styles.balanceFooterValue}>
                    − {formatCurrency(monthlySpentMinor)}
                  </Text>

                  {renderSecondaryAmount(
                    monthlySpentMinor,
                    styles.secondaryFooterValue,
                    "− ",
                  )}
                </View>
              </View>

              <View style={styles.balanceFooterDivider} />

              <View style={styles.balanceFooterRow}>
                <View style={styles.balanceFooterItem}>
                  <View style={styles.balanceFooterLabelRow}>
                    <ArrowDownLeft size={14} color="#DCE8DD" />
                    <Text style={styles.balanceFooterLabel}>TRANSFER IN</Text>
                  </View>

                  <Text style={styles.balanceFooterValue}>
                    + {formatCurrency(monthlyTransferInMinor)}
                  </Text>

                  {renderSecondaryAmount(
                    monthlyTransferInMinor,
                    styles.secondaryFooterValue,
                    "+ ",
                  )}
                </View>

                <View style={styles.balanceFooterItem}>
                  <View style={styles.balanceFooterLabelRow}>
                    <ArrowUpRight size={14} color="#DCE8DD" />
                    <Text style={styles.balanceFooterLabel}>TRANSFER OUT</Text>
                  </View>

                  <Text style={styles.balanceFooterValue}>
                    − {formatCurrency(monthlyTransferOutMinor)}
                  </Text>

                  {renderSecondaryAmount(
                    monthlyTransferOutMinor,
                    styles.secondaryFooterValue,
                    "− ",
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Monthly cash flow */}
          <View style={styles.cashFlowCard}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Monthly Cash Flow</Text>
              <Text style={styles.sectionTitle}>This month</Text>
            </View>

            <View style={styles.cashFlowRow}>
              <View style={styles.cashFlowItem}>
                <View style={styles.cashFlowLabel}>
                  <ArrowDownLeft size={16} color={colors.success} />
                  <Text style={styles.cashFlowLabelText}>Income</Text>
                </View>

                <Text
                  style={[styles.cashFlowAmount, { color: colors.success }]}
                >
                  {formatCurrency(monthlyIncomeMinor)}
                </Text>

                {renderSecondaryAmount(monthlyIncomeMinor)}
              </View>

              <View style={styles.cashFlowItem}>
                <View style={styles.cashFlowLabel}>
                  <ArrowUpRight size={16} color={colors.danger} />
                  <Text style={styles.cashFlowLabelText}>Expenses</Text>
                </View>

                <Text style={[styles.cashFlowAmount, { color: colors.danger }]}>
                  {formatCurrency(monthlyExpensesMinor)}
                </Text>

                {renderSecondaryAmount(monthlyExpensesMinor)}
              </View>
            </View>

            <View style={styles.cashFlowDivider} />

            <View style={styles.netCashFlowRow}>
              <Text style={styles.netCashFlowLabel}>Net Cash Flow</Text>

              <View style={styles.netCashFlowValueContainer}>
                <Text
                  style={[
                    styles.netCashFlowAmount,
                    {
                      color:
                        netCashFlowMinor > 0
                          ? colors.success
                          : netCashFlowMinor < 0
                            ? colors.danger
                            : colors.text,
                    },
                  ]}
                >
                  {netCashFlowMinor > 0 ? "+" : netCashFlowMinor < 0 ? "−" : ""}
                  {formatCurrency(Math.abs(netCashFlowMinor))}
                </Text>

                {renderSecondaryAmount(
                  Math.abs(netCashFlowMinor),
                  styles.secondaryAmount,
                  netCashFlowMinor > 0 ? "+" : netCashFlowMinor < 0 ? "−" : "",
                )}
              </View>
            </View>
          </View>

          {/* My Accounts */}
          <SectionHeading
            title="My Accounts"
            action={
              workspaceAccounts.length > 0
                ? `View all (${workspaceAccounts.length})`
                : undefined
            }
            onPress={() => router.push("/accounts/list")}
          />

          <View style={styles.accountCard}>
            {workspaceAccounts.length === 0 ? (
              <View style={styles.accountEmptyState}>
                <Text style={styles.accountEmptyTitle}>No accounts yet</Text>

                <Text style={styles.accountEmptySubtitle}>
                  Add your first account to start tracking your money.
                </Text>
              </View>
            ) : (
              displayedAccounts.map((account, index) => {
                const accountBalance = getAccountBalance(account, transactions);

                return (
                  <View key={account.id}>
                    {index > 0 && <View style={styles.accountDivider} />}

                    <View style={styles.accountRow}>
                      <AccountIcon
                        name={(account.icon ?? "wallet") as accountIconName}
                        color={account.color ?? colors.primary}
                        size={44}
                        iconSize={21}
                      />

                      <View style={styles.accountDetails}>
                        <Text style={styles.accountName} numberOfLines={1}>
                          {account.name}
                        </Text>

                        <Text style={styles.accountType}>
                          {account.type === "e-wallet"
                            ? "E-wallet"
                            : account.type.charAt(0).toUpperCase() +
                              account.type.slice(1)}
                        </Text>
                      </View>

                      <View style={styles.accountBalanceContainer}>
                        <Text style={styles.accountBalance}>
                          {formatCurrency(accountBalance)}
                        </Text>

                        {renderSecondaryAmount(
                          accountBalance,
                          styles.secondaryAccountBalance,
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
              <Text style={styles.accountAddButtonText}>Add Account</Text>
            </Pressable>
          </View>

          {/* Monthly budget */}
          <SectionHeading
            title="Monthly budget"
            action={hasCurrentBudget ? "View budget" : undefined}
            onPress={() => router.push("/(tabs)/budget")}
          />

          <View style={styles.card}>
            {budgetLoading && !hasCurrentBudget ? (
              <View style={styles.budgetEmptyState}>
                <Text style={styles.transactionSubtitle}>
                  Loading your monthly budget...
                </Text>
              </View>
            ) : budgetError && !hasCurrentBudget ? (
              <View style={styles.budgetEmptyState}>
                <Text style={styles.accountEmptyTitle}>
                  Unable to load budget
                </Text>

                <Text style={styles.accountEmptySubtitle}>
                  Please try again.
                </Text>

                <Pressable
                  onPress={() => {
                    if (activeWorkspaceId) {
                      void fetchBudgetOverview(
                        activeWorkspaceId,
                        currentBudgetMonth,
                      );
                    }
                  }}
                  style={styles.budgetCreateButton}
                >
                  <Text style={styles.budgetCreateButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : !hasCurrentBudget ? (
              <View style={styles.budgetEmptyState}>
                <Wallet size={28} color={colors.primary} />

                <Text style={styles.accountEmptyTitle}>
                  No budget set for this month
                </Text>

                <Text style={styles.accountEmptySubtitle}>
                  Create a monthly budget to keep track of your spending.
                </Text>

                <Pressable
                  style={styles.budgetCreateButton}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/budget/new",
                      params: { month: currentBudgetMonth },
                    })
                  }
                >
                  <Plus size={17} color="#FFFFFF" />
                  <Text style={styles.budgetCreateButtonText}>
                    Create budget
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.budgetTopRow}>
                  <View>
                    <Text style={styles.cardEyebrow}>TOTAL SPENT</Text>

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
                      {progressPercentage}% used
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
                    <Text style={styles.budgetCaption}>Monthly limit</Text>

                    <Text style={styles.budgetValue}>
                      {formatCurrency(budgetAmountLimit)}
                    </Text>

                    {renderSecondaryAmount(budgetAmountLimit)}
                  </View>

                  <View style={styles.remainingContainer}>
                    <Text style={styles.budgetCaption}>
                      {budgetRemaining < 0 ? "Over budget" : "Remaining"}
                    </Text>

                    <Text
                      style={[
                        styles.remainingValue,
                        budgetRemaining < 0 && { color: colors.danger },
                      ]}
                    >
                      {formatCurrency(Math.abs(budgetRemaining))}
                    </Text>

                    {renderSecondaryAmount(Math.abs(budgetRemaining))}
                  </View>
                </View>

                {budgetStatus === "warning" && (
                  <Text style={styles.budgetStatusMessage}>
                    You've used at least 80% of your monthly budget.
                  </Text>
                )}

                {budgetStatus === "over" && (
                  <Text
                    style={[
                      styles.budgetStatusMessage,
                      { color: colors.danger },
                    ]}
                  >
                    You've exceeded your monthly spending limit.
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Recent transactions */}

          {/* Recent transactions */}
          <SectionHeading
            title="Recent transactions"
            action="See all"
            onPress={() => router.push("/transactions")}
          />

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <Pressable
              style={styles.primaryAction}
              accessibilityRole="button"
              accessibilityLabel="Add transaction"
              onPress={() => router.push("/transactions/new")}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Add transaction</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryAction}
              accessibilityRole="button"
              accessibilityLabel="View transactions"
              onPress={() => router.push("/transactions")}
            >
              <Wallet size={20} color={colors.primary} />
            </Pressable>
          </View>

          {/* Transaction list */}
          <View style={styles.transactionCard}>
            {recentTransactions.length === 0 ? (
              <Text style={styles.transactionSubtitle}>
                No transactions yet.
              </Text>
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

          <Text style={styles.footerNote}>
            Small steps today, more freedom tomorrow.
          </Text>

          {/* Workspace selection modal */}
          <BottomSheetModal
            visible={workspaceSheetVisible}
            onClose={() => setWorkspaceSheetVisible(false)}
            title="Your workspaces"
            subtitle="Choose where you want to manage your money."
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
                      isActive ? ", currently selected" : ""
                    }`}
                    onPress={() => {
                      setActiveWorkspace(item.id);
                      setWorkspaceSheetVisible(false);
                    }}
                  >
                    {isActive && <Check size={20} color={colors.primary} />}

                    <View style={styles.workspaceOptionFlag}>
                      <Text style={styles.workspaceOptionCurrency}>
                        {item.currency_code}
                      </Text>
                    </View>

                    <View style={styles.workspaceOptionInfo}>
                      <Text style={styles.workspaceOptionName}>
                        {item.name}
                      </Text>

                      <Text style={styles.workspaceOptionCurrency}>
                        {item.currency_code}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={styles.workspaceActionButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.name}`}
                    hitSlop={8}
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
                    accessibilityLabel={`Delete ${item.name}`}
                    hitSlop={8}
                    onPress={() => handleDeleteWorkspace(item.id, item.name)}
                  >
                    <Trash2 size={17} color={colors.danger} />
                  </Pressable>
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
              <Text style={styles.addWorkspaceButtonText}>Add workspace</Text>
            </Pressable>
          </BottomSheetModal>
        </ScrollView>
      </WorkspaceGate>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  greeting: {
    color: colors.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
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

  converterShortcut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  converterShortcutText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },

  countryFlag: {
    fontSize: 28,
  },

  countryInfo: {
    flex: 1,
    gap: spacing.xs,
  },

  countryLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.8,
  },

  countryName: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
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
    color: "#DCE8DD",
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
  },

  currencyBadge: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },

  currencyBadgeText: {
    color: "#FFFFFF",
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: typography.weight.bold,
    marginTop: spacing.lg,
  },

  balanceCaption: {
    color: "#DCE8DD",
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },

  secondaryAmount: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginTop: 3,
  },

  secondaryBalanceAmount: {
    color: "#DCE8DD",
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },

  balanceFooter: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    gap: spacing.md,
  },

  balanceFooterRow: {
    flexDirection: "row",
    gap: spacing.md,
  },

  balanceFooterItem: {
    flex: 1,
    gap: spacing.xs,
  },

  balanceFooterLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  balanceFooterLabel: {
    color: "#DCE8DD",
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },

  balanceFooterValue: {
    color: "#FFFFFF",
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  secondaryFooterValue: {
    color: "#DCE8DD",
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },

  balanceFooterDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
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

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  cashFlowCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cashFlowRow: {
    flexDirection: "row",
    gap: spacing.md,
  },

  cashFlowItem: {
    flex: 1,
    gap: spacing.sm,
  },

  cashFlowLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  cashFlowLabelText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },

  cashFlowAmount: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  cashFlowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  netCashFlowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  netCashFlowLabel: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },

  netCashFlowValueContainer: {
    alignItems: "flex-end",
  },

  netCashFlowAmount: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  quickActions: {
    flexDirection: "row",
    gap: spacing.md,
  },

  primaryAction: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
    minHeight: 52,
  },

  primaryActionText: {
    color: "#FFFFFF",
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  secondaryAction: {
    width: 52,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  budgetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  cardEyebrow: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.6,
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
    marginTop: spacing.lg,
  },

  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },

  budgetBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.lg,
  },

  budgetCaption: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  budgetValue: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xs,
  },

  remainingContainer: {
    alignItems: "flex-end",
  },

  remainingValue: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xs,
  },

  budgetStatusMessage: {
    color: colors.warning,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    marginTop: spacing.md,
  },

  budgetEmptyState: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },

  budgetCreateButton: {
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

  budgetCreateButtonText: {
    color: "#FFFFFF",
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },

  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  accountDetails: {
    flex: 1,
    gap: spacing.xs,
  },

  accountName: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  accountType: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  accountBalanceContainer: {
    alignItems: "flex-end",
    gap: 2,
  },

  accountBalance: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  secondaryAccountBalance: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  accountDivider: {
    height: 1,
    backgroundColor: colors.border,
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

  accountEmptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },

  accountEmptyTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  accountEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: "center",
  },

  transactionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },

  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  transactionDetails: {
    flex: 1,
    gap: spacing.xs,
  },

  transactionTitle: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  transactionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  transactionAmountContainer: {
    alignItems: "flex-end",
    gap: 2,
  },

  transactionAmount: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  secondaryTransactionAmount: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  incomeAmount: {
    color: colors.success,
  },

  transactionDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  footerNote: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },

  workspaceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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

  workspaceOptionFlag: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  workspaceOptionInfo: {
    flex: 1,
    gap: spacing.xs,
  },

  workspaceOptionName: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  workspaceOptionCurrency: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  workspaceOptionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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
