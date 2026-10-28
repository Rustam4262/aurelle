import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  FolderPlus,
  MessageSquare,
  CirclePause,
  FileText,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { SalonCreationWizard } from "@/components/salon-creation-wizard";
import { reviewsWordRu as reviewsWord } from "@/lib/pluralize-ru";
import { countRu, pluralRu } from "@/lib/plural";

// This file hardcodes Russian text throughout rather than using i18next —
// matching that existing (non-localized) style here rather than introducing
// a one-off t() call.

type LocalizedRecord = { en?: string; ru?: string; uz?: string };

type OwnerSalon = {
  id: string;
  name: LocalizedRecord | string;
  city?: LocalizedRecord | string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: "draft" | "active" | "paused" | null;
  averageRating?: number | string | null;
  reviewCount?: number | null;
  updatedAt?: string | null;
};

function normalizeOwnerSalons(input: OwnerSalon[]) {
  if (!Array.isArray(input)) return [] as OwnerSalon[];

  return input.filter((salon): salon is OwnerSalon => {
    return Boolean(
      salon && typeof salon === "object" && typeof salon.id === "string" && salon.id.trim(),
    );
  });
}

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

type Stats = {
  unreadNotifications: number;
  unresolvedTickets: number;
};

export interface OwnerWorkspaceSectionsProps {
  activeSection: string;
  salons: OwnerSalon[];
  language: string;
  wizardOpen: boolean;
  setWizardOpen: Dispatch<SetStateAction<boolean>>;
  salonDraft: SalonDraft;
  setSalonDraft: Dispatch<SetStateAction<SalonDraft>>;
  supportDraft: SupportDraft;
  setSupportDraft: Dispatch<SetStateAction<SupportDraft>>;
  creatingSalon: boolean;
  sendingSupport: boolean;
  sectionLoading: boolean;
  ownerClients: OwnerClientSummary[];
  ownerReviews: OwnerReviewSummary[];
  analyticsSalons: { id: string; name: { [key: string]: string } }[];
  tickets: SupportTicket[];
  notifications: NotificationItem[];
  stats: Stats;
  onCreateSalon: () => Promise<void>;
  onSupportTicket: () => Promise<void>;
  onCloseSupportTicket: (ticketId: string) => Promise<void>;
  onStatusChange: (salonId: string, status: "draft" | "active" | "paused") => Promise<void>;
  onMarkNotificationRead: (notificationId: string) => Promise<void>;
  onMarkAllNotificationsRead: () => Promise<void>;
  onRefresh: () => Promise<void>;
  openOwnerSection: (section: string) => void;
  localize: (value: LocalizedRecord | string | null | undefined, language: string) => string;
  formatMoney: (value: number | null | undefined) => string;
  formatDate: (value?: string | null) => string;
  ownerStatusLabel: (status?: string | null) => string;
  ownerStatusBadgeClass: (status?: string | null) => string;
}

