import { Link, router } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useRef, useState, type ComponentRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { GoogleButton } from "@/components/auth/google-button";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { register, signInWithGoogle } from "@/services/auth-service";

import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

type textInputRef = ComponentRef<typeof TextInput>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullname || !email.trim() || !password || !confirmPassword) {
      Alert.alert(
        t("auth.register.alerts.missingInformationTitle"),
        t("auth.register.alerts.missingInformationMessage"),
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        t("auth.register.alerts.weakPasswordTitle"),
        t("auth.register.alerts.weakPasswordMessage"),
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        t("auth.register.alerts.passwordMismatchTitle"),
        t("auth.register.alerts.passwordMismatchMessage"),
      );
      return;
    }

    try {
      setLoading(true);

      const { session } = await register(email, password, fullname);

      if (!session) {
        Alert.alert(
          t("auth.register.alerts.checkEmailTitle"),
          t("auth.register.alerts.checkEmailMessage"),
          [
            {
              text: t("auth.register.alerts.ok"),
              onPress: () => router.replace("/sign-in"),
            },
          ],
        );
      }
      // If a session exists, the auth provider automatically
      // updates the protected navigator.
    } catch (error) {
      Alert.alert(
        t("auth.register.alerts.registrationFailedTitle"),
        error instanceof Error
          ? error.message
          : t("auth.register.alerts.tryAgain"),
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
        t("auth.register.alerts.googleRegistrationFailedTitle"),
        error instanceof Error
          ? error.message
          : t("auth.register.alerts.tryAgain"),
      );
    } finally {
      setLoading(false);
    }
  }

  // UI-only state: show/hide passwords and move between fields with the keyboard.
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<textInputRef>(null);
  const passwordRef = useRef<textInputRef>(null);
  const confirmPasswordRef = useRef<textInputRef>(null);

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
        <Text style={styles.tagline}>{t("auth.register.tagline")}</Text>
      </View>

      <View style={styles.form}>
        {/* Heading */}
        <View style={styles.headingGroup}>
          <Text style={styles.heading}>{t("auth.register.heading")}</Text>
          <Text style={styles.subtitle}>{t("auth.register.subtitle")}</Text>
        </View>

        {/* Fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t("auth.register.fullName")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.register.fullNamePlaceholder")}
            placeholderTextColor={colors.textSecondary}
            value={fullname}
            onChangeText={setFullname}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            editable={!loading}
            accessibilityLabel={t("auth.register.fullName")}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t("auth.register.emailAddress")}</Text>
          <TextInput
            ref={emailRef}
            style={styles.input}
            placeholder={t("auth.register.emailPlaceholder")}
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
            accessibilityLabel={t("auth.register.emailAddress")}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t("auth.register.password")}</Text>
          <PasswordField
            inputRef={passwordRef}
            placeholder={t("auth.register.passwordPlaceholder")}
            value={password}
            onChangeText={setPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword((value) => !value)}
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            editable={!loading}
            accessibilityLabel={t("auth.register.password")}
            hidePasswordLabel={t("auth.register.hidePasswords")}
            showPasswordLabel={t("auth.register.showPasswords")}
          />
          <Text style={styles.helperText}>
            {t("auth.register.passwordHelper")}
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t("auth.register.confirmPassword")}</Text>
          <PasswordField
            inputRef={confirmPasswordRef}
            placeholder={t("auth.register.confirmPasswordPlaceholder")}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword((value) => !value)}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            editable={!loading}
            accessibilityLabel={t("auth.register.confirmPassword")}
            hidePasswordLabel={t("auth.register.hidePasswords")}
            showPasswordLabel={t("auth.register.showPasswords")}
          />
        </View>

        {/* Actions */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.disabled,
          ]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>
              {t("auth.register.createAccount")}
            </Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("auth.register.or")}</Text>
          <View style={styles.dividerLine} />
        </View>

        <GoogleButton loading={loading} onPress={handleGoogleSignIn} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t("auth.register.alreadyHaveAccount")}{" "}
          </Text>
          <Link href="/sign-in" style={styles.link}>
            {t("auth.register.signIn")}
          </Link>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* Password field with a show / hide toggle                                    */
/* -------------------------------------------------------------------------- */

function PasswordField({
  inputRef,
  placeholder,
  value,
  onChangeText,
  show,
  onToggleShow,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  editable,
  accessibilityLabel,
  hidePasswordLabel,
  showPasswordLabel,
}: {
  inputRef: RefObject<textInputRef | null>;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: "new-password";
  returnKeyType: "next" | "done";
  onSubmitEditing: () => void;
  editable: boolean;
  accessibilityLabel: string;
  hidePasswordLabel: string;
  showPasswordLabel: string;
}) {
  return (
    <View style={styles.passwordField}>
      <TextInput
        ref={inputRef}
        style={styles.passwordInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType="newPassword"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        editable={editable}
        accessibilityLabel={accessibilityLabel}
      />

      <Pressable
        onPress={onToggleShow}
        hitSlop={8}
        style={styles.eyeButton}
        accessibilityRole="button"
        accessibilityLabel={show ? hidePasswordLabel : showPasswordLabel}
      >
        {show ? (
          <EyeOff size={20} color={colors.textSecondary} />
        ) : (
          <Eye size={20} color={colors.textSecondary} />
        )}
      </Pressable>
    </View>
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
    color: colors.textSecondary,
    fontSize: typography.size.sm,
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

  helperText: {
    fontSize: typography.size.caption,
    color: colors.textSecondary,
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
    justifyContent: "center",
    alignItems: "center",
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
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.sm,
  },
});
