import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Plus, Trash2 } from "lucide-react-native";
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

import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
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

  return (
    <SafeScreen>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("budget.manage.title")}</Text>
            <Text style={styles.subtitle}>
              {t("budget.manage.subtitle", {
                month: formatMonthLabel(budgetMonth, locale),
              })}
            </Text>
          </View>

          <View style={styles.workspaceCard}>
            <Text style={styles.workspaceLabel}>
              {t("budget.manage.workspace")}
            </Text>
            <View style={styles.workspaceValue}>
              <View style={styles.workspaceDot} />
              <Text style={styles.workspaceName} numberOfLines={1}>
                {activeWorkspace?.name ?? t("budget.manage.noWorkspace")}
              </Text>
              <Text style={styles.currencyBadge}>{currencyCode}</Text>
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.sectionTitle}>{t("budget.manage.period")}</Text>
            <View style={[styles.card, styles.cardPadded]}>
              <Text style={styles.periodText}>
                {formatMonthLabel(budgetMonth, locale)}
              </Text>
              <Text style={styles.periodHelper}>
                {t("budget.manage.periodHelp")}
              </Text>
            </View>
          </View>

          <View style={styles.group}>
            <View>
              <Text style={styles.sectionTitle}>
                {t("budget.manage.overallTitle")}
              </Text>
              <Text style={styles.sectionDescription}>
                {t("budget.manage.overallDescription")}
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

          <View style={styles.group}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>
                  {t("budget.manage.categoryTitle")}
                </Text>
                <Text style={styles.sectionDescription}>
                  {t("budget.manage.categoryDescription")}
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
                  {t("budget.manage.add")}
                </Text>
              </Pressable>
            </View>
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
            ) : categoryDrafts.length === 0 ? (
              <View style={styles.emptyCategories}>
                <Text style={styles.emptyTitle}>
                  {t("budget.manage.noCategoryLimits")}
                </Text>
                <Text style={styles.emptyDescription}>
                  {t("budget.manage.noCategoryLimitsDescription")}
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
                            {category?.name ??
                              t("budget.manage.unknownCategory")}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleRemoveCategory(item.categoryId)}
                          hitSlop={8}
                          style={styles.removeButton}
                          accessibilityRole="button"
                          accessibilityLabel={t("budget.manage.removeCategory")}
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
            <Text style={styles.helperText}>
              {t("budget.manage.categoryHelp")}
            </Text>
          </View>

          {overallAmountMinor !== null && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {t("budget.manage.summaryTitle")}
              </Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {t("budget.manage.overallLimit")}
                </Text>
                <Text style={styles.summaryValue}>
                  {currencyCode}{" "}
                  {formatAmountInput(overallAmountMinor, currencyCode)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {t("budget.manage.categoryLimits")}
                </Text>
                <Text style={styles.summaryValue}>
                  {currencyCode}{" "}
                  {formatAmountInput(categoryTotalMinor, currencyCode)}
                </Text>
              </View>
            </View>
          )}

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
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
              saving && styles.disabledButton,
            ]}
            onPress={() => router.back()}
            disabled={saving}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>
              {t("budget.manage.cancel")}
            </Text>
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

      <BottomSheetModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title={t("budget.manage.addCategoryTitle")}
        subtitle={t("budget.manage.addCategorySubtitle")}
      >
        {availableCategories.length === 0 ? (
          <View style={styles.modalEmpty}>
            <Text style={styles.emptyDescription}>
              {t("budget.manage.allCategoriesAdded")}
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
                    { backgroundColor: category.color ?? colors.primaryLight },
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl },
  group: { gap: spacing.sm },
  header: { gap: spacing.xs },
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
  sectionHeaderText: { flex: 1, paddingRight: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPadded: { padding: spacing.lg, gap: spacing.md },
  periodText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  periodHelper: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  addButtonPressed: { opacity: 0.8 },
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
  disabledText: { color: colors.textSecondary },
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
  summaryLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  summaryValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
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
