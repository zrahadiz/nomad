import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackScreen() {
  const router = useRouter();

  const { code, error, error_description } = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const [message, setMessage] = useState("Completing authentication...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function completeAuthentication() {
      try {
        if (error) {
          throw new Error(error_description ?? error);
        }

        if (!code) {
          throw new Error("No authorization code was received.");
        }

        const { data, error: sessionError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) throw sessionError;

        console.log("SESSION CREATED:", {
          userId: data.session?.user.id,
          email: data.session?.user.email,
          expiresAt: data.session?.expires_at,
        });

        if (active) {
          router.replace("/");
        }
      } catch (err) {
        if (active) {
          setMessage(
            err instanceof Error
              ? err.message
              : "Unable to complete authentication.",
          );
          setFailed(true);
        }
      }
    }

    completeAuthentication();

    return () => {
      active = false;
    };
  }, [code, error, error_description, router]);

  return (
    <View style={styles.container}>
      {!failed && <ActivityIndicator size="large" color={colors.primary} />}

      <Text style={styles.message}>
        {failed ? "Authentication failed" : message}
      </Text>

      {failed && (
        <Text style={styles.back} onPress={() => router.replace("/sign-in")}>
          Return to sign in
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  message: {
    marginTop: spacing.lg,
    color: colors.text,
    textAlign: "center",
  },
  back: {
    marginTop: spacing.xl,
    color: colors.primary,
    fontWeight: "600",
  },
});
