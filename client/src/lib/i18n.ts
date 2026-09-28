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
  // Sync init: all translations are bundled (no HTTP fetch), so async init
  // causes a race where i18n fires setState mid-render → React Error #321.
  initImmediate: false,
  react: {
    // Disable Suspense mode: lazy-loaded pages inside <Suspense> trigger
    // React Error #321 when react-i18next tries to suspend during render.
    useSuspense: false,
  },
});

// Keep <html lang="..."> in sync with the active language for screen readers
// and search engines — it stayed hardcoded to "en" in index.html otherwise.
if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
  i18n.on("languageChanged", (lang) => {
    document.documentElement.lang = lang;
  });
}

export const formatCurrency = (amount: number): string => {
  // Plain number formatting + manual "UZS" suffix: Intl's currency-style
  // formatting for UZS renders inconsistently across JS engines (e.g. "so'm"
  // in Node's ICU data vs "UZS" in Chromium's), so we keep the format
  // explicit and consistent with the rest of the app.
  return `${new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(amount)} UZS`;
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
