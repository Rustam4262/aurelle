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
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { SiGithub, SiGoogle } from "react-icons/si";

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
      (payload as { errors?: Array<{ message?: string }>; message?: string; error?: string }).errors?.[0]
        ?.message ||
      (payload as { message?: string; error?: string }).message ||
      (payload as { error?: string }).error ||
      "Request failed";
    throw new Error(message);
  }

  return payload;
}

const benefits = [
  "Бронирования и избранное в одном кабинете",
  "Управление салоном и командой без лишних шагов",
  "Безопасный вход через email и соцсети",
];

export default function AuthPage() {
  const t = i18n.t.bind(i18n);

  const loginWithProvider = (provider: string, role?: string) => {
    const q = role ? `?role=${encodeURIComponent(role)}` : "";
    window.location.href = `/api/auth/${provider}${q}`;
  };

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      await submitJson(event, "/api/auth/login");
      window.location.reload();
    } catch (error) {
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

    try {
      await submitJson(event, "/api/auth/register");
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(200,29,96,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_22%),linear-gradient(180deg,#07070a_0%,#121216_45%,#09090b_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <a href="/">
            <Button variant="ghost" size="icon" className="border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </a>
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center py-8 lg:py-12">
          <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="overflow-hidden border-white/10 bg-white/[0.04] text-white shadow-2xl shadow-black/30 backdrop-blur">
              <div className="h-full p-6 sm:p-8 lg:p-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  <Sparkles className="h-3.5 w-3.5 text-[#ff5c93]" />
                  Beauty marketplace для клиентов и владельцев
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <div className="rounded-2xl border border-[#ff5c93]/25 bg-gradient-to-br from-[#ff5c93]/30 to-white/5 p-3 shadow-lg shadow-[#ff5c93]/10">
                    <Logo className="h-16 w-16 rounded-xl object-cover" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-white/50">Aurelle</p>
                    <h1 className="mt-2 font-serif text-3xl leading-tight text-white sm:text-4xl">
                      Добро пожаловать в пространство записи и управления
                    </h1>
                  </div>
                </div>

                <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                  Войдите, чтобы бронировать услуги, сохранять любимые салоны и управлять рабочими кабинетами без лишних экранов и перегруза.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <User className="h-6 w-6 text-white/80" />
                    <p className="mt-4 text-lg font-medium text-white">Для клиентов</p>
                    <p className="mt-2 text-sm text-white/60">Записи, отзывы, избранное и история посещений.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <Store className="h-6 w-6 text-white/80" />
                    <p className="mt-4 text-lg font-medium text-white">Для владельцев</p>
                    <p className="mt-2 text-sm text-white/60">Салоны, услуги, команда и календарь бронирований.</p>
                  </div>
                </div>

                <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Почему этот вход удобнее сейчас
                  </div>
                  <div className="mt-4 space-y-3">
                    {benefits.map((benefit) => (
                      <div key={benefit} className="flex items-start gap-3 text-sm text-white/70">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-white/10 bg-[#141418]/95 text-white shadow-2xl shadow-black/30 backdrop-blur">
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="secondary" className="border border-white/10 bg-white/5 text-white/75 hover:bg-white/5">
                      Безопасный вход
                    </Badge>
                    <h2 className="mt-4 font-serif text-2xl text-white">Вход и регистрация</h2>
                    <p className="mt-2 text-sm text-white/60">
                      Используйте email или соцсети. Телефонный вход временно недоступен, пока мы восстанавливаем SMS-авторизацию.
                    </p>
                  </div>
                </div>

                <Alert className="mt-6 border-[#ff5c93]/20 bg-[#ff5c93]/8 text-white">
                  <AlertTitle className="text-white">Временно отключено</AlertTitle>
                  <AlertDescription className="text-white/75">
                    Вход по телефону временно недоступен. Используйте email, Google, Яндекс или GitHub.
                  </AlertDescription>
                </Alert>

                <div className="mt-6 space-y-3">
                  <Button className="w-full justify-start border-white/10 bg-white/0 text-white hover:bg-white/5" size="lg" variant="outline" onClick={() => loginWithProvider("google")}>
                    <SiGoogle className="mr-3 h-5 w-5 text-[#4285F4]" />
                    {t("marketplace.auth.signInWithGoogle", "Продолжить с Google")}
                  </Button>
                  <Button className="w-full justify-start border-white/10 bg-white/0 text-white hover:bg-white/5" size="lg" variant="outline" onClick={() => loginWithProvider("yandex")}>
                    <YandexIcon className="mr-3 h-5 w-5 text-[#FF0000]" />
                    {t("marketplace.auth.signInWithYandex", "Продолжить с Яндекс")}
                  </Button>
                  <Button className="w-full justify-start border-white/10 bg-white/0 text-white hover:bg-white/5" size="lg" variant="outline" onClick={() => loginWithProvider("github")}>
                    <SiGithub className="mr-3 h-5 w-5" />
                    {t("marketplace.auth.signInWithGitHub")}
                  </Button>
                </div>

                <Tabs defaultValue="login" className="mt-8 w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5">
                    <TabsTrigger value="login">{t("marketplace.auth.login")}</TabsTrigger>
                    <TabsTrigger value="register">{t("marketplace.auth.register")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-5">
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-white/85">{t("marketplace.auth.email")}</Label>
                        <Input id="login-email" name="email" type="email" placeholder="email@example.com" required className="border-white/10 bg-white/0 text-white placeholder:text-white/30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-white/85">{t("marketplace.auth.password")}</Label>
                        <Input id="login-password" name="password" type="password" placeholder="********" required minLength={8} className="border-white/10 bg-white/0 text-white placeholder:text-white/30" />
                      </div>
                      <Button type="submit" className="w-full bg-[#e33674] text-white hover:bg-[#f04a84]" size="lg">
                        <Mail className="mr-2 h-5 w-5" />
                        {t("marketplace.auth.signIn")}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="mt-5">
                    <form onSubmit={handleEmailRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-white/85">{t("marketplace.auth.email")}</Label>
                        <Input id="register-email" name="email" type="email" placeholder="email@example.com" required className="border-white/10 bg-white/0 text-white placeholder:text-white/30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-white/85">{t("marketplace.auth.password")}</Label>
                        <Input id="register-password" name="password" type="password" placeholder="********" required minLength={8} className="border-white/10 bg-white/0 text-white placeholder:text-white/30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-confirm-password" className="text-white/85">{t("marketplace.auth.confirmPassword")}</Label>
                        <Input id="register-confirm-password" name="confirmPassword" type="password" placeholder="********" required minLength={8} className="border-white/10 bg-white/0 text-white placeholder:text-white/30" />
                      </div>
                      <Button type="submit" className="w-full bg-[#e33674] text-white hover:bg-[#f04a84]" size="lg">
                        <Mail className="mr-2 h-5 w-5" />
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
