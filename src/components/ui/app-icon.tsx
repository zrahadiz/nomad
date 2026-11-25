import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  Car,
  CircleDollarSign,
  CircleEllipsis,
  Coins,
  CreditCard,
  Gift,
  Globe,
  GraduationCap,
  HandCoins,
  House,
  Landmark,
  Laptop,
  PiggyBank,
  Plane,
  ShoppingBag,
  Smartphone,
  Utensils,
  Vault,
  Wallet,
} from "lucide-react-native";

import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/constants/theme";

const iconComponents = {
  wallet: Wallet,
  banknote: Banknote,
  "building-2": Building2,
  smartphone: Smartphone,
  "credit-card": CreditCard,
  landmark: Landmark,
  "piggy-bank": PiggyBank,
  coins: Coins,
  "briefcase-business": BriefcaseBusiness,
  "circle-dollar-sign": CircleDollarSign,
  "hand-coins": HandCoins,
  vault: Vault,
  globe: Globe,
  "shopping-bag": ShoppingBag,
  house: House,
  car: Car,
  plane: Plane,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "circle-ellipsis": CircleEllipsis,
  utensils: Utensils,
  laptop: Laptop,
  ellipsis: CircleEllipsis,
} as const;

export type AppIconName = keyof typeof iconComponents;

type AppIconProps = {
  name: AppIconName | string;
  color?: string;
  size?: number;
  iconSize?: number;
  background?: boolean;
  backgroundColor?: string;
  shape?: "circle" | "rounded";
};

export function AppIcon({
  name,
  color = colors.primary,
  size = 40,
  iconSize = 20,
  background = true,
  backgroundColor,
  shape = "rounded",
}: AppIconProps) {
  const Icon = iconComponents[name as AppIconName] ?? CircleEllipsis;

  if (!background) {
    return <Icon size={iconSize} color={color} strokeWidth={1.8} />;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: shape === "circle" ? radius.full : radius.md,
          backgroundColor: backgroundColor ?? `${color}20`,
        },
      ]}
    >
      <Icon size={iconSize} color={color} strokeWidth={1.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
