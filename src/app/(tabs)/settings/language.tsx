import { Check } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import { changeAppLanguage, type AppLanguage } from "@/i18n";

const languages: {
  code: AppLanguage;
  name: string;
  subtitle: string;
}[] = [
  {
    code: "en",
    name: "English",
    subtitle: "English",
  },
  {
    code: "id",
    name: "Bahasa Indonesia",
    subtitle: "Indonesian",
  },
];

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();

  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language).split(
    "-",
  )[0];

  async function handleLanguageChange(language: AppLanguage) {
    try {
      await changeAppLanguage(language);
    } catch (error) {
      // Keep the current language and inform the user if saving fails.
      console.error("Failed to change language:", error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        {t("settings.languageDescription")}
      </Text>

      <View style={styles.languageCard}>
        {languages.map((language, index) => {
          const selected = currentLanguage === language.code;

          return (
            <View key={language.code}>
              <Pressable
                onPress={() => handleLanguageChange(language.code)}
                style={styles.languageOption}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{language.name}</Text>
                  <Text style={styles.languageSubtitle}>
                    {language.subtitle}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterSelected,
                  ]}
                >
                  {selected && (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  )}
                </View>
              </Pressable>

              {index < languages.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  languageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
  },
  languageInfo: {
    gap: spacing.xs,
  },
  languageName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  languageSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
