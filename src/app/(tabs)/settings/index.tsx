import { useRouter } from "expo-router";
import { ChevronRight, Globe, LogOut } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { WorkspaceGate } from "@/components/feedbacks/workspace-gate";
import { SafeScreen } from "@/components/layout/safe-screen";
import { colors, radius, spacing, typography } from "@/constants/theme";
import i18n from "@/i18n";
import { getInitials } from "@/lib/helper/get-initials";
import { signOut } from "@/services/auth-service";
import { useAuthStore } from "@/stores/use-auth-store";
import { useProfileStore } from "@/stores/use-profile-store";

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const user = useAuthStore((state) => state.user);
  const profile = useProfileStore((state) => state.profile);
  const loading = useProfileStore((state) => state.loading);

  const [signingOut, setSigningOut] = useState(false);

  const displayName = profile?.full_name || t("settings.profile.defaultName");
  const email = user?.email || t("settings.profile.noEmail");
  const avatarUrl = profile?.avatar_url;
  const initials = getInitials(displayName);

  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language).split(
    "-",
  )[0];

  const languageName =
    currentLanguage === "id" ? "Bahasa Indonesia" : "English";

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      Alert.alert(
        t("settings.profile.signOutFailed"),
        error instanceof Error ? error.message : t("common.tryAgain"),
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top"]}>
      <WorkspaceGate>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t("settings.title")}</Text>
              <Text style={styles.subtitle}>{t("settings.subtitle")}</Text>
            </View>
          </View>

          {/* Account section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("settings.account")}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.profileCard,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/settings/profile")}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t("settings.profile.edit")}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.initials}>{initials || "N"}</Text>
                </View>
              )}

              <View style={styles.profileInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {loading ? t("settings.profile.loading") : displayName}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {email}
                </Text>
              </View>

              <ChevronRight size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Preferences section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("settings.preferences")}</Text>

            <View style={styles.menuCard}>
              <SettingsRow
                icon={<Globe size={20} color={colors.primary} />}
                title={t("settings.language")}
                value={languageName}
                onPress={() => router.push("/settings/language")}
              />
            </View>
          </View>

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.pressed,
              signingOut && styles.disabled,
            ]}
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityRole="button"
            accessibilityState={{ disabled: signingOut, busy: signingOut }}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <LogOut size={20} color={colors.danger} />
            )}

            <Text style={styles.signOutText}>
              {signingOut ? t("common.saving") : t("settings.profile.signOut")}
            </Text>
          </Pressable>
        </ScrollView>
      </WorkspaceGate>
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* A single settings row: icon, title, current value and a chevron.            */
/* Add more rows here (currency, notifications, about) in the same way.        */
/* -------------------------------------------------------------------------- */

function SettingsRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.menuIcon}>{icon}</View>

      <Text style={styles.menuTitle} numberOfLines={1}>
        {title}
      </Text>

      {value ? (
        <Text style={styles.menuValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
    flexGrow: 1,
  },

  pressed: {
    opacity: 0.75,
  },

  disabled: {
    opacity: 0.6,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: colors.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: spacing.xs,
  },

  /* Sections */
  section: {
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: spacing.xs,
  },

  /* Profile */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
  },

  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  initials: {
    color: colors.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  profileInfo: {
    flex: 1,
    gap: 2,
  },

  name: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  email: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  /* Menu */
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  menuTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  menuValue: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  /* Sign out */
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 54,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    marginTop: spacing.md,
  },

  signOutText: {
    color: colors.danger,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
