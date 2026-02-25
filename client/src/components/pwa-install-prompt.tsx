import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useTranslation } from "react-i18next";

/**
 * PWA Install Prompt
 *
 * Android/Desktop: shows native "Add to Home Screen" install button.
 * iOS: shows manual instructions (iOS doesn't support beforeinstallprompt).
 *
 * Dismissed state is persisted in localStorage for 30 days.
 */
export function PWAInstallPrompt() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pwa-prompt-dismissed");
    if (stored) {
      const dismissedAt = parseInt(stored, 10);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < thirtyDays) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("pwa-prompt-dismissed", String(Date.now()));
    setDismissed(true);
    setShowIOSHint(false);
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) setDismissed(true);
  };

  if (isInstalled || dismissed) return null;

  // iOS: show hint button, but no auto-prompt
  if (isIOS) {
    return (
      <>
        {!showIOSHint && (
          <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex items-center gap-3 md:max-w-sm md:left-auto md:right-4">
            <img src="/icons/icon-96.webp" alt="Aurelle" className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{t("pwa.installApp")}</p>
              <p className="text-xs text-gray-500 truncate">{t("pwa.addToHomeScreen")}</p>
            </div>
            <button
              onClick={() => setShowIOSHint(true)}
              className="px-3 py-1.5 bg-[#C81D60] text-white text-sm font-medium rounded-lg flex-shrink-0"
            >
              {t("pwa.howToInstall")}
            </button>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showIOSHint && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-gray-900">{t("pwa.addToHomeScreenTitle")}</p>
                <button onClick={handleDismiss} className="text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#C81D60] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>{t("pwa.step1")} <Share className="w-4 h-4 inline-block mx-1 text-blue-500" /></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#C81D60] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span dangerouslySetInnerHTML={{ __html: t("pwa.step2") }} />
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#C81D60] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span dangerouslySetInnerHTML={{ __html: t("pwa.step3") }} />
                </li>
              </ol>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android / Desktop: show native install prompt
  if (!canInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex items-center gap-3 md:max-w-sm md:left-auto md:right-4">
      <img src="/icons/icon-96.webp" alt="Aurelle" className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{t("pwa.installApp")}</p>
        <p className="text-xs text-gray-500 truncate">{t("pwa.addToHomeScreen")}</p>
      </div>
      <button
        onClick={handleInstall}
        className="px-3 py-1.5 bg-[#C81D60] text-white text-sm font-medium rounded-lg flex items-center gap-1.5 flex-shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        {t("pwa.install")}
      </button>
      <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
