import { Plus } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { financialCategory } from "@/types/finances";

import { AppIcon } from "@/components/ui/app-icon";
import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { colors, spacing, typography } from "@/constants/theme";

type Category = financialCategory;

type CategorySelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  categories: Category[];
  title: string;
  subtitle: string;
  emptyMessage: string;
};

export function CategorySelectionModal({
  visible,
  onClose,
  onSelect,
  categories,
  title,
  subtitle,
  emptyMessage,
}: CategorySelectionModalProps) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    >
      {categories.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyDescription}>{emptyMessage}</Text>
        </View>
      ) : (
        categories.map((category) => (
          <Pressable
            key={category.id}
            style={styles.categoryOption}
            onPress={() => onSelect(category)}
            accessibilityRole="button"
          >
            <View style={styles.categoryInfo}>
              <AppIcon
                name={category.icon ?? "ellipsis"}
                size={36}
                iconSize={18}
                color={colors.primary}
                background
                backgroundColor={category.color ?? colors.primaryLight}
              />
              <Text style={styles.categoryOptionName}>{category.name}</Text>
            </View>

            <Plus size={18} color={colors.primary} />
          </Pressable>
        ))
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyDescription: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  categoryOptionName: {
    fontSize: typography.size.md,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
  },
});
