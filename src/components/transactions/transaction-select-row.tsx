import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { colors, spacing, typography } from "@/constants/theme";

type TransactionSelectRowProps = {
  context?: string;
  label: string;
  value?: string;
  placeholder: string;
  hint?: string;
  leading: ReactNode;
  onPress: () => void;
};

export function TransactionSelectRow({
  context,
  label,
  value,
  placeholder,
  hint,
  leading,
  onPress,
}: TransactionSelectRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${context ? `${context} ` : ""}${label}: ${
        value ?? placeholder
      }`}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
      ]}
    >
      {leading}
      <View style={styles.flex}>
        <Text style={styles.eyebrow}>{label}</Text>
        <Text
          style={[styles.value, !value && styles.placeholder]}
          numberOfLines={1}
        >
          {value ?? placeholder}
        </Text>
        {hint ? (
          <Text style={styles.hint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  pressed: { backgroundColor: colors.background },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  value: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  placeholder: {
    color: colors.textSecondary,
    fontWeight: typography.weight.regular,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: 2,
  },
});
