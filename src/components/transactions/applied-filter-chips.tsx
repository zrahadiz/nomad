import { X } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type AppliedFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

type NamedItem = { id: string; name: string };

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

// Edit if your SortFilter labels differ. Unknown values fall back to a
// humanized version of the raw value ("some_value" -> "Some value").
const SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  highest: "Highest amount",
  lowest: "Lowest amount",
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

  return date.toLocaleDateString("en-GB", {
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
  periodLabel: string; // label of the selected period, from your `periods` list
  dateRange: { start: string; end: string } | null; // resolved range (custom or preset)
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

  // Period
  if (params.selectedPeriod !== "all") {
    // A valid custom range shows its dates; an incomplete one still gets a chip
    // (so it can be removed) but isn't being applied to the list yet.
    const label =
      params.selectedPeriod === "custom"
        ? params.dateRange
          ? `${formatShortDate(params.dateRange.start)} – ${formatShortDate(
              params.dateRange.end,
            )}`
          : "Custom period"
        : params.periodLabel;

    result.push({ key: "period", label, onRemove: params.onClearPeriod });
  }

  // Categories: one removable chip each
  for (const id of params.selectedCategoryIds) {
    result.push({
      key: `category:${id}`,
      label:
        params.categories.find((item) => item.id === id)?.name ?? "Category",
      onRemove: () => params.onRemoveCategory(id),
    });
  }

  // Accounts: one removable chip each
  for (const id of params.selectedAccountIds) {
    result.push({
      key: `account:${id}`,
      label: params.accounts.find((item) => item.id === id)?.name ?? "Account",
      onRemove: () => params.onRemoveAccount(id),
    });
  }

  // Amount range: a single chip that clears both ends
  const min = params.minimumAmount.trim();
  const max = params.maximumAmount.trim();

  if (min || max) {
    const label =
      min && max
        ? `${params.currency} ${min} – ${max}`
        : min
          ? `Min ${params.currency} ${min}`
          : `Max ${params.currency} ${max}`;

    result.push({ key: "amount", label, onRemove: params.onClearAmount });
  }

  // Sort (only when it differs from the default)
  if (params.sortBy !== "newest") {
    result.push({
      key: "sort",
      label: `Sort: ${SORT_LABELS[params.sortBy] ?? humanize(params.sortBy)}`,
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
  // No filters applied: render nothing, so there's no empty gap in the layout.
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
            accessibilityLabel={`Remove filter: ${filter.label}`}
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
        accessibilityLabel="Clear all filters"
        hitSlop={8}
        style={styles.clearButton}
      >
        <Text style={styles.clearFiltersText}>Clear all</Text>
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
