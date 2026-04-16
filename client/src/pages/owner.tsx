import { useEffect, useMemo, useState } from "react";
import i18n from "@/lib/i18n";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FolderPlus,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Star,
  Store,
  UserCircle2,
  Wallet,
} from "lucide-react";

type LocalizedRecord = { en?: string; ru?: string; uz?: string };

type OwnerSalon = {
  id: string;
  name: LocalizedRecord | string;
  description?: LocalizedRecord | string | null;
  city?: LocalizedRecord | string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: "draft" | "active" | "paused" | null;
  averageRating?: number | string | null;
  reviewCount?: number | null;
  updatedAt?: string | null;
};

type DashboardOverview = {
  today: { revenue: number; bookings: number; newClients: number; completionRate: number };
  week: { revenue: number; revenueChange: number; bookings: number; bookingsChange: number };
  month: { revenue: number; bookings: number };
};

type DashboardAlert = {
  type: string;
  severity: "info" | "warning" | "error";
  count?: number;
  salonId?: string;
  message: string;
};

type RecentActivityItem = {
  type: string;
  message: string;
  timestamp?: string | null;
};

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type NotificationItem = {
  id: string;
  type: string;
  message?: string | null;
  isRead?: boolean | null;
  createdAt?: string | null;
};

type SalonDraft = {
  nameRu: string;
  nameEn: string;
  nameUz: string;
  cityRu: string;
  cityEn: string;
  cityUz: string;
  address: string;
  phone: string;
  email: string;
  descriptionRu: string;
  descriptionEn: string;
  descriptionUz: string;
  status: "draft" | "active" | "paused";
};

type SupportDraft = {
  subject: string;
  category: string;
  message: string;
};

const initialSalonDraft: SalonDraft = {
  nameRu: "",
  nameEn: "",
  nameUz: "",
  cityRu: "Ташкент",
  cityEn: "Tashkent",
  cityUz: "Toshkent",
  address: "",
  phone: "",
  email: "",
  descriptionRu: "",
  descriptionEn: "",
  descriptionUz: "",
  status: "draft",
};

const initialSupportDraft: SupportDraft = {
  subject: "",
  category: "account",
  message: "",
};

function localize(value: LocalizedRecord | string | null | undefined, language: string) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language as keyof LocalizedRecord] || value.ru || value.en || value.uz || "";
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ownerStatusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Опубликован";
    case "paused":
      return "На паузе";
    default:
      return "Черновик";
  }
}

function ownerStatusBadgeClass(status?: string | null) {
  switch (status) {
    case "active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "paused":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (response.status === 401) throw new Error("unauthorized");
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 401) throw new Error("unauthorized");
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 401) throw new Error("unauthorized");
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

