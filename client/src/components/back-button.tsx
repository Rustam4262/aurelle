import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { goBackOrNavigate } from "@/lib/safe-back";
export function BackButton({
  fallback = "/",
  className,
}: {
  fallback?: string;
  className?: string;
}) {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={t("common.back", "Назад")}
      onClick={() => goBackOrNavigate(navigate, fallback)}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
