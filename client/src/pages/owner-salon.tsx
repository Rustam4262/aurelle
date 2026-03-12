import { useEffect, useMemo, useState } from "react";
import i18n from "@/lib/i18n";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  CircleDashed,
  Clock,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  RefreshCw,
  Scissors,
  Sparkles,
  Star,
  Store,
  UserCog,
  Users,
} from "lucide-react";
import type { Salon } from "@shared/schema";
import { OwnerSalonInfo } from "@/components/owner/OwnerSalonInfo";
import { OwnerSalonServices } from "@/components/owner/OwnerSalonServices";
import { OwnerSalonStaff } from "@/components/owner/OwnerSalonStaff";
import { OwnerSalonHours } from "@/components/owner/OwnerSalonHours";
import { OwnerSalonBookings } from "@/components/owner/OwnerSalonBookings";
import { OwnerSalonTeam } from "@/components/owner/OwnerSalonTeam";
import { LanguageSwitcher } from "@/components/language-switcher";

function getLocalizedText(
  obj: { en: string; ru: string; uz: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
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

async function fetchOwnerSalon(salonId: string): Promise<Salon> {
  const response = await fetch(`/api/owner/salons/${salonId}`, {
    credentials: "include",
  });

  if (response.status === 401) {
    throw new Error("unauthorized");
  }

  if (response.status === 404) {
    throw new Error("not_found");
  }

  if (!response.ok) {
    throw new Error(`request_failed:${response.status}`);
  }

  return response.json() as Promise<Salon>;
}

export default function OwnerSalonPage() {
  const t = i18n.t.bind(i18n);
  const currentLang = i18n.language || "ru";
  const { user, isLoading: authLoading } = useAuth({ requireAuth: true });
  const params = useParams<{ id: string }>();
  const salonId = params.id;

  const [activeTab, setActiveTab] = useState("info");
  const [salon, setSalon] = useState<Salon | null>(null);
  const [salonLoading, setSalonLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSalon = async () => {
    if (!salonId) return;

    setRefreshing(true);
    setLoadError(null);

    try {
      const data = await fetchOwnerSalon(salonId);
      setSalon(data);
    } catch (error) {
      if (error instanceof Error && error.message === "unauthorized") {
        window.location.href = "/auth";
        return;
      }

      if (error instanceof Error && error.message === "not_found") {
        setSalon(null);
        return;
      }

      setLoadError("Не удалось загрузить салон. Попробуйте обновить страницу.");
    } finally {
      setSalonLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user || !salonId) return;
    void loadSalon();
  }, [authLoading, user, salonId]);

  if (authLoading || salonLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,24,93,0.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.03),transparent_35%)] bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,24,93,0.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.03),transparent_35%)] bg-background">
        <div className="border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/owner">
                <Button variant="ghost" size="icon" data-testid="button-back-salon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-serif text-xl text-foreground">Салон не найден</h1>
                <p className="text-sm text-muted-foreground">
                  Проверьте доступ или вернитесь к списку салонов
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6">
          <Card className="p-8 text-center border-border/70 shadow-sm">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-5">{t("marketplace.owner.salonNotFound")}</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link href="/owner">
                <Button>{t("marketplace.owner.backToSalons")}</Button>
              </Link>
              <Button variant="outline" onClick={() => void loadSalon()} disabled={refreshing}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Попробовать снова
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const salonName = getLocalizedText(
    salon.name as { en: string; ru: string; uz: string },
    currentLang,
  );
  const description = getLocalizedText(
    salon.description as { en: string; ru: string; uz: string },
    currentLang,
  );
  const status = salon.status || "draft";
  const stats = useMemo(
    () => ({
      rating: Number(salon.averageRating || 0).toFixed(1),
      reviews: Number(salon.reviewCount || 0),
      photos: Array.isArray(salon.photos) ? salon.photos.length : 0,
    }),
    [salon],
  );

  const tabItems = [
    { value: "info", label: t("marketplace.owner.info"), icon: Camera },
    { value: "services", label: t("marketplace.owner.services"), icon: Scissors },
    { value: "staff", label: t("marketplace.owner.staff"), icon: Users },
    { value: "hours", label: t("marketplace.owner.hours"), icon: Clock },
    { value: "team", label: t("team.title"), icon: UserCog },
    { value: "bookings", label: t("marketplace.owner.bookings"), icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,24,93,0.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.03),transparent_35%)] bg-background">
      <div className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/owner">
              <Button variant="ghost" size="icon" data-testid="button-back-salon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="font-serif text-xl text-foreground truncate">{salonName}</h1>
              <p className="text-sm text-muted-foreground">{t("marketplace.owner.manageSalon")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => void loadSalon()} disabled={refreshing}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {refreshing ? t("common.loading") : "Обновить"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {loadError && (
          <Card className="p-4 border-destructive/30 bg-destructive/5 text-destructive">
            {loadError}
          </Card>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <div className="p-6 sm:p-7 bg-[linear-gradient(135deg,rgba(190,24,93,0.08),rgba(14,165,233,0.08))]">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Центр управления салоном
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <h2 className="font-serif text-3xl text-foreground">{salonName}</h2>
                    <Badge variant="outline" className={`border ${statusBadgeClass(status)}`}>
                      {statusLabel(status)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-muted-foreground max-w-2xl">
                    {description ||
                      "Здесь собраны основные операции владельца: оформление карточки салона, услуги, команда, график и бронирования."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {salon.city}, {salon.address}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {salon.phone}
                    </span>
                    {salon.email && (
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {salon.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:min-w-[250px]">
                  <div className="rounded-2xl bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Рейтинг
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats.rating}</p>
                    <p className="text-xs text-muted-foreground mt-1">средняя оценка салона</p>
                  </div>
                  <div className="rounded-2xl bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Отзывы
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats.reviews}</p>
                    <p className="text-xs text-muted-foreground mt-1">социальное доверие</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/70 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Быстрый обзор</p>
                <p className="text-xs text-muted-foreground">Ключевое состояние карточки</p>
              </div>
              <Store className="h-5 w-5 text-primary" />
            </div>
            <Separator className="my-4" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-muted/25 px-4 py-3">
                <span className="text-muted-foreground">Статус публикации</span>
                <span className="font-medium text-foreground">{statusLabel(status)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/25 px-4 py-3">
                <span className="text-muted-foreground">Фото в карточке</span>
                <span className="font-medium text-foreground">{stats.photos}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/25 px-4 py-3">
                <span className="text-muted-foreground">Город</span>
                <span className="font-medium text-foreground">{salon.city}</span>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5 border-border/70 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Статус</p>
              {status === "active" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : status === "paused" ? (
                <PauseCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <CircleDashed className="h-5 w-5 text-slate-500" />
              )}
            </div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{statusLabel(status)}</p>
            <p className="mt-2 text-sm text-muted-foreground">состояние видимости на витрине</p>
          </Card>
          <Card className="p-5 border-border/70 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Рейтинг</p>
              <Star className="h-5 w-5 text-amber-500" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{stats.rating}</p>
            <p className="mt-2 text-sm text-muted-foreground">по отзывам клиентов</p>
          </Card>
          <Card className="p-5 border-border/70 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Отзывы</p>
              <Star className="h-5 w-5 text-pink-500" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{stats.reviews}</p>
            <p className="mt-2 text-sm text-muted-foreground">накопленный social proof</p>
          </Card>
          <Card className="p-5 border-border/70 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Фотографии</p>
              <Camera className="h-5 w-5 text-sky-500" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{stats.photos}</p>
            <p className="mt-2 text-sm text-muted-foreground">изображений в карточке салона</p>
          </Card>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-grid min-w-full grid-cols-6 mb-6">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    data-testid={`tab-salon-${tab.value}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <Card className="p-4 border-border/70 shadow-sm mb-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Сейчас открыт раздел:</span>
              <Badge variant="secondary">
                {tabItems.find((tab) => tab.value === activeTab)?.label ||
                  t("marketplace.owner.info")}
              </Badge>
              <span>Управляйте данными салона без переходов между отдельными страницами.</span>
            </div>
          </Card>

          <TabsContent value="info" className="mt-0">
            <OwnerSalonInfo salon={salon} />
          </TabsContent>

          <TabsContent value="services" className="mt-0">
            <OwnerSalonServices salonId={salonId} />
          </TabsContent>

          <TabsContent value="staff" className="mt-0">
            <OwnerSalonStaff salonId={salonId} />
          </TabsContent>

          <TabsContent value="hours" className="mt-0">
            <OwnerSalonHours salonId={salonId} />
          </TabsContent>

          <TabsContent value="team" className="mt-0">
            <OwnerSalonTeam salonId={salonId} />
          </TabsContent>

          <TabsContent value="bookings" className="mt-0">
            <OwnerSalonBookings salonId={salonId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
