import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Check, Wallet, X } from "lucide-react-native";

import { useTranslation } from "react-i18next";

import { colors, radius, spacing, typography } from "@/constants/theme";

export type PeriodFilter =
  | "all"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year"
  | "custom";

export type SortFilter = "newest" | "oldest" | "highest" | "lowest";

export type FilterCategory = {
  id: string;
  name: string;
  icon: string | null;
  isArchived: boolean;
};

export type FilterAccount = {
  id: string;
  name: string;
  type: string;
};

export const periods: {
  labelKey: string;
  value: PeriodFilter;
}[] = [
  {
    labelKey: "transactions.filterModal.periods.all",
    value: "all",
  },
  {
    labelKey: "transactions.filterModal.periods.thisMonth",
    value: "this_month",
  },
  {
    labelKey: "transactions.filterModal.periods.lastMonth",
    value: "last_month",
  },
  {
    labelKey: "transactions.filterModal.periods.last3Months",
    value: "last_3_months",
  },
  {
    labelKey: "transactions.filterModal.periods.thisYear",
    value: "this_year",
  },
  {
    labelKey: "transactions.filterModal.periods.custom",
    value: "custom",
  },
];

const sortingOptions: {
  labelKey: string;
  value: SortFilter;
}[] = [
  {
    labelKey: "transactions.filterModal.sorting.newest",
    value: "newest",
  },
  {
    labelKey: "transactions.filterModal.sorting.oldest",
    value: "oldest",
  },
  {
    labelKey: "transactions.filterModal.sorting.highest",
    value: "highest",
  },
  {
    labelKey: "transactions.filterModal.sorting.lowest",
    value: "lowest",
  },
];

type TransactionFilterModalProps = {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;

  categories: FilterCategory[];
  accounts: FilterAccount[];
  currency: string;
  transactionCount: number;

  selectedPeriod: PeriodFilter;
  onPeriodChange: (value: PeriodFilter) => void;

  selectedCategoryIds: string[];
  onCategoryChange: (value: string[]) => void;

  selectedAccountIds: string[];
  onAccountChange: (value: string[]) => void;

  customStartDate: string;
  onStartDateChange: (value: string) => void;

  customEndDate: string;
  onEndDateChange: (value: string) => void;

  minimumAmount: string;
  onMinimumAmountChange: (value: string) => void;

  maximumAmount: string;
  onMaximumAmountChange: (value: string) => void;

  sortBy: SortFilter;
  onSortChange: (value: SortFilter) => void;

  customDateIsInvalid: boolean;
  amountIsInvalid: boolean;
};

