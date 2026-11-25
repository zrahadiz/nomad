import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheetModal } from "@/components/ui/bottom-modal";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { TransactionSheetOption } from "@/types/transaction";

type TransactionOptionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  options: TransactionSheetOption[];
  selectedId: string;
  emptyText: string;
  onSelect: (id: string) => void;
};

export function TransactionOptionSheet({
  visible,
  onClose,
  title,
  subtitle,
  options,
  selectedId,
  emptyText,
  onSelect,
}: TransactionOptionSheetProps) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    >
      {options.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        options.map((option) => {
          const selected = option.id === selectedId;
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.option,
                selected && styles.selected,
                pressed && !selected && styles.pressed,
              ]}
            >
              {option.leading}
              <View style={styles.flex}>
                <Text style={styles.label} numberOfLines={1}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text style={styles.description}>{option.description}</Text>
                ) : null}
              </View>
              {selected ? <Check size={20} color={colors.primary} /> : null}
            </Pressable>
          );
        })
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  option: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  selected: { backgroundColor: colors.primaryLight },
  pressed: { backgroundColor: colors.background },
  label: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: 2,
  },
  empty: {
    paddingVertical: spacing.xl,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
});
