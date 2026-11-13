import { useRouter } from "expo-router";

import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react-native";

import { SafeScreen } from "@/components/layout/safe-screen";
import { TransactionList } from "@/components/transactions/transaction-list";

import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatMoney } from "@/lib/finance/calculations";
import { formatConvertedMoney } from "@/lib/finance/currency-converter";
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

export default function TransactionsScreen() {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<transactionFilter>("all");

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

  // Currency converter
  const converter = useCurrencyConverterStore((state) => state.converter);
  const loadedWorkspaceId = useCurrencyConverterStore(
    (state) => state.loadedWorkspaceId,
  );
  const fetchConverter = useCurrencyConverterStore(
    (state) => state.fetchConverter,
  );

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);

  const currency = workspace?.currency_code ?? "MYR";

  // Prevent displaying another workspace's converter while loading.
  const activeConverter =
    loadedWorkspaceId === activeWorkspaceId ? converter : null;

  // Format a secondary currency amount.
  const getSecondaryAmount = (
    amountMinor: number,
    transactionCurrency = currency,
  ) => {
    if (!activeConverter || transactionCurrency !== currency) {
      return null;
    }

    return formatConvertedMoney(
      amountMinor,
      transactionCurrency,
      activeConverter,
    );
  };

  // Only show transactions belonging to the active workspace.
  const workspaceTransactions = useMemo(
    () => transactions.filter((item) => item.workspaceId === activeWorkspaceId),
    [transactions, activeWorkspaceId],
  );

  // Apply the selected transaction filter and sort by date.
  const filteredTransactions = useMemo(() => {
    const result =
      activeFilter === "all"
        ? workspaceTransactions
        : activeFilter === "transfers"
          ? workspaceTransactions.filter(
              (item) =>
                item.type === "transfer_out" || item.type === "transfer_in",
            )
          : workspaceTransactions.filter((item) => item.type === activeFilter);

    return [...result].sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  }, [workspaceTransactions, activeFilter]);

  // Income and expenses exclude transfers.
  const totalIncome = useMemo(
    () =>
      workspaceTransactions
        .filter((item) => item.type === "income")
        .reduce((total, item) => total + item.amountMinor, 0),
    [workspaceTransactions],
  );

  const totalExpenses = useMemo(
    () =>
      workspaceTransactions
        .filter((item) => item.type === "expense")
        .reduce((total, item) => total + item.amountMinor, 0),
    [workspaceTransactions],
  );

  const totalTransferIn = useMemo(
    () =>
      workspaceTransactions
        .filter((item) => item.type === "transfer_in")
        .reduce((total, item) => total + item.amountMinor, 0),
    [workspaceTransactions],
  );

  const totalTransferOut = useMemo(
    () =>
      workspaceTransactions
        .filter((item) => item.type === "transfer_out")
        .reduce((total, item) => total + item.amountMinor, 0),
    [workspaceTransactions],
  );

  const handleRetry = () => {
    if (!activeWorkspaceId) return;

    void fetchTransactions(activeWorkspaceId);
    void fetchTransfers(activeWorkspaceId);
  };

  // Fetch data whenever the active workspace changes.
  useEffect(() => {
    if (!activeWorkspaceId) return;

    void fetchTransactions(activeWorkspaceId);
    void fetchTransfers(activeWorkspaceId);
    void fetchConverter(activeWorkspaceId);
  }, [activeWorkspaceId, fetchTransactions, fetchTransfers, fetchConverter]);

  const getEmptyStateMessage = () => {
    switch (activeFilter) {
      case "expense":
        return {
          title: "No expenses yet",
          description: "Your expenses will appear here.",
        };

      case "income":
        return {
          title: "No income yet",
          description: "Your income transactions will appear here.",
        };

      case "transfers":
        return {
          title: "No transfers yet",
          description: "Your transfers will appear here.",
        };

      default:
        return {
          title: "No transactions yet",
          description: "Your transactions will appear here.",
        };
    }
  };

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Text style={styles.title}>Transactions</Text>

          <Text style={styles.subtitle}>
            Track your money in {workspace?.name ?? "your workspace"}.
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          {/* Income and expenses */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <ArrowDownLeft size={18} color={colors.success} />
              </View>

              <Text style={styles.summaryLabel}>Total income</Text>

              <Text style={[styles.summaryAmount, styles.incomeText]}>
                {formatMoney(totalIncome, currency)}
              </Text>

              {getSecondaryAmount(totalIncome) && (
                <Text style={styles.secondaryAmount}>
                  {getSecondaryAmount(totalIncome)}
                </Text>
              )}
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <ArrowUpRight size={18} color={colors.danger} />
              </View>

              <Text style={styles.summaryLabel}>Total expenses</Text>

              <Text style={styles.summaryAmount}>
                {formatMoney(totalExpenses, currency)}
              </Text>

              {getSecondaryAmount(totalExpenses) && (
                <Text style={styles.secondaryAmount}>
                  {getSecondaryAmount(totalExpenses)}
                </Text>
              )}
            </View>
          </View>

          {/* Transfers */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <ArrowDownLeft size={18} color={colors.success} />
              </View>

              <Text style={styles.summaryLabel}>Transfer in</Text>

              <Text style={[styles.summaryAmount, styles.incomeText]}>
                {formatMoney(totalTransferIn, currency)}
              </Text>

              {getSecondaryAmount(totalTransferIn) && (
                <Text style={styles.secondaryAmount}>
                  {getSecondaryAmount(totalTransferIn)}
                </Text>
              )}
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <ArrowUpRight size={18} color={colors.danger} />
              </View>

              <Text style={styles.summaryLabel}>Transfer out</Text>

              <Text style={[styles.summaryAmount, styles.expenseText]}>
                {formatMoney(totalTransferOut, currency)}
              </Text>

              {getSecondaryAmount(totalTransferOut) && (
                <Text style={styles.secondaryAmount}>
                  {getSecondaryAmount(totalTransferOut)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
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
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Add transaction */}
        <Pressable
          onPress={() => router.push("/transactions/new")}
          style={styles.addButton}
          accessibilityRole="button"
        >
          <Plus size={20} color={colors.surface} />

          <Text style={styles.addButtonText}>Add transaction</Text>
        </Pressable>

        {/* Transaction list header */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Activity</Text>

          <Text style={styles.count}>
            {filteredTransactions.length} transactions
          </Text>
        </View>

        {/* Loading state */}
        {transactionsLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />

            <Text style={styles.emptyDescription}>Loading transactions...</Text>
          </View>
        ) : transactionsError ? (
          /* Error state */
          <View style={styles.emptyState}>
            <Wallet size={32} color={colors.danger} />

            <Text style={styles.emptyTitle}>Unable to load transactions</Text>

            <Text style={styles.emptyDescription}>{transactionsError}</Text>

            <Pressable
              onPress={handleRetry}
              style={styles.retryButton}
              accessibilityRole="button"
            >
              <RefreshCw size={16} color={colors.surface} />

              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : filteredTransactions.length === 0 ? (
          /* Empty state */
          <View style={styles.emptyState}>
            <Wallet size={32} color={colors.textSecondary} />

            <Text style={styles.emptyTitle}>
              {getEmptyStateMessage().title}
            </Text>

            <Text style={styles.emptyDescription}>
              {getEmptyStateMessage().description}
            </Text>
          </View>
        ) : (
          /* Transactions */
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
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },

  title: {
    color: colors.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },

  summaryContainer: {
    gap: spacing.md,
  },

  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },

  expenseText: {
    color: colors.danger,
  },

  summaryCard: {
    flex: 1,
    minWidth: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },

  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  summaryAmount: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },

  secondaryAmount: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  incomeText: {
    color: colors.success,
  },

  filterRow: {
    gap: spacing.sm,
  },

  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
    color: "#FFFFFF",
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },

  addButtonText: {
    color: colors.surface,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },

  count: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },

  transactionIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },

  transactionDetails: {
    flex: 1,
    minWidth: 0,
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

  transactionAmounts: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },

  transactionAmount: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  emptyState: {
    padding: spacing.xxxl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.sm,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
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
    color: colors.surface,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
