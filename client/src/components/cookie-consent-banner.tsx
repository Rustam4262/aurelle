import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "aurelle-cookie-consent";

declare global {
  interface Window {
    __loadAurelleAnalytics?: () => void;
  }
}

/**
 * Analytics (GTM/GA4) only loads once the visitor accepts here — see
 * client/public/gtm-init.js and index.html. Declining just means we never
 * call window.__loadAurelleAnalytics(); the rest of the site is unaffected.
 */
export function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(STORAGE_KEY));
    } catch {
      // localStorage unavailable — stay hidden rather than nag every render.
    }
  }, []);

  const respond = (choice: "accepted" | "declined") => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* best effort */
    }
    if (choice === "accepted") window.__loadAurelleAnalytics?.();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t("cookieConsent.title")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("cookieConsent.text")}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => respond("declined")}>
            {t("cookieConsent.decline")}
          </Button>
          <Button size="sm" onClick={() => respond("accepted")}>
            {t("cookieConsent.accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
