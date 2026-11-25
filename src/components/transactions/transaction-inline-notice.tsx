import { StyleSheet, Text, View } from "react-native";
import { Info } from "lucide-react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

export function TransactionInlineNotice({ text }: { text: string }) {
  return (
    <View style={styles.container}>
      <Info size={16} color={colors.warning} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },
});
