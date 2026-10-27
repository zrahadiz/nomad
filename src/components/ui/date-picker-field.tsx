import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { CalendarDays } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (date: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
};

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DatePickerField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
}: DatePickerFieldProps) {
  const [showIOSPicker, setShowIOSPicker] = useState(false);

  const selectedDate = parseLocalDate(value);

  function openPicker() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: "date",
        display: "calendar",
        maximumDate,
        minimumDate,
        onValueChange: (_, selectedDate) => {
          onChange(formatLocalDate(selectedDate));
        },
        onDismiss: () => {
          // User cancelled. Keep the existing date.
        },
      });

      return;
    }

    setShowIOSPicker(true);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={openPicker}
        style={styles.field}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label.toLowerCase()}`}
      >
        <Text style={styles.value}>{formatDisplayDate(value)}</Text>

        <CalendarDays
          size={20}
          color={colors.textSecondary}
          strokeWidth={1.8}
        />
      </Pressable>

      {Platform.OS === "ios" && showIOSPicker && (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onValueChange={(_, selectedDate) => {
              onChange(formatLocalDate(selectedDate));
            }}
          />

          <Pressable
            onPress={() => setShowIOSPicker(false)}
            style={styles.doneButton}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  field: {
    minHeight: 54,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: {
    fontSize: 16,
    color: colors.text,
  },
  iosPicker: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  doneText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 16,
  },
});
