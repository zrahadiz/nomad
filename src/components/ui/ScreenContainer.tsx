import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { colors, spacing } from "@/constants/theme";

type ScreenContainerProps = PropsWithChildren<{
  scrollable?: boolean;
}>;

export function ScreenContainer({
  children,
  scrollable = true,
}: ScreenContainerProps) {
  if (!scrollable) {
    return <View style={[styles.container, styles.content]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    flexGrow: 1,
  },
});
