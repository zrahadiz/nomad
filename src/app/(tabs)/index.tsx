import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Wallet,
} from "lucide-react-native";

import { useRouter } from "expo-router";
import { useMemo } from "react";

import { useFinanceStore } from "@/stores/use-finance-store";

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";
import {
  formatMoney,
  getMonthlySpending,
  getWorkspaceBalance,
} from "@/lib/finance/calculations";

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
  const activeWorkspaceId = useFinanceStore((state) => state.activeWorkspaceId);

  const workspaces = useFinanceStore((state) => state.workspaces);

  const accounts = useFinanceStore((state) => state.accounts);

  const transactions = useFinanceStore((state) => state.transactions);

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);

  const currency = workspace?.currency ?? "MYR";

  const totalBalanceMinor = useMemo(
    () => getWorkspaceBalance(activeWorkspaceId, accounts, transactions),
    [activeWorkspaceId, accounts, transactions],
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const monthlyIncomeMinor = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            item.workspaceId === activeWorkspaceId &&
            item.type === "income" &&
            item.date.startsWith(
              `${currentYear}-${String(currentMonth).padStart(2, "0")}`,
            ),
        )
        .reduce((total, item) => total + item.amountMinor, 0),
    [activeWorkspaceId, transactions, currentYear, currentMonth],
  );

  const monthlySpentMinor = useMemo(
    () =>
      getMonthlySpending(
        activeWorkspaceId,
        transactions,
        currentYear,
        currentMonth,
      ),
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

  // Temporary budget until we implement the Budget feature.
  const monthlyBudgetMinor = 200000;

  const remainingBudgetMinor = monthlyBudgetMinor - monthlySpentMinor;

  const budgetProgress =
    monthlyBudgetMinor > 0
      ? Math.min(monthlySpentMinor / monthlyBudgetMinor, 1)
      : 0;

  const progressPercentage = Math.round(budgetProgress * 100);

  const formatCurrency = (amountMinor: number) =>
    formatMoney(amountMinor, currency);

  return (
    <ScrollView
      style={styles.container}
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

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>N</Text>
        </View>
      </View>

      {/* Country selector */}
      <Pressable
        style={styles.countrySelector}
        accessibilityRole="button"
        accessibilityLabel={`Current workspace: ${workspace?.name ?? "Workspace"}`}
      >
        <Text style={styles.countryFlag}>🇲🇾</Text>

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
            <Text style={styles.currencyBadgeText}>MYR</Text>
          </View>
        </View>

        <Text style={styles.balanceAmount}>
          {formatCurrency(totalBalanceMinor)}
        </Text>

        <Text style={styles.balanceCaption}>Across your accounts</Text>

        <View style={styles.balanceFooter}>
          <View>
            <Text style={styles.balanceFooterLabel}>INCOME</Text>
            <Text style={styles.balanceFooterValue}>
              + {formatCurrency(monthlyIncomeMinor)}
            </Text>
          </View>

          <View style={styles.balanceDivider} />

          <View>
            <Text style={styles.balanceFooterLabel}>SPENDING</Text>
            <Text style={styles.balanceFooterValue}>
              − {formatCurrency(monthlySpentMinor)}
            </Text>
          </View>
        </View>
      </View>

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

      {/* Monthly budget */}
      <SectionHeading title="Monthly budget" />

      <View style={styles.card}>
        <View style={styles.budgetTopRow}>
          <View>
            <Text style={styles.cardEyebrow}>TOTAL SPENT</Text>
            <Text style={styles.spentAmount}>
              {formatCurrency(monthlySpentMinor)}
            </Text>
          </View>

          <View style={styles.budgetBadge}>
            <Text style={styles.budgetBadgeText}>
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
            now: progressPercentage,
          }}
        >
          <View
            style={[styles.progressFill, { width: `${progressPercentage}%` }]}
          />
        </View>

        <View style={styles.budgetBottomRow}>
          <View>
            <Text style={styles.budgetCaption}>Monthly limit</Text>
            <Text style={styles.budgetValue}>
              {formatCurrency(monthlyBudgetMinor)}
            </Text>
          </View>

          <View style={styles.remainingContainer}>
            <Text style={styles.budgetCaption}>Remaining</Text>
            <Text style={styles.remainingValue}>
              {formatCurrency(remainingBudgetMinor)}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent transactions */}
      <SectionHeading
        title="Recent transactions"
        action="See all"
        onPress={() => router.push("/transactions")}
      />

      <View style={styles.transactionCard}>
        {recentTransactions.length === 0 ? (
          <Text style={styles.transactionSubtitle}>No transactions yet.</Text>
        ) : (
          recentTransactions.map((transaction, index) => {
            const isIncome = transaction.type === "income";

            const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

            return (
              <View key={transaction.id}>
                {index > 0 && <View style={styles.transactionDivider} />}

                <View style={styles.transactionRow}>
                  <View style={styles.transactionIcon}>
                    <Icon size={20} color={colors.primary} />
                  </View>

                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>
                      {transaction.description || "Untitled transaction"}
                    </Text>

                    <Text style={styles.transactionSubtitle}>
                      {accounts.find(
                        (account) => account.id === transaction.accountId,
                      )?.name ?? "Unknown account"}
                      {" · "}
                      {transaction.date}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      isIncome && styles.incomeAmount,
                    ]}
                  >
                    {isIncome ? "+" : "−"}
                    {formatMoney(transaction.amountMinor, transaction.currency)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <Text style={styles.footerNote}>
        Small steps today, more freedom tomorrow.
      </Text>
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

  avatarText: {
    color: colors.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
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

  balanceFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    gap: spacing.lg,
  },

  balanceFooterLabel: {
    color: "#DCE8DD",
    fontSize: typography.size.xs,
    marginBottom: spacing.xs,
  },

  balanceFooterValue: {
    color: "#FFFFFF",
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  balanceDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.2)",
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
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  budgetBadgeText: {
    color: colors.primary,
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
    backgroundColor: colors.primary,
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

  transactionAmount: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
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
});
