import { MessengerLink } from "@/components/messenger-link";
import { BackButton } from "@/components/back-button";
import { useEffect, useMemo, useState } from "react";
import i18n from "@/lib/i18n";
import { getCsrfToken } from "@/lib/queryClient";
import { Link, useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OwnerWorkspaceSections } from "@/components/owner/OwnerWorkspaceSections";
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

type OwnerClientSummary = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  lastVisit?: string | null;
  salonId: string;
  salonName: string;
};

type OwnerReviewSummary = {
  id: string;
  rating: number;
  comment?: string | null;
  ownerResponse?: string | null;
  createdAt?: string | null;
  clientName?: string | null;
  masterName?: string | null;
  salonId: string;
  salonName: string;
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

const ownerSectionValues = [
  "overview",
  "salons",
  "add-salon",
  "staff",
  "services",
  "bookings",
  "clients",
  "messages",
  "reviews",
  "analytics",
  "support",
  "notifications",
  "settings",
] as const;

function readOwnerSection() {
  if (typeof window === "undefined") return "overview";
  const requested = new URLSearchParams(window.location.search).get("tab") || "overview";
  return ownerSectionValues.includes(requested as (typeof ownerSectionValues)[number])
    ? requested
    : "overview";
}

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
    headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
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
    headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
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
  // city is a plain string column in the DB (unlike name/description), so send it as-is
  formData.append("city", data.cityRu.trim());
  formData.append("address", data.address.trim());
  formData.append("phone", data.phone.trim());
  formData.append("email", data.email.trim());
  formData.append("status", data.status);
  formData.append("latitude", "41.311081");
  formData.append("longitude", "69.240562");

  const response = await fetch("/api/owner/salons", {
    method: "POST",
    credentials: "include",
    // /api/owner/* is behind verifyCsrf — a plain fetch() never sends this
    // header on its own, so the request was rejected with 403.
    headers: { "X-CSRF-Token": getCsrfToken() },
    body: formData,
  });
  if (response.status === 401) throw new Error("unauthorized");
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<OwnerSalon>;
}

