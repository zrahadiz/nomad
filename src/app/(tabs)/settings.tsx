import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import { signOut } from "@/services/auth-service";
import {
  deleteAvatar,
  updateMyProfile,
  uploadAvatar,
} from "@/services/profile-service";
import { useAuthStore } from "@/stores/use-auth-store";
import { useProfileStore } from "@/stores/use-profile-store";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function Screen() {
  const user = useAuthStore((state) => state.user);

  const profile = useProfileStore((state) => state.profile);
  const loading = useProfileStore((state) => state.loading);
  const setProfile = useProfileStore((state) => state.setProfile);

  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState("");
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const displayName = profile?.full_name || "Nomad User";
  const email = user?.email || "No email available";
  const avatarUrl = profile?.avatar_url;

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  function openEditProfile() {
    setFullName(profile?.full_name ?? "");
    setSelectedImage(null);
    setModalVisible(true);
  }

  async function handlePickImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow Nomad to access your photo library.",
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
        "Unable to select photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  async function handleSaveProfile() {
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      Alert.alert("Invalid name", "Please enter your full name.");
      return;
    }

    const oldAvatarUrl = profile?.avatar_url ?? null;
    let uploadedAvatarUrl: string | null = null;
    let profileUpdated = false;

    try {
      setSaving(true);

      let avatarUrl = oldAvatarUrl;

      // 1. Upload the new photo, if selected
      if (selectedImage) {
        uploadedAvatarUrl = await uploadAvatar(
          selectedImage.uri,
          selectedImage.mimeType,
        );

        avatarUrl = uploadedAvatarUrl;
      }

      // 2. Update the database
      const updatedProfile = await updateMyProfile({
        full_name: trimmedName,
        avatar_url: avatarUrl,
      });

      profileUpdated = true;

      // 3. Update Zustand
      setProfile(updatedProfile);

      setSelectedImage(null);
      setModalVisible(false);

      // 4. Delete the old avatar only after the database update succeeds
      if (selectedImage && oldAvatarUrl && oldAvatarUrl !== avatarUrl) {
        try {
          await deleteAvatar(oldAvatarUrl);
        } catch (error) {
          // Profile update succeeded, so don't report the whole operation
          // as failed just because old-file cleanup failed.
          console.warn("Failed to delete old avatar:", error);
        }
      }

      Alert.alert("Success", "Your profile has been updated.");
    } catch (error) {
      // If uploading succeeded but updating the profile failed,
      // remove the newly uploaded image to avoid an orphaned file.
      if (!profileUpdated && uploadedAvatarUrl) {
        try {
          await deleteAvatar(uploadedAvatarUrl);
        } catch (cleanupError) {
          console.warn("Failed to clean up new avatar:", cleanupError);
        }
      }

      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        "Sign out failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Profile information */}
      <View style={styles.profileCard}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.initials}>{initials || "N"}</Text>
          </View>
        )}

        <View style={styles.profileInfo}>
          <Text style={styles.name}>
            {loading ? "Loading profile..." : displayName}
          </Text>
          <Text style={styles.email}>{email}</Text>
        </View>
      </View>

      {/* Edit profile button */}
      <Pressable
        onPress={openEditProfile}
        style={styles.editButton}
        disabled={loading || !profile}
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </Pressable>

      {/* Sign out */}
      <Pressable onPress={handleSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      {/* Edit profile modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAwareScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 48 }}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

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

              <Text style={styles.photoHint}>Change profile photo</Text>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>

            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={100}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.cancelButton}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveProfile}
                style={[styles.saveButton, saving && styles.disabledButton]}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </Modal>
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
    marginBottom: spacing.xl,
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
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  email: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  editButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  signOutButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  signOutText: {
    color: colors.danger,
    fontWeight: "600",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.xl,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  photoPicker: {
    position: "relative",
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
  },
  photoFallback: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  photoInitials: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: "700",
  },
  cameraIcon: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  cameraIconText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 23,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.text,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
