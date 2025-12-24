import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Sparkles } from "lucide-react";

function loginWithReplit() {
  window.location.href = "/api/login";
}

export default function AuthPage() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    navigate("/profile");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-auth">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="font-serif text-2xl font-semibold">BeautyUz</span>
            </div>
            <h1 className="font-serif text-2xl text-foreground mb-2">
              {t("marketplace.auth.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("marketplace.auth.subtitle")}
            </p>
          </div>

          <div className="space-y-4">
            <Button
              className="w-full"
              size="lg"
              onClick={loginWithReplit}
              data-testid="button-login-replit"
            >
              {t("marketplace.auth.signInWith")} Replit
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("marketplace.auth.or")}
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Sign in with your Replit account to book appointments and save your favorite salons.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
