import { ChevronRight } from "lucide-react-native";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/constants/theme";

export default function SectionHeading({
  title,
  action,
  caption,
  onPress,
}: {
  title: string;
  action?: string;
  caption?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {action ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={8}
          style={styles.sectionAction}
        >
          <Text style={styles.sectionActionText}>{action}</Text>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>
      ) : caption ? (
        <Text style={styles.sectionCaption}>{caption}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: -spacing.xs,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  sectionCaption: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },

  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  sectionActionText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});
