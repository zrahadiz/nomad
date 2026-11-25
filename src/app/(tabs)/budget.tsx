import { useRouter } from "expo-router";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Pencil,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { WorkspaceGate } from "@/components/feedbacks/workspace-gate";
import { SafeScreen } from "@/components/layout/safe-screen";
import { AppIcon } from "@/components/ui/app-icon";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatMoney } from "@/lib/finance/calculations";
import { formatConvertedMoney } from "@/lib/finance/currency-converter";
import { useBudgetStore } from "@/stores/use-budget-store";
import { useCurrencyConverterStore } from "@/stores/use-currency-converter-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

function formatCurrency(amountMinor: number, currencyCode: string) {
  return formatMoney(amountMinor, currencyCode);
}

function formatMonth(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function getBudgetMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

type SpendingStatus = "normal" | "warning" | "over";

type StatusTranslationKey =
  | "budget.screen.status.over"
  | "budget.screen.status.warning"
  | "budget.screen.status.normal";

function getSpendingStatus(percentage: number): SpendingStatus {
  if (percentage >= 100) return "over";
  if (percentage >= 80) return "warning";
  return "normal";
}

function getStatusColor(status: SpendingStatus) {
  switch (status) {
    case "over":
      return colors.danger;
    case "warning":
      return colors.warning;
    default:
      return colors.success;
  }
}

function getStatusTranslationKey(status: SpendingStatus): StatusTranslationKey {
  switch (status) {
    case "over":
      return "budget.screen.status.over";
    case "warning":
      return "budget.screen.status.warning";
    default:
      return "budget.screen.status.normal";
  }
}

function getStatusBackground(status: SpendingStatus) {
  switch (status) {
    case "over":
      return colors.dangerLight;
    case "warning":
      return colors.warningLight;
    default:
      return colors.successLight;
  }
}

const MONTH_COLUMNS = 3;

export default function BudgetScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language.toLowerCase().startsWith("id")
    ? "id-ID"
    : "en-US";

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

  // Month picker (jump straight to any month / year)
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedMonth.getFullYear());
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  const isCurrentMonth =
    selectedMonth.getFullYear() === currentYear &&
    selectedMonth.getMonth() === currentMonthIndex;

  const openMonthPicker = () => {
    setPickerYear(selectedMonth.getFullYear());
    setMonthPickerVisible(true);
  };

  const selectMonth = (year: number, monthIndex: number) => {
    setSelectedMonth(new Date(year, monthIndex, 1));
    setMonthPickerVisible(false);
  };

  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Date(2000, index, 1).toLocaleDateString(locale, { month: "short" }),
  );

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top"]}>
      <WorkspaceGate>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t("budget.title")}</Text>
              <Text style={styles.subtitle}>{t("budget.screen.subtitle")}</Text>
            </View>
          </View>

          <View style={styles.monthSelectorWrap}>
            <View style={styles.monthSelector}>
              <Pressable
                onPress={goToPreviousMonth}
                style={styles.monthButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("budget.screen.month.previous")}
              >
                <ChevronLeft size={20} color={colors.text} />
              </Pressable>

              <Pressable
                onPress={openMonthPicker}
                style={({ pressed }) => [
                  styles.monthPill,
                  pressed && styles.monthPillPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("budget.screen.month.choose")}
              >
                <CalendarDays size={18} color={colors.primary} />
                <Text style={styles.monthText}>
                  {formatMonth(selectedMonth, locale)}
                </Text>
                <ChevronDown size={18} color={colors.textSecondary} />
              </Pressable>

              <Pressable
                onPress={goToNextMonth}
                style={styles.monthButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("budget.screen.month.next")}
              >
                <ChevronRight size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.stateText}>
                {t("budget.screen.states.loading")}
              </Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {t("budget.screen.states.loadError")}
              </Text>
              <Text style={styles.emptyDescription}>{error}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  if (activeWorkspaceId)
                    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>
                  {t("budget.screen.states.retry")}
                </Text>
              </Pressable>
            </View>
          ) : !overview ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Wallet size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {t("budget.screen.states.noBudget")}
              </Text>
              <Text style={styles.emptyDescription}>
                {t("budget.screen.states.noBudgetDescription")}
              </Text>
            </View>
          ) : (
            <>
              {/* Overall budget */}
              <View style={styles.overviewCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardLabel}>
                      {t("budget.screen.summary.totalSpending")}
                    </Text>
                    <Text
                      style={styles.spentAmount}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatCurrency(spent, currencyCode)}
                    </Text>
                    {formatSecondaryCurrency(spent) && (
                      <Text style={styles.secondaryAmount}>
                        {formatSecondaryCurrency(spent)}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.manageChip,
                      pressed && styles.manageChipPressed,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/budget/manage",
                        params: { month: budgetMonth },
                      })
                    }
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={t("budget.screen.actions.manage")}
                  >
                    <Pencil size={14} color={colors.primary} />
                    <Text style={styles.manageChipText}>
                      {t("budget.screen.actions.manage")}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.progressBlock}>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: getStatusBackground(overallStatus) },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: progressColor },
                        ]}
                      />
                      <Text
                        style={[styles.statusText, { color: progressColor }]}
                      >
                        {t(getStatusTranslationKey(overallStatus))}
                      </Text>
                    </View>
                    <Text style={styles.statusPercentage}>
                      {t("budget.screen.status.used", {
                        percentage: percentage.toFixed(1),
                      })}
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
                </View>

                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>
                      {t("budget.screen.summary.remaining")}
                    </Text>
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
                  <View style={[styles.summaryCell, styles.summaryRight]}>
                    <Text style={styles.summaryLabel}>
                      {t("budget.screen.summary.limit")}
                    </Text>
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
                      { backgroundColor: getStatusBackground(overallStatus) },
                    ]}
                  >
                    <AlertTriangle size={18} color={progressColor} />
                    <Text style={[styles.alertText, { color: progressColor }]}>
                      {overallStatus === "over"
                        ? t("budget.screen.summary.exceeded", {
                            amount: formatCurrency(
                              Math.abs(remaining),
                              currencyCode,
                            ),
                            secondary: formatSecondaryCurrency(
                              Math.abs(remaining),
                            )
                              ? ` (${formatSecondaryCurrency(Math.abs(remaining))})`
                              : "",
                          })
                        : t("budget.screen.summary.warningMessage", {
                            percentage: percentage.toFixed(0),
                          })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Category budget alerts */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {t("budget.screen.categories.title")}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {t("budget.screen.categories.count", {
                      count: overview.categories.length,
                    })}
                  </Text>
                </View>

                {overview.categories.length === 0 ? (
                  <View style={styles.emptyCategoryCard}>
                    <Text style={styles.emptyCategoryText}>
                      {t("budget.screen.categories.empty")}
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
                      category.amountLimit > 0
                        ? category.amountSpent / category.amountLimit
                        : 0,
                      1,
                    );

                    return (
                      <View key={category.id} style={styles.categoryCard}>
                        <View style={styles.categoryHeader}>
                          <View style={styles.categoryInfo}>
                            <AppIcon
                              name={category.categoryIcon ?? "ellipsis"}
                              size={36}
                              iconSize={18}
                              color={colors.primary}
                              background
                              backgroundColor={
                                category.categoryColor ?? colors.primaryLight
                              }
                            />
                            <View style={styles.categoryNameContainer}>
                              <Text
                                style={styles.categoryName}
                                numberOfLines={1}
                              >
                                {category.categoryName}
                              </Text>
                              <Text style={styles.categorySpent}>
                                {formatCurrency(
                                  category.amountSpent,
                                  currencyCode,
                                )}{" "}
                                {t("budget.screen.categories.of")}{" "}
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
                                    {t("budget.screen.categories.of")}{" "}
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
                              {t(getStatusTranslationKey(categoryStatus))}
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
                          <View
                            style={[
                              styles.categoryAlert,
                              {
                                backgroundColor:
                                  getStatusBackground(categoryStatus),
                              },
                            ]}
                          >
                            <AlertTriangle size={14} color={categoryColor} />
                            <Text
                              style={[
                                styles.categoryAlertText,
                                { color: categoryColor },
                              ]}
                            >
                              {categoryStatus === "over"
                                ? t("budget.screen.categories.exceededBy", {
                                    amount: formatCurrency(
                                      Math.abs(category.remainingAmount),
                                      currencyCode,
                                    ),
                                    secondary: formatSecondaryCurrency(
                                      Math.abs(category.remainingAmount),
                                    )
                                      ? ` (${formatSecondaryCurrency(Math.abs(category.remainingAmount))})`
                                      : "",
                                  })
                                : t(
                                    "budget.screen.categories.remainingAmount",
                                    {
                                      amount: formatCurrency(
                                        category.remainingAmount,
                                        currencyCode,
                                      ),
                                      secondary: formatSecondaryCurrency(
                                        category.remainingAmount,
                                      )
                                        ? ` (${formatSecondaryCurrency(category.remainingAmount)})`
                                        : "",
                                    },
                                  )}
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
                  <Text style={styles.sectionTitle}>
                    {t("budget.screen.insights.title")}
                  </Text>
                  <Lightbulb size={19} color={colors.primary} />
                </View>

                {spent === 0 ? (
                  <View style={styles.emptyCategoryCard}>
                    <Text style={styles.emptyCategoryText}>
                      {t("budget.screen.insights.empty")}
                    </Text>
                  </View>
                ) : (
                  <>
                    {highestSpendingCategory && (
                      <View style={styles.highlightCard}>
                        <View style={styles.insightIcon}>
                          <TrendingUp size={20} color={colors.primary} />
                        </View>
                        <View style={styles.insightContent}>
                          <Text style={styles.insightLabel}>
                            {t("budget.screen.insights.highest")}
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
                            {t("budget.screen.insights.share", {
                              percentage: (
                                (highestSpendingCategory.amountSpent / spent) *
                                100
                              ).toFixed(1),
                            })}
                            )
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
                        {t("budget.screen.insights.where")}
                      </Text>
                      {spendingInsights.map((category) => (
                        <View
                          key={category.categoryId ?? "uncategorized"}
                          style={styles.insightCategory}
                        >
                          <View style={styles.insightCategoryHeader}>
                            <View style={styles.insightCategoryNameRow}>
                              <AppIcon
                                name={category.categoryIcon ?? "ellipsis"}
                                size={28}
                                iconSize={14}
                                color={category.categoryColor ?? colors.primary}
                                background
                                backgroundColor={`${category.categoryColor ?? colors.primary}20`}
                              />
                              <Text
                                style={styles.insightCategoryName}
                                numberOfLines={1}
                              >
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

        <Pressable
          onPress={() => router.push("/budget/new")}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          accessibilityRole="button"
          accessibilityLabel={t("transactions.accessibility.add")}
        >
          <Plus size={26} color={colors.textOnPrimary} />
        </Pressable>

        {/* Month picker */}
        <BottomSheetModal
          visible={monthPickerVisible}
          onClose={() => setMonthPickerVisible(false)}
          title={t("budget.screen.monthPicker.title")}
          subtitle={t("budget.screen.monthPicker.subtitle")}
        >
          <View style={styles.pickerYearRow}>
            <Pressable
              onPress={() => setPickerYear((year) => year - 1)}
              style={styles.monthButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("budget.screen.monthPicker.previousYear")}
            >
              <ChevronLeft size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.pickerYear}>{pickerYear}</Text>
            <Pressable
              onPress={() => setPickerYear((year) => year + 1)}
              style={styles.monthButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("budget.screen.monthPicker.nextYear")}
            >
              <ChevronRight size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.monthGrid}>
            {monthNames.map((name, index) => {
              const isSelected =
                selectedMonth.getFullYear() === pickerYear &&
                selectedMonth.getMonth() === index;
              const isToday =
                pickerYear === currentYear && index === currentMonthIndex;
              return (
                <Pressable
                  key={name}
                  onPress={() => selectMonth(pickerYear, index)}
                  style={[
                    styles.monthCell,
                    isToday && styles.monthCellToday,
                    isSelected && styles.monthCellSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.monthCellText,
                      isSelected && styles.monthCellTextSelected,
                    ]}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => selectMonth(currentYear, currentMonthIndex)}
            disabled={isCurrentMonth}
            style={({ pressed }) => [
              styles.todayButton,
              pressed && styles.todayButtonPressed,
              isCurrentMonth && styles.todayButtonDisabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.todayButtonText}>
              {t("budget.screen.monthPicker.current")}
            </Text>
          </Pressable>
        </BottomSheetModal>
      </WorkspaceGate>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
    flexGrow: 1,
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
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
  },
  /* Month selector (sticky) */
  monthSelectorWrap: {
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  monthButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthPill: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  monthPillPressed: {
    backgroundColor: colors.primaryLight,
  },
  monthText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  /* Month picker sheet */
  pickerYearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  pickerYear: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.sm,
  },
  monthCell: {
    width: `${100 / MONTH_COLUMNS - 2}%`,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthCellToday: {
    borderColor: colors.primary,
  },
  monthCellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthCellText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  monthCellTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: typography.weight.semibold,
  },
  todayButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  todayButtonPressed: {
    opacity: 0.8,
  },
  todayButtonDisabled: {
    opacity: 0.5,
  },
  todayButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  /* States */
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  stateText: {
    fontSize: typography.size.sm,
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
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  emptyDescription: {
    fontSize: typography.size.sm,
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
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  createBudgetButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  /* Overview */
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
    gap: spacing.md,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  spentAmount: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  secondaryAmount: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 3,
  },
  manageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  manageChipPressed: {
    opacity: 0.8,
  },
  manageChipText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  statusPercentage: {
    fontSize: typography.size.caption,
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
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  summaryCell: {
    flex: 1,
  },
  summaryRight: {
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  summaryAmount: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
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
    fontSize: typography.size.caption,
    lineHeight: 19,
    fontWeight: typography.weight.medium,
  },
  /* Sections */
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  categoryCount: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  emptyCategoryCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCategoryText: {
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  /* Category cards */
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  categorySpent: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  categoryLimitContainer: {
    alignItems: "flex-end",
    gap: 3,
  },
  categoryPercentage: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  categoryStatus: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
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
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  categoryAlertText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  /* Insights */
  highlightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  insightTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  insightDescription: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  insightSectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
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
    fontSize: typography.size.caption,
    color: colors.text,
    flexShrink: 1,
  },
  insightCategoryAmount: {
    alignItems: "flex-end",
    gap: 2,
  },
  insightAmount: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  insightPercentage: {
    fontSize: typography.size.xs,
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
