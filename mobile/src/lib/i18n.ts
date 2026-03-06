import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "../locales/en.json";
import ru from "../locales/ru.json";
import uz from "../locales/uz.json";

const deviceLang = Localization.getLocales()?.[0]?.languageCode ?? "ru";
const supportedLangs = ["ru", "uz", "en"];
const lng = supportedLangs.includes(deviceLang) ? deviceLang : "ru";

i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  lng,
  fallbackLng: "ru",
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    uz: { translation: uz },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
