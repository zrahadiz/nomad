import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { colors } from "@/constants/theme";

export default function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Screen
        name="profile"
        options={{
          title: t("settings.profile.edit"),
        }}
      />

      <Stack.Screen
        name="language"
        options={{
          title: t("settings.language"),
        }}
      />
    </Stack>
  );
}
