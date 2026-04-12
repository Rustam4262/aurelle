import { useEffect, useState } from "react";
import i18n from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { SiGithub, SiGoogle } from "react-icons/si";

type AuthUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isAdmin?: boolean;
  role?: string | null;
};

function Logo({ className }: { className?: string }) {
  return <img src="/images/logo.jpg" alt="AURELLE" className={className} />;
}

function YandexIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm2.272 19.636h-2.182V9.454l-2.363 4.636H8.363l-2.363-4.636v10.182H3.818V4.363h2.182l3.636 7.273 3.636-7.273h2.182v15.273h-1.182z" />
    </svg>
  );
}

async function submitJson(event: React.FormEvent<HTMLFormElement>, url: string) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { errors?: Array<{ message?: string }>; message?: string; error?: string }).errors?.[0]?.message ||
      (payload as { message?: string; error?: string }).message ||
      (payload as { error?: string }).error ||
      "Request failed";
    throw new Error(message);
  }

  return payload;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Failed to load current user");
  return response.json();
}

async function resolvePostLoginPath(): Promise<string> {
  const savedRedirect = sessionStorage.getItem("redirectAfterLogin");
  if (savedRedirect) {
    sessionStorage.removeItem("redirectAfterLogin");
    return savedRedirect;
  }

  const user = await fetchCurrentUser();
  if (!user) return "/auth";
  if (user.isAdmin || user.role === "admin") return "/admin";
  if (user.role === "owner") return "/owner";
  if (user.role === "solo_master") return "/solo-master";
  if (user.role === "master") return "/solo-master";
  return "/client";
}

const benefits = [
  "Бронирования, избранное и история в одном кабинете",
  "Управление салоном и командой без лишних шагов",
  "Безопасный вход через email и социальные сети",
];

const registrationRoles = [
  {
    value: "client",
    title: "Клиент",
    description: "Записи, отзывы, избранное и история посещений.",
  },
  {
    value: "solo_master",
    title: "Фриланс-мастер",
    description: "Личный кабинет мастера, расписание и услуги без салона.",
  },
  {
    value: "owner",
    title: "Владелец салона",
    description: "Салоны, услуги, команда и календарь бронирований.",
  },
] as const;

