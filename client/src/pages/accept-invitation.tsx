import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type CheckResult =
  | { valid: true; salonId: string; expiresAt: string }
  | { valid: false; reason: "not_found" | "active" | "revoked" | "expired" };

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  // Check token validity once we have it
  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    setChecking(true);
    fetch(`/api/invitations/check?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: CheckResult) => setCheckResult(data))
      .catch(() => setCheckResult({ valid: false, reason: "not_found" }))
      .finally(() => setChecking(false));
  }, [token]);

  // Once auth is resolved and token is valid, redirect to login if not authenticated
  useEffect(() => {
    if (authLoading || checking) return;
    if (checkResult?.valid && !user) {
      // Store token so we can return after login
      sessionStorage.setItem("invitationToken", token ?? "");
      sessionStorage.setItem("redirectAfterLogin", `/accept-invitation?token=${token}`);
      setLocation("/auth");
    }
  }, [authLoading, checking, checkResult, user, token, setLocation]);

  // Auto-accept if user is authenticated and token is valid
  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccepted(true);
        setTimeout(() => setLocation("/owner"), 2500);
      } else {
        setError(data.error ?? "Не удалось принять приглашение");
      }
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setAccepting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (checking || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Приглашение принято!</CardTitle>
            <CardDescription>
              Вы успешно стали менеджером салона. Перенаправляем в панель управления…
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ── Invalid / expired token ───────────────────────────────────────────────
  if (!token || (checkResult && !checkResult.valid)) {
    const reason = !token ? "not_found" : (checkResult as { valid: false; reason: string }).reason;
    const messages: Record<string, string> = {
      not_found: "Приглашение не найдено или уже было использовано.",
      expired: "Срок действия приглашения истёк. Попросите владельца отправить новое.",
      active: "Это приглашение уже было принято.",
      revoked: "Приглашение отозвано владельцем.",
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Недействительное приглашение</CardTitle>
            <CardDescription>{messages[reason] ?? messages["not_found"]}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Valid token, user authenticated — show accept button ─────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Приглашение в команду</CardTitle>
          <CardDescription>
            Вас приглашают стать менеджером салона в AURELLE. Нажмите кнопку ниже, чтобы принять
            приглашение.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" onClick={handleAccept} disabled={accepting}>
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Принимаем…
              </>
            ) : (
              "Принять приглашение"
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
            Отмена
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
