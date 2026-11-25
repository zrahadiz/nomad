import { useRouter } from "expo-router";
import { Check, Search } from "lucide-react-native";
import { useState } from "react";
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

import { countries, type Country } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

import { SafeScreen } from "@/components/layout/safe-screen";

export default function NewWorkspaceScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const addWorkspace = useWorkspaceStore((state) => state.addWorkspace);

  const [name, setName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCountries = countries.filter((country) => {
    const query = countrySearch.trim().toLowerCase();

    return (
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.currencyCode.toLowerCase().includes(query) ||
      country.currencyName.toLowerCase().includes(query)
    );
  });

  async function handleCreateWorkspace() {
    if (isSubmitting) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t("workspace.create.validation.nameRequired"));
      return;
    }

    if (!selectedCountry) {
      setError(t("workspace.create.validation.countryRequired"));
      return;
    }

    if (trimmedName.length > 40) {
      setError(t("workspace.create.validation.nameTooLong"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await addWorkspace({
        name: trimmedName,
        country_code: selectedCountry.code,
        currency_code: selectedCountry.currencyCode,
      });

      router.back();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("workspace.create.errors.createFailed");

      if (message.includes("workspaces_user_name_unique")) {
        setError(t("workspace.create.validation.duplicateName"));
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
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
                {t("workspace.create.intro.title")}
              </Text>
              <Text style={styles.description}>
                {t("workspace.create.intro.description")}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("workspace.create.name.label")}</Text>

            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              placeholder={t("workspace.create.name.placeholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              maxLength={40}
              autoCapitalize="words"
              returnKeyType="done"
              accessibilityLabel={t("workspace.create.name.accessibilityLabel")}
            />

            <Text style={styles.helperText}>
              {t("workspace.create.name.helper")}
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("workspace.create.country.label")}
            </Text>

            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder={t("workspace.create.country.searchPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t(
                  "workspace.create.country.searchPlaceholder",
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
                    {t("workspace.create.country.noResults")}
                  </Text>
                </View>
              )}
            </ScrollView>

            <Text style={styles.helperText}>
              {t("workspace.create.country.helper")}
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
                    {t("workspace.create.currency.label")}
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
                    {t("workspace.create.currency.automatic")}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              {t("workspace.create.next.title")}
            </Text>
            <Text style={styles.infoDescription}>
              {t("workspace.create.next.description")}
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
              onPress={handleCreateWorkspace}
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
                  ? t("workspace.create.actions.creating")
                  : t("workspace.create.actions.create")}
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
    paddingBottom: spacing.xl,
    gap: spacing.lg,
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

  createButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
