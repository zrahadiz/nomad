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
  ChartPie,
  ChevronLeft,
  ChevronRight,
  Plus,
  Wallet,
} from "lucide-react-native";

import { useRouter } from "expo-router";

import { WorkspaceGate } from "@/components/feedbacks/workspace-gate";
import { SafeScreen } from "@/components/layout/safe-screen";
import { colors, radius, spacing } from "@/constants/theme";
import { useBudgetStore } from "@/stores/use-budget-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

function formatCurrency(amountMinor: number, currencyCode: string) {
  const fractionDigits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits ?? 2;

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / 10 ** fractionDigits);
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
}

function getBudgetMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
}

export default function BudgetScreen() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );

  const workspaces = useWorkspaceStore((state) => state.workspaces);

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId,
  );

  const currencyCode = activeWorkspace?.currency_code ?? "MYR";

  const budgetMonth = useMemo(
    () => getBudgetMonth(selectedMonth),
    [selectedMonth],
  );

  const overview = useBudgetStore((state) => state.overview);
  const loading = useBudgetStore((state) => state.loading);
  const error = useBudgetStore((state) => state.error);
  const fetchBudgetOverview = useBudgetStore(
    (state) => state.fetchBudgetOverview,
  );

  useEffect(() => {
    if (!activeWorkspaceId) return;

    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
  }, [activeWorkspaceId, budgetMonth, fetchBudgetOverview]);

  const goToPreviousMonth = () => {
    setSelectedMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setSelectedMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  };

  const spent = overview?.amountSpent ?? 0;
  const limit = overview?.budget.amountLimit ?? 0;
  const remaining = overview?.remainingAmount ?? 0;

  const progress = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;

  const progressColor =
    percentage >= 100
      ? colors.danger
      : percentage >= 80
        ? colors.warning
        : colors.success;

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top"]}>
      <WorkspaceGate>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={styles.title}>Budget</Text>
            <Text style={styles.subtitle}>
              Manage your monthly spending limits.
            </Text>
          </View>

          {/* Month selector */}
          <View style={styles.monthSelector}>
            <Pressable
              onPress={goToPreviousMonth}
              style={styles.monthButton}
              hitSlop={8}
            >
              <ChevronLeft size={20} color={colors.text} />
            </Pressable>

            <Text style={styles.monthText}>{formatMonth(selectedMonth)}</Text>

            <Pressable
              onPress={goToNextMonth}
              style={styles.monthButton}
              hitSlop={8}
            >
              <ChevronRight size={20} color={colors.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.stateText}>Loading budget...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Unable to load budget</Text>
              <Text style={styles.emptyDescription}>{error}</Text>

              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  if (activeWorkspaceId) {
                    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
                  }
                }}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : !overview ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Wallet size={28} color={colors.primary} />
              </View>

              <Text style={styles.emptyTitle}>No budget yet</Text>

              <Text style={styles.emptyDescription}>
                Create a monthly budget to start tracking your spending.
              </Text>

              <Pressable
                style={styles.createBudgetButton}
                onPress={() => router.push("/budget/new")}
              >
                <Plus size={18} color={colors.surface} />
                <Text style={styles.createBudgetButtonText}>Create budget</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Overall budget */}
              <View style={styles.overviewCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardLabel}>Total spending</Text>
                    <Text style={styles.spentAmount}>
                      {formatCurrency(spent, currencyCode)}
                    </Text>
                  </View>

                  <View style={styles.overviewIcon}>
                    <ChartPie size={22} color={colors.primary} />
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>

                <View style={styles.progressLabels}>
                  <Text style={styles.progressPercentage}>
                    {percentage.toFixed(1)}% used
                  </Text>
                  <Text style={styles.progressLimit}>
                    {formatCurrency(limit, currencyCode)} limit
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.summaryLabel}>Remaining</Text>
                    <Text
                      style={[
                        styles.summaryAmount,
                        remaining < 0 && styles.negativeAmount,
                      ]}
                    >
                      {formatCurrency(remaining, currencyCode)}
                    </Text>
                  </View>

                  <View style={styles.summaryRight}>
                    <Text style={styles.summaryLabel}>Budget limit</Text>
                    <Text style={styles.summaryAmount}>
                      {formatCurrency(limit, currencyCode)}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={styles.manageBudgetButton}
                onPress={() =>
                  router.push({
                    pathname: "/budget/manage",
                    params: { month: budgetMonth },
                  })
                }
              >
                <Text style={styles.manageBudgetButtonText}>Manage budget</Text>
              </Pressable>

              {/* Category budgets */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Category breakdown</Text>
                  <Text style={styles.categoryCount}>
                    {overview.categories.length} categories
                  </Text>
                </View>

                {overview.categories.length === 0 ? (
                  <View style={styles.emptyCategoryCard}>
                    <Text style={styles.emptyCategoryText}>
                      No category limits added yet.
                    </Text>
                  </View>
                ) : (
                  overview.categories.map((category) => {
                    const categoryProgress =
                      category.amountLimit > 0
                        ? Math.min(
                            category.amountSpent / category.amountLimit,
                            1,
                          )
                        : 0;

                    const categoryPercentage =
                      category.amountLimit > 0
                        ? (category.amountSpent / category.amountLimit) * 100
                        : 0;

                    const categoryColor =
                      categoryPercentage >= 100
                        ? colors.danger
                        : categoryPercentage >= 80
                          ? colors.warning
                          : colors.success;

                    return (
                      <View key={category.id} style={styles.categoryCard}>
                        <View style={styles.categoryHeader}>
                          <View style={styles.categoryInfo}>
                            <View
                              style={[
                                styles.categoryIcon,
                                {
                                  backgroundColor:
                                    category.categoryColor ??
                                    colors.primaryLight,
                                },
                              ]}
                            >
                              <Text style={styles.categoryEmoji}>
                                {category.categoryIcon ?? "•"}
                              </Text>
                            </View>

                            <View style={styles.categoryNameContainer}>
                              <Text style={styles.categoryName}>
                                {category.categoryName}
                              </Text>
                              <Text style={styles.categorySpent}>
                                {formatCurrency(
                                  category.amountSpent,
                                  currencyCode,
                                )}{" "}
                                spent
                              </Text>
                            </View>
                          </View>

                          <View style={styles.categoryLimitContainer}>
                            <Text style={styles.categoryLimit}>
                              {formatCurrency(
                                category.amountLimit,
                                currencyCode,
                              )}
                            </Text>
                            <Text style={styles.categoryPercentage}>
                              {categoryPercentage.toFixed(0)}%
                            </Text>
                          </View>
                        </View>

                        <View style={styles.categoryProgressTrack}>
                          <View
                            style={[
                              styles.categoryProgressFill,
                              {
                                width: `${categoryProgress * 100}%`,
                                backgroundColor: categoryColor,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </>
          )}
        </ScrollView>
      </WorkspaceGate>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  stateText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
  },
  createBudgetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },

  createBudgetButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  spentAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.xs,
  },
  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  progressLimit: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryRight: {
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.xs,
  },
  negativeAmount: {
    color: colors.danger,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  manageBudgetButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },

  manageBudgetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyCategoryCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCategoryText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryNameContainer: {
    flex: 1,
    gap: 3,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  categorySpent: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryLimitContainer: {
    alignItems: "flex-end",
    gap: 3,
  },
  categoryLimit: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  categoryPercentage: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  categoryProgressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  categoryProgressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
});
