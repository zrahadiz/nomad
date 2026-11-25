import { ArrowLeft } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";

import { SafeScreen } from "@/components/layout/safe-screen";
import { colors, radius, spacing, typography } from "@/constants/theme";

const ITEM_HEIGHT = 56;
const VISIBLE_SIDE_ITEMS = 2;

type WheelColumnProps<T extends string | number> = {
  items: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  formatLabel?: (value: T) => string;
};

function WheelColumn<T extends string | number>({
  items,
  selectedValue,
  onSelect,
  formatLabel = String,
}: WheelColumnProps<T>) {
  const listRef = useRef<FlatList<T | null>>(null);

  const selectedIndex = Math.max(0, items.indexOf(selectedValue));

  const data = useMemo(
    () => [null, null, ...items, null, null] as (T | null)[],
    [items],
  );

  const scrollToItem = (index: number) => {
    listRef.current?.scrollToIndex({
      index: index + VISIBLE_SIDE_ITEMS,
      animated: true,
    });
  };

  const handleScrollEnd = (offset: number) => {
    const index = Math.round(offset / ITEM_HEIGHT) - VISIBLE_SIDE_ITEMS;
    const safeIndex = Math.max(0, Math.min(index, items.length - 1));

    if (items[safeIndex] !== undefined) {
      onSelect(items[safeIndex]);
    }
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<T | null>) => {
    if (item === null) {
      return <View style={styles.wheelItem} />;
    }

    const itemIndex = index - VISIBLE_SIDE_ITEMS;
    const distance = Math.abs(itemIndex - selectedIndex);
    const selected = item === selectedValue;

    return (
      <Pressable
        style={styles.wheelItem}
        onPress={() => {
          onSelect(item);
          scrollToItem(itemIndex);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <Text
          style={[
            styles.wheelText,
            selected && styles.wheelTextSelected,
            distance === 1 && styles.wheelTextAdjacent,
            distance >= 2 && styles.wheelTextFaded,
          ]}
          numberOfLines={1}
        >
          {formatLabel(item)}
        </Text>
      </Pressable>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={(item, index) =>
        item === null ? `spacer-${index}` : String(item)
      }
      style={styles.wheel}
      contentContainerStyle={styles.wheelContent}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      initialScrollIndex={selectedIndex + VISIBLE_SIDE_ITEMS}
      getItemLayout={(_, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      onMomentumScrollEnd={(event) =>
        handleScrollEnd(event.nativeEvent.contentOffset.y)
      }
      onScrollToIndexFailed={({ index }) => {
        listRef.current?.scrollToOffset({
          offset: index * ITEM_HEIGHT,
          animated: false,
        });
      }}
    />
  );
}

type MonthYearPickerProps = {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
};

export function MonthYearPicker({
  value,
  onSave,
  onCancel,
}: MonthYearPickerProps) {
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.startsWith("id") ? "id-ID" : "en";

  const [initialYear, initialMonth] = value.split("-").map(Number);

  const [selectedMonth, setSelectedMonth] = useState(
    Number.isInteger(initialMonth) && initialMonth >= 1 && initialMonth <= 12
      ? initialMonth
      : new Date().getMonth() + 1,
  );

  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const start = Math.min(currentYear - 10, initialYear - 1);
    const end = Math.max(currentYear + 10, initialYear + 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentYear, initialYear]);

  const [selectedYear, setSelectedYear] = useState(
    years.includes(initialYear) ? initialYear : currentYear,
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Date(2024, index, 1).toLocaleDateString(locale, {
          month: "long",
        }),
      ),
    [locale],
  );

  const selectedMonthLabel = months[selectedMonth - 1];

  const handleSave = () => {
    const normalizedMonth = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    onSave(normalizedMonth);
  };

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
            hitSlop={12}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t("common.back", {
              defaultValue: "Back",
            })}
          >
            <ArrowLeft size={25} color={colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>
            {t("monthYearPicker.title", {
              defaultValue: "Select month",
            })}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.pickerArea}>
          <View style={styles.wheelLabels}>
            <Text style={styles.columnLabel}>
              {t("monthYearPicker.month", {
                defaultValue: "MONTH",
              })}
            </Text>
            <Text style={styles.columnLabel}>
              {t("monthYearPicker.year", {
                defaultValue: "YEAR",
              })}
            </Text>
          </View>

          <View style={styles.wheels}>
            <WheelColumn
              items={months}
              selectedValue={selectedMonthLabel}
              onSelect={(month) => setSelectedMonth(months.indexOf(month) + 1)}
            />

            <WheelColumn
              items={years}
              selectedValue={selectedYear}
              onSelect={setSelectedYear}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            accessibilityRole="button"
          >
            <Text style={styles.saveButtonText}>
              {t("monthYearPicker.save", {
                defaultValue: "Save",
              })}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  pickerArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  wheelLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.sm,
  },
  columnLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  wheels: {
    height: ITEM_HEIGHT * 5,
    flexDirection: "row",
    alignItems: "center",
  },
  wheel: {
    flex: 1,
  },
  wheelContent: {
    paddingVertical: 0,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  wheelText: {
    fontSize: typography.size.lg,
    color: colors.textSecondary,
    textAlign: "center",
  },
  wheelTextSelected: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  wheelTextAdjacent: {
    opacity: 0.65,
  },
  wheelTextFaded: {
    opacity: 0.35,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  saveButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textOnPrimary,
  },
});
