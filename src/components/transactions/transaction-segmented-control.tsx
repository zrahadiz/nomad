import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";
import type { TransactionSegmentOption } from "@/types/transaction";

type TransactionSegmentedControlProps<T extends string> = {
  options: TransactionSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function TransactionSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: TransactionSegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected
          ? (option.color ?? colors.primary)
          : colors.textSecondary;
        const Icon = option.icon;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              selected && {
                backgroundColor: option.background ?? colors.primaryLight,
              },
            ]}
          >
            {Icon ? <Icon size={16} color={color} /> : null}
            <Text
              style={[styles.text, selected && styles.textSelected, { color }]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  text: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  textSelected: { fontWeight: typography.weight.semibold },
});
