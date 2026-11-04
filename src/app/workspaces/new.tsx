import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Check, Search } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { countries, type Country } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

export default function NewWorkspaceScreen() {
  const router = useRouter();

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
      setError("Please enter a workspace name.");
      return;
    }

    if (!selectedCountry) {
      setError("Please select a country.");
      return;
    }

    if (trimmedName.length > 40) {
      setError("Workspace name cannot exceed 40 characters.");
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
          : "Unable to create workspace. Please try again.";

      if (message.includes("workspaces_user_name_unique")) {
        setError("You already have a workspace with this name.");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
            >
              <ArrowLeft size={22} color={colors.text} />
            </Pressable>

            <Text style={styles.headerTitle}>New workspace</Text>

            <View style={styles.headerSpacer} />
          </View>

          {/* Introduction */}
          <View style={styles.intro}>
            <View style={styles.illustration}>
              <Text style={styles.illustrationEmoji}>🌏</Text>
            </View>

            <Text style={styles.title}>Manage money across borders</Text>

            <Text style={styles.description}>
              Create a separate financial space for each country where you live,
              study, or travel.
            </Text>
          </View>

          {/* Workspace name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Workspace name</Text>

            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              placeholder="e.g. Indonesia"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              maxLength={40}
              autoCapitalize="words"
              returnKeyType="done"
              accessibilityLabel="Workspace name"
            />

            <Text style={styles.helperText}>
              Give your workspace a name you can recognize.
            </Text>
          </View>

          {/* Country selection */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Country or region</Text>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} />

              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search country or currency..."
                placeholderTextColor={colors.textSecondary}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Country list */}
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
                  <Text style={styles.noResultsText}>No countries found.</Text>
                </View>
              )}
            </ScrollView>

            <Text style={styles.helperText}>
              Select a country to automatically determine your default currency.
            </Text>
          </View>

          {/* Currency preview */}
          {selectedCountry && (
            <View style={styles.currencyCard}>
              <View style={styles.currencyIcon}>
                <Text style={styles.currencyIconText}>
                  {selectedCountry.currencyCode.slice(0, 1)}
                </Text>
              </View>

              <View style={styles.currencyDetails}>
                <Text style={styles.currencyLabel}>DEFAULT CURRENCY</Text>
                <Text style={styles.currencyValue}>
                  {selectedCountry.currencyCode}
                </Text>
              </View>

              <View style={styles.automaticBadge}>
                <Text style={styles.automaticBadgeText}>Automatic</Text>
              </View>
            </View>
          )}

          {/* Initial state information */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What happens next?</Text>

            <Text style={styles.infoDescription}>
              Your new workspace starts with an empty balance. You can add your
              bank accounts, cash, and e-wallets afterward. Your existing
              workspaces will remain separate.
            </Text>
          </View>

          {error && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {error}
            </Text>
          )}

          {/* Submit */}
          <Pressable
            style={[
              styles.createButton,
              isSubmitting && styles.createButtonDisabled,
            ]}
            onPress={handleCreateWorkspace}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            <Text style={styles.createButtonText}>
              {isSubmitting ? "Creating..." : "Create workspace"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },

  headerTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },

  headerSpacer: {
    width: 44,
  },

  intro: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },

  illustration: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },

  illustrationEmoji: {
    fontSize: 38,
  },

  title: {
    color: colors.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    textAlign: "center",
  },

  description: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: 22,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 320,
  },

  fieldGroup: {
    marginBottom: spacing.xl,
  },

  label: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
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
    fontSize: typography.size.xs,
    lineHeight: 18,
    marginTop: spacing.sm,
  },

  countryInput: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },

  countryInputText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.size.md,
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

  countryList: {
    maxHeight: 280,
    marginTop: spacing.sm,
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

  placeholder: {
    color: colors.textSecondary,
  },

  selectedFlag: {
    fontSize: 24,
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
    gap: spacing.xs,
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

  currencyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  currencyIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },

  currencyIconText: {
    color: colors.primary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },

  currencyDetails: {
    flex: 1,
    gap: spacing.xs,
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

  automaticBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },

  automaticBadgeText: {
    color: colors.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },

  infoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  infoTitle: {
    color: colors.primaryDark,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
  },

  infoDescription: {
    color: colors.primaryDark,
    fontSize: typography.size.sm,
    lineHeight: 22,
  },

  errorText: {
    color: colors.danger,
    fontSize: typography.size.sm,
    marginBottom: spacing.md,
  },

  createButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    color: "#FFFFFF",
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  cancelButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },

  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});
