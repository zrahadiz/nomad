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
  PiggyBank,
  Plane,
  ShoppingBag,
  Smartphone,
  Vault,
  Wallet,
} from "lucide-react-native";

import { StyleSheet, View } from "react-native";

import type { accountIconName } from "@/constants/account-options";
import { radius } from "@/constants/theme";

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
};

type AccountIconProps = {
  name: accountIconName;
  color: string;
  size?: number;
  iconSize?: number;
};

export function AccountIcon({
  name,
  color,
  size = 44,
  iconSize = 21,
}: AccountIconProps) {
  const Icon = iconComponents[name];

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: `${color}20`,
          borderRadius: radius.md,
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
