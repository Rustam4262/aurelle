import { useEffect, useMemo, useState } from "react";
import i18n from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  Clock,
  Heart,
  LogOut,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  User,
  Wallet,
  XCircle,
} from "lucide-react";

type LocalizedName = string | { en?: string; ru?: string; uz?: string } | null | undefined;

interface ClientProfile {
  fullName?: string | null;
  phone?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
}

interface ClientBooking {
  id: string;
  status: string;
  salonId: string;
  bookingDate: string;
  startTime: string;
  endTime?: string | null;
  priceSnapshot?: number | null;
  salon?: { name?: LocalizedName; address?: string | null } | null;
  service?: { name?: LocalizedName } | null;
  master?: { name?: string | null } | null;
}

interface ClientFavorite {
  id: string;
  salonId: string;
  salon?: {
    id: string;
    name?: LocalizedName;
    city?: LocalizedName;
    averageRating?: number | string | null;
    photos?: string[] | null;
  } | null;
}

interface ClientReview {
  id: string;
  salonId: string;
  rating: number;
  comment?: string | null;
  ownerResponse?: string | null;
  createdAt: string;
  salon?: { name?: LocalizedName } | null;
  master?: { name?: string | null } | null;
}

interface LoadState {
  profile: ClientProfile | null;
  bookings: ClientBooking[];
  favorites: ClientFavorite[];
  reviews: ClientReview[];
}

