import { Check, ChevronDown, X } from "lucide-react-native";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

type selectOption = {
  id: string;
  name: string;
};

type selectSheetProps = {
  label: string;
  value: string;
  options: readonly selectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SelectSheet({
  label,
  value,
  options,
  onChange,
  placeholder = "Select an option",
}: selectSheetProps) {
  const [visible, setVisible] = useState(false);

  const selected = options.find((option) => option.id === value);

  function handleSelect(id: string) {
    onChange(id);
    setVisible(false);
  }

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>

        <Pressable
          style={styles.trigger}
          onPress={() => setVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Select ${label}`}
        >
          <Text style={[styles.triggerText, !selected && styles.placeholder]}>
            {selected?.name ?? placeholder}
          </Text>

          <ChevronDown size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setVisible(false)}
            accessibilityLabel="Close selector"
          />

          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>

              <Pressable
                onPress={() => setVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.optionList}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const isSelected = option.id === value;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelect(option.id)}
                    style={[styles.option, isSelected && styles.selectedOption]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {option.name}
                    </Text>

                    {isSelected && <Check size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  triggerText: {
    color: colors.text,
    fontSize: typography.size.md,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: "75%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  optionList: {
    flexGrow: 0,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  selectedOption: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    color: colors.text,
    fontSize: typography.size.md,
  },
  selectedText: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
});
