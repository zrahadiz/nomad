import { useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Wallet,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

import { formatMoney } from "@/lib/finance/calculations";
import { useFinanceStore } from "@/stores/use-finance-store";
import type { transactionType } from "@/types/finances";

import { Plus } from "lucide-react-native";

type transactionFilter = "all" | transactionType;

const filters: { label: string; value: transactionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Expenses", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Transfers", value: "transfer" },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<transactionFilter>("all");

  const activeWorkspaceId = useFinanceStore((state) => state.activeWorkspaceId);
  const workspaces = useFinanceStore((state) => state.workspaces);
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);

  const currency = workspace?.currency ?? "MYR";

  const workspaceTransactions = useMemo(
    () => transactions.filter((item) => item.workspaceId === activeWorkspaceId),
    [transactions, activeWorkspaceId],
  );

  const filteredTransactions = useMemo(() => {
    const result =
      activeFilter === "all"
        ? workspaceTransactions
        : workspaceTransactions.filter((item) => item.type === activeFilter);

    return [...result].sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  }, [workspaceTransactions, activeFilter]);

  const totalIncome = workspaceTransactions
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + item.amountMinor, 0);

  const totalExpenses = workspaceTransactions
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + item.amountMinor, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          Track your money in {workspace?.name ?? "your workspace"}.
        </Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <ArrowDownLeft size={18} color={colors.success} />
          </View>

          <Text style={styles.summaryLabel}>Total income</Text>
          <Text style={[styles.summaryAmount, styles.incomeText]}>
            {formatMoney(totalIncome, currency)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <ArrowUpRight size={18} color={colors.danger} />
          </View>

          <Text style={styles.summaryLabel}>Total expenses</Text>
          <Text style={styles.summaryAmount}>
            {formatMoney(totalExpenses, currency)}
          </Text>
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
                style={[styles.filterText, selected && styles.filterTextActive]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/transactions/new")}
        style={styles.addButton}
      >
        <Plus size={20} color={colors.surface} />

        <Text style={styles.addButtonText}>Add transaction</Text>
      </Pressable>

      {/* Transaction list */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <Text style={styles.count}>
          {filteredTransactions.length} transactions
        </Text>
      </View>

      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Wallet size={32} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyDescription}>
            Your transactions will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.transactionCard}>
          {filteredTransactions.map((item, index) => {
            const account = accounts.find(
              (account) => account.id === item.accountId,
            );

            const isIncome = item.type === "income";
            const isTransfer = item.type === "transfer";

            const Icon = isTransfer
              ? ArrowLeftRight
              : isIncome
                ? ArrowDownLeft
                : ArrowUpRight;

            return (
              <View key={item.id}>
                {index > 0 && <View style={styles.divider} />}

                <View style={styles.transactionRow}>
                  <View style={styles.transactionIcon}>
                    <Icon size={20} color={colors.primary} />
                  </View>

                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                      {item.description || "Untitled transaction"}
                    </Text>

                    <Text style={styles.transactionSubtitle}>
                      {account?.name ?? "Unknown account"} · {item.date}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      isIncome && styles.incomeText,
                    ]}
                  >
                    {isTransfer ? "" : isIncome ? "+" : "−"}
                    {formatMoney(item.amountMinor, item.currency)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
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
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
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
});
