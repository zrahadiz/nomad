import { StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/ui/app-icon";
import { getCountryByCode } from "@/constants/countries";
import { colors, radius } from "@/constants/theme";

export function TransactionWorkspaceAvatar({
  countryCode,
}: {
  countryCode?: string | null;
}) {
  const flag = countryCode
    ? getCountryByCode(countryCode)?.flag
    : undefined;

  return flag ? (
    <View style={styles.container}>
      <Text style={styles.flag}>{flag}</Text>
    </View>
  ) : (
    <AppIcon
      name="globe"
      color={colors.primary}
      size={40}
      iconSize={20}
      backgroundColor={colors.background}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  flag: { fontSize: 20 },
});
