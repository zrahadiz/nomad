import { Tabs, useRouter } from "expo-router";
import {
  ArrowLeftRight,
  ChartPie,
  House,
  Plus,
  Settings,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, typography } from "../../constants/theme";

type CustomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const TAB_ICONS = {
  index: House,
  transactions: ArrowLeftRight,
  budget: ChartPie,
  settings: Settings,
};

const TAB_LABELS = {
  index: "tabs.home",
  transactions: "tabs.transactions",
  budget: "tabs.budget",
  settings: "tabs.settings",
};

const ADD_BUTTON_SIZE = 56;

function CustomTabBar({
  state,
  descriptors,
  navigateToTab,
  insets,
}: CustomTabBarProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const renderTab = (route: (typeof state.routes)[number]) => {
    const focused = state.routes[state.index]?.key === route.key;
    const Icon = TAB_ICONS[route.name as keyof typeof TAB_ICONS];
    const labelKey = TAB_LABELS[route.name as keyof typeof TAB_LABELS];

    const color = focused ? colors.primary : colors.textSecondary;
    const label = labelKey ? t(labelKey) : route.name;

    return (
      <Pressable
        key={route.key}
        style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
        onPress={() => navigateToTab(route.key)}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
      >
        {/* The active tab is highlighted by color and weight only */}
        <View style={styles.iconWrapper}>
          {Icon && (
            <Icon color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
          )}
        </View>

        <Text
          style={[styles.tabLabel, focused && styles.tabLabelActive, { color }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: bottomInset,
          height: 68 + bottomInset,
        },
      ]}
    >
      {state.routes.slice(0, 2).map(renderTab)}

      {/* Center slot: part of the row, so it is always exactly centered */}
      <View style={styles.centerSlot}>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={() => router.push("/transactions/new")}
          accessibilityRole="button"
          accessibilityLabel={t("tabs.addTransaction")}
        >
          <Plus color={colors.textOnPrimary} size={28} strokeWidth={2.5} />
        </Pressable>
      </View>

      {state.routes.slice(2).map(renderTab)}
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
      <Tabs.Screen name="budget" options={{ title: "Budget" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    // Rounded top corners and a soft shadow instead of a hard divider line.
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  pressed: {
    opacity: 0.7,
  },

  iconWrapper: {
    width: 56,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  tabLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },

  tabLabelActive: {
    fontWeight: typography.weight.semibold,
  },

  centerSlot: {
    width: ADD_BUTTON_SIZE + 24,
    alignItems: "center",
    justifyContent: "center",
  },

  // Raised button with a surface-colored ring, so it looks cut into the bar.
  // "top" only shifts it visually upwards; it does not change the layout.
  addButton: {
    top: -22,
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    borderRadius: ADD_BUTTON_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },

  addButtonPressed: {
    transform: [{ scale: 0.94 }],
    backgroundColor: colors.primaryDark,
  },
});
