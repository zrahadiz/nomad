import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Plus, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { colors, radius, spacing, typography } from "@/constants/theme";

import { useBudgetStore } from "@/stores/use-budget-store";
import { useCategoryStore } from "@/stores/use-category-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

import { getCurrencyDecimalDigits, toMinorUnits } from "@/lib/finance/currency";

import { isValidCurrencyAmountInput } from "@/lib/finance/currency-input";

import type { financialCategory } from "@/types/finances";

// =====================================================
// HELPERS
// =====================================================
function parseAmountToMinor(value: string, currency: string) {
  if (!isValidCurrencyAmountInput(value, currency)) {
    return null;
  }

  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

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
  ) {
    return getCurrentMonth();
  }

  return month;
}

function formatMonthLabel(date: string) {
  const [year, month] = date.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
}

// =====================================================
// TYPES
// =====================================================

type categoryBudgetDraft = {
  id: string | null;
  categoryId: string;
  amount: string;
};

// =====================================================
// SCREEN
// =====================================================

export default function ManageBudgetScreen() {
  const router = useRouter();

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

  // =================================================
  // FETCH
  // =================================================

  useEffect(() => {
    if (!activeWorkspaceId) return;

    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
  }, [activeWorkspaceId, budgetMonth, fetchBudgetOverview]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  // =================================================
  // INITIALIZE FORM
  // =================================================

  useEffect(() => {
    if (saving || !overview) return;

    if (overview.budget.budgetMonth !== budgetMonth) return;

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

  // =================================================
  // DERIVED VALUES
  // =================================================

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

  // =================================================
  // CATEGORY ACTIONS
  // =================================================

  const getCategory = (categoryId: string) =>
    expenseCategories.find((category) => category.id === categoryId);

  const handleAddCategory = (category: financialCategory) => {
    setCategoryDrafts((current) => [
      ...current,
      {
        id: null,
        categoryId: category.id,
        amount: "",
      },
    ]);

    setCategoryModalVisible(false);
  };

  const handleOverallAmountChange = (value: string) => {
    if (isValidCurrencyAmountInput(value, currencyCode)) {
      setOverallAmount(value);
    }
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

  // =================================================
  // SAVE CHANGES
  // =================================================

  const handleSave = async () => {
    if (!activeWorkspaceId || !budget) return;

    if (overallAmountMinor === null) {
      Alert.alert(
        "Invalid budget amount",
        "Please enter a valid overall budget limit.",
      );
      return;
    }

    if (categoryDrafts.length > 0 && hasInvalidCategoryAmount) {
      Alert.alert(
        "Invalid category amount",
        "Please enter a valid amount for every category budget.",
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
      // Update the overall budget.
      if (overallAmountMinor !== budget.amountLimit) {
        await updateBudget(budget.id, {
          amountLimit: overallAmountMinor,
        });
      }

      // Remove category budgets that were removed from the form.
      const retainedIds = new Set(
        categoryInputs
          .map((item) => item.id)
          .filter((id): id is string => id !== null),
      );

      for (const original of originalCategories) {
        if (!retainedIds.has(original.id)) {
          await deleteBudgetCategory(original.id);
        }
      }

      // Create new category budgets and update existing ones.
      for (const item of categoryInputs) {
        if (item.id) {
          const original = originalCategories.find(
            (category) => category.id === item.id,
          );

          if (original && original.amountLimit !== item.amountLimit) {
            await updateBudgetCategory(item.id, {
              amountLimit: item.amountLimit,
            });
          }
        } else {
          await createBudgetCategory({
            budgetId: budget.id,
            categoryId: item.categoryId,
            amountLimit: item.amountLimit,
          });
        }
      }

      await fetchBudgetOverview(activeWorkspaceId, budgetMonth);

      Alert.alert("Budget updated", "Your budget changes have been saved.", [
        {
          text: "Done",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while updating your budget.";

      Alert.alert("Unable to update budget", message);
    } finally {
      setSaving(false);
    }
  };

  // =================================================
  // DELETE BUDGET
  // =================================================

  const handleDeleteBudget = () => {
    if (!budget) return;

    Alert.alert(
      "Delete budget?",
      `This will permanently delete the ${formatMonthLabel(
        budgetMonth,
      )} budget and all its category limits. Your transactions will not be affected.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete budget",
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
                  : "Failed to delete budget.";

              Alert.alert("Unable to delete budget", message);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  // =================================================
  // RENDER: LOADING / ERROR / EMPTY
  // =================================================

  if (loading || !isCorrectBudget) {
    return (
      <SafeScreen>
        <View style={styles.centerContainer}>
          {loading ? (
            <>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading budget...</Text>
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
                  if (activeWorkspaceId) {
                    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
                  }
                }}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.loadingText}>
              No budget found for this month.
            </Text>
          )}
        </View>
      </SafeScreen>
    );
  }

  // =================================================
  // RENDER: FORM
  // =================================================

  return (
    <SafeScreen>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}

          <View style={styles.header}>
            <Text style={styles.title}>Manage budget</Text>

            <Text style={styles.subtitle}>
              Update your spending limits for {formatMonthLabel(budgetMonth)}.
            </Text>
          </View>

          {/* WORKSPACE */}

          <View style={styles.workspaceCard}>
            <Text style={styles.workspaceLabel}>Workspace</Text>

            <View style={styles.workspaceValue}>
              <View style={styles.workspaceDot} />

              <Text style={styles.workspaceName} numberOfLines={1}>
                {activeWorkspace?.name ?? "No workspace selected"}
              </Text>

              <Text style={styles.currencyBadge}>{currencyCode}</Text>
            </View>
          </View>

          {/* MONTH */}

          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Budget period</Text>

            <View style={[styles.card, styles.cardPadded]}>
              <Text style={styles.periodText}>
                {formatMonthLabel(budgetMonth)}
              </Text>

              <Text style={styles.periodHelper}>
                The budget period cannot be changed here.
              </Text>
            </View>
          </View>

          {/* OVERALL LIMIT */}

          <View style={styles.group}>
            <View>
              <Text style={styles.sectionTitle}>Overall spending limit</Text>

              <Text style={styles.sectionDescription}>
                The maximum amount you plan to spend during this month.
              </Text>
            </View>

            <View style={[styles.card, styles.cardPadded]}>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencyPrefix}>{currencyCode}</Text>

                <AmountInput
                  value={overallAmount}
                  onChangeText={handleOverallAmountChange}
                  currency={currencyCode}
                  placeholder={
                    getCurrencyDecimalDigits(currencyCode) === 0 ? "0" : "0.00"
                  }
                  placeholderTextColor={colors.textSecondary}
                  style={styles.amountInput}
                />
              </View>
            </View>
          </View>

          {/* CATEGORY LIMITS */}

          <View style={styles.group}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Category limits</Text>

                <Text style={styles.sectionDescription}>
                  Optional limits for individual expense categories.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.addButtonPressed,
                  availableCategories.length === 0 && styles.addButtonDisabled,
                ]}
                onPress={() => setCategoryModalVisible(true)}
                disabled={availableCategories.length === 0}
                accessibilityRole="button"
              >
                <Plus
                  size={17}
                  color={
                    availableCategories.length === 0
                      ? colors.textSecondary
                      : colors.primary
                  }
                />

                <Text
                  style={[
                    styles.addButtonText,
                    availableCategories.length === 0 && styles.disabledText,
                  ]}
                >
                  Add
                </Text>
              </Pressable>
            </View>

            {categoriesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            ) : categoriesError ? (
              <View style={styles.messageCard}>
                <Text style={styles.errorText}>{categoriesError}</Text>

                <Pressable
                  onPress={() => void fetchCategories()}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : categoryDrafts.length === 0 ? (
              <View style={styles.emptyCategories}>
                <Text style={styles.emptyTitle}>No category limits added</Text>

                <Text style={styles.emptyDescription}>
                  Add limits for categories such as Food, Transport, Shopping,
                  or Entertainment.
                </Text>
              </View>
            ) : (
              <View style={styles.categoryList}>
                {categoryDrafts.map((item) => {
                  const category = getCategory(item.categoryId);

                  return (
                    <View key={item.categoryId} style={styles.categoryCard}>
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryInfo}>
                          <View
                            style={[
                              styles.categoryIcon,
                              {
                                backgroundColor:
                                  category?.color ?? colors.primaryLight,
                              },
                            ]}
                          >
                            <Text style={styles.categoryIconText}>
                              {category?.icon ?? "•"}
                            </Text>
                          </View>

                          <Text style={styles.categoryName} numberOfLines={1}>
                            {category?.name ?? "Unknown category"}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => handleRemoveCategory(item.categoryId)}
                          hitSlop={8}
                          style={styles.removeButton}
                          accessibilityRole="button"
                          accessibilityLabel="Remove category limit"
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
                            handleCategoryAmountChange(item.categoryId, value)
                          }
                          currency={currencyCode}
                          placeholder={
                            getCurrencyDecimalDigits(currencyCode) === 0
                              ? "0"
                              : "0.00"
                          }
                          placeholderTextColor={colors.textSecondary}
                          style={styles.categoryAmountInput}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* CATEGORY TOTAL WARNING */}

            {exceedsOverallLimit && (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>
                  Category limits exceed overall budget
                </Text>

                <Text style={styles.warningDescription}>
                  Your combined category limits are higher than your overall
                  budget. You can still save these changes.
                </Text>
              </View>
            )}

            <Text style={styles.helperText}>
              Category limits are included in your overall budget. They do not
              add extra spending allowance.
            </Text>
          </View>

          {/* SUMMARY */}

          {overallAmountMinor !== null && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Budget summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Overall limit</Text>

                <Text style={styles.summaryValue}>
                  {currencyCode}{" "}
                  {formatAmountInput(overallAmountMinor, currencyCode)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Category limits</Text>

                <Text style={styles.summaryValue}>
                  {currencyCode}{" "}
                  {formatAmountInput(categoryTotalMinor, currencyCode)}
                </Text>
              </View>
            </View>
          )}

          {/* DELETE: separated from the save actions */}

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
            <Text style={styles.deleteButtonText}>Delete budget</Text>
          </Pressable>
        </KeyboardAwareScrollView>

        {/* ACTIONS: always visible */}

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
              saving && styles.disabledButton,
            ]}
            onPress={() => router.back()}
            disabled={saving}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              saving && styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, busy: saving }}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
                <Text style={styles.saveButtonText}>Saving changes...</Text>
              </>
            ) : (
              <>
                <Check size={19} color={colors.textOnPrimary} />
                <Text style={styles.saveButtonText}>Save changes</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* CATEGORY SELECTOR */}

      <BottomSheetModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title="Add category limit"
        subtitle="Choose an expense category."
      >
        {availableCategories.length === 0 ? (
          <View style={styles.modalEmpty}>
            <Text style={styles.emptyDescription}>
              All available expense categories have already been added.
            </Text>
          </View>
        ) : (
          availableCategories.map((category) => (
            <Pressable
              key={category.id}
              style={styles.categoryOption}
              onPress={() => handleAddCategory(category)}
              accessibilityRole="button"
            >
              <View style={styles.categoryInfo}>
                <View
                  style={[
                    styles.categoryIcon,
                    {
                      backgroundColor: category.color ?? colors.primaryLight,
                    },
                  ]}
                >
                  <Text style={styles.categoryIconText}>
                    {category.icon ?? "•"}
                  </Text>
                </View>

                <Text style={styles.categoryOptionName}>{category.name}</Text>
              </View>

              <Plus size={18} color={colors.primary} />
            </Pressable>
          ))
        )}
      </BottomSheetModal>
    </SafeScreen>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },

  group: {
    gap: spacing.sm,
  },

  /* Header */
  header: {
    gap: spacing.xs,
  },

  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },

  subtitle: {
    fontSize: typography.size.sm,
    lineHeight: 21,
    color: colors.textSecondary,
  },

  /* Workspace */
  workspaceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  workspaceLabel: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },

  workspaceValue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
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
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  currencyBadge: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: "hidden",
  },

  /* Sections */
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  sectionDescription: {
    fontSize: typography.size.caption,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },

  helperText: {
    fontSize: typography.size.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionHeaderText: {
    flex: 1,
    paddingRight: spacing.sm,
  },

  /* Cards */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardPadded: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  /* Period */
  periodText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  periodHelper: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },

  /* Overall amount */
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 56,
  },

  currencyPrefix: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },

  amountInput: {
    flex: 1,
    height: 56,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },

  /* Add button */
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },

  addButtonPressed: {
    opacity: 0.8,
  },

  addButtonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  addButtonText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  disabledText: {
    color: colors.textSecondary,
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

  errorText: {
    color: colors.danger,
    fontSize: typography.size.sm,
  },

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
    padding: spacing.lg,
    gap: spacing.xs,
  },

  emptyTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  emptyDescription: {
    fontSize: typography.size.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  /* Category cards */
  categoryList: {
    gap: spacing.md,
  },

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

  categoryIconText: {
    fontSize: 17,
    color: colors.text,
  },

  categoryName: {
    flexShrink: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  removeButton: {
    padding: spacing.xs,
  },

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

  /* Summary */
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  summaryTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },

  summaryLabel: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },

  summaryValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
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

  deleteButtonPressed: {
    opacity: 0.8,
  },

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

  cancelButtonPressed: {
    backgroundColor: colors.background,
  },

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

  saveButtonPressed: {
    backgroundColor: colors.primaryDark,
  },

  disabledButton: {
    opacity: 0.5,
  },

  saveButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textOnPrimary,
  },

  /* Category sheet */
  modalEmpty: {
    padding: spacing.lg,
  },

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
