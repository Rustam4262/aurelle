import { useEffect, useMemo, useState } from "react";
import i18n from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Star,
  Store,
  User,
  Building2,
  CircleDashed,
  PauseCircle,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

interface LocalizedRecord {
  en?: string;
  ru?: string;
  uz?: string;
}

interface OwnerSalon {
  id: string;
  name: LocalizedRecord | string;
  city: LocalizedRecord | string;
  status?: string | null;
  averageRating?: number | string | null;
  reviewCount?: number | null;
  isActive?: boolean | null;
}

function goToAuth() {
  window.location.href = "/auth";
}

function getLocalizedText(value: LocalizedRecord | string | null | undefined, language: string) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language as keyof typeof value] || value.ru || value.en || value.uz || "";
}

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return "Активен";
    case "paused":
      return "На паузе";
    default:
      return "Черновик";
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300";
    case "paused":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300";
    default:
      return "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300";
  }
}

async function fetchOwnerSalons(): Promise<OwnerSalon[]> {
  const response = await fetch("/api/owner/salons", {
    credentials: "include",
  });

  if (response.status === 401) {
    throw new Error("unauthorized");
  }

  if (!response.ok) {
    throw new Error(`request_failed:${response.status}`);
  }

  return response.json() as Promise<OwnerSalon[]>;
}

