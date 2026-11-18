import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import id from "./locales/id.json";

export type AppLanguage = "en" | "id";

const LANGUAGE_STORAGE_KEY = "nomad.language";

const resources = {
  en: {
    translation: en,
  },
  id: {
    translation: id,
  },
};

const deviceLanguage = getLocales()[0]?.languageCode;

const initialLanguage: AppLanguage = deviceLanguage === "id" ? "id" : "en";

const i18nInitialization = i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  supportedLngs: ["en", "id"],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export const i18nReady = (async () => {
  await i18nInitialization;

  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

  const language: AppLanguage =
    savedLanguage === "en" || savedLanguage === "id"
      ? savedLanguage
      : initialLanguage;

  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }
})();

export const changeAppLanguage = async (language: AppLanguage) => {
  await i18nReady;
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

export default i18n;