export default function AuthPage() {
  const t = i18n.t.bind(i18n);
  const [isResolvingSession, setIsResolvingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationRole, setRegistrationRole] = useState<"client" | "owner" | "solo_master">("client");

  const loginWithProvider = (provider: string, role?: string) => {
    const q = role ? `?role=${encodeURIComponent(role)}` : "";
    window.location.href = `/api/auth/${provider}${q}`;
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const user = await fetchCurrentUser();
        if (!user || cancelled) {
          if (!cancelled) setIsResolvingSession(false);
          return;
        }

        const nextPath = await resolvePostLoginPath();
        if (!cancelled) {
          window.location.replace(nextPath);
        }
      } catch {
        if (!cancelled) setIsResolvingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    try {
      await submitJson(event, "/api/auth/login");
      const nextPath = await resolvePostLoginPath();
      window.location.replace(nextPath);
    } catch (error) {
      setIsSubmitting(false);
      window.alert(error instanceof Error ? error.message : "Login failed");
    }
  };

  const handleEmailRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      window.alert(t("marketplace.auth.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitJson(event, "/api/auth/register");
      const nextPath = await resolvePostLoginPath();
      window.location.replace(nextPath);
    } catch (error) {
      setIsSubmitting(false);
      window.alert(error instanceof Error ? error.message : "Registration failed");
    }
  };

  if (isResolvingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fff8fb_0%,#fff3f8_45%,#ffffff_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(200,29,96,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_22%),linear-gradient(180deg,#07070a_0%,#121216_45%,#09090b_100%)] dark:text-white">
        <div className="flex items-center gap-3 rounded-full border border-border bg-background/90 px-5 py-3 text-sm text-muted-foreground shadow-lg shadow-primary/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-white/75">
          <Loader2 className="h-4 w-4 animate-spin" />
          Проверяем сессию и открываем ваш кабинет...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#fff4f8_42%,#ffffff_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(200,29,96,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_22%),linear-gradient(180deg,#07070a_0%,#121216_45%,#09090b_100%)] dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <a href="/">
            <Button
              variant="ghost"
              size="icon"
              className="border border-border bg-white/80 text-foreground shadow-sm hover:bg-accent hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </a>
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center py-8 lg:py-12">
          <div className="grid w-full gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <Card className="overflow-hidden border-border bg-white/88 text-foreground shadow-2xl shadow-primary/10 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:shadow-black/30">
              <div className="h-full p-6 sm:p-8 lg:p-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  <Sparkles className="h-3.5 w-3.5 text-[#ff5c93]" />
                  Beauty marketplace для клиентов и владельцев
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-[#ff5c93]/12 via-white to-primary/5 p-3 shadow-lg shadow-[#ff5c93]/10 dark:border-[#ff5c93]/25 dark:from-[#ff5c93]/30 dark:to-white/5">
                    <Logo className="h-16 w-16 rounded-xl object-cover" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground dark:text-white/50">Aurelle</p>
                    <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl dark:text-white">
                      Добро пожаловать в пространство записи и управления
                    </h1>
                  </div>
                </div>

                <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-white/70">
                  Войдите, чтобы бронировать услуги, сохранять любимые салоны и управлять рабочими кабинетами без перегруза и лишних экранов.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted/35 p-5 dark:border-white/10 dark:bg-white/5">
                    <User className="h-6 w-6 text-primary dark:text-white/80" />
                    <p className="mt-4 text-lg font-medium text-foreground dark:text-white">Для клиентов</p>
                    <p className="mt-2 text-sm text-muted-foreground dark:text-white/60">Записи, отзывы, избранное и история посещений.</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/35 p-5 dark:border-white/10 dark:bg-white/5">
                    <Store className="h-6 w-6 text-primary dark:text-white/80" />
                    <p className="mt-4 text-lg font-medium text-foreground dark:text-white">Для владельцев</p>
                    <p className="mt-2 text-sm text-muted-foreground dark:text-white/60">Салоны, услуги, команда и календарь бронирований.</p>
                  </div>
                </div>

                <div className="mt-8 rounded-3xl border border-border bg-background/80 p-5 dark:border-white/10 dark:bg-black/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Почему этот вход удобен
                  </div>
                  <div className="mt-4 space-y-3">
                    {benefits.map((benefit) => (
                      <div key={benefit} className="flex items-start gap-3 text-sm text-muted-foreground dark:text-white/70">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-border bg-white/92 text-foreground shadow-2xl shadow-primary/10 backdrop-blur dark:border-white/10 dark:bg-[#141418]/95 dark:text-white dark:shadow-black/30">
              <div className="p-6 sm:p-8">
                <Badge variant="secondary" className="border border-primary/10 bg-primary/5 text-foreground/80 hover:bg-primary/5 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
                  Безопасный вход
                </Badge>

                <h2 className="mt-4 font-serif text-2xl text-foreground dark:text-white">Вход и регистрация</h2>
                <p className="mt-2 text-sm text-muted-foreground dark:text-white/60">
                  Используйте email или социальные сети. Вход по телефону временно недоступен, пока мы восстанавливаем SMS-авторизацию.
                </p>

                <Alert className="mt-6 border-[#ff5c93]/15 bg-[#ff5c93]/6 text-foreground dark:text-white">
                  <AlertTitle className="text-foreground dark:text-white">Временно отключено</AlertTitle>
                  <AlertDescription className="text-muted-foreground dark:text-white/75">
                    Вход по телефону временно недоступен. Используйте email, Google, Яндекс или GitHub.
                  </AlertDescription>
                </Alert>

                <div className="mt-6 space-y-3">
                  <Button className="w-full justify-start border-border bg-background text-foreground hover:bg-accent dark:border-white/10 dark:bg-white/0 dark:text-white dark:hover:bg-white/5" size="lg" variant="outline" onClick={() => loginWithProvider("google")}>
                    <SiGoogle className="mr-3 h-5 w-5 text-[#4285F4]" />
                    {t("marketplace.auth.signInWithGoogle", "Продолжить с Google")}
                  </Button>
                  <Button className="w-full justify-start border-border bg-background text-foreground hover:bg-accent dark:border-white/10 dark:bg-white/0 dark:text-white dark:hover:bg-white/5" size="lg" variant="outline" onClick={() => loginWithProvider("yandex")}>
                    <YandexIcon className="mr-3 h-5 w-5 text-[#FF0000]" />
                    {t("marketplace.auth.signInWithYandex", "Продолжить с Яндекс")}
                  </Button>
                  <Button className="w-full justify-start border-border bg-background text-foreground hover:bg-accent dark:border-white/10 dark:bg-white/0 dark:text-white dark:hover:bg-white/5" size="lg" variant="outline" onClick={() => loginWithProvider("github")}>
                    <SiGithub className="mr-3 h-5 w-5" />
                    {t("marketplace.auth.signInWithGitHub")}
                  </Button>
                </div>

                <Tabs defaultValue="login" className="mt-8 w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted dark:bg-white/5">
                    <TabsTrigger value="login">{t("marketplace.auth.login")}</TabsTrigger>
                    <TabsTrigger value="register">{t("marketplace.auth.register")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-5">
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-foreground/85 dark:text-white/85">{t("marketplace.auth.email")}</Label>
                        <Input id="login-email" name="email" type="email" placeholder="email@example.com" required className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/0 dark:text-white dark:placeholder:text-white/30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-foreground/85 dark:text-white/85">{t("marketplace.auth.password")}</Label>
                        <Input id="login-password" name="password" type="password" placeholder="********" required minLength={8} className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/0 dark:text-white dark:placeholder:text-white/30" />
                      </div>
                      <Button type="submit" className="w-full bg-[#e33674] text-white hover:bg-[#f04a84]" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mail className="mr-2 h-5 w-5" />}
                        {t("marketplace.auth.signIn")}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="mt-5">
                    <form onSubmit={handleEmailRegister} className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-foreground/85 dark:text-white/85">Кто вы?</Label>
                          <span className="text-xs text-muted-foreground dark:text-white/50">
                            Выбор влияет на кабинет после регистрации
                          </span>
                        </div>
                        <input type="hidden" name="role" value={registrationRole} />
                        <div className="grid gap-2 sm:grid-cols-3">
                          {registrationRoles.map((role) => (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => setRegistrationRole(role.value)}
                              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                                registrationRole === role.value
                                  ? "border-primary bg-primary/10 text-foreground dark:border-primary dark:bg-primary/15 dark:text-white"
                                  : "border-border bg-background text-muted-foreground hover:bg-accent dark:border-white/10 dark:bg-white/0 dark:text-white/70 dark:hover:bg-white/5"
                              }`}
                            >
                              <div className="text-sm font-semibold">{role.title}</div>
                              <div className="mt-1 text-xs leading-5">{role.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-foreground/85 dark:text-white/85">{t("marketplace.auth.email")}</Label>
                        <Input id="register-email" name="email" type="email" placeholder="email@example.com" required className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/0 dark:text-white dark:placeholder:text-white/30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-foreground/85 dark:text-white/85">{t("marketplace.auth.password")}</Label>
                        <Input id="register-password" name="password" type="password" placeholder="********" required minLength={8} className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/0 dark:text-white dark:placeholder:text-white/30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-confirm-password" className="text-foreground/85 dark:text-white/85">{t("marketplace.auth.confirmPassword")}</Label>
                        <Input id="register-confirm-password" name="confirmPassword" type="password" placeholder="********" required minLength={8} className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/0 dark:text-white dark:placeholder:text-white/30" />
                      </div>
                      <Button type="submit" className="w-full bg-[#e33674] text-white hover:bg-[#f04a84]" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mail className="mr-2 h-5 w-5" />}
                        {t("marketplace.auth.createAccount")}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
