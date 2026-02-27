import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { logger } from "@/lib/logger";

// Import translations with explicit JSON type
import en from "../locales/en.json";
import ru from "../locales/ru.json";
import uz from "../locales/uz.json";

// Debug logging
if (typeof window !== "undefined") {
  logger.debug("[i18n] Loading translations...", {
    meta: {
      en: typeof en === "object" && en !== null,
      ru: typeof ru === "object" && ru !== null,
      uz: typeof uz === "object" && uz !== null,
    },
  });
}

const savedLanguage =
  typeof window !== "undefined" ? localStorage.getItem("language") || "ru" : "ru";

if (typeof window !== "undefined") {
  logger.debug("[i18n] Selected language:", { meta: { lang: savedLanguage } });
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    uz: { translation: uz },
  },
  lng: savedLanguage,
  fallbackLng: "ru",
  interpolation: {
    escapeValue: false,
  },
  missingKeyHandler: (lngs, ns, key) => {
    // Log missing keys for debugging
    logger.warn(`[i18n] Missing key: ${key}, language: ${i18n.language}`);
  },
  returnEmptyString: false,
  debug: false,
});

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    maximumFractionDigits: 0,
  }).format(amount);
};

export function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  localStorage.setItem("language", lang);
};

export default i18n;
