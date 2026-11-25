import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Search } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { SafeScreen } from "@/components/layout/safe-screen";
import {
  countries,
  getCountryByCode,
  type Country,
} from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

export default function EditWorkspaceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const editWorkspace = useWorkspaceStore((state) => state.editWorkspace);
  const workspace = workspaces.find((item) => item.id === id);

  const [name, setName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setName(workspace.name);
    setSelectedCountry(getCountryByCode(workspace.country_code) ?? null);
  }, [workspace]);

  const filteredCountries = countries.filter((country) => {
    const query = countrySearch.trim().toLowerCase();

    return (
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.currencyCode.toLowerCase().includes(query) ||
      country.currencyName.toLowerCase().includes(query)
    );
  });

  async function handleUpdateWorkspace() {
    if (isSubmitting || !workspace) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t("workspace.edit.validation.nameRequired"));
      return;
    }
    if (!selectedCountry) {
      setError(t("workspace.edit.validation.countryRequired"));
      return;
    }
    if (trimmedName.length > 40) {
      setError(t("workspace.edit.validation.nameTooLong"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await editWorkspace(workspace.id, {
        name: trimmedName,
        country_code: selectedCountry.code,
        currency_code: selectedCountry.currencyCode,
      });
      router.back();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("workspace.edit.errors.updateFailed");
      const errorCode = (err as { code?: string }).code;

      if (
        errorCode === "23505" ||
        message.includes("workspaces_user_name_unique")
      ) {
        setError(t("workspace.edit.validation.duplicateName"));
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!workspace) {
    return (
      <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIcon}>
            <Text style={styles.illustrationEmoji}>🌏</Text>
          </View>
          <Text style={styles.notFoundTitle}>
            {t("workspace.edit.notFound.title")}
          </Text>
          <Text style={styles.notFoundDescription}>
            {t("workspace.edit.notFound.description")}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              styles.notFoundButton,
              pressed && styles.createButtonPressed,
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={styles.createButtonText}>{t("common.goBack")}</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <View style={styles.illustration}>
              <Text style={styles.illustrationEmoji}>🌏</Text>
            </View>

            <View style={styles.introText}>
              <Text style={styles.title}>
                {t("workspace.edit.intro.title")}
              </Text>
              <Text style={styles.description}>
                {t("workspace.edit.intro.description")}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("workspace.edit.name.label")}</Text>

            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              placeholder={t("workspace.edit.name.placeholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              maxLength={40}
              autoCapitalize="words"
              returnKeyType="done"
              accessibilityLabel={t("workspace.edit.name.accessibilityLabel")}
            />

            <Text style={styles.helperText}>
              {t("workspace.edit.name.helper")}
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("workspace.edit.country.label")}
            </Text>

            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder={t("workspace.edit.country.searchPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t(
                  "workspace.edit.country.searchPlaceholder",
                )}
              />
            </View>

            <ScrollView
              style={styles.countryList}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => {
                  const isSelected = selectedCountry?.code === country.code;

                  return (
                    <Pressable
                      key={country.code}
                      style={[
                        styles.countryOption,
                        isSelected && styles.countryOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedCountry(country);
                        setError(null);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={styles.countryFlag}>{country.flag}</Text>
                      <View style={styles.countryDetails}>
                        <Text style={styles.countryName}>{country.name}</Text>
                        <Text style={styles.countryCurrency}>
                          {country.currencyCode} · {country.currencyName}
                        </Text>
                      </View>
                      {isSelected && <Check size={20} color={colors.primary} />}
                    </Pressable>
                  );
                })
              ) : (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>
                    {t("workspace.edit.country.noResults")}
                  </Text>
                </View>
              )}
            </ScrollView>

            <Text style={styles.helperText}>
              {t("workspace.edit.country.helper")}
            </Text>

            {selectedCountry && (
              <View style={styles.currencyCard}>
                <View style={styles.currencyIcon}>
                  <Text style={styles.currencyFlag}>
                    {selectedCountry.flag}
                  </Text>
                </View>
                <View style={styles.currencyDetails}>
                  <Text style={styles.currencyLabel}>
                    {t("workspace.edit.currency.label")}
                  </Text>
                  <Text style={styles.currencyValue}>
                    {selectedCountry.currencyCode}
                  </Text>
                  <Text style={styles.currencyName} numberOfLines={1}>
                    {selectedCountry.currencyName}
                  </Text>
                </View>
                <View style={styles.automaticBadge}>
                  <Text style={styles.automaticBadgeText}>
                    {t("workspace.edit.currency.automatic")}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              {t("workspace.edit.reassurance.title")}
            </Text>
            <Text style={styles.infoDescription}>
              {t("workspace.edit.reassurance.description")}
            </Text>
          </View>
        </KeyboardAwareScrollView>

        <View style={styles.footer}>
          {error && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <View style={styles.footerButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleUpdateWorkspace}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isSubmitting,
                busy: isSubmitting,
              }}
            >
              {isSubmitting && (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              )}
              <Text style={styles.createButtonText}>
                {isSubmitting
                  ? t("workspace.edit.actions.saving")
                  : t("workspace.edit.actions.save")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },

  /* Intro */
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  illustration: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  illustrationEmoji: {
    fontSize: 32,
  },

  introText: {
    flex: 1,
    gap: spacing.xs,
  },

  title: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  description: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: 20,
  },

  /* Fields */
  fieldGroup: {
    gap: spacing.sm,
  },

  label: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.size.md,
  },

  helperText: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.size.md,
    paddingVertical: spacing.sm,
  },

  /* Country list */
  countryList: {
    maxHeight: 264,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  noResults: {
    padding: spacing.xl,
    alignItems: "center",
  },

  noResultsText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  countryOptionSelected: {
    backgroundColor: colors.primaryLight,
  },

  countryFlag: {
    fontSize: 26,
  },

  countryDetails: {
    flex: 1,
    gap: 2,
  },

  countryName: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  countryCurrency: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  /* Default currency */
  currencyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  currencyIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  currencyFlag: {
    fontSize: 24,
  },

  currencyDetails: {
    flex: 1,
    gap: 2,
  },

  currencyLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },

  currencyValue: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },

  currencyName: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  automaticBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },

  automaticBadgeText: {
    color: colors.success,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  /* Info */
  infoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  infoTitle: {
    color: colors.primaryDark,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  infoDescription: {
    color: colors.primaryDark,
    fontSize: typography.size.sm,
    lineHeight: 22,
  },

  /* Footer */
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  errorText: {
    color: colors.danger,
    fontSize: typography.size.sm,
  },

  footerButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },

  cancelButton: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  cancelButtonPressed: {
    backgroundColor: colors.background,
  },

  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
  },

  createButton: {
    flex: 2,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },

  createButtonPressed: {
    backgroundColor: colors.primaryDark,
  },

  disabledButton: {
    opacity: 0.6,
  },

  /* Not found */
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },

  notFoundIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  notFoundTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  notFoundDescription: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: "center",
    lineHeight: 20,
  },

  notFoundButton: {
    alignSelf: "stretch",
    flex: 0,
    marginTop: spacing.lg,
  },

  createButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
