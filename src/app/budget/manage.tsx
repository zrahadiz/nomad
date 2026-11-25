import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronDown, Lock, Plus, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { CategorySelectionModal } from "@/components/budgets/category-selection-modal";
import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";
import { AppIcon } from "@/components/ui/app-icon";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { getCurrencyDecimalDigits, toMinorUnits } from "@/lib/finance/currency";
import { isValidCurrencyAmountInput } from "@/lib/finance/currency-input";
import { useBudgetStore } from "@/stores/use-budget-store";
import { useCategoryStore } from "@/stores/use-category-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { financialCategory } from "@/types/finances";

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

function formatAmountInput(amountMinor: number, currency: string) {
  const decimals = getCurrencyDecimalDigits(currency);
  return (amountMinor / 10 ** decimals).toFixed(decimals);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function normalizeBudgetMonth(date: string | undefined) {
  if (!date || date.length < 7) return getCurrentMonth();
  const month = `${date.slice(0, 7)}-01`;
  if (!/^\d{4}-\d{2}-01$/.test(month)) return getCurrentMonth();
  const parsed = new Date(`${month}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== month
  )
    return getCurrentMonth();
  return month;
}

function formatMonthLabel(date: string, locale: string) {
  const [year, month] = date.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

type categoryBudgetDraft = {
  id: string | null;
  categoryId: string;
  amount: string;
};

export default function ManageBudgetScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("id") ? "id-ID" : "en";
  const params = useLocalSearchParams<{ month?: string }>();
  const budgetMonth = normalizeBudgetMonth(params.month);

  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId,
  );
  const currencyCode = activeWorkspace?.currency_code ?? "MYR";

  const overview = useBudgetStore((state) => state.overview);
  const loading = useBudgetStore((state) => state.loading);
  const error = useBudgetStore((state) => state.error);
  const fetchBudgetOverview = useBudgetStore(
    (state) => state.fetchBudgetOverview,
  );
  const updateBudget = useBudgetStore((state) => state.updateBudget);
  const deleteBudget = useBudgetStore((state) => state.deleteBudget);
  const createBudgetCategory = useBudgetStore(
    (state) => state.createBudgetCategory,
  );
  const updateBudgetCategory = useBudgetStore(
    (state) => state.updateBudgetCategory,
  );
  const deleteBudgetCategory = useBudgetStore(
    (state) => state.deleteBudgetCategory,
  );

  const categories = useCategoryStore((state) => state.categories);
  const categoriesLoading = useCategoryStore(
    (state) => state.categoriesLoading,
  );
  const categoriesError = useCategoryStore((state) => state.categoriesError);
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  const [overallAmount, setOverallAmount] = useState("");
  const [categoryDrafts, setCategoryDrafts] = useState<categoryBudgetDraft[]>(
    [],
  );
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
  }, [activeWorkspaceId, budgetMonth, fetchBudgetOverview]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (saving || !overview || overview.budget.budgetMonth !== budgetMonth)
      return;
    setOverallAmount(
      formatAmountInput(overview.budget.amountLimit, currencyCode),
    );
    setCategoryDrafts(
      overview.categories.map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        amount: formatAmountInput(item.amountLimit, currencyCode),
      })),
    );
  }, [overview, budgetMonth, currencyCode, saving]);

  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.type === "expense" && !category.isArchived,
      ),
    [categories],
  );
  const selectedCategoryIds = useMemo(
    () => new Set(categoryDrafts.map((item) => item.categoryId)),
    [categoryDrafts],
  );
  const availableCategories = expenseCategories.filter(
    (category) => !selectedCategoryIds.has(category.id),
  );
  const overallAmountMinor = parseAmountToMinor(overallAmount, currencyCode);
  const categoryAmounts = categoryDrafts.map((item) =>
    parseAmountToMinor(item.amount, currencyCode),
  );
  const categoryTotalMinor = categoryAmounts.reduce<number>(
    (total, amount) => total + (amount ?? 0),
    0,
  );
  const hasInvalidCategoryAmount = categoryAmounts.some(
    (amount) => amount === null,
  );
  const exceedsOverallLimit =
    overallAmountMinor !== null && categoryTotalMinor > overallAmountMinor;
  const budget = overview?.budget;
  const isCorrectBudget = !!budget && budget.budgetMonth === budgetMonth;

  const getCategory = (categoryId: string) =>
    expenseCategories.find((category) => category.id === categoryId);
  const handleAddCategory = (category: financialCategory) => {
    setCategoryDrafts((current) => [
      ...current,
      { id: null, categoryId: category.id, amount: "" },
    ]);
    setCategoryModalVisible(false);
  };
  const handleOverallAmountChange = (value: string) => {
    if (isValidCurrencyAmountInput(value, currencyCode))
      setOverallAmount(value);
  };
  const handleCategoryAmountChange = (categoryId: string, value: string) => {
    if (!isValidCurrencyAmountInput(value, currencyCode)) return;
    setCategoryDrafts((current) =>
      current.map((item) =>
        item.categoryId === categoryId ? { ...item, amount: value } : item,
      ),
    );
  };
  const handleRemoveCategory = (categoryId: string) => {
    setCategoryDrafts((current) =>
      current.filter((item) => item.categoryId !== categoryId),
    );
  };

  const handleSave = async () => {
    if (!activeWorkspaceId || !budget) return;
    if (overallAmountMinor === null) {
      Alert.alert(
        t("budget.manage.alerts.invalidBudgetTitle"),
        t("budget.manage.alerts.invalidBudgetMessage"),
      );
      return;
    }
    if (categoryDrafts.length > 0 && hasInvalidCategoryAmount) {
      Alert.alert(
        t("budget.manage.alerts.invalidCategoryTitle"),
        t("budget.manage.alerts.invalidCategoryMessage"),
      );
      return;
    }
    const categoryInputs = categoryDrafts.map((item) => ({
      ...item,
      amountLimit: parseAmountToMinor(item.amount, currencyCode)!,
    }));
    const originalCategories = overview?.categories ?? [];
    setSaving(true);
    try {
      if (overallAmountMinor !== budget.amountLimit)
        await updateBudget(budget.id, { amountLimit: overallAmountMinor });
      const retainedIds = new Set(
        categoryInputs
          .map((item) => item.id)
          .filter((id): id is string => id !== null),
      );
      for (const original of originalCategories) {
        if (!retainedIds.has(original.id))
          await deleteBudgetCategory(original.id);
      }
      for (const item of categoryInputs) {
        if (item.id) {
          const original = originalCategories.find(
            (category) => category.id === item.id,
          );
          if (original && original.amountLimit !== item.amountLimit)
            await updateBudgetCategory(item.id, {
              amountLimit: item.amountLimit,
            });
        } else {
          await createBudgetCategory({
            budgetId: budget.id,
            categoryId: item.categoryId,
            amountLimit: item.amountLimit,
          });
        }
      }
      await fetchBudgetOverview(activeWorkspaceId, budgetMonth);
      Alert.alert(
        t("budget.manage.alerts.updatedTitle"),
        t("budget.manage.alerts.updatedMessage"),
        [
          {
            text: t("budget.manage.alerts.done"),
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("budget.manage.alerts.genericUpdateError");
      Alert.alert(t("budget.manage.alerts.updateFailedTitle"), message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = () => {
    if (!budget) return;
    const monthLabel = formatMonthLabel(budgetMonth, locale);
    Alert.alert(
      t("budget.manage.alerts.deleteConfirmTitle"),
      t("budget.manage.alerts.deleteConfirmMessage", { month: monthLabel }),
      [
        { text: t("budget.manage.alerts.deleteCancel"), style: "cancel" },
        {
          text: t("budget.manage.alerts.deleteConfirm"),
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              await deleteBudget(budget.id);
              router.back();
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : t("budget.manage.alerts.deleteError");
              Alert.alert(t("budget.manage.alerts.deleteFailedTitle"), message);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  // UI-only: the category section starts open here, since you came to edit.
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  if (loading || !isCorrectBudget) {
    return (
      <SafeScreen>
        <View style={styles.centerContainer}>
          {loading ? (
            <>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.loadingText}>
                {t("budget.manage.loadingBudget")}
              </Text>
            </>
          ) : error ? (
            <>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.addButtonPressed,
                ]}
                onPress={() => {
                  if (activeWorkspaceId)
                    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>
                  {t("budget.manage.tryAgain")}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.loadingText}>
              {t("budget.manage.noBudget")}
            </Text>
          )}
        </View>
      </SafeScreen>
    );
  }

  const saveDisabled = saving;
  const amountPlaceholder =
    getCurrencyDecimalDigits(currencyCode) === 0 ? "0" : "0.00";

  const allocationRatio =
    overallAmountMinor !== null && overallAmountMinor > 0
      ? Math.min(categoryTotalMinor / overallAmountMinor, 1)
      : 0;

  const showAddRow =
    !categoriesLoading && !categoriesError && availableCategories.length > 0;

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.workspaceRow}>
            <View style={styles.workspaceDot} />
            <Text style={styles.workspaceName} numberOfLines={1}>
              {activeWorkspace?.name ?? t("budget.manage.noWorkspace")}
            </Text>
            <Text style={styles.workspaceSeparator}>·</Text>
            <Text style={styles.workspaceCurrency}>{currencyCode}</Text>
          </View>
          {/* 1. The one thing most people need: the overall limit */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>
              {t("budget.manage.overallTitle")}
            </Text>

            <View style={styles.amountInputContainer}>
              <Text style={styles.currencyPrefix}>{currencyCode}</Text>
              <AmountInput
                value={overallAmount}
                onChangeText={handleOverallAmountChange}
                currency={currencyCode}
                placeholder={amountPlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={styles.amountInput}
              />
            </View>

            <Text style={styles.hint}>
              {t("budget.manage.overallHint", {
                defaultValue:
                  "Covers all your expenses, with or without a category limit.",
              })}
            </Text>
          </View>

          {/* 2. Month: read-only here, the lock makes that obvious */}
          <View style={styles.periodRow}>
            <Lock size={16} color={colors.textSecondary} />
            <Text style={styles.periodLabel}>{t("budget.manage.period")}</Text>
            <Text style={styles.periodValue}>
              {formatMonthLabel(budgetMonth, locale)}
            </Text>
          </View>

          {/* 3. Optional category limits: collapsed until needed */}
          <View style={styles.group}>
            <Pressable
              style={({ pressed }) => [
                styles.collapseHeader,
                pressed && styles.collapseHeaderPressed,
              ]}
              onPress={() => setCategoriesOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: categoriesOpen }}
            >
              <View style={styles.collapseTitleRow}>
                <Text style={styles.sectionTitle} numberOfLines={1}>
                  {t("budget.manage.categoryTitle")}
                </Text>
                <Text style={styles.optionalText}>
                  {t("budget.manage.optional", { defaultValue: "Optional" })}
                </Text>
              </View>

              {categoryDrafts.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {categoryDrafts.length}
                  </Text>
                </View>
              )}

              <ChevronDown
                size={20}
                color={colors.textSecondary}
                style={categoriesOpen ? styles.chevronOpen : undefined}
              />
            </Pressable>

            {categoriesOpen && (
              <View style={styles.collapseBody}>
                <Text style={styles.hint}>
                  {t("budget.manage.categoryHint", {
                    defaultValue:
                      "Category limits are part of your overall budget, not extra.",
                  })}
                </Text>

                {categoriesLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.loadingText}>
                      {t("budget.manage.loadingCategories")}
                    </Text>
                  </View>
                ) : categoriesError ? (
                  <View style={styles.messageCard}>
                    <Text style={styles.errorText}>{categoriesError}</Text>
                    <Pressable
                      onPress={() => void fetchCategories()}
                      accessibilityRole="button"
                    >
                      <Text style={styles.retryText}>
                        {t("budget.manage.tryAgain")}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  categoryDrafts.length > 0 && (
                    <View style={styles.categoryList}>
                      {categoryDrafts.map((item) => {
                        const category = getCategory(item.categoryId);
                        return (
                          <View
                            key={item.categoryId}
                            style={styles.categoryCard}
                          >
                            <View style={styles.categoryHeader}>
                              <View style={styles.categoryInfo}>
                                <AppIcon
                                  name={category?.icon ?? "ellipsis"}
                                  size={36}
                                  iconSize={18}
                                  color={colors.primary}
                                  background
                                  backgroundColor={
                                    category?.color ?? colors.primaryLight
                                  }
                                />

                                <Text
                                  style={styles.categoryName}
                                  numberOfLines={1}
                                >
                                  {category?.name ??
                                    t("budget.manage.unknownCategory")}
                                </Text>
                              </View>
                              <Pressable
                                onPress={() =>
                                  handleRemoveCategory(item.categoryId)
                                }
                                hitSlop={8}
                                style={styles.removeButton}
                                accessibilityRole="button"
                                accessibilityLabel={t(
                                  "budget.manage.removeCategory",
                                )}
                              >
                                <Trash2 size={17} color={colors.danger} />
                              </Pressable>
                            </View>
                            <View style={styles.categoryAmountContainer}>
                              <Text style={styles.categoryCurrency}>
                                {currencyCode}
                              </Text>
                              <AmountInput
                                value={item.amount}
                                onChangeText={(value) =>
                                  handleCategoryAmountChange(
                                    item.categoryId,
                                    value,
                                  )
                                }
                                currency={currencyCode}
                                placeholder={amountPlaceholder}
                                placeholderTextColor={colors.textSecondary}
                                style={styles.categoryAmountInput}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )
                )}

                {/* The add row doubles as the empty state */}
                {showAddRow && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.addRow,
                      pressed && styles.addRowPressed,
                    ]}
                    onPress={() => setCategoryModalVisible(true)}
                    accessibilityRole="button"
                  >
                    <Plus size={18} color={colors.primary} />
                    <Text style={styles.addRowText}>
                      {t("budget.manage.addCategoryTitle")}
                    </Text>
                  </Pressable>
                )}

                {!categoriesLoading &&
                  !categoriesError &&
                  categoryDrafts.length === 0 &&
                  availableCategories.length === 0 && (
                    <View style={styles.emptyCategories}>
                      <Text style={styles.emptyTitle}>
                        {t("budget.manage.noCategoryLimits")}
                      </Text>
                    </View>
                  )}

                {/* Allocation: one slim line, only once there is something to show */}
                {overallAmountMinor !== null && categoryDrafts.length > 0 && (
                  <View style={styles.allocation}>
                    <View style={styles.allocationRow}>
                      <Text style={styles.allocationLabel}>
                        {t("budget.manage.categoryLimits")}
                      </Text>
                      <Text style={styles.allocationValue}>
                        {currencyCode}{" "}
                        {formatAmountInput(categoryTotalMinor, currencyCode)}
                        {" / "}
                        {formatAmountInput(overallAmountMinor, currencyCode)}
                      </Text>
                    </View>

                    <View style={styles.allocationTrack}>
                      <View
                        style={[
                          styles.allocationFill,
                          {
                            width: `${allocationRatio * 100}%`,
                            backgroundColor: exceedsOverallLimit
                              ? colors.warning
                              : colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Shown even when collapsed, since it affects saving */}
            {exceedsOverallLimit && (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>
                  {t("budget.manage.warningTitle")}
                </Text>
                <Text style={styles.warningDescription}>
                  {t("budget.manage.warningDescription")}
                </Text>
              </View>
            )}
          </View>

          {/* Delete: separated from the save actions */}
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
              saving && styles.disabledButton,
            ]}
            onPress={handleDeleteBudget}
            disabled={saving}
            accessibilityRole="button"
          >
            <Trash2 size={17} color={colors.danger} />
            <Text style={styles.deleteButtonText}>
              {t("budget.manage.delete")}
            </Text>
          </Pressable>
        </KeyboardAwareScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              saveDisabled && styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={saveDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: saveDisabled, busy: saving }}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
                <Text style={styles.saveButtonText}>
                  {t("budget.manage.saving")}
                </Text>
              </>
            ) : (
              <>
                <Check size={19} color={colors.textOnPrimary} />
                <Text style={styles.saveButtonText}>
                  {t("budget.manage.save")}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <CategorySelectionModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSelect={handleAddCategory}
        categories={availableCategories}
        title={t("budget.manage.addCategoryTitle")}
        subtitle={t("budget.manage.addCategorySubtitle")}
        emptyMessage={t("budget.manage.allCategoriesAdded")}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  group: { gap: spacing.sm },

  /* Header */
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  workspaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  workspaceDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  workspaceName: {
    flexShrink: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  workspaceSeparator: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  workspaceCurrency: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },

  /* Period (read-only) */
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodLabel: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  periodValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  /* Overall amount */
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  amountLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 60,
  },
  currencyPrefix: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    height: 60,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  hint: {
    fontSize: typography.size.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  /* Collapsible categories */
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  collapseHeaderPressed: { backgroundColor: colors.background },
  collapseTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  optionalText: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  collapseBody: { gap: spacing.md },

  /* Add row (also the empty state) */
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  addRowPressed: { opacity: 0.8 },
  addButtonPressed: { opacity: 0.8 },
  addRowText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  /* States */
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  messageCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorText: { color: colors.danger, fontSize: typography.size.sm },
  retryText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.sm,
  },
  emptyCategories: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  emptyDescription: {
    fontSize: typography.size.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  /* Category cards */
  categoryList: { gap: spacing.md },
  categoryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconText: { fontSize: 17, color: colors.text },
  categoryName: {
    flexShrink: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  removeButton: { padding: spacing.xs },
  categoryAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    minHeight: 48,
  },
  categoryCurrency: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  categoryAmountInput: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },

  /* Allocation */
  allocation: { gap: spacing.sm },
  allocationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  allocationLabel: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  allocationValue: {
    flexShrink: 1,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  allocationTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  allocationFill: {
    height: "100%",
    borderRadius: radius.full,
  },

  /* Warning */
  warningCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  warningTitle: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.warning,
  },
  warningDescription: {
    fontSize: typography.size.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  /* Delete */
  deleteButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  deleteButtonPressed: { opacity: 0.8 },
  deleteButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.danger,
  },

  /* Loading / error / empty (full screen) */
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  /* Footer */
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButtonPressed: { backgroundColor: colors.background },
  cancelButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    minHeight: 54,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  saveButtonPressed: { backgroundColor: colors.primaryDark },
  disabledButton: { opacity: 0.5 },
  saveButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textOnPrimary,
  },

  /* Category sheet */
  modalEmpty: { padding: spacing.lg },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryOptionName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
});
