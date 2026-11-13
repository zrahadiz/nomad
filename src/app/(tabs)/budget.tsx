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
  AlertTriangle,
  ChartPie,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react-native";

import { useRouter } from "expo-router";

import { WorkspaceGate } from "@/components/feedbacks/workspace-gate";
import { SafeScreen } from "@/components/layout/safe-screen";
import { colors, radius, spacing } from "@/constants/theme";
import { formatConvertedMoney } from "@/lib/finance/currency-converter";
import { useBudgetStore } from "@/stores/use-budget-store";
import { useCurrencyConverterStore } from "@/stores/use-currency-converter-store";
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

type spendingStatus = "normal" | "warning" | "over";

function getSpendingStatus(percentage: number): spendingStatus {
  if (percentage >= 100) return "over";
  if (percentage >= 80) return "warning";
  return "normal";
}

function getStatusColor(status: spendingStatus) {
  switch (status) {
    case "over":
      return colors.danger;
    case "warning":
      return colors.warning;
    default:
      return colors.success;
  }
}

function getStatusLabel(status: spendingStatus) {
  switch (status) {
    case "over":
      return "Over budget";
    case "warning":
      return "Approaching limit";
    default:
      return "On track";
  }
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

  // Currency converter
  const converter = useCurrencyConverterStore((state) => state.converter);

  const loadedConverterWorkspaceId = useCurrencyConverterStore(
    (state) => state.loadedWorkspaceId,
  );

  const fetchConverter = useCurrencyConverterStore(
    (state) => state.fetchConverter,
  );

  const activeConverter =
    loadedConverterWorkspaceId === activeWorkspaceId ? converter : null;

  const formatSecondaryCurrency = (amountMinor: number) => {
    if (!activeConverter) return null;

    return formatConvertedMoney(amountMinor, currencyCode, activeConverter);
  };

  const overview = useBudgetStore((state) => state.overview);
  const loading = useBudgetStore((state) => state.loading);
  const error = useBudgetStore((state) => state.error);

  const fetchBudgetOverview = useBudgetStore(
    (state) => state.fetchBudgetOverview,
  );

  const budgetMonth = useMemo(
    () => getBudgetMonth(selectedMonth),
    [selectedMonth],
  );

  useEffect(() => {
    if (!activeWorkspaceId) return;

    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
    void fetchConverter(activeWorkspaceId);
  }, [activeWorkspaceId, budgetMonth, fetchBudgetOverview, fetchConverter]);

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

  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const progress = limit > 0 ? Math.min(spent / limit, 1) : 0;

  const overallStatus = getSpendingStatus(percentage);
  const progressColor = getStatusColor(overallStatus);

  const spendingBreakdown = overview?.spendingBreakdown ?? [];

  const highestSpendingCategory = spendingBreakdown[0] ?? null;

  const spendingInsights = spendingBreakdown.map((category) => ({
    ...category,
    percentage: spent > 0 ? (category.amountSpent / spent) * 100 : 0,
  }));

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

                    {formatSecondaryCurrency(spent) && (
                      <Text style={styles.secondaryAmount}>
                        {formatSecondaryCurrency(spent)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.overviewIcon}>
                    <ChartPie size={22} color={colors.primary} />
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: progressColor },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: progressColor }]}>
                    {getStatusLabel(overallStatus)}
                  </Text>
                  <Text style={styles.statusPercentage}>
                    {percentage.toFixed(1)}% used
                  </Text>
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
                  <View>
                    <Text style={styles.progressPercentage}>
                      {formatCurrency(spent, currencyCode)} spent
                    </Text>
                    {formatSecondaryCurrency(spent) && (
                      <Text style={styles.secondaryAmount}>
                        {formatSecondaryCurrency(spent)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.progressRightLabel}>
                    <Text style={styles.progressLimit}>
                      {formatCurrency(limit, currencyCode)} limit
                    </Text>
                    {formatSecondaryCurrency(limit) && (
                      <Text style={styles.secondaryAmount}>
                        {formatSecondaryCurrency(limit)}
                      </Text>
                    )}
                  </View>
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

                    {formatSecondaryCurrency(remaining) && (
                      <Text style={styles.secondaryAmount}>
                        {formatSecondaryCurrency(remaining)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.summaryRight}>
                    <Text style={styles.summaryLabel}>Budget limit</Text>
                    <Text style={styles.summaryAmount}>
                      {formatCurrency(limit, currencyCode)}
                    </Text>

                    {formatSecondaryCurrency(limit) && (
                      <Text style={styles.secondaryAmount}>
                        {formatSecondaryCurrency(limit)}
                      </Text>
                    )}
                  </View>
                </View>

                {overallStatus !== "normal" && (
                  <View
                    style={[
                      styles.alertCard,
                      {
                        backgroundColor:
                          overallStatus === "over" ? "#FCEDEA" : "#FFF5E5",
                      },
                    ]}
                  >
                    <AlertTriangle size={18} color={progressColor} />
                    <Text style={[styles.alertText, { color: progressColor }]}>
                      {overallStatus === "over"
                        ? `You've exceeded your monthly budget by ${formatCurrency(
                            Math.abs(remaining),
                            currencyCode,
                          )}${
                            formatSecondaryCurrency(Math.abs(remaining))
                              ? ` (${formatSecondaryCurrency(
                                  Math.abs(remaining),
                                )})`
                              : ""
                          }.`
                        : `You've used ${percentage.toFixed(
                            0,
                          )}% of your monthly budget. Keep an eye on your spending.`}
                    </Text>
                  </View>
                )}
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

              {/* Category budget alerts */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Category breakdown</Text>
                  <Text style={styles.categoryCount}>
                    {overview.categories.length} budgets
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
                    const categoryPercentage =
                      category.amountLimit > 0
                        ? (category.amountSpent / category.amountLimit) * 100
                        : 0;

                    const categoryStatus =
                      getSpendingStatus(categoryPercentage);

                    const categoryColor = getStatusColor(categoryStatus);

                    const categoryProgress = Math.min(
                      category.amountSpent / category.amountLimit,
                      1,
                    );

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
                                of{" "}
                                {formatCurrency(
                                  category.amountLimit,
                                  currencyCode,
                                )}
                              </Text>

                              {formatSecondaryCurrency(category.amountSpent) &&
                                formatSecondaryCurrency(
                                  category.amountLimit,
                                ) && (
                                  <Text style={styles.secondaryAmount}>
                                    {formatSecondaryCurrency(
                                      category.amountSpent,
                                    )}{" "}
                                    of{" "}
                                    {formatSecondaryCurrency(
                                      category.amountLimit,
                                    )}
                                  </Text>
                                )}
                            </View>
                          </View>

                          <View style={styles.categoryLimitContainer}>
                            <Text style={styles.categoryPercentage}>
                              {categoryPercentage.toFixed(0)}%
                            </Text>
                            <Text
                              style={[
                                styles.categoryStatus,
                                { color: categoryColor },
                              ]}
                            >
                              {getStatusLabel(categoryStatus)}
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

                        {categoryStatus !== "normal" && (
                          <View style={styles.categoryAlert}>
                            <AlertTriangle size={14} color={categoryColor} />
                            <Text
                              style={[
                                styles.categoryAlertText,
                                { color: categoryColor },
                              ]}
                            >
                              {categoryStatus === "over"
                                ? `Exceeded by ${formatCurrency(
                                    Math.abs(category.remainingAmount),
                                    currencyCode,
                                  )}${
                                    formatSecondaryCurrency(
                                      Math.abs(category.remainingAmount),
                                    )
                                      ? ` (${formatSecondaryCurrency(
                                          Math.abs(category.remainingAmount),
                                        )})`
                                      : ""
                                  }`
                                : `${formatCurrency(
                                    category.remainingAmount,
                                    currencyCode,
                                  )} remaining${
                                    formatSecondaryCurrency(
                                      category.remainingAmount,
                                    )
                                      ? ` (${formatSecondaryCurrency(
                                          category.remainingAmount,
                                        )})`
                                      : ""
                                  }`}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              {/* Spending insights */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Spending insights</Text>
                  <Lightbulb size={19} color={colors.primary} />
                </View>

                {spent === 0 ? (
                  <View style={styles.emptyCategoryCard}>
                    <Text style={styles.emptyCategoryText}>
                      No expenses recorded for this month yet. Your spending
                      insights will appear here.
                    </Text>
                  </View>
                ) : (
                  <>
                    {highestSpendingCategory && (
                      <View style={styles.insightCard}>
                        <View style={styles.insightIcon}>
                          <TrendingUp size={20} color={colors.primary} />
                        </View>

                        <View style={styles.insightContent}>
                          <Text style={styles.insightLabel}>
                            Highest spending category
                          </Text>
                          <Text style={styles.insightTitle}>
                            {highestSpendingCategory.categoryName}
                          </Text>
                          <Text style={styles.insightDescription}>
                            {formatCurrency(
                              highestSpendingCategory.amountSpent,
                              currencyCode,
                            )}{" "}
                            (
                            {(
                              (highestSpendingCategory.amountSpent / spent) *
                              100
                            ).toFixed(1)}
                            % of total spending)
                          </Text>

                          {formatSecondaryCurrency(
                            highestSpendingCategory.amountSpent,
                          ) && (
                            <Text style={styles.secondaryAmount}>
                              {formatSecondaryCurrency(
                                highestSpendingCategory.amountSpent,
                              )}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    <View style={styles.insightCard}>
                      <Text style={styles.insightSectionTitle}>
                        Where your money goes
                      </Text>

                      {spendingInsights.map((category) => (
                        <View
                          key={category.categoryId ?? "uncategorized"}
                          style={styles.insightCategory}
                        >
                          <View style={styles.insightCategoryHeader}>
                            <View style={styles.insightCategoryNameRow}>
                              <View
                                style={[
                                  styles.insightCategoryDot,
                                  {
                                    backgroundColor:
                                      category.categoryColor ??
                                      colors.textSecondary,
                                  },
                                ]}
                              />
                              <Text style={styles.insightCategoryName}>
                                {category.categoryIcon
                                  ? `${category.categoryIcon} `
                                  : ""}
                                {category.categoryName}
                              </Text>
                            </View>

                            <View style={styles.insightCategoryAmount}>
                              <Text style={styles.insightAmount}>
                                {formatCurrency(
                                  category.amountSpent,
                                  currencyCode,
                                )}
                              </Text>

                              {formatSecondaryCurrency(
                                category.amountSpent,
                              ) && (
                                <Text style={styles.secondaryAmount}>
                                  {formatSecondaryCurrency(
                                    category.amountSpent,
                                  )}
                                </Text>
                              )}

                              <Text style={styles.insightPercentage}>
                                {category.percentage.toFixed(1)}%
                              </Text>
                            </View>
                          </View>

                          <View style={styles.insightProgressTrack}>
                            <View
                              style={[
                                styles.insightProgressFill,
                                {
                                  width: `${category.percentage}%`,
                                  backgroundColor:
                                    category.categoryColor ?? colors.primary,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
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
  secondaryAmount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusPercentage: {
    marginLeft: "auto",
    fontSize: 12,
    color: colors.textSecondary,
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
  progressRightLabel: {
    alignItems: "flex-end",
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
  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
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
    lineHeight: 20,
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
  categoryPercentage: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  categoryStatus: {
    fontSize: 11,
    fontWeight: "600",
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
  categoryAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  categoryAlertText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  insightContent: {
    flex: 1,
    gap: spacing.xs,
  },
  insightLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  insightDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  insightSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  insightCategory: {
    gap: spacing.sm,
  },
  insightCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  insightCategoryNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  insightCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  insightCategoryName: {
    fontSize: 13,
    color: colors.text,
    flexShrink: 1,
  },
  insightCategoryAmount: {
    alignItems: "flex-end",
    gap: 2,
  },
  insightAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  insightPercentage: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  insightProgressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  insightProgressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
});
