import { colors, radius, spacing, typography } from "@/constants/theme";
import { type ReactNode } from "react";

import { StyleSheet, Text, View } from "react-native";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react-native";

export default function FlowStat({
  label,
  amount,
  amountColor,
  direction,
  tone,
  secondary,
}: {
  label: string;
  amount: string;
  amountColor: string;
  direction: "in" | "out";
  tone: "success" | "danger" | "neutral";
  secondary?: ReactNode;
}) {
  const iconColor =
    tone === "success"
      ? colors.success
      : tone === "danger"
        ? colors.danger
        : colors.textSecondary;

  const bubbleColor =
    tone === "success"
      ? colors.successLight
      : tone === "danger"
        ? colors.dangerLight
        : colors.background;

  return (
    <View style={styles.flowStat}>
      <View style={[styles.flowIcon, { backgroundColor: bubbleColor }]}>
        {direction === "in" ? (
          <ArrowDownLeft size={16} color={iconColor} />
        ) : (
          <ArrowUpRight size={16} color={iconColor} />
        )}
      </View>

      <View style={styles.flowStatText}>
        <Text style={styles.flowLabel}>{label}</Text>

        <Text
          style={[styles.flowAmount, { color: amountColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {amount}
        </Text>

        {secondary}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flowStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },

  flowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  flowStatText: {
    flex: 1,
  },

  flowLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  flowAmount: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
});
