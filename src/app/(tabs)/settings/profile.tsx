import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { colors, radius, spacing } from "@/constants/theme";
import {
  deleteAvatar,
  updateMyProfile,
  uploadAvatar,
} from "@/services/profile-service";
import { useProfileStore } from "@/stores/use-profile-store";

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const avatarUrl = profile?.avatar_url;

  const displayName = profile?.full_name || t("settings.profile.defaultName");

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  async function handlePickImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("settings.profile.permissionRequired"),
          t("settings.profile.photoPermissionMessage"),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert(
        t("settings.profile.photoError"),
        error instanceof Error ? error.message : t("common.tryAgain"),
      );
    }
  }

  async function handleSaveProfile() {
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      Alert.alert(
        t("settings.profile.invalidName"),
        t("settings.profile.nameRequired"),
      );
      return;
    }

    const oldAvatarUrl = profile?.avatar_url ?? null;
    let uploadedAvatarUrl: string | null = null;
    let profileUpdated = false;

    try {
      setSaving(true);

      let newAvatarUrl = oldAvatarUrl;

      // 1. Upload the new photo, if selected
      if (selectedImage) {
        uploadedAvatarUrl = await uploadAvatar(
          selectedImage.uri,
          selectedImage.mimeType,
        );

        newAvatarUrl = uploadedAvatarUrl;
      }

      // 2. Update the database
      const updatedProfile = await updateMyProfile({
        full_name: trimmedName,
        avatar_url: newAvatarUrl,
      });

      profileUpdated = true;

      // 3. Update Zustand
      setProfile(updatedProfile);

      // 4. Delete the old avatar after the update succeeds
      if (selectedImage && oldAvatarUrl && oldAvatarUrl !== newAvatarUrl) {
        try {
          await deleteAvatar(oldAvatarUrl);
        } catch (error) {
          console.warn("Failed to delete old avatar:", error);
        }
      }

      Alert.alert(
        t("settings.profile.success"),
        t("settings.profile.updateSuccess"),
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      // Clean up the new upload if the database update failed
      if (!profileUpdated && uploadedAvatarUrl) {
        try {
          await deleteAvatar(uploadedAvatarUrl);
        } catch (cleanupError) {
          console.warn("Failed to clean up new avatar:", cleanupError);
        }
      }

      Alert.alert(
        t("settings.profile.updateFailed"),
        error instanceof Error ? error.message : t("common.tryAgain"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.photoSection}>
        <Pressable
          onPress={handlePickImage}
          style={styles.photoPicker}
          disabled={saving}
        >
          {selectedImage?.uri || avatarUrl ? (
            <Image
              source={{ uri: selectedImage?.uri ?? avatarUrl! }}
              style={styles.photoPreview}
            />
          ) : (
            <View style={styles.photoFallback}>
              <Text style={styles.photoInitials}>{initials || "N"}</Text>
            </View>
          )}

          <View style={styles.cameraIcon}>
            <Text style={styles.cameraIconText}>+</Text>
          </View>
        </Pressable>

        <Text style={styles.photoHint}>
          {t("settings.profile.changePhoto")}
        </Text>
      </View>

      <Text style={styles.inputLabel}>{t("settings.profile.fullName")}</Text>

      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder={t("settings.profile.namePlaceholder")}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={100}
        editable={!saving}
      />

      <Pressable
        onPress={handleSaveProfile}
        style={[styles.saveButton, saving && styles.disabledButton]}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? t("common.saving") : t("settings.profile.saveChanges")}
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  photoPicker: {
    position: "relative",
  },
  photoPreview: {
    width: 104,
    height: 104,
    borderRadius: radius.full,
  },
  photoFallback: {
    width: 104,
    height: 104,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  photoInitials: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: "700",
  },
  cameraIcon: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  cameraIconText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 24,
  },
  photoHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.text,
    fontSize: 15,
  },
  saveButton: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
