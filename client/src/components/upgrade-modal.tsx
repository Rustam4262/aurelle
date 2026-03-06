/**
 * client/src/components/upgrade-modal.tsx
 *
 * Global paywall modal that appears when any API call returns HTTP 402.
 *
 * Usage:
 *   1. Mount <UpgradeModal /> once at the app root (inside QueryClientProvider).
 *   2. The queryClient fires a CustomEvent "aurelle:upgrade-required" on 402.
 *   3. This component intercepts it and renders the dialog.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, X } from "lucide-react";

interface UpgradeEvent {
  feature: string;
  upgradeUrl?: string;
}

export const UPGRADE_EVENT = "aurelle:upgrade-required";

/** Dispatch this from anywhere to open the upgrade modal. */
export function emitUpgradeRequired(detail: UpgradeEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UpgradeEvent>(UPGRADE_EVENT, { detail }));
}

export function UpgradeModal() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [featureKey, setFeatureKey] = useState<string>("");

  useEffect(() => {
    function onUpgrade(e: Event) {
      const evt = e as CustomEvent<UpgradeEvent>;
      setFeatureKey(evt.detail.feature ?? "");
      setOpen(true);
    }
    window.addEventListener(UPGRADE_EVENT, onUpgrade);
    return () => window.removeEventListener(UPGRADE_EVENT, onUpgrade);
  }, []);

  function handleUpgrade() {
    setOpen(false);
    navigate("/pricing");
  }

  // Humanize feature key: "analytics.advanced" → "Analytics Advanced"
  const featureLabel = featureKey
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <Badge variant="secondary" className="text-xs">
              {t("upgrade.premiumBadge")}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{t("upgrade.title")}</DialogTitle>
          <DialogDescription className="text-base mt-1">
            {t("upgrade.description", { feature: featureLabel })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {(t("upgrade.benefits", { returnObjects: true }) as string[]).map(
              (benefit, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {benefit}
                </li>
              ),
            )}
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setOpen(false)} className="gap-1">
            <X className="h-4 w-4" />
            {t("upgrade.dismiss")}
          </Button>
          <Button onClick={handleUpgrade} className="gap-1 flex-1">
            {t("upgrade.cta")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
