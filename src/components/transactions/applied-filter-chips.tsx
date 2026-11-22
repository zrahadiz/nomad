import { useTranslation } from "react-i18next";

import i18n from "@/i18n";

import { X } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

export type AppliedFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

type NamedItem = { id: string; name: string };

const SORT_LABEL_KEYS: Record<string, string> = {
  newest: "transactions.filterModal.sorting.newest",
  oldest: "transactions.filterModal.sorting.oldest",
  highest: "transactions.filterModal.sorting.highest",
  lowest: "transactions.filterModal.sorting.lowest",
};

function humanize(value: string): string {
  const text = value.replace(/[-_]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "2026-11-13" -> "13 Nov" (adds the year only when it isn't the current one).
function formatShortDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) return value.trim();

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  const locale = i18n.resolvedLanguage === "id" ? "id-ID" : "en-GB";

  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

/* -------------------------------------------------------------------------- */
/* Build the chip list from the filter state                                   */
/* (search text is not a chip: it's already visible in the search box)         */
/* -------------------------------------------------------------------------- */

export function buildAppliedFilters(params: {
  selectedPeriod: string;
  periodLabel: string;
  dateRange: { start: string; end: string } | null;
  selectedCategoryIds: string[];
  selectedAccountIds: string[];
  minimumAmount: string;
  maximumAmount: string;
  sortBy: string;
  currency: string;
  categories: NamedItem[];
  accounts: NamedItem[];
  onClearPeriod: () => void;
  onRemoveCategory: (id: string) => void;
  onRemoveAccount: (id: string) => void;
  onClearAmount: () => void;
  onClearSort: () => void;
}): AppliedFilter[] {
  const result: AppliedFilter[] = [];

  const t = i18n.t.bind(i18n);

  // Period
  if (params.selectedPeriod !== "all") {
    const label =
      params.selectedPeriod === "custom"
        ? params.dateRange
          ? `${formatShortDate(params.dateRange.start)} – ${formatShortDate(
              params.dateRange.end,
            )}`
          : t("transactions.appliedFilters.customPeriod")
        : params.periodLabel;

    result.push({
      key: "period",
      label,
      onRemove: params.onClearPeriod,
    });
  }

  // Categories
  for (const id of params.selectedCategoryIds) {
    result.push({
      key: `category:${id}`,
      label:
        params.categories.find((item) => item.id === id)?.name ??
        t("transactions.appliedFilters.categoryFallback"),
      onRemove: () => params.onRemoveCategory(id),
    });
  }

  // Accounts
  for (const id of params.selectedAccountIds) {
    result.push({
      key: `account:${id}`,
      label:
        params.accounts.find((item) => item.id === id)?.name ??
        t("transactions.appliedFilters.accountFallback"),
      onRemove: () => params.onRemoveAccount(id),
    });
  }

  // Amount range
  const min = params.minimumAmount.trim();
  const max = params.maximumAmount.trim();

  if (min || max) {
    const label =
      min && max
        ? `${params.currency} ${min} – ${max}`
        : min
          ? `${t("transactions.appliedFilters.minimum")} ${params.currency} ${min}`
          : `${t("transactions.appliedFilters.maximum")} ${params.currency} ${max}`;

    result.push({
      key: "amount",
      label,
      onRemove: params.onClearAmount,
    });
  }

  // Sorting
  if (params.sortBy !== "newest") {
    const sortLabel = SORT_LABEL_KEYS[params.sortBy]
      ? t(SORT_LABEL_KEYS[params.sortBy])
      : humanize(params.sortBy);

    result.push({
      key: "sort",
      label: `${t("transactions.appliedFilters.sortPrefix")} ${sortLabel}`,
      onRemove: params.onClearSort,
    });
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function AppliedFilterChips({
  filters,
  onClearAll,
}: {
  filters: AppliedFilter[];
  onClearAll: () => void;
}) {
  const { t } = useTranslation();
  if (filters.length === 0) return null;

  return (
    <View style={styles.row}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {filters.map((filter) => (
          <Pressable
            key={filter.key}
            onPress={filter.onRemove}
            accessibilityRole="button"
            accessibilityLabel={t(
              "transactions.appliedFilters.removeAccessibility",
              { label: filter.label },
            )}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={styles.chipText} numberOfLines={1}>
              {filter.label}
            </Text>

            <X size={14} color={colors.primary} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Pinned outside the scroll area so it's always reachable */}
      <Pressable
        onPress={onClearAll}
        accessibilityRole="button"
        accessibilityLabel={t("transactions.appliedFilters.clearAccessibility")}
        hitSlop={8}
        style={styles.clearButton}
      >
        <Text style={styles.clearFiltersText}>
          <Text style={styles.clearFiltersText}>
            {t("transactions.appliedFilters.clearAll")}
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  scroll: {
    flex: 1,
  },

  content: {
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.md,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: 180,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingVertical: spacing.xs + 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },

  chipPressed: {
    opacity: 0.7,
  },

  chipText: {
    flexShrink: 1,
    color: colors.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },

  clearButton: {
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },

  clearFiltersText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