export default function OwnerPage() {
  const t = i18n.t.bind(i18n);
  const language = i18n.language || "ru";
  const { user, isLoading, logout, isLoggingOut } = useAuth({ requireAuth: true });
  const [salons, setSalons] = useState<OwnerSalon[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const ownerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Owner";

  const stats = useMemo(() => {
    const active = salons.filter((salon) => (salon.status || "draft") === "active").length;
    const paused = salons.filter((salon) => (salon.status || "draft") === "paused").length;
    const drafts = salons.filter((salon) => (salon.status || "draft") === "draft").length;
    const totalReviews = salons.reduce((sum, salon) => sum + Number(salon.reviewCount || 0), 0);

    return {
      total: salons.length,
      active,
      paused,
      drafts,
      totalReviews,
    };
  }, [salons]);

  const topSalon = useMemo(() => {
    return [...salons].sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0))[0];
  }, [salons]);

  const loadSalons = async () => {
    setIsRefreshing(true);
    setLoadError(null);

    try {
      const data = await fetchOwnerSalons();
      setSalons(data);
    } catch (error) {
      if (error instanceof Error && error.message === "unauthorized") {
        window.location.href = "/auth";
        return;
      }
      setLoadError("Не удалось загрузить кабинеты салонов. Попробуйте еще раз.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoading || !user) return;
    void loadSalons();
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,24,93,0.10),transparent_24%),linear-gradient(180deg,rgba(14,165,233,0.08),transparent_32%)] bg-background">
        <div className="border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-serif text-xl text-foreground">{t("marketplace.owner.title")}</h1>
                <p className="text-sm text-muted-foreground">Кабинет владельца салона</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <div className="p-8 md:p-10 bg-[linear-gradient(135deg,rgba(190,24,93,0.08),rgba(14,165,233,0.08))]">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Пространство для владельца
                </div>
                <h2 className="mt-4 font-serif text-3xl text-foreground">Управляйте салонами, командой и статусами в одном месте</h2>
                <p className="mt-3 text-muted-foreground">
                  Войдите в кабинет владельца, чтобы работать с салонами, переходить в настройки и постепенно возвращаться к расширенному управлению без продовых сбоев.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={goToAuth}>{t("owner.signInToContinue")}</Button>
                  <Button variant="outline" asChild>
                    <Link href="/">На главную</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,24,93,0.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.03),transparent_35%)] bg-background">
      <div className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-serif text-xl text-foreground">{t("marketplace.owner.title")}</h1>
              <p className="text-sm text-muted-foreground">Кабинет владельца салона</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => void loadSalons()} disabled={isRefreshing}>
              {isRefreshing ? t("common.loading") : "Обновить"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void logout()} disabled={isLoggingOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? t("common.loading") : t("marketplace.profile.signOut")}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {loadError && <Card className="p-4 border-destructive/30 bg-destructive/5 text-destructive">{loadError}</Card>}

        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <div className="p-6 sm:p-7 bg-[linear-gradient(135deg,rgba(190,24,93,0.08),rgba(14,165,233,0.08))]">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Центр управления владельца
                  </div>
                  <h2 className="mt-4 font-serif text-3xl text-foreground">{ownerName}</h2>
                  <p className="mt-3 text-muted-foreground max-w-2xl">
                    Здесь собран быстрый обзор по вашим салонам: активность, готовность к публикации и быстрые переходы к управлению каждым объектом.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>{user.email || "-"}</span>
                    <span>Безопасный режим владельца активен</span>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/">Открыть витрину</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/auth">Управлять доступом</Link>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:min-w-[250px]">
                  <div className="rounded-2xl bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Салонов</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">в кабинете владельца</p>
                  </div>
                  <div className="rounded-2xl bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Отзывы</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats.totalReviews}</p>
                    <p className="text-xs text-muted-foreground mt-1">всего по салонам</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/70 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Лучший салон по рейтингу</p>
                <p className="text-xs text-muted-foreground">Быстрый фокус владельца</p>
              </div>
              <Star className="h-5 w-5 text-amber-500" />
            </div>
            <Separator className="my-4" />
            {topSalon ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{getLocalizedText(topSalon.name, language) || "Salon"}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{getLocalizedText(topSalon.city, language) || "Город не указан"}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{Number(topSalon.averageRating || 0).toFixed(1)}</span>
                  <span>•</span>
                  <span>{Number(topSalon.reviewCount || 0)} отзывов</span>
                </div>
                <Badge variant="outline" className={`border ${statusBadgeClass(topSalon.status || "draft")}`}>
                  {statusLabel(topSalon.status || "draft")}
                </Badge>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/owner/salon/${topSalon.id}`}>
                    Открыть управление
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                <Store className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">Салоны пока не созданы</p>
                <p className="text-sm text-muted-foreground mt-2">Когда появятся салоны, здесь будет ваш быстрый обзор.</p>
              </div>
            )}
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5 border-border/70 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Активные</p><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{stats.active}</p>
            <p className="mt-2 text-sm text-muted-foreground">уже доступны клиентам</p>
          </Card>
          <Card className="p-5 border-border/70 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Черновики</p><CircleDashed className="h-5 w-5 text-slate-500" /></div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{stats.drafts}</p>
            <p className="mt-2 text-sm text-muted-foreground">требуют заполнения и публикации</p>
          </Card>
          <Card className="p-5 border-border/70 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">На паузе</p><PauseCircle className="h-5 w-5 text-amber-500" /></div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{stats.paused}</p>
            <p className="mt-2 text-sm text-muted-foreground">временно скрыты для клиентов</p>
          </Card>
          <Card className="p-5 border-border/70 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Отзывы</p><Star className="h-5 w-5 text-pink-500" /></div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{stats.totalReviews}</p>
            <p className="mt-2 text-sm text-muted-foreground">суммарный social proof ваших салонов</p>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-5 border-border/70 shadow-sm">
            <div>
              <h3 className="font-semibold text-foreground">Быстрые действия</h3>
              <p className="text-sm text-muted-foreground">Короткие пути к главным задачам владельца</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Link href="/owner" className="rounded-2xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/50">
                <Building2 className="h-5 w-5 text-primary" />
                <p className="mt-4 font-medium text-foreground">Мои салоны</p>
                <p className="mt-1 text-sm text-muted-foreground">Открыть список всех салонов</p>
              </Link>
              <Link href="/owner" className="rounded-2xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/50">
                <Plus className="h-5 w-5 text-primary" />
                <p className="mt-4 font-medium text-foreground">Добавить салон</p>
                <p className="mt-1 text-sm text-muted-foreground">Подготовить новый объект к публикации</p>
              </Link>
              <Link href="/search" className="rounded-2xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/50">
                <Search className="h-5 w-5 text-primary" />
                <p className="mt-4 font-medium text-foreground">Проверить витрину</p>
                <p className="mt-1 text-sm text-muted-foreground">Посмотреть, как это увидит клиент</p>
              </Link>
            </div>
          </Card>

          <Card className="p-5 border-border/70 shadow-sm">
            <div>
              <h3 className="font-semibold text-foreground">Состояние кабинета</h3>
              <p className="text-sm text-muted-foreground">Текущий безопасный режим и что в нем уже доступно</p>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border p-4">
                <p className="font-medium text-foreground">Что уже доступно</p>
                <p className="text-sm text-muted-foreground mt-2">Список салонов, статусы, рейтинг, быстрые переходы в управление и базовая навигация для владельца.</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="font-medium text-foreground">Почему режим безопасный</p>
                <p className="text-sm text-muted-foreground mt-2">Мы сознательно держим owner-кабинет на устойчивом runtime, пока возвращаем глубокий dashboard-функционал без риска снова уронить прод.</p>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Салоны владельца</h3>
              <p className="text-sm text-muted-foreground">Карточки с быстрым переходом в управление</p>
            </div>
          </div>

          {salons.length === 0 ? (
            <Card className="p-10 text-center border-border/70 shadow-sm">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground">У вас пока нет салонов</p>
              <p className="text-muted-foreground mt-2 mb-5">Когда салон будет создан, здесь появятся статусы, рейтинг и быстрые действия.</p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Button asChild>
                  <Link href="/">На главную</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/search">Посмотреть клиентскую витрину</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {salons.map((salon) => {
                const salonStatus = salon.status || "draft";
                const salonName = getLocalizedText(salon.name, language) || "Salon";
                const city = getLocalizedText(salon.city, language) || "Город не указан";
                const rating = Number(salon.averageRating || 0);

                return (
                  <Card key={salon.id} className="p-5 border-border/70 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-lg text-foreground truncate">{salonName}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{city}</p>
                      </div>
                      <Badge variant="outline" className={`border ${statusBadgeClass(salonStatus)}`}>
                        {statusLabel(salonStatus)}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-muted/25 px-4 py-3">
                        <p className="text-muted-foreground">Рейтинг</p>
                        <div className="mt-2 flex items-center gap-2 text-foreground font-medium">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{rating > 0 ? rating.toFixed(1) : "Новый"}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-muted/25 px-4 py-3">
                        <p className="text-muted-foreground">Отзывы</p>
                        <p className="mt-2 text-foreground font-medium">{Number(salon.reviewCount || 0)}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2 flex-wrap">
                      <Button className="flex-1 min-w-[160px]" asChild>
                        <Link href={`/owner/salon/${salon.id}`}>
                          <Settings className="h-4 w-4 mr-2" />
                          Управлять
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/search">Проверить витрину</Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
