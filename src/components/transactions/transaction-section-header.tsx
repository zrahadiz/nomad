import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

type TransactionSectionHeaderProps = {
  title: string;
  icon?: ReactNode;
  iconBackground?: string;
};

export function TransactionSectionHeader({
  title,
  icon,
  iconBackground,
}: TransactionSectionHeaderProps) {
  return (
    <View style={styles.container}>
      {icon ? (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: iconBackground ?? colors.primaryLight },
          ]}
        >
          {icon}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
