import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
} from "lucide-react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatMoney } from "@/lib/finance/calculations";
import { formatConvertedMoney } from "@/lib/finance/currency-converter";
import type { workspaceCurrencyConverter } from "@/types/currency-converter";
import type { transaction } from "@/types/finances";

type TransactionItemProps = {
  item: transaction;
  accountName?: string;
  categoryName?: string;
  categoryIcon?: string | null;
  primaryCurrency: string;
  converter?: workspaceCurrencyConverter | null;
  onPress?: () => void;
  showDate?: boolean;
};

export function TransactionItem({
  item,
  accountName,
  categoryName,
  categoryIcon,
  primaryCurrency,
  converter = null,
  onPress,
  showDate = true,
}: TransactionItemProps) {
  const isIncome = item.type === "income";
  const isTransferOut = item.type === "transfer_out";
  const isTransferIn = item.type === "transfer_in";

  const isTransfer = isTransferOut || isTransferIn;
  const isPositive = isIncome || isTransferIn;

  const Icon = isTransfer
    ? ArrowLeftRight
    : isIncome
      ? ArrowDownLeft
      : ArrowUpRight;

  const defaultTitle = isTransferOut
    ? "Transfer sent"
    : isTransferIn
      ? "Transfer received"
      : (categoryName ?? (isIncome ? "Income" : "Expense"));

  const secondaryAmount =
    converter && item.currency === primaryCurrency
      ? formatConvertedMoney(item.amountMinor, primaryCurrency, converter)
      : null;

  const subtitleParts = [categoryName, accountName ?? "Unknown account"];

  if (showDate) {
    subtitleParts.push(item.date);
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.row}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <View style={styles.icon}>
        {categoryIcon && !isTransfer ? (
          <Text style={styles.categoryIcon}>{categoryIcon}</Text>
        ) : (
          <Icon size={20} color={colors.primary} />
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {item.description || defaultTitle}
        </Text>

        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitleParts.filter(Boolean).join(" · ")}
        </Text>
      </View>

      <View style={styles.amounts}>
        <Text style={[styles.amount, isPositive && styles.incomeText]}>
          {isPositive ? "+" : "−"}
          {formatMoney(item.amountMinor, item.currency)}
        </Text>

        {secondaryAmount && (
          <Text style={styles.secondaryAmount}>
            {isPositive ? "+" : "−"}
            {secondaryAmount}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryIcon: {
    fontSize: 20,
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
  amounts: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  amount: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  secondaryAmount: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
  incomeText: {
    color: colors.success,
  },
});
