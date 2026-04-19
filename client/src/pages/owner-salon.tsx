import { useEffect, useMemo, useState } from "react";
import i18n from "@/lib/i18n";
import { Link, useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Star,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { OwnerSalonInfo } from "@/components/owner/OwnerSalonInfo";
import { OwnerSalonServices } from "@/components/owner/OwnerSalonServices";
import { OwnerSalonStaff } from "@/components/owner/OwnerSalonStaff";
import { OwnerSalonHours } from "@/components/owner/OwnerSalonHours";
import { OwnerSalonBookings } from "@/components/owner/OwnerSalonBookings";
import { OwnerSalonTeam } from "@/components/owner/OwnerSalonTeam";
import { RevenueAnalytics } from "@/components/revenue-analytics";

type LocalizedRecord = { en?: string; ru?: string; uz?: string };

type Salon = {
  id: string;
  name: LocalizedRecord | string;
  description?: LocalizedRecord | string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  photos?: string[] | null;
  status?: "draft" | "active" | "paused" | null;
  averageRating?: number | string | null;
  reviewCount?: number | null;
};

type ReviewItem = {
  id: string;
  rating: number;
  comment?: string | null;
  ownerResponse?: string | null;
  createdAt?: string | null;
  clientName?: string | null;
  masterName?: string | null;
};

type ClientItem = {
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
};

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type SupportMessage = {
  id: string;
  senderType: "user" | "admin";
  message: string;
  createdAt?: string | null;
};

type NotificationItem = {
  id: string;
  type: string;
  message?: string | null;
  isRead?: boolean | null;
  createdAt?: string | null;
};

function localize(value: LocalizedRecord | string | null | undefined, language: string) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language as keyof LocalizedRecord] || value.ru || value.en || value.uz || "";
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

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value || 0));
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
  if (response.status === 404) throw new Error("not_found");
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

