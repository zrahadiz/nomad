import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Plus, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { SafeScreen } from "@/components/layout/safe-screen";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { colors, radius, spacing } from "@/constants/theme";

import { useBudgetStore } from "@/stores/use-budget-store";
import { useCategoryStore } from "@/stores/use-category-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

import type { financialCategory } from "@/types/finances";

// =====================================================
// HELPERS
// =====================================================

function getCurrencyDecimals(currency: string) {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

function parseAmountToMinor(value: string, currency: string) {
  const decimals = getCurrencyDecimals(currency);
  const amount = Number(value.replace(/,/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) return null;

  const minorAmount = Math.round(amount * 10 ** decimals);

  if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) {
    return null;
  }

  return minorAmount;
}

function sanitizeAmountInput(value: string, currency: string) {
  const cleaned = value.replace(/,/g, "");
  const decimals = getCurrencyDecimals(currency);

  const pattern =
    decimals === 0 ? /^\d*$/ : new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`);

  return pattern.test(cleaned) ? cleaned : null;
}

function formatAmountInput(amountMinor: number, currency: string) {
  const decimals = getCurrencyDecimals(currency);

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

  const handleCategoryAmountChange = (categoryId: string, value: string) => {
    const sanitized = sanitizeAmountInput(value, currencyCode);

    if (sanitized === null) return;

    setCategoryDrafts((current) =>
      current.map((item) =>
        item.categoryId === categoryId ? { ...item, amount: sanitized } : item,
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
                style={styles.retryButton}
                onPress={() => {
                  if (activeWorkspaceId) {
                    void fetchBudgetOverview(activeWorkspaceId, budgetMonth);
                  }
                }}
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
      <KeyboardAwareScrollView
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

            <Text style={styles.workspaceName}>
              {activeWorkspace?.name ?? "No workspace selected"}
            </Text>

            <Text style={styles.currencyBadge}>{currencyCode}</Text>
          </View>
        </View>

        {/* BUDGET PERIOD */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget period</Text>

          <View style={styles.periodCard}>
            <Text style={styles.periodText}>
              {formatMonthLabel(budgetMonth)}
            </Text>

            <Text style={styles.periodHelper}>
              The budget period cannot be changed here.
            </Text>
          </View>
        </View>

        {/* OVERALL LIMIT */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall spending limit</Text>

          <Text style={styles.sectionDescription}>
            The maximum amount you plan to spend during this month.
          </Text>

          <View style={styles.amountInputContainer}>
            <Text style={styles.currencyPrefix}>{currencyCode}</Text>

            <TextInput
              value={overallAmount}
              onChangeText={(value) => {
                const sanitized = sanitizeAmountInput(value, currencyCode);

                if (sanitized !== null) {
                  setOverallAmount(sanitized);
                }
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>
        </View>

        {/* CATEGORY LIMITS */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Category limits</Text>

              <Text style={styles.sectionDescription}>
                Optional limits for individual expense categories.
              </Text>
            </View>

            <Pressable
              style={styles.addButton}
              onPress={() => setCategoryModalVisible(true)}
              disabled={availableCategories.length === 0}
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

              <Pressable onPress={() => void fetchCategories()}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : categoryDrafts.length === 0 ? (
            <View style={styles.emptyCategories}>
              <Text style={styles.emptyTitle}>No category limits added</Text>

              <Text style={styles.emptyDescription}>
                Add limits for categories such as Food, Transport, Shopping, or
                Entertainment.
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

                        <Text style={styles.categoryName}>
                          {category?.name ?? "Unknown category"}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleRemoveCategory(item.categoryId)}
                        hitSlop={8}
                        style={styles.removeButton}
                      >
                        <Trash2 size={17} color={colors.danger} />
                      </Pressable>
                    </View>

                    <View style={styles.categoryAmountContainer}>
                      <Text style={styles.categoryCurrency}>
                        {currencyCode}
                      </Text>

                      <TextInput
                        value={item.amount}
                        onChangeText={(value) =>
                          handleCategoryAmountChange(item.categoryId, value)
                        }
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                        style={styles.categoryAmountInput}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

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
            Category limits are included in your overall budget. They do not add
            extra spending allowance.
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

        {/* SAVE */}

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <ActivityIndicator color={colors.surface} />
              <Text style={styles.saveButtonText}>Saving changes...</Text>
            </>
          ) : (
            <>
              <Check size={19} color={colors.surface} />
              <Text style={styles.saveButtonText}>Save changes</Text>
            </>
          )}
        </Pressable>

        {/* DELETE */}

        <Pressable
          style={styles.deleteButton}
          onPress={handleDeleteBudget}
          disabled={saving}
        >
          <Trash2 size={17} color={colors.danger} />
          <Text style={styles.deleteButtonText}>Delete budget</Text>
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </KeyboardAwareScrollView>

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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },

  header: {
    marginBottom: spacing.xl,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  workspaceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },

  workspaceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  workspaceValue: {
    flexDirection: "row",
    alignItems: "center",
  },

  workspaceDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },

  workspaceName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },

  currencyBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },

  section: {
    marginBottom: spacing.xl,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },

  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  periodCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },

  periodText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },

  periodHelper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    minHeight: 56,
  },

  currencyPrefix: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },

  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    paddingVertical: spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  sectionHeaderText: {
    flex: 1,
    paddingRight: spacing.sm,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },

  addButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },

  disabledText: {
    color: colors.textSecondary,
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },

  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  messageCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },

  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },

  retryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.sm,
  },

  emptyCategories: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    padding: spacing.lg,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },

  emptyDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  categoryList: {
    gap: spacing.md,
  },

  categoryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
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
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },

  removeButton: {
    padding: spacing.xs,
  },

  categoryAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    minHeight: 46,
  },

  categoryCurrency: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },

  categoryAmountInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.sm,
  },

  warningCard: {
    backgroundColor: "#FFF5E5",
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  warningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9A681C",
    marginBottom: spacing.xs,
  },

  warningDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#8B6A35",
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },

  saveButton: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.surface,
  },

  deleteButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.danger,
  },

  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },

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
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
});