export function OwnerWorkspaceSections(props: OwnerWorkspaceSectionsProps) {
  const {
    activeSection,
    salons,
    language,
    wizardOpen,
    setWizardOpen,
    salonDraft,
    setSalonDraft,
    supportDraft,
    setSupportDraft,
    creatingSalon,
    sendingSupport,
    sectionLoading,
    ownerClients,
    ownerReviews,
    tickets,
    notifications,
    stats,
    onCreateSalon,
    onSupportTicket,
    onCloseSupportTicket,
    onStatusChange,
    onMarkNotificationRead,
    onMarkAllNotificationsRead,
    onRefresh,
    openOwnerSection,
    localize,
    formatMoney,
    formatDate,
    ownerStatusLabel,
    ownerStatusBadgeClass,
  } = props;

  const [salonSearch, setSalonSearch] = useState("");
  const [salonStatusFilter, setSalonStatusFilter] = useState<"all" | "active" | "draft" | "paused">(
    "all",
  );
  const [salonSort, setSalonSort] = useState<"updated" | "rating" | "reviews">("updated");
  const safeSalons = useMemo(() => normalizeOwnerSalons(salons), [salons]);

  const ownerSalonSummary = useMemo(() => {
    const active = safeSalons.filter((salon) => (salon.status || "draft") === "active");
    const draft = safeSalons.filter((salon) => (salon.status || "draft") === "draft");
    const paused = safeSalons.filter((salon) => (salon.status || "draft") === "paused");
    const ratingAverage =
      safeSalons.length > 0
        ? safeSalons.reduce((acc, salon) => acc + Number(salon.averageRating || 0), 0) /
          safeSalons.length
        : 0;
    const needsAttention = safeSalons.filter((salon) => {
      const status = salon.status || "draft";
      return status !== "active" || !salon.address || (!salon.phone && !salon.email);
    });

    return {
      total: safeSalons.length,
      active: active.length,
      draft: draft.length,
      paused: paused.length,
      needsAttention: needsAttention.length,
      ratingAverage,
    };
  }, [safeSalons]);

  const filteredSalons = useMemo(() => {
    const normalizedSearch = salonSearch.trim().toLowerCase();

    const mapped = safeSalons
      .map((salon) => {
        const status = salon.status || "draft";
        const localizedName = localize(salon.name, language) || "Салон";
        const localizedCity = localize(salon.city, language);
        const reviewCount = Number(salon.reviewCount || 0);
        const averageRating = Number(salon.averageRating || 0);
        const readinessScore = [
          Boolean(localizedName && localizedName !== "Салон"),
          Boolean(localizedCity),
          Boolean(salon.address),
          Boolean(salon.phone || salon.email),
          status === "active",
        ].filter(Boolean).length;
        const readinessPercent = Math.round((readinessScore / 5) * 100);
        const attentionFlags = [
          status !== "active" ? "Не опубликован" : null,
          !salon.address ? "Нет адреса" : null,
          !salon.phone && !salon.email ? "Нет контактов" : null,
          reviewCount === 0 ? "Нет отзывов" : null,
        ].filter(Boolean) as string[];

        return {
          salon,
          status,
          localizedName,
          localizedCity,
          reviewCount,
          averageRating,
          readinessPercent,
          attentionFlags,
        };
      })
      .filter(({ status, localizedName, localizedCity, salon }) => {
        if (salonStatusFilter !== "all" && status !== salonStatusFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const haystack =
          `${localizedName} ${localizedCity || ""} ${salon.address || ""} ${salon.phone || ""} ${salon.email || ""}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });

    return mapped.sort((left, right) => {
      if (salonSort === "rating") {
        return right.averageRating - left.averageRating;
      }

      if (salonSort === "reviews") {
        return right.reviewCount - left.reviewCount;
      }

      return (
        new Date(right.salon.updatedAt || 0).getTime() -
        new Date(left.salon.updatedAt || 0).getTime()
      );
    });
  }, [language, localize, safeSalons, salonSearch, salonSort, salonStatusFilter]);

  const [directorySearch, setDirectorySearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedSalon, setSelectedSalon] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const visibleClients = ownerClients.filter(
    (client) =>
      (selectedSalon === "all" || client.salonId === selectedSalon) &&
      [client.name, client.email, client.phone, client.salonName]
        .join(" ")
        .toLowerCase()
        .includes(clientSearch.trim().toLowerCase()),
  );
  const visibleReviews = ownerReviews.filter(
    (review) =>
      (selectedSalon === "all" || review.salonId === selectedSalon) &&
      (reviewFilter === "all" || !review.ownerResponse),
  );
  const visibleNotifications = notifications.filter((item) => !unreadOnly || !item.isRead);
  const directorySalons = safeSalons.filter((salon) =>
    [localize(salon.name, language), salon.address, localize(salon.city, language)]
      .join(" ")
      .toLowerCase()
      .includes(directorySearch.trim().toLowerCase()),
  );
  const salonFilter = (
    <select
      aria-label="Фильтр по салону"
      value={selectedSalon}
      onChange={(event) => setSelectedSalon(event.target.value)}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="all">Все салоны</option>
      {safeSalons.map((salon) => (
        <option key={salon.id} value={salon.id}>
          {localize(salon.name, language)}
        </option>
      ))}
    </select>
  );
  return (
    <>
      {activeSection === "salons" && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>Всего: {ownerSalonSummary.total}</span>
            <span>· Активные: {ownerSalonSummary.active}</span>
            <span>· Черновики: {ownerSalonSummary.draft}</span>
            <span>· На паузе: {ownerSalonSummary.paused}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              aria-label="Поиск моих салонов"
              placeholder="Название, город или адрес"
              value={salonSearch}
              onChange={(event) => setSalonSearch(event.target.value)}
            />
            <select
              aria-label="Статус салона"
              value={salonStatusFilter}
              onChange={(event) =>
                setSalonStatusFilter(event.target.value as typeof salonStatusFilter)
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="draft">Черновики</option>
              <option value="paused">На паузе</option>
            </select>
            <select
              aria-label="Сортировка салонов"
              value={salonSort}
              onChange={(event) => setSalonSort(event.target.value as typeof salonSort)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="updated">По обновлению</option>
              <option value="rating">По рейтингу</option>
              <option value="reviews">По отзывам</option>
            </select>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSalons.length > 0 ? (
              filteredSalons.map(
                ({
                  salon,
                  status,
                  localizedName,
                  localizedCity,
                  reviewCount,
                  averageRating,
                  readinessPercent,
                  attentionFlags,
                }) => (
                  <Card key={salon.id} className="border-border/70 p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-lg font-semibold text-foreground">
                            {localizedName || "Салон"}
                          </h3>
                          <Badge variant="outline" className={ownerStatusBadgeClass(status)}>
                            {ownerStatusLabel(status)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {localizedCity || "Город не указан"}
                        </p>
                        {salon.address && (
                          <p className="mt-1 break-words text-sm text-muted-foreground">
                            {salon.address}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">
                          {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {reviewCount} {reviewsWord(reviewCount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Статус
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {ownerStatusLabel(status)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Контакт
                        </p>
                        <p className="mt-2 break-words text-sm font-medium text-foreground">
                          {salon.phone || salon.email || "Не указан"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Обновлён
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {formatDate(salon.updatedAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Готовность
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {readinessPercent}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/70 bg-muted/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">Состояние карточки</p>
                        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {readinessPercent}% готовности
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(readinessPercent, 8)}%` }}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {attentionFlags.length > 0 ? (
                          attentionFlags.map((flag) => (
                            <Badge
                              key={flag}
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            >
                              {flag}
                            </Badge>
                          ))
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          >
                            Карточка выглядит готовой к трафику
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button asChild>
                        <Link href={`/owner/salon/${salon.id}`}>Открыть управление</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/salon/${salon.id}`}>Открыть витрину</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/owner/salon/${salon.id}?tab=bookings`}>Записи</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/owner/salon/${salon.id}?tab=access`}>Доступы</Link>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          void onStatusChange(salon.id, status === "active" ? "paused" : "active")
                        }
                      >
                        {status === "active" ? "Пауза" : "Опубликовать"}
                      </Button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>
                            {reviewCount} {reviewsWord(reviewCount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CirclePause className="h-4 w-4" />
                          <span>{status === "active" ? "В витрине" : "Не опубликован"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          <span>
                            {status === "active" ? "Готов к бронированиям" : "Трафик ограничен"}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/owner/salon/${salon.id}`}>
                          Детали салона
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ),
              )
            ) : (
              <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground lg:col-span-2">
                {salons.length > 0
                  ? "По текущим фильтрам ничего не найдено. Попробуйте сменить статус, сортировку или очистить поиск."
                  : "У владельца пока нет салонов. Создайте первый объект и откройте для него рабочую панель."}
              </Card>
            )}
          </div>
        </section>
      )}

      {activeSection === "add-salon" && (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-border/70 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Создание нового салона</h3>
                <p className="text-sm text-muted-foreground">
                  Полный wizard для аккуратного старта: профиль, фото, график и подготовка к
                  публикации.
                </p>
              </div>
              <FolderPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                1. Заполните основную информацию и контакты салона.
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                2. Добавьте фото, часы работы и подготовьте карточку к публикации.
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                3. После сохранения сразу переходите в рабочее пространство салона.
              </div>
            </div>
            <Button className="mt-6 w-full" onClick={() => setWizardOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Открыть мастер создания
            </Button>
          </Card>

          <Card className="border-border/70 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Быстрый черновик</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Если нужен быстрый старт без полного wizard, можно создать минимальный черновик прямо
              здесь.
            </p>
            <div className="mt-5 space-y-3">
              <Input
                placeholder="Название салона (RU)"
                value={salonDraft.nameRu}
                onChange={(event) =>
                  setSalonDraft((current) => ({ ...current, nameRu: event.target.value }))
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Телефон"
                  value={salonDraft.phone}
                  onChange={(event) =>
                    setSalonDraft((current) => ({ ...current, phone: event.target.value }))
                  }
                />
                <Input
                  placeholder="Email салона"
                  value={salonDraft.email}
                  onChange={(event) =>
                    setSalonDraft((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>
              <Input
                placeholder="Адрес"
                value={salonDraft.address}
                onChange={(event) =>
                  setSalonDraft((current) => ({ ...current, address: event.target.value }))
                }
              />
              <Textarea
                rows={4}
                placeholder="Краткое описание салона"
                value={salonDraft.descriptionRu}
                onChange={(event) =>
                  setSalonDraft((current) => ({ ...current, descriptionRu: event.target.value }))
                }
              />
              <Button
                className="w-full"
                onClick={() => void onCreateSalon()}
                disabled={creatingSalon}
              >
                {creatingSalon ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="mr-2 h-4 w-4" />
                )}
                Создать черновик
              </Button>
            </div>
          </Card>
        </section>
      )}

      {["staff", "services", "bookings"].includes(activeSection) && (
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {activeSection === "bookings"
              ? "Выберите салон для просмотра записей и расписания."
              : activeSection === "staff"
                ? "Выберите салон для управления мастерами и доступами команды."
                : "Выберите салон для изменения услуг, цен и длительности процедур."}
          </p>
          <Input
            aria-label="Поиск салона"
            placeholder="Название салона или адрес"
            value={directorySearch}
            onChange={(event) => setDirectorySearch(event.target.value)}
          />
          <div className="space-y-3">
            {directorySalons.map((salon) => (
              <Card
                key={salon.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <h3 className="font-semibold">{localize(salon.name, language)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {salon.address || localize(salon.city, language)}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {ownerStatusLabel(salon.status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link
                      href={
                        "/owner/salon/" +
                        salon.id +
                        "?tab=" +
                        (activeSection === "staff" ? "masters" : activeSection)
                      }
                    >
                      {activeSection === "staff"
                        ? "Мастера"
                        : activeSection === "bookings"
                          ? "Открыть записи"
                          : "Услуги и цены"}
                    </Link>
                  </Button>
                  {activeSection !== "services" && (
                    <Button asChild variant="outline">
                      <Link
                        href={
                          "/owner/salon/" +
                          salon.id +
                          "?tab=" +
                          (activeSection === "staff" ? "access" : "schedule")
                        }
                      >
                        {activeSection === "staff" ? "Доступы команды" : "Расписание"}
                      </Link>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {!directorySalons.length && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {safeSalons.length
                  ? "По вашему запросу салоны не найдены."
                  : "Сначала добавьте салон, чтобы начать работу."}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() =>
                  safeSalons.length ? setDirectorySearch("") : openOwnerSection("add-salon")
                }
              >
                {safeSalons.length ? "Сбросить поиск" : "Добавить салон"}
              </Button>
            </Card>
          )}
        </section>
      )}

      {activeSection === "clients" && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              className="min-w-0 flex-1"
              aria-label="Поиск клиентов"
              placeholder="Имя, телефон или email"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
            />
            {salonFilter}
          </div>
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Клиентская база владельца</h3>
                <p className="text-sm text-muted-foreground">
                  Сводный список клиентов по всем салонам с быстрым переходом в нужный объект.
                </p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {countRu(ownerClients.length, ["клиент", "клиента", "клиентов"])}
              </Badge>
            </div>
          </Card>

          {sectionLoading ? (
            <Card className="border-border/70 p-8 text-center text-muted-foreground shadow-sm">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
              Загружаем клиентскую базу владельца
            </Card>
          ) : visibleClients.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleClients.map((client) => (
                <Card
                  key={`${client.salonId}-${client.id}`}
                  className="border-border/70 p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-foreground">
                        {client.name}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">{client.salonName}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {client.email && <span className="break-all">{client.email}</span>}
                        {client.phone && <span>{client.phone}</span>}
                        {client.city && <span>{client.city}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {formatMoney(client.totalSpent)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        UZS всего
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Визиты
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {client.totalBookings}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Завершено
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {client.completedBookings}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Отмены
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {client.cancelledBookings}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Последний визит
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatDate(client.lastVisit)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" asChild>
                      <Link href={`/owner/salon/${client.salonId}?tab=clients`}>
                        Открыть салон клиента
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground shadow-sm">
              {ownerClients.length
                ? "По выбранным фильтрам клиентов нет."
                : "После первой записи здесь появятся ваши клиенты."}
            </Card>
          )}
        </section>
      )}

      {activeSection === "messages" && (
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Обращения в поддержку и связь с платформой. Уведомления о событиях находятся в отдельном
            разделе.
          </p>
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h3 className="font-semibold">Поддержка платформы</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Открытых обращений: {stats.unresolvedTickets}
              </p>
            </div>
            <Button onClick={() => openOwnerSection("support")}>Написать в поддержку</Button>
          </Card>
          {tickets.slice(0, 5).map((ticket) => (
            <Card key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h3 className="font-medium">{ticket.subject}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(ticket.updatedAt || ticket.createdAt)}
                </p>
              </div>
              <Button variant="outline" onClick={() => openOwnerSection("support")}>
                К обращениям
              </Button>
            </Card>
          ))}
          {!tickets.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Переписки с поддержкой пока нет.
            </p>
          )}
        </section>
      )}

      {activeSection === "reviews" && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {salonFilter}
            <select
              aria-label="Фильтр отзывов"
              value={reviewFilter}
              onChange={(event) => setReviewFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Все отзывы</option>
              <option value="unanswered">Без ответа</option>
            </select>
          </div>
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Отзывы по сети владельца</h3>
                <p className="text-sm text-muted-foreground">
                  Сводная репутация по всем салонам с быстрым переходом в нужное рабочее
                  пространство.
                </p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {countRu(ownerReviews.length, ["отзыв", "отзыва", "отзывов"])}
              </Badge>
            </div>
          </Card>

          {sectionLoading ? (
            <Card className="border-border/70 p-8 text-center text-muted-foreground shadow-sm">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
              Загружаем отзывы по всей сети
            </Card>
          ) : visibleReviews.length > 0 ? (
            <div className="space-y-4">
              {visibleReviews.map((review) => (
                <Card
                  key={`${review.salonId}-${review.id}`}
                  className="border-border/70 p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-foreground">
                        {review.clientName || "Клиент"}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">{review.salonName}</p>
                      {review.masterName && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Мастер: {review.masterName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">{review.rating}/5</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-4 break-words text-sm leading-6 text-foreground">
                      {review.comment}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Badge
                      variant="outline"
                      className={
                        review.ownerResponse
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      }
                    >
                      {review.ownerResponse ? "Есть ответ владельца" : "Требует ответа"}
                    </Badge>
                    <Button variant="outline" asChild>
                      <Link href={`/owner/salon/${review.salonId}?tab=reviews`}>
                        Открыть в салоне
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground shadow-sm">
              {ownerReviews.length
                ? "По выбранным фильтрам отзывов нет."
                : "Отзывы появятся после завершённых визитов клиентов."}
            </Card>
          )}
        </section>
      )}

      {activeSection === "analytics" && (
        <section className="space-y-4">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Аналитика владельца</h3>
                <p className="text-sm text-muted-foreground">
                  Сводка по салонам и репутации. Подробные финансовые отчёты доступны в кабинете
                  каждого салона.
                </p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {countRu(salons.length, ["салон", "салона", "салонов"])} в аналитике
              </Badge>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Средний рейтинг
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {ownerSalonSummary.ratingAverage > 0
                  ? ownerSalonSummary.ratingAverage.toFixed(1)
                  : "—"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Общий сигнал по качеству сети владельца.
              </p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Готовые карточки
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {filteredSalons.filter((item) => item.readinessPercent === 100).length}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Полностью собранные салоны, готовые к трафику.
              </p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Точки роста
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {filteredSalons.filter((item) => item.reviewCount === 0).length}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Салоны без отзывов, где важен первый клиентский опыт.
              </p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSalons.length > 0 ? (
              filteredSalons.map(
                ({ salon, localizedName, averageRating, reviewCount, readinessPercent }) => (
                  <Card key={`analytics-${salon.id}`} className="border-border/70 p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-semibold text-foreground">
                          {localizedName}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Внутри карточки салона уже доступна детальная аналитика по записям,
                          отзывам и заполненности карточки.
                        </p>
                      </div>
                      <Badge variant="outline" className="border-border/70">
                        {readinessPercent}% готовности
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Рейтинг
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Отзывы
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">{reviewCount}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button asChild>
                        <Link href={`/owner/salon/${salon.id}?tab=analytics`}>
                          Открыть аналитику
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/owner/salon/${salon.id}?tab=reviews`}>Открыть отзывы</Link>
                      </Button>
                    </div>
                  </Card>
                ),
              )
            ) : (
              <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground shadow-sm lg:col-span-2">
                Сначала создайте хотя бы один салон, и здесь появится аналитика салонов.
              </Card>
            )}
          </div>
        </section>
      )}

      {activeSection === "support" && (
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-border/70 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Написать платформе</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Технические проблемы, модерация, платежи, клиенты и вопросы владельца в одном канале.
            </p>
            <div className="mt-5 space-y-3">
              <Input
                aria-label="Тема обращения"
                placeholder="Тема обращения"
                value={supportDraft.subject}
                onChange={(event) =>
                  setSupportDraft((current) => ({ ...current, subject: event.target.value }))
                }
              />
              <label className="space-y-2 text-sm text-muted-foreground">
                <span>Категория</span>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={supportDraft.category}
                  onChange={(event) =>
                    setSupportDraft((current) => ({ ...current, category: event.target.value }))
                  }
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
                aria-label="Сообщение в поддержку"
                placeholder="Опишите вопрос или проблему"
                rows={6}
                value={supportDraft.message}
                onChange={(event) =>
                  setSupportDraft((current) => ({ ...current, message: event.target.value }))
                }
              />
              <Button
                className="w-full"
                onClick={() => void onSupportTicket()}
                disabled={sendingSupport}
              >
                {sendingSupport ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="mr-2 h-4 w-4" />
                )}
                Отправить обращение
              </Button>
            </div>
          </Card>

          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">История обращений</h3>
                <p className="text-sm text-muted-foreground">
                  Текущие и закрытые обращения по платформе.
                </p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {countRu(tickets.length, ["обращение", "обращения", "обращений"])}
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-foreground">
                          {ticket.subject}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {(
                            {
                              bug: "Ошибка",
                              payment: "Оплата",
                              question: "Вопрос",
                              suggestion: "Предложение",
                            } as Record<string, string>
                          )[ticket.category] || ticket.category}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-border/70">
                        {(
                          {
                            open: "Открыто",
                            in_progress: "В работе",
                            resolved: "Решено",
                            closed: "Закрыто",
                          } as Record<string, string>
                        )[ticket.status] || ticket.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        Создано: {formatDate(ticket.createdAt)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Обновлено: {formatDate(ticket.updatedAt)}
                      </span>
                      {ticket.status !== "closed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void onCloseSupportTicket(ticket.id)}
                        >
                          Закрыть
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                  Пока нет обращений. Когда владелец напишет платформе, история появится здесь.
                </div>
              )}
            </div>
          </Card>
        </section>
      )}

      {activeSection === "notifications" && (
        <section className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={unreadOnly ? "outline" : "default"}
              onClick={() => setUnreadOnly(false)}
            >
              Все
            </Button>
            <Button
              variant={unreadOnly ? "default" : "outline"}
              onClick={() => setUnreadOnly(true)}
            >
              Непрочитанные ({stats.unreadNotifications})
            </Button>
          </div>
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Центр уведомлений</h3>
                <p className="text-sm text-muted-foreground">
                  Все уведомления: публикация, события по салонам, статусы и ответы платформы.
                </p>
              </div>
              {stats.unreadNotifications > 0 && (
                <Button variant="outline" onClick={() => void onMarkAllNotificationsRead()}>
                  Прочитать всё
                </Button>
              )}
            </div>
          </Card>
          <div className="space-y-3">
            {visibleNotifications.length > 0 ? (
              visibleNotifications.map((item) => (
                <Card key={item.id} className="border-border/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-foreground">
                        {item.message || item.type}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {item.type}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        item.isRead
                          ? "border-border/70"
                          : "border-primary/30 bg-primary/5 text-primary"
                      }
                    >
                      {item.isRead ? "Прочитано" : "Новое"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                    {!item.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void onMarkNotificationRead(item.id)}
                      >
                        Отметить прочитанным
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground shadow-sm">
                {unreadOnly ? "Все уведомления прочитаны." : "Новых событий пока нет."}
              </Card>
            )}
          </div>
        </section>
      )}

      {activeSection === "settings" && (
        <section className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold">Внешний вид и язык</h3>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-sm font-medium">Тема интерфейса</p>
                <p className="text-sm text-muted-foreground">
                  Светлая, тёмная или как на устройстве
                </p>
              </div>
              <ThemeToggle />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm font-medium">Язык интерфейса</p>
              <LanguageSwitcher />
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Безопасность аккаунта</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Для смены пароля запросите письмо на вашу почту.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/auth/forgot-password">Сменить пароль</Link>
            </Button>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Команда и права доступа</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Доступ сотрудников настраивается отдельно для каждого салона.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => openOwnerSection("staff")}>
              Управлять доступами
            </Button>
          </Card>
        </section>
      )}

      <SalonCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={() => {
          void onRefresh();
        }}
      />
    </>
  );
}
