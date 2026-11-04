import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AuthProvider } from "@/components/auth/auth-provider";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/stores/use-auth-store";

function RootNavigator() {
  const session = useAuthStore((state) => state.session);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) {
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
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </KeyboardProvider>
  );
}
