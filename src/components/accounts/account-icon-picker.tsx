import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AccountIcon } from "@/components/accounts/account-icon";
import {
  accountIcons,
  type accountIconName,
} from "@/constants/account-options";
import { colors, radius, spacing } from "@/constants/theme";

type AccountIconPickerProps = {
  value: accountIconName;
  color: string;
  onChange: (icon: accountIconName) => void;
};

export function AccountIconPicker({
  value,
  color,
  onChange,
}: AccountIconPickerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {accountIcons.map((item) => {
          const selected = value === item.name;

          return (
            <Pressable
              key={item.name}
              style={[styles.option, selected && styles.selectedOption]}
              onPress={() => onChange(item.name)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.label} icon`}
              accessibilityState={{ selected }}
            >
              <AccountIcon
                name={item.name}
                color={color}
                size={44}
                iconSize={21}
              />

              {selected && (
                <View style={styles.checkContainer}>
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  option: {
    width: "18%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkContainer: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