export default function OwnerSalonPage() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth({ requireAuth: true });
  const [location, setLocation] = useLocation();
  const language = i18n.language || "ru";
  const params = useParams<{ id: string }>();
  const salonId = params.id;

  const [activeTab, setActiveTab] = useState("overview");
  const [salon, setSalon] = useState<Salon | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [supportDraft, setSupportDraft] = useState({
    subject: "",
    category: "general",
    message: "",
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicketMessages, setSelectedTicketMessages] = useState<SupportMessage[]>([]);
  const [supportReply, setSupportReply] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [supportCreating, setSupportCreating] = useState(false);
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState<"all" | "unanswered" | "low" | "recent">("all");

  useEffect(() => {
    const requested = new URLSearchParams(location.split("?")[1] || "").get("tab") || "overview";
    const normalized = requested === "staff" ? "masters" : requested;
    if (normalized !== activeTab) {
      setActiveTab(normalized);
    }
  }, [activeTab, location]);

  const loadWorkspace = async () => {
    if (!salonId) return;
    setError(null);
    try {
      const [salonData, reviewsData, clientsData, ticketsData, notificationsData] = await Promise.all([
        fetchJson<Salon>(`/api/owner/salons/${salonId}`),
        fetchJson<ReviewItem[]>(`/api/owner/salons/${salonId}/reviews`),
        fetchJson<ClientItem[]>(`/api/owner/salons/${salonId}/clients`),
        fetchJson<SupportTicket[]>("/api/owner/support/tickets"),
        fetchJson<NotificationItem[]>("/api/notifications"),
      ]);
      setSalon(salonData);
      setReviews(reviewsData);
      setClients(clientsData);
      setTickets(ticketsData);
      setNotifications(notificationsData);
    } catch (loadErr) {
      if (loadErr instanceof Error && loadErr.message === "unauthorized") {
        window.location.href = "/auth";
        return;
      }
      if (loadErr instanceof Error && loadErr.message === "not_found") {
        setSalon(null);
      } else {
        setError("Не удалось открыть кабинет салона. Попробуйте обновить страницу.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoading || !user || !salonId) return;
    void loadWorkspace();
  }, [isLoading, user, salonId]);

  useEffect(() => {
    if (!selectedTicketId && tickets.length > 0) {
      void loadSupportTicket(tickets[0].id);
    }
  }, [selectedTicketId, tickets]);

  const salonName = localize(salon?.name, language) || "Салон";
  const salonDescription = localize(salon?.description, language);
  const rating = Number(salon?.averageRating || 0);
  const photosCount = Array.isArray(salon?.photos) ? salon!.photos!.length : 0;
  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const openTickets = tickets.filter((ticket) => ticket.status !== "closed").length;

  const topClient = useMemo(() => {
    return [...clients].sort((left, right) => right.totalSpent - left.totalSpent)[0];
  }, [clients]);

  const reviewWithoutResponse = useMemo(() => {
    return reviews.find((review) => !review.ownerResponse);
  }, [reviews]);

  const reviewSummary = useMemo(() => {
    const total = reviews.length;
    const unanswered = reviews.filter((review) => !review.ownerResponse).length;
    const average = total
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total
      : 0;
    const fiveStars = reviews.filter((review) => Number(review.rating || 0) >= 5).length;
    return { total, unanswered, average, fiveStars };
  }, [reviews]);

  const filteredClients = useMemo(() => {
    const query = clientQuery.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) =>
      [client.name, client.email, client.phone, client.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [clientQuery, clients]);

  const filteredReviews = useMemo(() => {
    switch (reviewFilter) {
      case "unanswered":
        return reviews.filter((review) => !review.ownerResponse);
      case "low":
        return reviews.filter((review) => Number(review.rating || 0) <= 3);
      case "recent":
        return [...reviews].sort((left, right) => {
          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightTime - leftTime;
        });
      default:
        return reviews;
    }
  }, [reviewFilter, reviews]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId, tickets],
  );

  const profileCompletion = useMemo(() => {
    const checkpoints = [
      Boolean(salonName && salonName !== "РЎР°Р»РѕРЅ"),
      Boolean(salonDescription),
      Boolean(salon?.address),
      Boolean(salon?.phone || salon?.email),
      photosCount > 0,
      Number(salon?.reviewCount || 0) > 0,
      salon?.status === "active",
    ];

    return Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100);
  }, [photosCount, salon?.address, salon?.email, salon?.phone, salon?.reviewCount, salon?.status, salonDescription, salonName]);

  const attentionItems = useMemo(
    () => [
      {
        id: "publication",
        title: salon?.status !== "active" ? "Салон ещё не опубликован" : "Публикация активна",
        description:
          salon?.status !== "active"
            ? "Пока карточка неактивна, салон теряет органический трафик и новые бронирования с витрины."
            : "Карточка доступна клиентам и участвует в выдаче платформы.",
        tone: salon?.status !== "active" ? "warning" : "good",
        action: salon?.status !== "active" ? "Перейти к публикации" : "Открыть витрину",
        tab: "public",
      },
      {
        id: "gallery",
        title: photosCount === 0 ? "Нужно добавить фото" : `Фото загружены: ${photosCount}`,
        description:
          photosCount === 0
            ? "Фотографии интерьера и услуг поднимают доверие и конверсию в запись."
            : "Проверьте, что галерея действительно продаёт салон, а не просто заполняет блок.",
        tone: photosCount === 0 ? "warning" : "neutral",
        action: "Открыть профиль",
        tab: "profile",
      },
      {
        id: "reviews",
        title: reviewSummary.unanswered > 0 ? `Отзывы без ответа: ${reviewSummary.unanswered}` : "Отзывы под контролем",
        description:
          reviewSummary.unanswered > 0
            ? "Есть отзывы, на которые салон ещё не ответил. Это влияет на доверие и повторные визиты."
            : "Все текущие отзывы уже закрыты ответом owner или новых отзывов пока нет.",
        tone: reviewSummary.unanswered > 0 ? "warning" : "good",
        action: "Перейти к отзывам",
        tab: "reviews",
      },
      {
        id: "support",
        title: openTickets > 0 ? `Открытых обращений: ${openTickets}` : "Поддержка без зависаний",
        description:
          openTickets > 0
            ? "По салону есть открытые диалоги с платформой. Их лучше не оставлять без движения."
            : "Сейчас нет зависших вопросов к платформе и в поддержку.",
        tone: openTickets > 0 ? "warning" : "neutral",
        action: "Открыть сообщения и платформу",
        tab: "support",
      },
    ],
    [openTickets, photosCount, reviewSummary.unanswered, salon?.status],
  );

  const quickActions = useMemo(
    () => [
      {
        title: "Профиль салона",
        description: "Контакты, адрес, фото и упаковка карточки.",
        tab: "profile",
      },
      {
        title: "Услуги и цены",
        description: "Проверьте каталог услуг и их порядок на витрине.",
        tab: "services",
      },
      {
        title: "Мастера и команда",
        description: "Назначение сотрудников, ролей и рабочих зон.",
        tab: "masters",
      },
      {
        title: "Записи и CRM",
        description: "Бронирования, клиенты и операционный поток салона.",
        tab: "bookings",
      },
    ],
    [],
  );

  const recentClients = useMemo(() => {
    return [...clients]
      .sort((left, right) => {
        const leftTime = left.lastVisit ? new Date(left.lastVisit).getTime() : 0;
        const rightTime = right.lastVisit ? new Date(right.lastVisit).getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, 4);
  }, [clients]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWorkspace();
  };

  const handleStatusChange = async (status: "draft" | "active" | "paused") => {
    if (!salonId) return;
    try {
      await patchJson(`/api/owner/salons/${salonId}/status`, { status });
      toast({ title: "Статус обновлён", description: `Салон переведён в режим: ${ownerStatusLabel(status)}.` });
      await handleRefresh();
    } catch (statusErr) {
      toast({
        title: "Не удалось обновить статус",
        description: statusErr instanceof Error ? statusErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  const handleRespondToReview = async (reviewId: string) => {
    const responseText = (responseDrafts[reviewId] || "").trim();
    if (!responseText) {
      toast({
        title: "Напишите ответ",
        description: "Пустой ответ отправить нельзя.",
        variant: "destructive",
      });
      return;
    }

    try {
      await patchJson(`/api/owner/reviews/${reviewId}/respond`, { ownerResponse: responseText });
      toast({ title: "Ответ сохранён", description: "Ответ на отзыв теперь виден в системе." });
      setResponseDrafts((current) => ({ ...current, [reviewId]: "" }));
      await handleRefresh();
    } catch (reviewErr) {
      toast({
        title: "Не удалось отправить ответ",
        description: reviewErr instanceof Error ? reviewErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  const loadSupportTicket = async (ticketId: string) => {
    setSupportLoading(true);
    setSelectedTicketId(ticketId);
    try {
      const detail = await fetchJson<{ ticket: SupportTicket; messages: SupportMessage[] }>(
        `/api/owner/support/tickets/${ticketId}`,
      );
      setSelectedTicketMessages(detail.messages || []);
    } catch (ticketErr) {
      toast({
        title: "Не удалось открыть обращение",
        description: ticketErr instanceof Error ? ticketErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setSupportLoading(false);
    }
  };

  const handleCreateSupportTicket = async () => {
    if (supportDraft.subject.trim().length < 3 || supportDraft.message.trim().length < 5) {
      toast({
        title: "Заполните обращение",
        description: "Нужны тема и понятное описание проблемы.",
        variant: "destructive",
      });
      return;
    }

    setSupportCreating(true);
    try {
      const response = await fetch("/api/owner/support/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `${supportDraft.subject.trim()} · ${salonName}`,
          category: supportDraft.category.trim(),
          message: supportDraft.message.trim(),
        }),
      });

      if (response.status === 401) throw new Error("unauthorized");
      if (!response.ok) throw new Error(await response.text());

      const ticket = (await response.json()) as SupportTicket;
      toast({ title: "Обращение создано", description: "Диалог с платформой уже открыт." });
      setSupportDraft({ subject: "", category: "general", message: "" });
      await handleRefresh();
      await loadSupportTicket(ticket.id);
    } catch (ticketErr) {
      toast({
        title: "Не удалось создать обращение",
        description: ticketErr instanceof Error ? ticketErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setSupportCreating(false);
    }
  };

  const handleSendSupportReply = async () => {
    if (!selectedTicketId) return;
    if (!supportReply.trim()) {
      toast({
        title: "Напишите сообщение",
        description: "Пустой ответ отправить нельзя.",
        variant: "destructive",
      });
      return;
    }

    setSupportSending(true);
    try {
      const response = await fetch(`/api/owner/support/tickets/${selectedTicketId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: supportReply.trim() }),
      });
      if (response.status === 401) throw new Error("unauthorized");
      if (!response.ok) throw new Error(await response.text());
      setSupportReply("");
      await handleRefresh();
      await loadSupportTicket(selectedTicketId);
      toast({ title: "Ответ отправлен", description: "Сообщение добавлено в историю обращения." });
    } catch (replyErr) {
      toast({
        title: "Не удалось отправить сообщение",
        description: replyErr instanceof Error ? replyErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setSupportSending(false);
    }
  };

  const handleCloseSupportTicket = async (ticketId: string) => {
    setClosingTicketId(ticketId);
    try {
      await patchJson(`/api/owner/support/tickets/${ticketId}/close`, {});
      toast({ title: "Обращение закрыто", description: "При необходимости его можно открыть новым сообщением." });
      await handleRefresh();
      if (selectedTicketId === ticketId) {
        await loadSupportTicket(ticketId);
      }
    } catch (closeErr) {
      toast({
        title: "Не удалось закрыть обращение",
        description: closeErr instanceof Error ? closeErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setClosingTicketId(null);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await patchJson(`/api/notifications/${notificationId}/read`, {});
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
      );
    } catch (notificationErr) {
      toast({
        title: "Не удалось обновить уведомление",
        description:
          notificationErr instanceof Error ? notificationErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await patchJson("/api/notifications/read-all", {});
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (notificationErr) {
      toast({
        title: "Не удалось отметить уведомления",
        description:
          notificationErr instanceof Error ? notificationErr.message : "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Загрузка салона
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!salon) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Card className="border-border/70 p-8 text-center shadow-sm">
            <Store className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 font-serif text-3xl text-foreground">Салон не найден</h1>
            <p className="mt-3 text-muted-foreground">Проверьте доступ или вернитесь к общему owner-списку.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/owner">К списку салонов</Link>
              </Button>
              <Button variant="outline" onClick={() => void handleRefresh()}>
                Повторить
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,24,93,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.05),transparent_36%)] bg-background">
      <div className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/owner">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Salon workspace</p>
              <h1 className="truncate font-serif text-2xl text-foreground">{salonName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Обновить
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
                    Управление конкретным салоном без битых переходов
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <h2 className="break-words font-serif text-3xl text-foreground">{salonName}</h2>
                    <Badge variant="outline" className={ownerStatusBadgeClass(salon.status)}>
                      {ownerStatusLabel(salon.status)}
                    </Badge>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {salonDescription || "Здесь владелец управляет профилем салона, услугами, мастерами, отзывами, клиентами и операционной частью без переходов в разваленные страницы."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {salon.city && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1">
                        <MapPin className="h-4 w-4" />
                        {salon.city}
                      </span>
                    )}
                    {salon.phone && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1">
                        <Phone className="h-4 w-4" />
                        {salon.phone}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1">
                      <Shield className="h-4 w-4" />
                      Owner-доступ активен
                    </span>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href={`/salon/${salonId}`}>Открыть публичную страницу</Link>
                    </Button>
                    <Button variant="outline" onClick={() => void handleStatusChange("active")}>
                      Опубликовать
                    </Button>
                    <Button variant="outline" onClick={() => void handleStatusChange("paused")}>
                      Пауза
                    </Button>
                  </div>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:w-[320px]">
                  <div className="rounded-2xl bg-background/85 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Рейтинг</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{rating > 0 ? rating.toFixed(1) : "—"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">по отзывам клиентов</p>
                  </div>
                  <div className="rounded-2xl bg-background/85 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Отзывы</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{Number(salon.reviewCount || 0)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">получено по салону</p>
                  </div>
                  <div className="rounded-2xl bg-background/85 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Клиенты</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{clients.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">в CRM салона</p>
                  </div>
                  <div className="rounded-2xl bg-background/85 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Фото</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{photosCount}</p>
                    <p className="mt-1 text-sm text-muted-foreground">в карточке салона</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-border/70 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Операционный фокус</p>
                <p className="text-xs text-muted-foreground">Что важно именно по этому салону</p>
              </div>
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Клиент с самым большим чеком</p>
                <p className="mt-2 break-words text-lg font-semibold text-foreground">{topClient ? topClient.name : "Пока нет данных"}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {topClient ? `Потратил ${formatMoney(topClient.totalSpent)} UZS и сделал ${topClient.totalBookings} визитов.` : "Когда появится клиентская история, фокус появится здесь."}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Отзывы без ответа</p>
                <p className="mt-2 break-words text-lg font-semibold text-foreground">{reviewSummary.unanswered}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {reviewWithoutResponse ? `Свежий отзыв от ${reviewWithoutResponse.clientName || "клиента"} ждёт owner-ответа.` : "Все отзывы сейчас закрыты owner-ответом или ещё не поступили."}
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Клиенты</p><Users className="h-5 w-5 text-primary" /></div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{clients.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">в базе салона</p>
          </Card>
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Открытые обращения</p><MessageSquare className="h-5 w-5 text-sky-500" /></div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{openTickets}</p>
            <p className="mt-2 text-sm text-muted-foreground">нужны ответы платформы</p>
          </Card>
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Непрочитанные</p><Clock3 className="h-5 w-5 text-amber-500" /></div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{unreadNotifications}</p>
            <p className="mt-2 text-sm text-muted-foreground">уведомления по owner-потоку</p>
          </Card>
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Отзывы</p><Star className="h-5 w-5 text-pink-500" /></div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{reviewSummary.total}</p>
            <p className="mt-2 text-sm text-muted-foreground">по салону прямо сейчас</p>
          </Card>
        </section>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setLocation(value === "overview" ? `/owner/salon/${salonId}` : `/owner/salon/${salonId}?tab=${value}`);
          }}
          className="space-y-6"
        >
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex min-w-max gap-2">
              <TabsTrigger value="overview">Обзор салона</TabsTrigger>
              <TabsTrigger value="profile">Профиль</TabsTrigger>
              <TabsTrigger value="public">Публичная страница</TabsTrigger>
              <TabsTrigger value="services">Услуги</TabsTrigger>
              <TabsTrigger value="masters">Мастера</TabsTrigger>
              <TabsTrigger value="schedule">Расписание</TabsTrigger>
              <TabsTrigger value="bookings">Записи</TabsTrigger>
              <TabsTrigger value="clients">Клиенты</TabsTrigger>
              <TabsTrigger value="reviews">Отзывы</TabsTrigger>
              <TabsTrigger value="analytics">Аналитика</TabsTrigger>
              <TabsTrigger value="finance">Финансы</TabsTrigger>
              <TabsTrigger value="access">Доступы</TabsTrigger>
              <TabsTrigger value="support">Сообщения и платформа</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="overview" className="mt-0 space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="border-border/70 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Что требует внимания</h3>
                    <p className="text-sm text-muted-foreground">
                      Приоритетные задачи, которые прямо сейчас влияют на видимость салона, доверие и новые записи.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border/70">
                    {attentionItems.filter((item) => item.tone === "warning").length} в фокусе
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3">
                  {attentionItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.tab);
                        setLocation(item.tab === "overview" ? `/owner/salon/${salonId}` : `/owner/salon/${salonId}?tab=${item.tab}`);
                      }}
                      className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{item.title}</p>
                            <Badge
                              variant="outline"
                              className={
                                item.tone === "good"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : item.tone === "warning"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                    : "border-border/70 text-muted-foreground"
                              }
                            >
                              {item.tone === "good" ? "OK" : item.tone === "warning" ? "Внимание" : "Контроль"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                        </div>
                        <ArrowLeft className="mt-1 h-4 w-4 shrink-0 rotate-180 text-muted-foreground" />
                      </div>
                      <div className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-primary">{item.action}</div>
                    </button>
                  ))}
                </div>
              </Card>

              <div className="grid gap-4">
                <Card className="border-border/70 p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground">Быстрые действия</h3>
                  <div className="mt-4 grid gap-3">
                    {quickActions.map((action) => (
                      <button
                        key={action.tab}
                        type="button"
                        onClick={() => {
                          setActiveTab(action.tab);
                          setLocation(`/owner/salon/${salonId}?tab=${action.tab}`);
                        }}
                        className="rounded-2xl border border-border/70 bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{action.title}</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
                          </div>
                          <ArrowLeft className="mt-1 h-4 w-4 shrink-0 rotate-180 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="border-border/70 p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground">Готовность салона</h3>
                  <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Профиль и витрина</p>
                        <p className="mt-2 text-3xl font-semibold text-foreground">{profileCompletion}%</p>
                      </div>
                      <Badge variant="outline" className="border-border/70">
                        {salon.status === "active" ? "Публикация включена" : "Пока не опубликован"}
                      </Badge>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-border/60">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${profileCompletion}%` }} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Чем ближе карточка к 100%, тем проще салону конвертировать просмотр в запись и удерживать доверие клиентов.
                    </p>
                  </div>
                </Card>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="border-border/70 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Последние клиенты</h3>
                    <p className="text-sm text-muted-foreground">
                      Живой срез CRM салона: визиты, частота возвратов и наиболее активные гости.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab("clients");
                      setLocation(`/owner/salon/${salonId}?tab=clients`);
                    }}
                  >
                    Открыть клиентов
                  </Button>
                </div>
                <div className="mt-4 grid gap-3">
                  {recentClients.length > 0 ? (
                    recentClients.map((client) => (
                      <div key={client.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{client.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {client.email || client.phone || "Контакт появится после записи"}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-border/70">
                            {client.completedBookings} визитов
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                          <span>Сумма: {formatMoney(client.totalSpent)} UZS</span>
                          <span>Отмены: {client.cancelledBookings}</span>
                          <span>Последний визит: {formatDate(client.lastVisit)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
                      Как только начнутся реальные записи, здесь появятся последние клиенты, частота визитов и полезный CRM-контекст.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="border-border/70 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Публичная витрина</h3>
                    <p className="text-sm text-muted-foreground">
                      Контроль готовности карточки к клиентскому трафику и онлайн-записи.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/salon/${salonId}`}>Смотреть витрину</Link>
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Публикация", ready: salon.status === "active" },
                    { label: "Описание салона", ready: Boolean(salonDescription) },
                    { label: "Контакты", ready: Boolean(salon.phone || salon.email) },
                    { label: "Адрес", ready: Boolean(salon.address) },
                    { label: "Фотогалерея", ready: photosCount > 0 },
                    { label: "Отзывы и доверие", ready: Number(salon.reviewCount || 0) > 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                      <span className="text-sm text-foreground">{item.label}</span>
                      <Badge
                        variant="outline"
                        className={
                          item.ready
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        }
                      >
                        {item.ready ? "Готово" : "Нужно заполнить"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <Card className="border-border/70 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground">Что требует внимания</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-foreground">
                    {salon.status !== "active" ? "Салон ещё не опубликован и не принимает весь возможный входящий трафик." : "Салон опубликован и доступен клиентам на витрине."}
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-foreground">
                    {photosCount === 0 ? "В карточке салона нет фото. Это снижает доверие и конверсию в запись." : `В карточке уже ${photosCount} фото. Проверьте, достаточно ли они продают салон.`}
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-foreground">
                    {reviewSummary.unanswered > 0 ? `${reviewSummary.unanswered} отзыв(ов) без owner-ответа.` : "Все отзывы сейчас закрыты ответом или новых пока нет."}
                  </div>
                </div>
              </Card>

              <Card className="border-border/70 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground">Финансовый контур</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Платежи</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">Ещё не подключены</p>
                    <p className="mt-2 text-sm text-muted-foreground">Показываем owner-friendly сценарий вместо мёртвой пустоты.</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Что дальше</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">Подключить оплату</p>
                    <p className="mt-2 text-sm text-muted-foreground">После активации здесь появятся выручка, транзакции и выплаты.</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <OwnerSalonInfo salon={salon as any} />
          </TabsContent>

          <TabsContent value="public" className="mt-0">
            <div className="mb-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="border-border/70 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Статус витрины</h3>
                    <p className="text-sm text-muted-foreground">
                      Понять за 10 секунд, можно ли уже лить трафик на карточку салона.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      salon.status === "active"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    }
                  >
                    {salon.status === "active" ? "Готов к трафику" : "Нужно доработать"}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Публикация", value: ownerStatusLabel(salon.status) },
                    { label: "Фото", value: `${photosCount} в карточке` },
                    { label: "Отзывы", value: `${reviewSummary.total} всего` },
                    { label: "Средний рейтинг", value: rating > 0 ? rating.toFixed(1) : "—" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-border/70 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground">Чек-лист витрины</h3>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      label: "Есть описание салона",
                      ready: Boolean(salonDescription),
                      hint: "Короткий и внятный оффер повышает переход в запись.",
                    },
                    {
                      label: "Есть адрес и контакты",
                      ready: Boolean(salon.address && (salon.phone || salon.email)),
                      hint: "Клиент должен быстро понять, где вы и как связаться.",
                    },
                    {
                      label: "Добавлены фотографии",
                      ready: photosCount > 0,
                      hint: "Фотографии интерьера и работ усиливают доверие.",
                    },
                    {
                      label: "Салон опубликован",
                      ready: salon.status === "active",
                      hint: "Без публикации карточка не приводит новый трафик.",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <Badge
                          variant="outline"
                          className={
                            item.ready
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          }
                        >
                          {item.ready ? "Готово" : "Нужно заполнить"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.hint}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="border-border/70 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Публичная страница салона</h3>
                  <p className="text-sm text-muted-foreground">
                    Управление витриной салона, публикацией и готовностью карточки к клиентскому трафику.
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/salon/${salonId}`}>Открыть витрину</Link>
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Статус</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{ownerStatusLabel(salon.status)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Фото</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{photosCount} в карточке</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Описание</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{salonDescription ? "Заполнено" : "Нужно добавить"}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Контакты</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{salon.phone ? "Готово" : "Не хватает телефона"}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  {salon.status !== "active"
                    ? "Салон пока не опубликован. После публикации карточка появится в клиентской витрине."
                    : "Салон опубликован и доступен для клиентских переходов и бронирований."}
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  Проверьте фото, описание, услуги и расписание — именно эти блоки сильнее всего влияют на конверсию карточки.
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="mt-0">
            <OwnerSalonServices salonId={salonId} />
          </TabsContent>

          <TabsContent value="masters" className="mt-0 space-y-4">
            <OwnerSalonStaff salonId={salonId} />
          </TabsContent>

          <TabsContent value="schedule" className="mt-0">
            <OwnerSalonHours salonId={salonId} />
          </TabsContent>

          <TabsContent value="bookings" className="mt-0">
            <OwnerSalonBookings salonId={salonId} />
          </TabsContent>

          <TabsContent value="clients" className="mt-0">
            <div className="space-y-4">
              <Card className="border-border/70 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Клиенты салона</h3>
                    <p className="text-sm text-muted-foreground">Мини-CRM владельца по реальным бронированиям</p>
                  </div>
                  <Badge variant="outline" className="border-border/70">{clients.length} клиентов</Badge>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={clientQuery}
                      onChange={(event) => setClientQuery(event.target.value)}
                      placeholder="Поиск по имени, email, телефону или городу"
                      className="pl-9"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Повторные</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {clients.filter((client) => client.completedBookings > 1).length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Топ-клиент</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{topClient?.name || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Выручка</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatMoney(clients.reduce((sum, client) => sum + client.totalSpent, 0))} UZS
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="border-border/70 p-5 shadow-sm">
                <div className="space-y-3">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <div key={client.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-semibold text-foreground">{client.name}</p>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                              {client.email && <span className="break-all">{client.email}</span>}
                              {client.phone && <span>{client.phone}</span>}
                              {client.city && <span>{client.city}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">{formatMoney(client.totalSpent)} UZS</p>
                            <p className="mt-1 text-sm text-muted-foreground">суммарно</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                          <div className="rounded-2xl bg-background/80 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Визиты</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{client.totalBookings}</p>
                          </div>
                          <div className="rounded-2xl bg-background/80 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Завершено</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{client.completedBookings}</p>
                          </div>
                          <div className="rounded-2xl bg-background/80 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Отмены</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{client.cancelledBookings}</p>
                          </div>
                          <div className="rounded-2xl bg-background/80 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Последний визит</p>
                            <p className="mt-2 text-sm font-medium text-foreground">{formatDate(client.lastVisit)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                      {clients.length
                        ? "По текущему фильтру клиентов не найдено."
                        : "Пока нет клиентской истории. После первых броней раздел наполнится автоматически."}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-0">
            <div className="space-y-4">
              <Card className="border-border/70 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Отзывы и owner-ответы</h3>
                    <p className="text-sm text-muted-foreground">Свежая репутация салона и реакции владельца</p>
                  </div>
                  <Badge variant="outline" className="border-border/70">{reviewSummary.total} отзывов</Badge>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Средний рейтинг</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{reviewSummary.average.toFixed(1)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Без ответа</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{reviewSummary.unanswered}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">5 звёзд</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{reviewSummary.fiveStars}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Нужно сейчас</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {reviewWithoutResponse ? `Ответить ${reviewWithoutResponse.clientName || "клиенту"}` : "Всё закрыто"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["all", "Все"],
                    ["unanswered", "Без ответа"],
                    ["low", "3 и ниже"],
                    ["recent", "Сначала новые"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      variant={reviewFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setReviewFilter(value as typeof reviewFilter)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </Card>

              <Card className="border-border/70 p-5 shadow-sm">
                <div className="space-y-4">
                  {filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-semibold text-foreground">{review.clientName || "Клиент"}</p>
                            <p className="mt-2 text-sm text-muted-foreground">{review.masterName ? `Мастер: ${review.masterName}` : "Отзыв без привязки к мастеру"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">{review.rating}/5</p>
                            <p className="mt-1 text-sm text-muted-foreground">{formatDate(review.createdAt)}</p>
                          </div>
                        </div>
                        {review.comment && <p className="mt-4 break-words text-sm leading-6 text-foreground">{review.comment}</p>}
                        {review.ownerResponse ? (
                          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-primary">Ответ владельца</p>
                            <p className="mt-2 break-words text-sm leading-6 text-foreground">{review.ownerResponse}</p>
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            <Textarea
                              placeholder="Ответить на отзыв"
                              rows={3}
                              value={responseDrafts[review.id] || ""}
                              onChange={(event) => setResponseDrafts((current) => ({ ...current, [review.id]: event.target.value }))}
                            />
                            <Button onClick={() => void handleRespondToReview(review.id)}>Сохранить ответ</Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                      {reviews.length ? "По выбранному фильтру отзывов ничего нет." : "Пока нет отзывов. После завершённых записей они будут появляться здесь."}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <RevenueAnalytics
              salons={[
                {
                  id: salonId,
                  name:
                    typeof salon.name === "string"
                      ? { ru: salon.name, en: salon.name, uz: salon.name }
                      : (salon.name as { [key: string]: string }),
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="finance" className="mt-0">
            <Card className="border-border/70 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Финансы салона</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Статус платежей</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">Платёжный контур ещё не подключён</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Вместо пустоты показываем понятный сценарий: когда провайдер будет подключён, здесь появятся выручка, оплаты и транзакции салона.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Что готовить</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">Реквизиты и правила оплаты</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Салонный workspace уже готов к будущему подключению финансового слоя без сломанных переходов.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="mt-0">
            <OwnerSalonTeam salonId={salonId} />
          </TabsContent>

          <TabsContent value="support" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-border/70 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground">Коммуникации салона</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Канал с платформой
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Открытых owner-обращений: {openTickets}. Этот блок уже живой и связан с support tickets.</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      Канал с клиентами
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Прямой универсальный чат ещё не развёрнут на owner API, поэтому рабочим центром остаются брони, клиентская база и support-контур платформы.</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Wallet className="h-4 w-4 text-primary" />
                      Финансовые сигналы
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Платёжный модуль ещё не активирован, но owner workspace уже готов для подключения этого контура.</p>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Новое обращение в платформу</h4>
                    <p className="mt-1 text-sm text-muted-foreground">Создайте запрос по текущему салону и продолжайте диалог уже внутри тикета.</p>
                  </div>
                  <Input
                    value={supportDraft.subject}
                    onChange={(event) => setSupportDraft((current) => ({ ...current, subject: event.target.value }))}
                    placeholder="Тема обращения"
                  />
                  <Input
                    value={supportDraft.category}
                    onChange={(event) => setSupportDraft((current) => ({ ...current, category: event.target.value }))}
                    placeholder="Категория: moderation, payments, staff..."
                  />
                  <Textarea
                    value={supportDraft.message}
                    onChange={(event) => setSupportDraft((current) => ({ ...current, message: event.target.value }))}
                    rows={4}
                    placeholder="Опишите проблему или задачу по этому салону"
                  />
                  <Button className="w-full" onClick={() => void handleCreateSupportTicket()} disabled={supportCreating}>
                    {supportCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    Отправить обращение
                  </Button>
                </div>
              </Card>

              <Card className="border-border/70 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground">Owner-support и уведомления</h3>
                <div className="mt-5 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                  <div className="space-y-3">
                    {tickets.length > 0 ? (
                      tickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => void loadSupportTicket(ticket.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selectedTicketId === ticket.id
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/70 bg-muted/20 hover:border-primary/20"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-medium text-foreground">{ticket.subject}</p>
                              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{ticket.category}</p>
                            </div>
                            <Badge variant="outline" className="border-border/70">{ticket.status}</Badge>
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">Обновлено: {formatDate(ticket.updatedAt)}</p>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                        Пока нет сообщений к платформе. При первом owner-обращении история появится здесь.
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">Уведомления по салону</p>
                        {unreadNotifications > 0 && (
                          <Button variant="outline" size="sm" onClick={() => void handleMarkAllNotificationsRead()}>
                            Прочитать всё
                          </Button>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {notifications.slice(0, 4).map((item) => (
                          <div key={item.id} className="rounded-xl bg-background/80 p-3 text-sm text-muted-foreground">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="break-words text-foreground">{item.message || item.type}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em]">{formatDate(item.createdAt)}</p>
                              </div>
                              {!item.isRead && (
                                <Button variant="ghost" size="sm" onClick={() => void handleMarkNotificationRead(item.id)}>
                                  Новое
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {!notifications.length && (
                          <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
                            Пока нет новых уведомлений.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                      {selectedTicket ? (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-foreground">{selectedTicket.subject}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {selectedTicket.category} · обновлено {formatDate(selectedTicket.updatedAt)}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="border-border/70">{selectedTicket.status}</Badge>
                              {selectedTicket.status !== "closed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleCloseSupportTicket(selectedTicket.id)}
                                  disabled={closingTicketId === selectedTicket.id}
                                >
                                  {closingTicketId === selectedTicket.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Закрыть
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                            {supportLoading ? (
                              <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
                                <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
                                Загружаем переписку
                              </div>
                            ) : selectedTicketMessages.length > 0 ? (
                              selectedTicketMessages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`rounded-2xl border p-4 text-sm ${
                                    message.senderType === "admin"
                                      ? "border-border/70 bg-muted/20 text-foreground"
                                      : "border-primary/15 bg-primary/8 text-foreground"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-foreground">
                                      {message.senderType === "admin" ? "Платформа" : "Вы"}
                                    </p>
                                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                      {formatDate(message.createdAt)}
                                    </span>
                                  </div>
                                  <p className="mt-2 break-words leading-6">{message.message}</p>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
                                У этого обращения пока нет истории сообщений.
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <Textarea
                              rows={4}
                              value={supportReply}
                              onChange={(event) => setSupportReply(event.target.value)}
                              placeholder="Ответить платформе по этому обращению"
                            />
                            <Button className="w-full" onClick={() => void handleSendSupportReply()} disabled={supportSending}>
                              {supportSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                              Отправить сообщение
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                          Выберите обращение слева, чтобы увидеть историю диалога и продолжить переписку.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
