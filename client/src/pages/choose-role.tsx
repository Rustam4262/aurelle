import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Building2, WandSparkles, ArrowRight, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";

export default function ChooseRolePage() {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("uz") ? "uz" : i18n.language.startsWith("en") ? "en" : "ru";
  const c = {
    ru: {
      title: "Кто вы?",
      hint: "Выберите, как будете пользоваться AURELLE. После выбора откроется ваш кабинет.",
      client: "Клиент",
      clientHint: "Записывайтесь на услуги, сохраняйте любимых мастеров и оставляйте отзывы.",
      solo_master: "Фриланс-мастер",
      solo_masterHint: "Создайте профиль, добавьте услуги и принимайте записи самостоятельно.",
      owner: "Владелец салона",
      ownerHint: "Добавьте салон, пригласите команду и управляйте записями.",
      error: "Не удалось сохранить выбор. Попробуйте ещё раз.",
      loading: "Открываем кабинет…",
      retry: "Повторить",
      checking: "Проверяем аккаунт…",
    },
    en: {
      title: "Who are you?",
      hint: "Choose how you will use AURELLE. Your workspace opens after you choose.",
      client: "Client",
      clientHint: "Book services, save favorite professionals and leave reviews.",
      solo_master: "Freelance master",
      solo_masterHint: "Create your profile, add services and accept bookings independently.",
      owner: "Salon owner",
      ownerHint: "Add your salon, invite your team and manage bookings.",
      error: "Could not save your choice. Please try again.",
      loading: "Opening your workspace…",
      retry: "Retry",
      checking: "Checking your account…",
    },
    uz: {
      title: "Siz kimsiz?",
      hint: "AURELLE xizmatidan qanday foydalanishingizni tanlang. Keyin kabinetingiz ochiladi.",
      client: "Mijoz",
      clientHint: "Xizmatlarga yoziling, sevimli ustalarni saqlang va sharh qoldiring.",
      solo_master: "Frilans usta",
      solo_masterHint:
        "Profil yarating, xizmatlar qo‘shing va mustaqil ravishda bronlar qabul qiling.",
      owner: "Salon egasi",
      ownerHint: "Salon qo‘shing, jamoangizni taklif qiling va bronlarni boshqaring.",
      error: "Tanlovni saqlab bo‘lmadi. Qayta urinib ko‘ring.",
      loading: "Kabinet ochilmoqda…",
      retry: "Qayta urinish",
      checking: "Akkaunt tekshirilmoqda…",
    },
  }[lang];
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/user", { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.replace("/auth");
          return;
        }
        if (!r.ok) throw new Error();
        const user = await r.json();
        if (cancelled) return;
        if (!user.roleSelectionRequired) {
          window.location.replace("/auth");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  async function choose(role: "client" | "owner" | "solo_master") {
    if (busy || !ready) return;
    setBusy(role);
    setError(false);
    try {
      const result = await (await apiRequest("POST", "/api/auth/choose-role", { role })).json();
      // A full navigation discards cached client-role data from before onboarding.
      sessionStorage.removeItem("redirectAfterLogin");
      window.location.replace(result.redirect);
    } catch (e) {
      if ((e as any).status === 409) {
        window.location.replace("/auth");
        return;
      }
      setError(true);
      setBusy("");
    }
  }
  return (
    <main className="page-backdrop min-h-screen px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center justify-between mb-10">
          <span className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary bg-[linear-gradient(135deg,rgb(255_255_255/0.25),rgb(0_0_0/0.15))] font-serif text-lg font-semibold text-white shadow-glow">A</span><span className="font-serif text-xl font-semibold tracking-[0.12em]">AURELLE</span></span>
          <LanguageSwitcher />
        </header>
        <h1 className="mb-3 font-serif text-5xl font-light tracking-[-0.02em] animate-fade-up">{c.title}</h1>
        <p className="text-muted-foreground mb-7">{c.hint}</p>
        {!ready && !error && <p role="status">{c.checking}</p>}
        <div className="space-y-3">
          {(["client", "solo_master", "owner"] as const).map((role) => {
            const Icon = role === "client" ? Heart : role === "owner" ? Building2 : WandSparkles;
            return (
              <button
                key={role}
                disabled={!ready || !!busy}
                onClick={() => choose(role)}
                className="glass lift group flex w-full items-center gap-4 rounded-3xl p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110"><Icon className="h-6 w-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{c[role]}</span>
                  <span className="block mt-1 text-sm text-muted-foreground">
                    {c[`${role}Hint`]}
                  </span>
                </span>
                {busy === role ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                ) : (
                  <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" />
                )}
              </button>
            );
          })}
        </div>
        {busy && (
          <p role="status" className="mt-4 text-muted-foreground">
            {c.loading}
          </p>
        )}
        {error && (
          <div role="alert" className="mt-5 text-destructive">
            {c.error}
            {!ready && (
              <Button
                variant="outline"
                className="ml-3"
                onClick={() => {
                  setError(false);
                  setAttempt((x) => x + 1);
                }}
              >
                {c.retry}
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
