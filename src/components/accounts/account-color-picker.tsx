import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { accountColors } from "@/constants/account-options";
import { radius, spacing } from "@/constants/theme";

type AccountColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function AccountColorPicker({
  value,
  onChange,
}: AccountColorPickerProps) {
  return (
    <View style={styles.container}>
      {accountColors.map((color) => {
        const selected = value === color;

        return (
          <Pressable
            key={color}
            style={[
              styles.option,
              { backgroundColor: color },
              selected && styles.selectedOption,
            ]}
            onPress={() => onChange(color)}
            accessibilityRole="button"
            accessibilityLabel={`Select color ${color}`}
            accessibilityState={{ selected }}
          >
            {selected && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  option: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedOption: {
    borderColor: "#202824",
  },
});
