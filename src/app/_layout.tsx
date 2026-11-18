import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/components/auth/auth-provider";
import { colors } from "@/constants/theme";
import { i18nReady } from "@/i18n";
import { useAuthStore } from "@/stores/use-auth-store";

function RootNavigator() {
  const session = useAuthStore((state) => state.session);
  const initialized = useAuthStore((state) => state.initialized);

  const [languageInitialized, setLanguageInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    i18nReady.then(() => {
      if (mounted) {
        setLanguageInitialized(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!initialized || !languageInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isAuthenticated = Boolean(session);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/callback" />

      {/* Public authentication screens */}
      <Stack.Protected guard={!isAuthenticated} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Private application screens */}
      <Stack.Protected guard={isAuthenticated} redirectTo="/sign-in">
        <Stack.Screen name="(tabs)" />

        <Stack.Screen name="currency-converter/index" />

        <Stack.Screen
          name="transactions/new"
          options={{
            headerShown: true,
            title: "Add transaction",
            presentation: "modal",
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />

        <Stack.Screen
          name="accounts/new"
          options={{
            headerShown: true,
            title: "Add account",
            presentation: "modal",
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />

        <Stack.Screen
          name="accounts/list"
          options={{
            headerShown: true,
            title: "Accounts",
            presentation: "modal",
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />

        <Stack.Screen
          name="accounts/[id]/edit"
          options={{
            headerShown: true,
            title: "Edit account",
            presentation: "modal",
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
