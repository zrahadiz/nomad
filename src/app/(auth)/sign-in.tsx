import { GoogleButton } from "@/components/auth/google-button";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { signIn, signInWithGoogle } from "@/services/auth-service";

import { Link } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert("Missing information", "Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
    } catch (error) {
      Alert.alert(
        "Sign in failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setLoading(true);

      await signInWithGoogle();
    } catch (error) {
      Alert.alert(
        "Google sign in failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // UI-only state: show/hide password and jump from email to password.
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>N</Text>
        </View>

        <Text style={styles.appName}>nomad.</Text>
        <Text style={styles.tagline}>Your money, wherever life takes you.</Text>
      </View>

      <View style={styles.form}>
        {/* Heading */}
        <View style={styles.headingGroup}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue managing your finances.
          </Text>
        </View>

        {/* Fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
            accessibilityLabel="Email address"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordField}>
            <TextInput
              ref={passwordRef}
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              editable={!loading}
              onSubmitEditing={handleSignIn}
              accessibilityLabel="Password"
            />

            <Pressable
              onPress={() => setShowPassword((value) => !value)}
              hitSlop={8}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Actions */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.disabled,
          ]}
          onPress={handleSignIn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <GoogleButton loading={loading} onPress={handleGoogleSignIn} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Nomad? </Text>
          <Link href="/register" style={styles.link}>
            Create an account
          </Link>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
    paddingVertical: spacing.xxxl,
  },

  /* Brand */
  brand: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },

  logo: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  logoText: {
    color: colors.textOnPrimary,
    fontSize: 34,
    fontWeight: typography.weight.bold,
  },

  appName: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    letterSpacing: -1,
  },

  tagline: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  /* Form */
  form: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: spacing.lg,
  },

  headingGroup: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },

  heading: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },

  subtitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 21,
  },

  fieldGroup: {
    gap: spacing.sm,
  },

  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    fontSize: typography.size.md,
    color: colors.text,
  },

  passwordField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    height: 52,
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    fontSize: typography.size.md,
    color: colors.text,
  },

  eyeButton: {
    paddingLeft: spacing.sm,
  },

  /* Actions */
  button: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },

  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },

  disabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  dividerText: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  /* Footer */
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
  },

  footerText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  link: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