const INITIAL_STATE: LoadState = {
  profile: null,
  bookings: [],
  favorites: [],
  reviews: [],
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (response.status === 401) {
    throw new Error("unauthorized");
  }

  if (!response.ok) {
    throw new Error(`request_failed:${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

function getLocalizedName(name: LocalizedName, language: string): string {
  if (!name) return "";
  if (typeof name === "string") return name;
  return name[language as keyof typeof name] || name.ru || name.en || name.uz || "";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

function formatDate(value: string, language: string) {
  const locale = language === "ru" ? "ru-RU" : language === "uz" ? "uz-UZ" : "en-US";
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Ожидает подтверждения";
    case "confirmed":
      return "Подтверждено";
    case "completed":
      return "Завершено";
    case "cancelled":
      return "Отменено";
    default:
      return status;
  }
}

function statusClassName(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300";
    case "completed":
      return "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300";
    case "cancelled":
      return "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300";
    default:
      return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300";
  }
}

export default function ClientPage() {
  const t = i18n.t.bind(i18n);
  const language = i18n.language || "ru";
  const { user, isLoading, logout, isLoggingOut } = useAuth();
  const [data, setData] = useState<LoadState>(INITIAL_STATE);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("bookings");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const completed = data.bookings.filter((booking) => booking.status === "completed");
    const upcoming = data.bookings.filter(
      (booking) =>
        (booking.status === "pending" || booking.status === "confirmed") &&
        new Date(booking.bookingDate).getTime() >= new Date().setHours(0, 0, 0, 0),
    );

    return {
      totalBookings: data.bookings.length,
      completedBookings: completed.length,
      favoritesCount: data.favorites.length,
      totalSpent: completed.reduce((sum, booking) => sum + (booking.priceSnapshot || 0), 0),
      upcomingCount: upcoming.length,
    };
  }, [data.bookings, data.favorites.length]);

  const nextBooking = useMemo(() => {
    return [...data.bookings]
      .filter(
        (booking) =>
          booking.status !== "cancelled" &&
          booking.status !== "completed" &&
          new Date(booking.bookingDate).getTime() >= new Date().setHours(0, 0, 0, 0),
      )
      .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime())[0];
  }, [data.bookings]);

  const recentReviews = useMemo(() => data.reviews.slice(0, 2), [data.reviews]);

  const loadDashboard = async () => {
    setIsRefreshing(true);
    setActionError(null);

    try {
      const [profile, bookings, favorites, reviews] = await Promise.all([
        fetchJson<ClientProfile | null>("/api/client/profile").catch(() => null),
        fetchJson<ClientBooking[]>("/api/client/bookings").catch(() => []),
        fetchJson<ClientFavorite[]>("/api/client/favorites").catch(() => []),
        fetchJson<ClientReview[]>("/api/client/reviews").catch(() => []),
      ]);

      setData({ profile, bookings, favorites, reviews });
    } catch (error) {
      if (error instanceof Error && error.message === "unauthorized") {
        window.location.href = "/auth";
        return;
      }

      setActionError("Не удалось загрузить кабинет клиента. Попробуйте еще раз.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoading || !user) return;
    void loadDashboard();
  }, [isLoading, user]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      window.location.href = "/auth";
    }
  }, [isLoading, user]);

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    setActionError(null);
    setActionMessage(null);

    try {
      await fetchJson(`/api/client/bookings/${bookingId}`, { method: "DELETE" });
      setActionMessage("Бронирование отменено.");
      await loadDashboard();
    } catch (error) {
      if (error instanceof Error && error.message === "unauthorized") {
        window.location.href = "/auth";
        return;
      }
      setActionError("Не удалось отменить бронирование.");
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName =
    data.profile?.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Client";

  const contactSummary = [data.profile?.city, data.profile?.phone].filter(Boolean).join(" • ");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.02),transparent_40%)] bg-background">
      <div className="border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="font-serif text-xl text-foreground truncate">{t("marketplace.client.title")}</h1>
              <p className="text-sm text-muted-foreground truncate">Личный кабинет клиента</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => void loadDashboard()} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
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
        {actionError && <Card className="p-4 border-destructive/30 bg-destructive/5 text-destructive">{actionError}</Card>}
        {actionMessage && <Card className="p-4 border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300">{actionMessage}</Card>}

        <section className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <div className="p-6 sm:p-7 bg-[linear-gradient(135deg,rgba(190,24,93,0.08),rgba(14,165,233,0.08))]">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4 min-w-0">
                  <Avatar className="h-16 w-16 ring-4 ring-background shadow-sm">
                    <AvatarImage src={data.profile?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">{displayName[0] || "C"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Персональный кабинет
                    </div>
                    <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground">{displayName}</h2>
                    <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                      {nextBooking ? "Все важное под рукой: ближайшая запись, избранные салоны и история отзывов." : "Собрали для вас быстрый доступ к записям, любимым салонам и истории посещений."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{user.email || "-"}</span>
                      {contactSummary && <span>{contactSummary}</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:min-w-[240px]">
                  <div className="rounded-2xl bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Впереди</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats.upcomingCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">активных записей</p>
                  </div>
                  <div className="rounded-2xl bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Любимые</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats.favoritesCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">салонов в избранном</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild><Link href="/search"><Search className="h-4 w-4 mr-2" />Найти новый салон</Link></Button>
                <Button variant="outline" onClick={() => setActiveTab("bookings")}><CalendarClock className="h-4 w-4 mr-2" />Управлять записями</Button>
                <Button variant="outline" onClick={() => setActiveTab("favorites")}><Heart className="h-4 w-4 mr-2" />Открыть избранное</Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/70 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Следующая запись</p>
                <p className="text-xs text-muted-foreground">Ближайшее действие для клиента</p>
              </div>
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <Separator className="my-4" />
            {nextBooking ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{getLocalizedName(nextBooking.service?.name, language) || "Услуга"}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{getLocalizedName(nextBooking.salon?.name, language) || "Салон"}</p>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{formatDate(nextBooking.bookingDate, language)}</span></div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{nextBooking.startTime}{nextBooking.endTime ? ` - ${nextBooking.endTime}` : ""}</span></div>
                  {nextBooking.master?.name && <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>{nextBooking.master.name}</span></div>}
                </div>
                <Badge className={`border ${statusClassName(nextBooking.status)}`} variant="outline">{statusLabel(nextBooking.status)}</Badge>
                <Button variant="outline" className="w-full" asChild><Link href={`/salon/${nextBooking.salonId}`}>Открыть салон<ChevronRight className="h-4 w-4 ml-2" /></Link></Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">Пока нет активных записей</p>
                <p className="text-sm text-muted-foreground mt-2">Выберите салон и запишитесь в пару кликов.</p>
                <Button className="mt-4" asChild><Link href="/search">Перейти к поиску</Link></Button>
              </div>
            )}
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5 border-border/70 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Всего записей</p><Calendar className="h-5 w-5 text-primary" /></div><p className="mt-4 text-3xl font-semibold text-foreground">{stats.totalBookings}</p><p className="mt-2 text-sm text-muted-foreground">Вся история бронирований в одном месте</p></Card>
          <Card className="p-5 border-border/70 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Завершено</p><CheckCircle className="h-5 w-5 text-emerald-500" /></div><p className="mt-4 text-3xl font-semibold text-foreground">{stats.completedBookings}</p><p className="mt-2 text-sm text-muted-foreground">Посещения, к которым можно вернуться</p></Card>
          <Card className="p-5 border-border/70 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Потрачено</p><Wallet className="h-5 w-5 text-sky-500" /></div><p className="mt-4 text-2xl font-semibold text-foreground break-words">{formatCurrency(stats.totalSpent)}</p><p className="mt-2 text-sm text-muted-foreground">Сумма по завершённым услугам</p></Card>
          <Card className="p-5 border-border/70 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Отзывы</p><MessageSquare className="h-5 w-5 text-pink-500" /></div><p className="mt-4 text-3xl font-semibold text-foreground">{data.reviews.length}</p><p className="mt-2 text-sm text-muted-foreground">Ваши впечатления и ответы салонов</p></Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5 border-border/70 shadow-sm">
            <div><h3 className="font-semibold text-foreground">Быстрый обзор</h3><p className="text-sm text-muted-foreground">Куда стоит обратить внимание прямо сейчас</p></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => setActiveTab("bookings")} className="rounded-2xl border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/50"><CalendarClock className="h-5 w-5 text-primary" /><p className="mt-4 font-medium text-foreground">Управлять записями</p><p className="mt-1 text-sm text-muted-foreground">Подтвердить планы, открыть салон или отменить визит</p></button>
              <button type="button" onClick={() => setActiveTab("favorites")} className="rounded-2xl border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/50"><Heart className="h-5 w-5 text-pink-500" /><p className="mt-4 font-medium text-foreground">Любимые салоны</p><p className="mt-1 text-sm text-muted-foreground">Быстрый возврат к тем, кому вы доверяете</p></button>
              <button type="button" onClick={() => setActiveTab("reviews")} className="rounded-2xl border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/50"><Star className="h-5 w-5 text-amber-500" /><p className="mt-4 font-medium text-foreground">Ваши отзывы</p><p className="mt-1 text-sm text-muted-foreground">Следить за ответами владельцев и историей оценок</p></button>
            </div>
          </Card>

          <Card className="p-5 border-border/70 shadow-sm">
            <div><h3 className="font-semibold text-foreground">Последние отзывы</h3><p className="text-sm text-muted-foreground">Краткая сводка по вашей обратной связи</p></div>
            <div className="mt-5 space-y-3">
              {recentReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center"><MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="font-medium text-foreground">Отзывов пока нет</p><p className="text-sm text-muted-foreground mt-2">После завершённой услуги здесь появится ваша история оценок.</p></div>
              ) : (
                recentReviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-medium text-foreground">{getLocalizedName(review.salon?.name, language) || "Salon"}</p><p className="text-xs text-muted-foreground mt-1">{formatDate(review.createdAt, language)}</p></div><div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={index < review.rating ? "h-3.5 w-3.5 fill-yellow-400 text-yellow-400" : "h-3.5 w-3.5 text-muted-foreground"} />)}</div></div>
                    {review.comment && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{review.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 rounded-2xl bg-muted/50 p-1">
            <TabsTrigger value="bookings" className="rounded-xl">Бронирования</TabsTrigger>
            <TabsTrigger value="favorites" className="rounded-xl">Избранное</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-xl">Отзывы</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4 mt-6">
            {data.bookings.length === 0 ? (
              <Card className="p-10 text-center border-border/70 shadow-sm"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="font-medium text-foreground">У вас пока нет бронирований</p><p className="text-muted-foreground mt-2 mb-5">Подберите салон, мастера и удобное время для первой записи.</p><Button asChild><Link href="/search">Найти салон</Link></Button></Card>
            ) : (
              data.bookings.map((booking) => {
                const salonName = getLocalizedName(booking.salon?.name, language) || "Salon";
                const serviceName = getLocalizedName(booking.service?.name, language) || "Service";
                const isCancelable = booking.status === "pending" || booking.status === "confirmed";

                return (
                  <Card key={booking.id} className="p-5 border-border/70 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-4 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-xl text-foreground">{serviceName}</h3><Badge variant="outline" className={`border ${statusClassName(booking.status)}`}>{statusLabel(booking.status)}</Badge></div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm text-muted-foreground">
                          <div className="rounded-2xl bg-muted/25 px-4 py-3"><div className="flex items-center gap-2 text-foreground font-medium"><MapPin className="h-4 w-4 text-primary" />{salonName}</div><p className="mt-1 text-xs">Салон</p></div>
                          <div className="rounded-2xl bg-muted/25 px-4 py-3"><div className="flex items-center gap-2 text-foreground font-medium"><Calendar className="h-4 w-4 text-primary" />{formatDate(booking.bookingDate, language)}</div><p className="mt-1 text-xs">Дата</p></div>
                          <div className="rounded-2xl bg-muted/25 px-4 py-3"><div className="flex items-center gap-2 text-foreground font-medium"><Clock className="h-4 w-4 text-primary" />{booking.startTime}{booking.endTime ? ` - ${booking.endTime}` : ""}</div><p className="mt-1 text-xs">Время</p></div>
                          <div className="rounded-2xl bg-muted/25 px-4 py-3"><div className="flex items-center gap-2 text-foreground font-medium"><Wallet className="h-4 w-4 text-primary" />{formatCurrency(booking.priceSnapshot || 0)}</div><p className="mt-1 text-xs">Стоимость</p></div>
                        </div>
                        {booking.master?.name && <div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4" /><span>{booking.master.name}</span></div>}
                      </div>
                      <div className="flex flex-col gap-2 xl:min-w-[210px]">
                        <Button variant="outline" asChild><Link href={`/salon/${booking.salonId}`}>Открыть салон</Link></Button>
                        {isCancelable && <Button variant="destructive" onClick={() => void handleCancelBooking(booking.id)} disabled={cancellingId === booking.id}><XCircle className="h-4 w-4 mr-2" />{cancellingId === booking.id ? t("common.loading") : "Отменить запись"}</Button>}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4 mt-6">
            {data.favorites.length === 0 ? (
              <Card className="p-10 text-center border-border/70 shadow-sm"><Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="font-medium text-foreground">Избранное пока пустое</p><p className="text-muted-foreground mt-2 mb-5">Добавляйте любимые салоны, чтобы быстрее возвращаться к ним.</p><Button asChild><Link href="/search">Перейти к поиску</Link></Button></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.favorites.map((favorite) => {
                  const salon = favorite.salon;
                  const salonName = getLocalizedName(salon?.name, language) || "Salon";
                  const city = getLocalizedName(salon?.city, language);
                  const rating = salon?.averageRating ? Number(salon.averageRating) : null;
                  const photo = salon?.photos?.[0] || undefined;

                  return (
                    <Link key={favorite.id} href={`/salon/${favorite.salonId}`}>
                      <Card className="overflow-hidden border-border/70 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                        <div className="aspect-[16/10] bg-muted/40 overflow-hidden">
                          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center bg-[linear-gradient(135deg,rgba(236,72,153,0.10),rgba(14,165,233,0.12))]"><Heart className="h-8 w-8 text-pink-400" /></div>}
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-foreground truncate">{salonName}</h3>{city && <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{city}</p>}</div><Heart className="h-4.5 w-4.5 fill-pink-500 text-pink-500 shrink-0" /></div>
                          <div className="mt-4 flex items-center justify-between">{rating && rating > 0 ? <div className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span>{rating.toFixed(1)}</span></div> : <span className="text-sm text-muted-foreground">Новый салон для вас</span>}<span className="text-sm font-medium text-foreground flex items-center gap-1">Открыть<ChevronRight className="h-4 w-4" /></span></div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4 mt-6">
            {data.reviews.length === 0 ? (
              <Card className="p-10 text-center border-border/70 shadow-sm"><MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="font-medium text-foreground">У вас пока нет отзывов</p><p className="text-muted-foreground mt-2">После завершённых визитов здесь появится история ваших оценок.</p></Card>
            ) : (
              data.reviews.map((review) => (
                <Card key={review.id} className="p-5 border-border/70 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3 min-w-0 flex-1">
                      <div><h3 className="font-semibold text-foreground text-lg">{getLocalizedName(review.salon?.name, language) || "Salon"}</h3>{review.master?.name && <p className="text-sm text-muted-foreground mt-1">Мастер: {review.master.name}</p>}</div>
                      {review.comment && <p className="text-sm leading-6 text-muted-foreground">{review.comment}</p>}
                      {review.ownerResponse && <div className="rounded-2xl bg-muted/35 p-4 border border-border/60"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground mb-2">Ответ владельца</p><p className="text-sm text-foreground">{review.ownerResponse}</p></div>}
                    </div>
                    <div className="md:text-right shrink-0"><div className="flex items-center gap-1 md:justify-end">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={index < review.rating ? "h-4 w-4 fill-yellow-400 text-yellow-400" : "h-4 w-4 text-muted-foreground"} />)}</div><p className="text-xs text-muted-foreground mt-3">{formatDate(review.createdAt, language)}</p></div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