export function TransactionFilterModal({
  visible,
  onClose,
  onApply,
  onClear,
  categories,
  accounts,
  currency,
  transactionCount,
  selectedPeriod,
  onPeriodChange,
  selectedCategoryIds,
  onCategoryChange,
  selectedAccountIds,
  onAccountChange,
  customStartDate,
  onStartDateChange,
  customEndDate,
  onEndDateChange,
  minimumAmount,
  onMinimumAmountChange,
  maximumAmount,
  onMaximumAmountChange,
  sortBy,
  onSortChange,
  customDateIsInvalid,
  amountIsInvalid,
}: TransactionFilterModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const toggleCategory = (categoryId: string) => {
    onCategoryChange(
      selectedCategoryIds.includes(categoryId)
        ? selectedCategoryIds.filter((id) => id !== categoryId)
        : [...selectedCategoryIds, categoryId],
    );
  };

  const toggleAccount = (accountId: string) => {
    onAccountChange(
      selectedAccountIds.includes(accountId)
        ? selectedAccountIds.filter((id) => id !== accountId)
        : [...selectedAccountIds, accountId],
    );
  };

  const isInvalid = customDateIsInvalid || amountIsInvalid;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              maxHeight: "92%",
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleContainer}>
              <Text style={styles.sheetTitle}>
                {t("transactions.filterModal.title")}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {t("transactions.filterModal.subtitle")}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t("transactions.filterModal.close")}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Period */}
            {/* Period */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {t("transactions.filterModal.period")}
              </Text>

              <View style={styles.optionGrid}>
                {periods.map((period) => {
                  const selected = selectedPeriod === period.value;

                  return (
                    <Pressable
                      key={period.value}
                      onPress={() => onPeriodChange(period.value)}
                      style={[
                        styles.optionButton,
                        selected && styles.optionButtonSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {t(period.labelKey)}
                      </Text>

                      {selected && <Check size={15} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>

              {selectedPeriod === "custom" && (
                <View style={styles.dateRangeContainer}>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("transactions.filterModal.date.start")}
                    </Text>
                    <TextInput
                      value={customStartDate}
                      onChangeText={onStartDateChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.textInput}
                      autoCapitalize="none"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.dateInputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("transactions.filterModal.date.end")}
                    </Text>
                    <TextInput
                      value={customEndDate}
                      onChangeText={onEndDateChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.textInput}
                      autoCapitalize="none"
                      maxLength={10}
                    />
                  </View>

                  {customDateIsInvalid && (
                    <Text style={styles.validationText}>
                      {t("transactions.filterModal.date.invalid")}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.sheetDivider} />

            {/* Categories */}
            {/* Categories */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {t("transactions.filterModal.categories.title")}
              </Text>

              <Text style={styles.filterSectionDescription}>
                {t("transactions.filterModal.categories.description")}
              </Text>

              {categories.length === 0 ? (
                <Text style={styles.noOptionsText}>
                  {t("transactions.filterModal.categories.empty")}
                </Text>
              ) : (
                <View style={styles.selectionList}>
                  {categories.map((category) => {
                    const selected = selectedCategoryIds.includes(category.id);

                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => toggleCategory(category.id)}
                        style={styles.selectionRow}
                      >
                        <View style={styles.selectionLeft}>
                          <View style={styles.selectionIcon}>
                            <Text style={styles.categoryEmoji}>
                              {category.icon ?? "🏷️"}
                            </Text>
                          </View>

                          <Text style={styles.selectionLabel}>
                            {category.name}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.checkbox,
                            selected && styles.checkboxSelected,
                          ]}
                        >
                          {selected && (
                            <Check size={13} color={colors.textOnPrimary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.sheetDivider} />

            {/* Accounts */}
            {/* Accounts */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {t("transactions.filterModal.accounts.title")}
              </Text>

              <Text style={styles.filterSectionDescription}>
                {t("transactions.filterModal.accounts.description")}
              </Text>

              {accounts.length === 0 ? (
                <Text style={styles.noOptionsText}>
                  {t("transactions.filterModal.accounts.empty")}
                </Text>
              ) : (
                <View style={styles.selectionList}>
                  {accounts.map((account) => {
                    const selected = selectedAccountIds.includes(account.id);

                    const accountTypeKey =
                      account.type === "e-wallet" ? "eWallet" : account.type;

                    return (
                      <Pressable
                        key={account.id}
                        onPress={() => toggleAccount(account.id)}
                        style={styles.selectionRow}
                      >
                        <View style={styles.selectionLeft}>
                          <View style={styles.selectionIcon}>
                            <Wallet size={17} color={colors.primary} />
                          </View>

                          <View style={styles.accountTextContainer}>
                            <Text style={styles.selectionLabel}>
                              {account.name}
                            </Text>
                            <Text style={styles.accountType}>
                              {t(`home.accountTypes.${accountTypeKey}`)}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.checkbox,
                            selected && styles.checkboxSelected,
                          ]}
                        >
                          {selected && (
                            <Check size={13} color={colors.textOnPrimary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.sheetDivider} />

            {/* Amount range */}
            {/* Amount range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {t("transactions.filterModal.amount.title")}
              </Text>

              <Text style={styles.filterSectionDescription}>
                {t("transactions.filterModal.amount.description", {
                  currency,
                })}
              </Text>

              <View style={styles.amountRangeRow}>
                <View style={styles.amountInputGroup}>
                  <Text style={styles.inputLabel}>
                    {t("transactions.filterModal.amount.minimum")}
                  </Text>
                  <TextInput
                    value={minimumAmount}
                    onChangeText={onMinimumAmountChange}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.amountRangeSeparator}>
                  <Text style={styles.amountRangeSeparatorText}>
                    {t("transactions.filterModal.amount.separator")}
                  </Text>
                </View>

                <View style={styles.amountInputGroup}>
                  <Text style={styles.inputLabel}>
                    {t("transactions.filterModal.amount.maximum")}
                  </Text>
                  <TextInput
                    value={maximumAmount}
                    onChangeText={onMaximumAmountChange}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {amountIsInvalid && (
                <Text style={styles.validationText}>
                  {t("transactions.filterModal.amount.invalid")}
                </Text>
              )}
            </View>

            <View style={styles.sheetDivider} />

            {/* Sorting */}
            {/* Sorting */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {t("transactions.filterModal.sorting.title")}
              </Text>

              <View style={styles.optionGrid}>
                {sortingOptions.map((option) => {
                  const selected = sortBy === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => onSortChange(option.value)}
                      style={[
                        styles.optionButton,
                        selected && styles.optionButtonSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {t(option.labelKey)}
                      </Text>

                      {selected && <Check size={15} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Pressable onPress={onClear} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>
                {t("transactions.filterModal.actions.clear")}
              </Text>
            </Pressable>

            <Pressable
              disabled={isInvalid}
              onPress={onApply}
              style={[
                styles.applyButton,
                isInvalid && styles.applyButtonDisabled,
              ]}
            >
              <Text style={styles.applyButtonText}>
                {t("transactions.filterModal.actions.showTransactions", {
                  count: transactionCount,
                })}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },

  bottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    overflow: "hidden",
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  sheetTitleContainer: {
    gap: 2,
  },

  sheetTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  sheetSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },

  filterSection: {
    gap: spacing.md,
  },

  filterSectionTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  filterSectionDescription: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginTop: -spacing.xs,
  },

  sheetDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  optionButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  optionText: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },

  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },

  dateRangeContainer: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },

  dateInputGroup: {
    flex: 1,
    gap: spacing.xs,
  },

  inputLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },

  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typography.size.sm,
  },

  validationText: {
    color: colors.danger,
    fontSize: typography.size.xs,
  },

  selectionList: {
    gap: spacing.sm,
  },

  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },

  selectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },

  selectionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  categoryEmoji: {
    fontSize: 18,
  },

  selectionLabel: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  accountTextContainer: {
    gap: 2,
  },

  accountType: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    textTransform: "capitalize",
  },

  checkbox: {
    width: 21,
    height: 21,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  noOptionsText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  amountRangeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },

  amountInputGroup: {
    flex: 1,
    gap: spacing.xs,
  },

  amountRangeSeparator: {
    height: 44,
    justifyContent: "center",
  },

  amountRangeSeparatorText: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  sheetFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  resetButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },

  resetButtonText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  applyButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },

  applyButtonDisabled: {
    opacity: 0.45,
  },

  applyButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
