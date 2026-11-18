import { useRouter } from "expo-router";
import { ChevronRight, Globe, LogOut } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import i18n from "@/i18n";
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

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

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
    <View style={styles.container}>
      <Text style={styles.title}>{t("settings.title")}</Text>

      {/* Account section */}
      <Text style={styles.sectionTitle}>{t("settings.account")}</Text>

      <Pressable
        style={styles.profileCard}
        onPress={() => router.push("/settings/profile")}
        disabled={loading}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.initials}>{initials || "N"}</Text>
          </View>
        )}

        <View style={styles.profileInfo}>
          <Text style={styles.name}>
            {loading ? t("settings.profile.loading") : displayName}
          </Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <ChevronRight size={20} color={colors.textSecondary} />
      </Pressable>

      {/* Preferences section */}
      <Text style={styles.sectionTitle}>{t("settings.preferences")}</Text>

      <View style={styles.menuCard}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/settings/language")}
        >
          <View style={styles.menuIcon}>
            <Globe size={20} color={colors.primary} />
          </View>

          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>{t("settings.language")}</Text>
            <Text style={styles.menuSubtitle}>{languageName}</Text>
          </View>

          <ChevronRight size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Sign out */}
      <Pressable
        style={styles.signOutButton}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        <LogOut size={20} color={colors.danger} />

        <Text style={styles.signOutText}>
          {signingOut ? t("common.saving") : t("settings.profile.signOut")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    paddingTop: 60,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  email: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
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
  menuInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  menuTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  menuSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
  signOutText: {
    color: colors.danger,
    fontWeight: "600",
  },
});