export default function OwnerPage() {
  const { toast } = useToast();
  const { user, isLoading, logout, isLoggingOut } = useAuth({ requireAuth: true });
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const t = i18n.t.bind(i18n);
  const language = i18n.language || "ru";

  const [salons, setSalons] = useState<OwnerSalon[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [salonDraft, setSalonDraft] = useState<SalonDraft>(initialSalonDraft);
  const [supportDraft, setSupportDraft] = useState<SupportDraft>(initialSupportDraft);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingSalon, setCreatingSalon] = useState(false);
  const [sendingSupport, setSendingSupport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [ownerClients, setOwnerClients] = useState<OwnerClientSummary[]>([]);
  const [ownerReviews, setOwnerReviews] = useState<OwnerReviewSummary[]>([]);

  const [activeSection, setActiveSection] = useState(readOwnerSection);

  const ownerName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Владелец салона";

  const openOwnerSection = (section: string) => {
    setActiveSection(section);
    setLocation(section === "overview" ? "/owner" : `/owner?tab=${section}`);
  };

  useEffect(() => {
    setActiveSection(readOwnerSection());
  }, [location, search]);

  const loadOwnerWorkspace = async () => {
    setError(null);
    try {
      const [salonsData, overviewData, alertsData, ticketsData, notificationsData] =
        await Promise.all([
          fetchJson<OwnerSalon[]>("/api/owner/salons"),
          fetchJson<DashboardOverview>("/api/owner/dashboard/overview"),
          fetchJson<DashboardAlert[]>("/api/owner/dashboard/alerts"),
          fetchJson<SupportTicket[]>("/api/owner/support/tickets"),
          fetchJson<NotificationItem[]>("/api/notifications"),
        ]);
      setSalons(salonsData);
      setOverview(overviewData);
      setAlerts(alertsData);
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

  useEffect(() => {
    if (!user || salons.length === 0) {
      setOwnerClients([]);
      setOwnerReviews([]);
      return;
    }

    if (activeSection !== "clients" && activeSection !== "reviews") {
      return;
    }

    let cancelled = false;

    const loadSectionData = async () => {
      setSectionLoading(true);
      try {
        if (activeSection === "clients") {
          const clientGroups = await Promise.all(
            salons.map(async (salon) => {
              const salonName = localize(salon.name, language) || "Салон";
              const clients = await fetchJson<Omit<OwnerClientSummary, "salonId" | "salonName">[]>(
                `/api/owner/salons/${salon.id}/clients`,
              );
              return clients.map((client) => ({
                ...client,
                salonId: salon.id,
                salonName,
              }));
            }),
          );

          if (!cancelled) {
            const deduped = new Map<string, OwnerClientSummary>();
            clientGroups.flat().forEach((client) => {
              const key = client.email || client.phone || `${client.salonId}:${client.id}`;
              const existing = deduped.get(key);
              if (!existing || existing.totalSpent < client.totalSpent) {
                deduped.set(key, client);
              }
            });
            setOwnerClients(
              Array.from(deduped.values()).sort(
                (left, right) => right.totalSpent - left.totalSpent,
              ),
            );
          }
        }

        if (activeSection === "reviews") {
          const reviewGroups = await Promise.all(
            salons.map(async (salon) => {
              const salonName = localize(salon.name, language) || "Салон";
              const reviews = await fetchJson<Omit<OwnerReviewSummary, "salonId" | "salonName">[]>(
                `/api/owner/salons/${salon.id}/reviews`,
              );
              return reviews.map((review) => ({
                ...review,
                salonId: salon.id,
                salonName,
              }));
            }),
          );

          if (!cancelled) {
            setOwnerReviews(
              reviewGroups
                .flat()
                .sort(
                  (left, right) =>
                    new Date(right.createdAt || 0).getTime() -
                    new Date(left.createdAt || 0).getTime(),
                ),
            );
          }
        }
      } catch (sectionErr) {
        if (!cancelled) {
          toast({
            title:
              activeSection === "clients"
                ? "Не удалось загрузить клиентов"
                : "Не удалось загрузить отзывы",
            description:
              sectionErr instanceof Error ? sectionErr.message : "Попробуйте обновить раздел.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setSectionLoading(false);
        }
      }
    };

    void loadSectionData();

    return () => {
      cancelled = true;
    };
  }, [activeSection, language, salons, toast, user]);

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

  const closeSupportTicket = async (ticketId: string) => {
    try {
      await patchJson(`/api/owner/support/tickets/${ticketId}/close`, {});
      toast({
        title: "Обращение закрыто",
        description: "Тикет переведён в закрытый статус.",
      });
      await handleRefresh();
    } catch (ticketErr) {
      toast({
        title: "Не удалось закрыть обращение",
        description: ticketErr instanceof Error ? ticketErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  const analyticsSalons = useMemo(
    () =>
      salons.map((salon) => ({
        id: salon.id,
        name:
          typeof salon.name === "string"
            ? { ru: salon.name, en: salon.name, uz: salon.name }
            : salon.name || { ru: "Салон", en: "Salon", uz: "Salon" },
      })),
    [salons],
  );

  const sectionTabs = [
    { value: "overview", label: "Обзор", icon: Store },
    { value: "salons", label: "Мои салоны", icon: Store },
    { value: "add-salon", label: "Добавить салон", icon: FolderPlus },
    { value: "staff", label: "Персонал", icon: UserCircle2 },
    { value: "services", label: "Услуги", icon: Sparkles },
    { value: "bookings", label: "Записи", icon: CalendarClock },
    { value: "clients", label: "Клиенты", icon: UserCircle2 },
    { value: "messages", label: "Сообщения", icon: MessageSquare },
    { value: "reviews", label: "Отзывы", icon: Star },
    { value: "analytics", label: "Аналитика", icon: Wallet },
    { value: "support", label: "Поддержка", icon: Shield },
    { value: "notifications", label: "Уведомления", icon: Bell },
    { value: "settings", label: "Настройки", icon: Settings },
  ];

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
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="cabinet-topbar flex flex-col gap-4 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <BackButton fallback="/" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">AURELLE</p>
              <h1 className="truncate font-serif text-2xl tracking-[-0.01em] text-foreground sm:text-[1.7rem]">
                Кабинет владельца салона
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <MessengerLink userId={user?.id} />
            <LanguageSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Clock3 className="mr-2 h-4 w-4" />
              )}
              Обновить
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void logout()}
              disabled={isLoggingOut}
            >
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

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="cabinet-sidebar min-w-0 lg:sticky lg:top-28">
            <nav aria-label="Разделы кабинета владельца" className="flex gap-1 overflow-x-auto no-scrollbar lg:block lg:space-y-4 lg:overflow-visible">
              {[
                {
                  label: "Управление",
                  ids: ["overview", "bookings", "salons", "services", "staff", "clients"],
                },
                { label: "Обратная связь", ids: ["messages", "reviews", "notifications"] },
                { label: "Дополнительно", ids: ["analytics", "support"] },
                { label: "Настройки", ids: ["settings"] },
              ].map((group) => (
                <div key={group.label} className="contents lg:block">
                  <p className="hidden px-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 lg:block">
                    {group.label}
                  </p>
                  {group.ids.map((id) => {
                    const item = sectionTabs.find((tab) => tab.value === id)!;
                    const Icon = item.icon;
                    return (
                      <button
                        key={id}
                        onClick={() => openOwnerSection(id)}
                        aria-current={activeSection === id ? "page" : undefined}
                        data-active={activeSection === id}
                        className={
                          "cabinet-nav-item w-auto shrink-0 whitespace-nowrap lg:w-full " + (activeSection === id ? "font-semibold" : "")
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        {item.label}
                        {id === "notifications" && stats.unreadNotifications > 0 && (
                          <Badge className="ml-auto">{stats.unreadNotifications}</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
          <main id="main-content" className="min-w-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  key={activeSection}
                  className="font-serif text-4xl font-light tracking-[-0.01em] animate-fade-up"
                >
                  {sectionTabs.find((tab) => tab.value === activeSection)?.label || "Обзор"}
                </h2>
                {activeSection === "overview" && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Здравствуйте, {ownerName}. Здесь главное о работе ваших салонов.
                  </p>
                )}
              </div>
              {activeSection !== "add-salon" && (
                <Button onClick={() => openOwnerSection("add-salon")} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить салон
                </Button>
              )}
            </div>
            {activeSection === "overview" && (
              <>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {[
                    {
                      label: "Записи сегодня",
                      value: overview?.today.bookings ?? 0,
                      tab: "bookings",
                      Icon: CalendarClock,
                    },
                    {
                      label: "Выручка за неделю",
                      value: formatMoney(overview?.week.revenue) + " UZS",
                      tab: "analytics",
                      Icon: Wallet,
                    },
                    { label: "Мои салоны", value: salons.length, tab: "salons", Icon: Store },
                    { label: "Отзывы", value: stats.totalReviews, tab: "reviews", Icon: Star },
                  ].map(({ label, value, tab, Icon }, i) => (
                    <button
                      key={tab}
                      onClick={() => openOwnerSection(tab)}
                      className="lift group relative overflow-hidden rounded-3xl border border-foreground/[0.07] bg-card/80 p-5 text-left shadow-sm backdrop-blur animate-fade-up"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_100%_0%,hsl(var(--primary)/0.14),transparent_70%)]" />
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                        <Icon className="h-5 w-5" />
                      </span>
                      <p className="mt-4 break-words text-3xl font-semibold tabular-nums leading-none tracking-[-0.03em]">
                        {value}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
                    </button>
                  ))}
                </div>
                <Card className="rounded-2xl p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-semibold">Мои салоны</h3>
                    <Button variant="ghost" size="sm" onClick={() => openOwnerSection("salons")}>
                      Все салоны
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                  {salons.length ? (
                    <div className="divide-y divide-border/70">
                      {salons.slice(0, 4).map((salon) => (
                        <div
                          key={salon.id}
                          className="flex flex-wrap items-center justify-between gap-4 py-4"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{localize(salon.name, language)}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {salon.address || localize(salon.city, language)}
                            </p>
                            <Badge variant="outline" className="mt-2">
                              {ownerStatusLabel(salon.status)}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button asChild size="sm">
                              <Link href={"/owner/salon/" + salon.id + "?tab=bookings"}>
                                Записи
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={"/owner/salon/" + salon.id}>Управление</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <Store className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="font-medium">Добавьте первый салон</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Укажите услуги и команду, чтобы начать принимать записи.
                      </p>
                      <Button className="mt-4" onClick={() => openOwnerSection("add-salon")}>
                        Добавить салон
                      </Button>
                    </div>
                  )}
                </Card>
                <Card className="rounded-2xl p-5">
                  <h3 className="mb-4 font-semibold">Требует внимания</h3>
                  {alerts.length ? (
                    <div className="space-y-3">
                      {alerts.slice(0, 4).map((alert, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-xl bg-muted/40 p-3"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div className="flex-1 text-sm">{alert.message}</div>
                          {alert.salonId && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={"/owner/salon/" + alert.salonId}>Открыть</Link>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      Сейчас нет важных уведомлений.
                    </p>
                  )}
                </Card>
              </>
            )}
            <OwnerWorkspaceSections
              activeSection={activeSection}
              salons={salons}
              language={language}
              wizardOpen={wizardOpen}
              setWizardOpen={setWizardOpen}
              salonDraft={salonDraft}
              setSalonDraft={setSalonDraft}
              supportDraft={supportDraft}
              setSupportDraft={setSupportDraft}
              creatingSalon={creatingSalon}
              sendingSupport={sendingSupport}
              sectionLoading={sectionLoading}
              ownerClients={ownerClients}
              ownerReviews={ownerReviews}
              analyticsSalons={analyticsSalons}
              tickets={tickets}
              notifications={notifications}
              stats={{
                unreadNotifications: stats.unreadNotifications,
                unresolvedTickets: stats.unresolvedTickets,
              }}
              onCreateSalon={handleCreateSalon}
              onSupportTicket={handleSupportTicket}
              onCloseSupportTicket={closeSupportTicket}
              onStatusChange={handleStatusChange}
              onMarkNotificationRead={markNotificationRead}
              onMarkAllNotificationsRead={markAllNotificationsRead}
              onRefresh={handleRefresh}
              openOwnerSection={openOwnerSection}
              localize={localize}
              formatMoney={formatMoney}
              formatDate={formatDate}
              ownerStatusLabel={ownerStatusLabel}
              ownerStatusBadgeClass={ownerStatusBadgeClass}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