async function createSalonRequest(data: SalonDraft) {
  const formData = new FormData();
  formData.append(
    "name",
    JSON.stringify({
      ru: data.nameRu.trim(),
      en: data.nameEn.trim() || data.nameRu.trim(),
      uz: data.nameUz.trim() || data.nameRu.trim(),
    }),
  );
  formData.append(
    "description",
    JSON.stringify({
      ru: data.descriptionRu.trim(),
      en: data.descriptionEn.trim() || data.descriptionRu.trim(),
      uz: data.descriptionUz.trim() || data.descriptionRu.trim(),
    }),
  );
  formData.append(
    "workingHours",
    JSON.stringify([
      { dayOfWeek: 1, openTime: "09:00", closeTime: "20:00", isOpen: true },
      { dayOfWeek: 2, openTime: "09:00", closeTime: "20:00", isOpen: true },
      { dayOfWeek: 3, openTime: "09:00", closeTime: "20:00", isOpen: true },
      { dayOfWeek: 4, openTime: "09:00", closeTime: "20:00", isOpen: true },
      { dayOfWeek: 5, openTime: "09:00", closeTime: "20:00", isOpen: true },
      { dayOfWeek: 6, openTime: "10:00", closeTime: "19:00", isOpen: true },
      { dayOfWeek: 0, openTime: "10:00", closeTime: "18:00", isOpen: false },
    ]),
  );
  formData.append(
    "city",
    JSON.stringify({
      ru: data.cityRu.trim(),
      en: data.cityEn.trim() || data.cityRu.trim(),
      uz: data.cityUz.trim() || data.cityRu.trim(),
    }),
  );
  formData.append("address", data.address.trim());
  formData.append("phone", data.phone.trim());
  formData.append("email", data.email.trim());
  formData.append("status", data.status);
  formData.append("latitude", "41.311081");
  formData.append("longitude", "69.240562");

  const response = await fetch("/api/owner/salons", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (response.status === 401) throw new Error("unauthorized");
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<OwnerSalon>;
}

export default function OwnerPage() {
  const { toast } = useToast();
  const { user, isLoading, logout, isLoggingOut } = useAuth({ requireAuth: true });
  const t = i18n.t.bind(i18n);
  const language = i18n.language || "ru";

  const [salons, setSalons] = useState<OwnerSalon[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [salonDraft, setSalonDraft] = useState<SalonDraft>(initialSalonDraft);
  const [supportDraft, setSupportDraft] = useState<SupportDraft>(initialSupportDraft);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingSalon, setCreatingSalon] = useState(false);
  const [sendingSupport, setSendingSupport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Владелец салона";

  const loadOwnerWorkspace = async () => {
    setError(null);
    try {
      const [salonsData, overviewData, alertsData, activityData, ticketsData, notificationsData] =
        await Promise.all([
          fetchJson<OwnerSalon[]>("/api/owner/salons"),
          fetchJson<DashboardOverview>("/api/owner/dashboard/overview"),
          fetchJson<DashboardAlert[]>("/api/owner/dashboard/alerts"),
          fetchJson<RecentActivityItem[]>("/api/owner/dashboard/recent-activity"),
          fetchJson<SupportTicket[]>("/api/owner/support/tickets"),
          fetchJson<NotificationItem[]>("/api/notifications"),
        ]);
      setSalons(salonsData);
      setOverview(overviewData);
      setAlerts(alertsData);
      setActivity(activityData);
      setTickets(ticketsData);
      setNotifications(notificationsData);
    } catch (loadErr) {
      if (loadErr instanceof Error && loadErr.message === "unauthorized") {
        window.location.href = "/auth";
        return;
      }
      setError("Не удалось загрузить кабинет владельца. Попробуйте обновить страницу.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoading || !user) return;
    void loadOwnerWorkspace();
  }, [isLoading, user]);

  const stats = useMemo(() => {
    const active = salons.filter((salon) => (salon.status || "draft") === "active").length;
    const paused = salons.filter((salon) => (salon.status || "draft") === "paused").length;
    const drafts = salons.filter((salon) => (salon.status || "draft") === "draft").length;
    const unreadNotifications = notifications.filter((item) => !item.isRead).length;
    const unresolvedTickets = tickets.filter((ticket) => ticket.status !== "closed").length;
    const totalReviews = salons.reduce((sum, salon) => sum + Number(salon.reviewCount || 0), 0);
    const averageRating =
      salons.length > 0
        ? salons.reduce((sum, salon) => sum + Number(salon.averageRating || 0), 0) / salons.length
        : 0;

    return {
      active,
      paused,
      drafts,
      unreadNotifications,
      unresolvedTickets,
      totalReviews,
      averageRating,
    };
  }, [notifications, salons, tickets]);

  const bestSalon = useMemo(() => {
    return [...salons].sort(
      (left, right) => Number(right.averageRating || 0) - Number(left.averageRating || 0),
    )[0];
  }, [salons]);

  const problemSalon = useMemo(() => {
    if (!salons.length) return null;
    const unpublished = salons.find((salon) => (salon.status || "draft") !== "active");
    return unpublished || salons.find((salon) => Number(salon.reviewCount || 0) === 0) || salons[0];
  }, [salons]);

  const attentionItems = useMemo(() => {
    const items: string[] = [];
    if (salons.length === 0) items.push("Добавить первый салон и подготовить его к публикации.");
    if (stats.drafts > 0) items.push(`${stats.drafts} салон(ов) ещё в черновике.`);
    if (stats.paused > 0) items.push(`${stats.paused} салон(ов) сейчас на паузе.`);
    if (alerts.length > 0) items.push(`${alerts.length} сигнал(ов) требуют внимания в owner-центре.`);
    if (stats.unreadNotifications > 0) {
      items.push(`${stats.unreadNotifications} уведомление(й) ещё не просмотрено.`);
    }
    if (stats.unresolvedTickets > 0) {
      items.push(`${stats.unresolvedTickets} обращение(й) в поддержку остаются открытыми.`);
    }
    return items.slice(0, 5);
  }, [alerts.length, salons.length, stats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOwnerWorkspace();
  };

  const handleStatusChange = async (salonId: string, status: "draft" | "active" | "paused") => {
    try {
      await patchJson(`/api/owner/salons/${salonId}/status`, { status });
      toast({
        title: "Статус салона обновлён",
        description:
          status === "active"
            ? "Салон опубликован."
            : status === "paused"
              ? "Салон поставлен на паузу."
              : "Салон переведён в черновик.",
      });
      await handleRefresh();
    } catch (statusErr) {
      toast({
        title: "Не удалось изменить статус",
        description: statusErr instanceof Error ? statusErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSalon = async () => {
    if (!salonDraft.nameRu.trim() || !salonDraft.address.trim() || !salonDraft.phone.trim()) {
      toast({
        title: "Не хватает данных",
        description: "Укажите название, адрес и телефон салона.",
        variant: "destructive",
      });
      return;
    }

    setCreatingSalon(true);
    try {
      const created = await createSalonRequest(salonDraft);
      toast({ title: "Салон создан", description: "Карточка появилась в кабинете владельца." });
      setSalonDraft(initialSalonDraft);
      await handleRefresh();
      window.location.href = `/owner/salon/${created.id}`;
    } catch (createErr) {
      toast({
        title: "Не удалось создать салон",
        description: createErr instanceof Error ? createErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setCreatingSalon(false);
    }
  };

  const handleSupportTicket = async () => {
    if (!supportDraft.subject.trim() || !supportDraft.message.trim()) {
      toast({
        title: "Заполните обращение",
        description: "Нужны тема и текст сообщения.",
        variant: "destructive",
      });
      return;
    }

    setSendingSupport(true);
    try {
      await postJson("/api/owner/support/tickets", supportDraft);
      toast({ title: "Обращение отправлено", description: "Платформа получила ваш запрос." });
      setSupportDraft(initialSupportDraft);
      await handleRefresh();
    } catch (supportErr) {
      toast({
        title: "Не удалось отправить обращение",
        description: supportErr instanceof Error ? supportErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setSendingSupport(false);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await patchJson(`/api/notifications/${notificationId}/read`, {});
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
      );
    } catch {
      toast({
        title: "Не удалось отметить уведомление",
        description: "Обновите список и попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await patchJson("/api/notifications/read-all", {});
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch {
      toast({
        title: "Не удалось обновить уведомления",
        description: "Попробуйте ещё раз через пару секунд.",
        variant: "destructive",
      });
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,24,93,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.05),transparent_36%)] bg-background">
      <div className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Owner workspace</p>
              <h1 className="truncate font-serif text-2xl text-foreground">Кабинет владельца салона</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-4 w-4" />}
              Обновить
            </Button>
            <Button variant="outline" size="sm" onClick={() => void logout()} disabled={isLoggingOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? t("common.loading") : "Выйти"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {error && (
          <Card className="border-destructive/30 bg-destructive/5 p-4 text-destructive">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => void handleRefresh()}>
                Повторить загрузку
              </Button>
            </div>
          </Card>
        )}

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <div className="bg-[linear-gradient(135deg,rgba(190,24,93,0.10),rgba(14,165,233,0.08))] p-6 sm:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Контроль сети салонов в одном окне
                  </div>
                  <h2 className="mt-4 break-words font-serif text-3xl text-foreground">{ownerName}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Здесь собраны салонные KPI, проблемные точки, быстрые переходы в управление объектами и канал связи с платформой. Это уже не “витрина намерений”, а реальный control center владельца.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex max-w-full items-center gap-2 break-all rounded-full border border-border/60 bg-background/70 px-3 py-1">
                      <UserCircle2 className="h-4 w-4" />
                      {user.email || "email не указан"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1">
                      <Shield className="h-4 w-4" />
                      Безопасный owner-доступ активен
                    </span>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/search">Открыть клиентскую витрину</Link>
                    </Button>
                    <Button variant="outline" onClick={() => window.location.assign("/owner")}>
                      Перезагрузить owner-flow
                    </Button>
                  </div>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:w-[320px]">
                  <div className="rounded-2xl bg-background/85 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Салонов</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{salons.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">объектов в кабинете</p>
                  </div>
                  <div className="rounded-2xl bg-background/85 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Непрочитанные</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{stats.unreadNotifications}</p>
                    <p className="mt-1 text-sm text-muted-foreground">уведомления и сигналы</p>
                  </div>
                  <div className="rounded-2xl bg-background/85 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Открытые обращения</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{stats.unresolvedTickets}</p>
                    <p className="mt-1 text-sm text-muted-foreground">в support-канале</p>
                  </div>
                  <div className="rounded-2xl bg-background/85 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Средний рейтинг</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">по сети владельца</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-border/70 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Фокус дня</p>
                <p className="text-xs text-muted-foreground">Что лучше открыть первым</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Лучший салон</p>
                <p className="mt-2 break-words text-lg font-semibold text-foreground">
                  {bestSalon ? localize(bestSalon.name, language) : "Пока нет данных"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {bestSalon
                    ? `Рейтинг ${Number(bestSalon.averageRating || 0).toFixed(1)} • отзывов ${Number(bestSalon.reviewCount || 0)}`
                    : "После первых салонов и отзывов здесь появится лучший объект сети."}
                </p>
                {bestSalon && (
                  <Button className="mt-4 w-full" variant="outline" asChild>
                    <Link href={`/owner/salon/${bestSalon.id}`}>
                      Открыть управление
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Проблемная зона</p>
                <p className="mt-2 break-words text-lg font-semibold text-foreground">
                  {problemSalon ? localize(problemSalon.name, language) : "Пока нет проблемных объектов"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {problemSalon
                    ? `Статус: ${ownerStatusLabel(problemSalon.status)}. Проверьте публикацию, услуги и контент карточки.`
                    : "Когда появится салон с недоработками, он будет поднят сюда автоматически."}
                </p>
                {problemSalon && (
                  <Button className="mt-4 w-full" asChild>
                    <Link href={`/owner/salon/${problemSalon.id}`}>Исправить сейчас</Link>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Салоны</p>
              <Store className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{salons.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">активные, черновики и паузы в одном месте</p>
          </Card>
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Брони сегодня</p>
              <CalendarClock className="h-5 w-5 text-sky-500" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{overview?.today.bookings ?? 0}</p>
            <p className="mt-2 text-sm text-muted-foreground">новые визиты и подтверждения на сегодня</p>
          </Card>
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Выручка недели</p>
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{formatMoney(overview?.week.revenue)}</p>
            <p className="mt-2 text-sm text-muted-foreground">UZS • динамика {Math.round(overview?.week.revenueChange || 0)}%</p>
          </Card>
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Отзывы</p>
              <Star className="h-5 w-5 text-pink-500" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{stats.totalReviews}</p>
            <p className="mt-2 text-sm text-muted-foreground">накопленный social proof по сети</p>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Нужно сделать сейчас</h3>
                <p className="text-sm text-muted-foreground">Приоритетные owner-задачи без лишнего шума</p>
              </div>
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                {attentionItems.length} в фокусе
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              {attentionItems.length > 0 ? (
                attentionItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm leading-6 text-foreground">{item}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                  Критичных задач сейчас нет. Можно спокойно дорабатывать витрину, услуги и команду.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Быстрые действия</h3>
                <p className="text-sm text-muted-foreground">Владелец должен действовать, а не искать кнопку</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button asChild className="justify-start">
                <Link href="/owner">
                  <Store className="mr-2 h-4 w-4" />
                  Мои салоны
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => document.getElementById("owner-create-salon")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Добавить салон
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => document.getElementById("owner-support")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Написать платформе
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => document.getElementById("owner-notifications")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <Bell className="mr-2 h-4 w-4" />
                Уведомления
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/search">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Проверить витрину
                </Link>
              </Button>
              <Button variant="outline" className="justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Настройки owner-доступа
              </Button>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Alerts и активность</h3>
                <p className="text-sm text-muted-foreground">Сигналы по сети и последние изменения</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Что требует внимания</p>
                {alerts.length > 0 ? (
                  alerts.slice(0, 6).map((alert, index) => (
                    <div key={`${alert.type}-${index}`} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={
                            alert.severity === "error"
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : alert.severity === "warning"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          }
                        >
                          {alert.severity === "error" ? "Критично" : alert.severity === "warning" ? "Внимание" : "Инфо"}
                        </Badge>
                        {alert.salonId && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/owner/salon/${alert.salonId}`}>Открыть</Link>
                          </Button>
                        )}
                      </div>
                      <p className="mt-3 break-words text-sm leading-6 text-foreground">{alert.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                    Явных owner-alerts сейчас нет.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Последняя активность</p>
                {activity.length > 0 ? (
                  activity.slice(0, 6).map((item, index) => (
                    <div key={`${item.type}-${index}`} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-sm font-medium text-foreground">{item.message}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.type}</p>
                      <p className="mt-3 text-sm text-muted-foreground">{formatDate(item.timestamp)}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                    Активность появится после новых записей, подтверждений и событий в owner-сети.
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card id="owner-create-salon" className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Добавить салон</h3>
                <p className="text-sm text-muted-foreground">Минимальный wizard для быстрого старта</p>
              </div>
              <Plus className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              <Input
                placeholder="Название салона (RU)"
                value={salonDraft.nameRu}
                onChange={(event) => setSalonDraft((current) => ({ ...current, nameRu: event.target.value }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Название (EN)"
                  value={salonDraft.nameEn}
                  onChange={(event) => setSalonDraft((current) => ({ ...current, nameEn: event.target.value }))}
                />
                <Input
                  placeholder="Название (UZ)"
                  value={salonDraft.nameUz}
                  onChange={(event) => setSalonDraft((current) => ({ ...current, nameUz: event.target.value }))}
                />
              </div>
              <Input
                placeholder="Адрес салона"
                value={salonDraft.address}
                onChange={(event) => setSalonDraft((current) => ({ ...current, address: event.target.value }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Телефон"
                  value={salonDraft.phone}
                  onChange={(event) => setSalonDraft((current) => ({ ...current, phone: event.target.value }))}
                />
                <Input
                  placeholder="Email салона"
                  value={salonDraft.email}
                  onChange={(event) => setSalonDraft((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <Textarea
                placeholder="Краткое описание салона (RU)"
                rows={4}
                value={salonDraft.descriptionRu}
                onChange={(event) => setSalonDraft((current) => ({ ...current, descriptionRu: event.target.value }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-muted-foreground">
                  <span>Статус на старте</span>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={salonDraft.status}
                    onChange={(event) =>
                      setSalonDraft((current) => ({ ...current, status: event.target.value as SalonDraft["status"] }))
                    }
                  >
                    <option value="draft">Черновик</option>
                    <option value="paused">На паузе</option>
                    <option value="active">Сразу публиковать</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-muted-foreground">
                  <span>Город</span>
                  <Input
                    placeholder="Ташкент"
                    value={salonDraft.cityRu}
                    onChange={(event) =>
                      setSalonDraft((current) => ({
                        ...current,
                        cityRu: event.target.value,
                        cityEn: current.cityEn || event.target.value,
                        cityUz: current.cityUz || event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <Button className="w-full" onClick={() => void handleCreateSalon()} disabled={creatingSalon}>
                {creatingSalon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                Создать салон
              </Button>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card id="owner-support" className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Поддержка платформы</h3>
                <p className="text-sm text-muted-foreground">Owner ↔ AURELLE без внешних мессенджеров</p>
              </div>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-5 space-y-3">
              <Input
                placeholder="Тема обращения"
                value={supportDraft.subject}
                onChange={(event) => setSupportDraft((current) => ({ ...current, subject: event.target.value }))}
              />
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>Категория</span>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={supportDraft.category}
                  onChange={(event) => setSupportDraft((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="account">Аккаунт и доступ</option>
                  <option value="moderation">Модерация</option>
                  <option value="booking">Записи и клиенты</option>
                  <option value="payment">Платежи и финансы</option>
                  <option value="bug">Техническая проблема</option>
                  <option value="suggestion">Предложение по улучшению</option>
                </select>
              </label>
              <Textarea
                placeholder="Опишите проблему, вопрос или запрос"
                rows={5}
                value={supportDraft.message}
                onChange={(event) => setSupportDraft((current) => ({ ...current, message: event.target.value }))}
              />
              <Button className="w-full" onClick={() => void handleSupportTicket()} disabled={sendingSupport}>
                {sendingSupport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Отправить обращение
              </Button>
            </div>
          </Card>

          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">История обращений</h3>
                <p className="text-sm text-muted-foreground">Что уже открыто, решено или ждёт ответа</p>
              </div>
              <Badge variant="outline" className="border-border/70">{tickets.length} всего</Badge>
            </div>

            <div className="mt-5 space-y-3">
              {tickets.length > 0 ? (
                tickets.slice(0, 8).map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-foreground">{ticket.subject}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{ticket.category}</p>
                      </div>
                      <Badge variant="outline" className="border-border/70">{ticket.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>Создано: {formatDate(ticket.createdAt)}</span>
                      <span>Обновлено: {formatDate(ticket.updatedAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                  Пока нет обращений. Когда owner напишет платформе, история появится здесь.
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
