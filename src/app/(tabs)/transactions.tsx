import { useRouter } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react-native";

import { SafeScreen } from "@/components/layout/safe-screen";
import {
  AppliedFilterChips,
  buildAppliedFilters,
} from "@/components/transactions/applied-filter-chips";
import type {
  PeriodFilter,
  SortFilter,
} from "@/components/transactions/transaction-filter-modal";
import {
  TransactionFilterModal,
  periods,
} from "@/components/transactions/transaction-filter-modal";
import { TransactionList } from "@/components/transactions/transaction-list";

import { getCountryByCode } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatMoney } from "@/lib/finance/calculations";
import { getCurrencyDecimalDigits } from "@/lib/finance/currency";
import { formatConvertedMoney } from "@/lib/finance/currency-converter";

import { useCategoryStore } from "@/stores/use-category-store";
import { useCurrencyConverterStore } from "@/stores/use-currency-converter-store";
import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

type transactionFilter = "all" | "expense" | "income" | "transfers";

const filters: { label: string; value: transactionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Expenses", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Transfers", value: "transfers" },
];

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime()) && toISODate(date) === value;
}

function getPeriodRange(
  period: PeriodFilter,
  customStartDate: string,
  customEndDate: string,
) {
  const now = new Date();
  const today = toISODate(now);

  switch (period) {
    case "this_month":
      return {
        start: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: today,
      };

    case "last_month":
      return {
        start: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };

    case "last_3_months":
      return {
        start: toISODate(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        end: today,
      };

    case "this_year":
      return {
        start: `${now.getFullYear()}-01-01`,
        end: today,
      };

    case "custom":
      if (
        isValidDate(customStartDate) &&
        isValidDate(customEndDate) &&
        customStartDate <= customEndDate
      ) {
        return {
          start: customStartDate,
          end: customEndDate,
        };
      }

      return null;

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Flow stat                                                                   */
/* -------------------------------------------------------------------------- */

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

export default function TransactionsScreen() {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<transactionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("all");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [minimumAmount, setMinimumAmount] = useState("");
  const [maximumAmount, setMaximumAmount] = useState("");

  const [sortBy, setSortBy] = useState<SortFilter>("newest");

  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );

  const workspaces = useWorkspaceStore((state) => state.workspaces);

  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);

  const transactionsLoading = useFinanceStore(
    (state) => state.transactionsLoading,
  );

  const transactionsError = useFinanceStore((state) => state.transactionsError);

  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);

  const fetchTransfers = useFinanceStore((state) => state.fetchTransfers);

  const categories = useCategoryStore((state) => state.categories);

  const converter = useCurrencyConverterStore((state) => state.converter);

  const loadedWorkspaceId = useCurrencyConverterStore(
    (state) => state.loadedWorkspaceId,
  );

  const fetchConverter = useCurrencyConverterStore(
    (state) => state.fetchConverter,
  );

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);
  const currency = workspace?.currency_code ?? "MYR";
  const flag = getCountryByCode(workspace?.country_code ?? "")?.flag ?? "🌍";

  const activeConverter =
    loadedWorkspaceId === activeWorkspaceId ? converter : null;

  const workspaceAccounts = useMemo(
    () =>
      accounts.filter((account) => account.workspaceId === activeWorkspaceId),
    [accounts, activeWorkspaceId],
  );

  const activeCategories = useMemo(
    () => categories.filter((category) => !category.isArchived),
    [categories],
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const renderSecondaryAmount = (amountMinor: number) => {
    if (!activeConverter) return null;

    const formatted = formatConvertedMoney(
      amountMinor,
      currency,
      activeConverter,
    );

    if (!formatted) return null;

    return <Text style={styles.secondaryAmount}>≈ {formatted}</Text>;
  };

  const workspaceTransactions = useMemo(
    () => transactions.filter((item) => item.workspaceId === activeWorkspaceId),
    [transactions, activeWorkspaceId],
  );

  const dateRange = useMemo(
    () => getPeriodRange(selectedPeriod, customStartDate, customEndDate),
    [selectedPeriod, customStartDate, customEndDate],
  );

  const customDateIsInvalid = selectedPeriod === "custom" && dateRange === null;

  const amountIsInvalid =
    (minimumAmount.trim() !== "" &&
      (!Number.isFinite(Number(minimumAmount)) || Number(minimumAmount) < 0)) ||
    (maximumAmount.trim() !== "" &&
      (!Number.isFinite(Number(maximumAmount)) || Number(maximumAmount) < 0)) ||
    (minimumAmount.trim() !== "" &&
      maximumAmount.trim() !== "" &&
      Number(minimumAmount) > Number(maximumAmount));

  const activeAdvancedFilterCount =
    (selectedPeriod !== "all" ? 1 : 0) +
    (selectedCategoryIds.length > 0 ? 1 : 0) +
    (selectedAccountIds.length > 0 ? 1 : 0) +
    (minimumAmount.trim() !== "" || maximumAmount.trim() !== "" ? 1 : 0);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const decimalDigits = getCurrencyDecimalDigits(currency);

    const minimumMinor =
      minimumAmount.trim() !== ""
        ? Number(minimumAmount) * 10 ** decimalDigits
        : null;

    const maximumMinor =
      maximumAmount.trim() !== ""
        ? Number(maximumAmount) * 10 ** decimalDigits
        : null;

    const result = workspaceTransactions.filter((item) => {
      if (activeFilter === "transfers") {
        if (item.type !== "transfer_out" && item.type !== "transfer_in") {
          return false;
        }
      } else if (activeFilter !== "all" && item.type !== activeFilter) {
        return false;
      }

      if (query) {
        const category = item.categoryId
          ? categoryMap.get(item.categoryId)
          : undefined;

        const account = accountMap.get(item.accountId);

        const searchableText = [
          item.description ?? "",
          category?.name ?? "",
          account?.name ?? "",
          item.type.replace("_", " "),
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(query)) return false;
      }

      if (dateRange) {
        const transactionDate = item.date.slice(0, 10);

        if (
          transactionDate < dateRange.start ||
          transactionDate > dateRange.end
        ) {
          return false;
        }
      }

      if (
        selectedCategoryIds.length > 0 &&
        (!item.categoryId || !selectedCategoryIds.includes(item.categoryId))
      ) {
        return false;
      }

      if (
        selectedAccountIds.length > 0 &&
        !selectedAccountIds.includes(item.accountId)
      ) {
        return false;
      }

      if (minimumMinor !== null && item.amountMinor < minimumMinor) {
        return false;
      }

      if (maximumMinor !== null && item.amountMinor > maximumMinor) {
        return false;
      }

      return true;
    });

    return result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            a.date.localeCompare(b.date) ||
            a.createdAt.localeCompare(b.createdAt)
          );

        case "highest":
          return b.amountMinor - a.amountMinor;

        case "lowest":
          return a.amountMinor - b.amountMinor;

        case "newest":
        default:
          return (
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt)
          );
      }
    });
  }, [
    workspaceTransactions,
    activeFilter,
    searchQuery,
    dateRange,
    selectedCategoryIds,
    selectedAccountIds,
    minimumAmount,
    maximumAmount,
    currency,
    categoryMap,
    accountMap,
    sortBy,
  ]);

  const totals = useMemo(() => {
    const result = {
      income: 0,
      expenses: 0,
      transferIn: 0,
      transferOut: 0,
    };

    for (const item of workspaceTransactions) {
      if (item.type === "income") result.income += item.amountMinor;
      else if (item.type === "expense") result.expenses += item.amountMinor;
      else if (item.type === "transfer_in") {
        result.transferIn += item.amountMinor;
      } else if (item.type === "transfer_out") {
        result.transferOut += item.amountMinor;
      }
    }

    return result;
  }, [workspaceTransactions]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveFilter("all");
    setSelectedPeriod("all");
    setSelectedCategoryIds([]);
    setSelectedAccountIds([]);
    setCustomStartDate("");
    setCustomEndDate("");
    setMinimumAmount("");
    setMaximumAmount("");
    setSortBy("newest");
  };

  // Used by the chips' "Clear all": resets the filters the chips represent,
  // but leaves the search text and the All/Expenses/Income/Transfers pills alone.
  const clearAdvancedFilters = () => {
    setSelectedPeriod("all");
    setSelectedCategoryIds([]);
    setSelectedAccountIds([]);
    setCustomStartDate("");
    setCustomEndDate("");
    setMinimumAmount("");
    setMaximumAmount("");
    setSortBy("newest");
  };

  const handleRetry = () => {
    if (!activeWorkspaceId) return;

    void fetchTransactions(activeWorkspaceId);
    void fetchTransfers(activeWorkspaceId);
  };

  useEffect(() => {
    if (!activeWorkspaceId) return;

    void fetchTransactions(activeWorkspaceId);
    void fetchTransfers(activeWorkspaceId);
    void fetchConverter(activeWorkspaceId);
  }, [activeWorkspaceId, fetchTransactions, fetchTransfers, fetchConverter]);

  const getEmptyStateMessage = () => {
    if (
      searchQuery.trim() ||
      activeAdvancedFilterCount > 0 ||
      activeFilter !== "all"
    ) {
      return {
        title: "No matching transactions",
        description: "Try changing your search or adjusting your filters.",
      };
    }

    return {
      title: "No transactions yet",
      description: "Your transactions will appear here.",
    };
  };

  const count = filteredTransactions.length;

  const selectedPeriodLabel =
    periods.find((item) => item.value === selectedPeriod)?.label ?? "All time";

  const appliedFilters = buildAppliedFilters({
    selectedPeriod,
    periodLabel: selectedPeriodLabel,
    dateRange,
    selectedCategoryIds,
    selectedAccountIds,
    minimumAmount,
    maximumAmount,
    sortBy,
    currency,
    categories,
    accounts,
    onClearPeriod: () => {
      setSelectedPeriod("all");
      setCustomStartDate("");
      setCustomEndDate("");
    },
    onRemoveCategory: (id) =>
      setSelectedCategoryIds((prev) => prev.filter((item) => item !== id)),
    onRemoveAccount: (id) =>
      setSelectedAccountIds((prev) => prev.filter((item) => item !== id)),
    onClearAmount: () => {
      setMinimumAmount("");
      setMaximumAmount("");
    },
    onClearSort: () => setSortBy("newest"),
  });

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top"]}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={[2]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Transactions</Text>
              <Text style={styles.subtitle}>
                Track your money in {workspace?.name ?? "your workspace"}.
              </Text>
            </View>

            <View style={styles.workspaceChip}>
              <Text style={styles.workspaceChipFlag}>{flag}</Text>
              <Text style={styles.workspaceChipText}>{currency}</Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <Text style={styles.summaryCaption}>All time</Text>
            </View>

            <View style={styles.flowRow}>
              <FlowStat
                label="Total income"
                direction="in"
                tone="success"
                amountColor={colors.success}
                amount={formatMoney(totals.income, currency)}
                secondary={renderSecondaryAmount(totals.income)}
              />

              <FlowStat
                label="Total expenses"
                direction="out"
                tone="danger"
                amountColor={colors.danger}
                amount={formatMoney(totals.expenses, currency)}
                secondary={renderSecondaryAmount(totals.expenses)}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.flowRow}>
              <FlowStat
                label="Transfer in"
                direction="in"
                tone="neutral"
                amountColor={colors.text}
                amount={formatMoney(totals.transferIn, currency)}
                secondary={renderSecondaryAmount(totals.transferIn)}
              />

              <FlowStat
                label="Transfer out"
                direction="out"
                tone="neutral"
                amountColor={colors.text}
                amount={formatMoney(totals.transferOut, currency)}
                secondary={renderSecondaryAmount(totals.transferOut)}
              />
            </View>
          </View>

          {/* Search and filters */}
          <View style={styles.filterArea}>
            <View style={styles.searchRow}>
              <View style={styles.searchInputContainer}>
                <Search size={18} color={colors.textSecondary} />

                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search transactions..."
                  placeholderTextColor={colors.textSecondary}
                  style={styles.searchInput}
                  returnKeyType="search"
                />

                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <X size={17} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>

              <Pressable
                onPress={() => setIsFilterVisible(true)}
                style={styles.filterIconButton}
                accessibilityRole="button"
                accessibilityLabel="Open transaction filters"
              >
                <Filter size={19} color={colors.primary} />

                {activeAdvancedFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {activeAdvancedFilterCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            <AppliedFilterChips
              filters={appliedFilters}
              onClearAll={clearAdvancedFilters}
            />

            <View style={styles.filterRow}>
              {filters.map((filter) => {
                const selected = activeFilter === filter.value;

                return (
                  <Pressable
                    key={filter.value}
                    onPress={() => setActiveFilter(filter.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.filterButton,
                      selected && styles.filterButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selected && styles.filterTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* List header */}
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <Text style={styles.count}>
              {count} {count === 1 ? "transaction" : "transactions"}
            </Text>
          </View>

          {/* Transaction list */}
          {transactionsLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyDescription}>
                Loading transactions...
              </Text>
            </View>
          ) : transactionsError ? (
            <View style={styles.emptyState}>
              <Wallet size={32} color={colors.danger} />
              <Text style={styles.emptyTitle}>Unable to load transactions</Text>
              <Text style={styles.emptyDescription}>{transactionsError}</Text>

              <Pressable
                onPress={handleRetry}
                style={styles.retryButton}
                accessibilityRole="button"
              >
                <RefreshCw size={16} color={colors.textOnPrimary} />
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Wallet size={32} color={colors.textSecondary} />

              <Text style={styles.emptyTitle}>
                {getEmptyStateMessage().title}
              </Text>

              <Text style={styles.emptyDescription}>
                {getEmptyStateMessage().description}
              </Text>

              {(searchQuery.trim() ||
                activeAdvancedFilterCount > 0 ||
                activeFilter !== "all") && (
                <Pressable onPress={clearAllFilters} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Clear filters</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.transactionCard}>
              <TransactionList
                transactions={filteredTransactions}
                accounts={accounts}
                primaryCurrency={currency}
                converter={activeConverter}
                onTransactionPress={(item) =>
                  router.push({
                    pathname: "/transactions/[id]",
                    params: { id: item.id },
                  })
                }
              />
            </View>
          )}
        </ScrollView>

        {/* Floating add button */}
        <Pressable
          onPress={() => router.push("/transactions/new")}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
        >
          <Plus size={26} color={colors.textOnPrimary} />
        </Pressable>
      </View>

      {/* Filter modal */}
      <TransactionFilterModal
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        onApply={() => setIsFilterVisible(false)}
        onClear={clearAllFilters}
        categories={activeCategories}
        accounts={workspaceAccounts}
        currency={currency}
        transactionCount={count}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        selectedCategoryIds={selectedCategoryIds}
        onCategoryChange={setSelectedCategoryIds}
        selectedAccountIds={selectedAccountIds}
        onAccountChange={setSelectedAccountIds}
        customStartDate={customStartDate}
        onStartDateChange={setCustomStartDate}
        customEndDate={customEndDate}
        onEndDateChange={setCustomEndDate}
        minimumAmount={minimumAmount}
        onMinimumAmountChange={setMinimumAmount}
        maximumAmount={maximumAmount}
        onMaximumAmountChange={setMaximumAmount}
        sortBy={sortBy}
        onSortChange={setSortBy}
        customDateIsInvalid={customDateIsInvalid}
        amountIsInvalid={amountIsInvalid}
      />
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 96,
    gap: spacing.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: colors.text,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },

  workspaceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },

  workspaceChipFlag: {
    fontSize: 16,
  },

  workspaceChipText: {
    color: colors.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  summaryCaption: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  flowRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },

  flowStat: {
    flex: 1,
    minWidth: 0,
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
    minWidth: 0,
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

  secondaryAmount: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  filterArea: {
    backgroundColor: colors.background,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },

  searchRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },

  searchInputContainer: {
    flex: 1,
    minWidth: 0,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.size.sm,
    paddingVertical: 0,
  },

  filterIconButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    position: "relative",
  },

  filterBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  filterBadgeText: {
    color: colors.textOnPrimary,
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },

  filterRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
  },

  filterButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  filterTextActive: {
    color: colors.textOnPrimary,
  },

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  count: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },

  emptyState: {
    padding: spacing.xxxl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.sm,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    textAlign: "center",
  },

  emptyDescription: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },

  retryButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  clearButton: {
    marginTop: spacing.sm,
    padding: spacing.sm,
  },

  clearButtonText: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.sm,
  },

  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: "#202824",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  fabPressed: {
    backgroundColor: colors.primaryDark,
  },
});
