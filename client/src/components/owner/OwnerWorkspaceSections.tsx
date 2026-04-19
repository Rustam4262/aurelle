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
  Bell,
  MessageSquare,
  Settings,
  Shield,
  Store,
  Search,
  CirclePause,
  FileText,
  Star,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { SalonCreationWizard } from "@/components/salon-creation-wizard";

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
    analyticsSalons,
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
  const [salonStatusFilter, setSalonStatusFilter] = useState<"all" | "active" | "draft" | "paused">("all");
  const [salonSort, setSalonSort] = useState<"updated" | "rating" | "reviews">("updated");

  const ownerSalonSummary = useMemo(() => {
    const active = salons.filter((salon) => (salon.status || "draft") === "active");
    const draft = salons.filter((salon) => (salon.status || "draft") === "draft");
    const paused = salons.filter((salon) => (salon.status || "draft") === "paused");
    const ratingAverage =
      salons.length > 0
        ? salons.reduce((acc, salon) => acc + Number(salon.averageRating || 0), 0) / salons.length
        : 0;
    const needsAttention = salons.filter((salon) => {
      const status = salon.status || "draft";
      return status !== "active" || !salon.address || (!salon.phone && !salon.email);
    });

    return {
      total: salons.length,
      active: active.length,
      draft: draft.length,
      paused: paused.length,
      needsAttention: needsAttention.length,
      ratingAverage,
    };
  }, [salons]);

  const filteredSalons = useMemo(() => {
    const normalizedSearch = salonSearch.trim().toLowerCase();

    const mapped = salons
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

        const haystack = `${localizedName} ${localizedCity || ""} ${salon.address || ""} ${salon.phone || ""} ${salon.email || ""}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });

    return mapped.sort((left, right) => {
      if (salonSort === "rating") {
        return right.averageRating - left.averageRating;
      }

      if (salonSort === "reviews") {
        return right.reviewCount - left.reviewCount;
      }

      return new Date(right.salon.updatedAt || 0).getTime() - new Date(left.salon.updatedAt || 0).getTime();
    });
  }, [language, localize, salonSearch, salonSort, salonStatusFilter, salons]);

  return (
    <>
      {activeSection === "salons" && (
        <section className="space-y-4">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Мои салоны</h3>
                <p className="text-sm text-muted-foreground">
                  Рабочая сетка владельца: состояние публикации, готовность карточек и быстрый вход в управление.
                </p>
              </div>
              <Button onClick={() => setWizardOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Добавить салон
              </Button>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Сеть</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.total}</p>
              <p className="mt-2 text-sm text-muted-foreground">Всего объектов в owner-контуре.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Активные</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.active}</p>
              <p className="mt-2 text-sm text-muted-foreground">Уже доступны клиентскому трафику.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Черновики</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.draft}</p>
              <p className="mt-2 text-sm text-muted-foreground">Ещё не доведены до публикации.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">На паузе</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.paused}</p>
              <p className="mt-2 text-sm text-muted-foreground">Временно выключены из витрины.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Фокус</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.needsAttention}</p>
              <p className="mt-2 text-sm text-muted-foreground">Нуждаются во внимании прямо сейчас.</p>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-border/70 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Управление сетью</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Быстрый фильтр по объектам, приоритетам и состоянию публикации.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:w-[620px] xl:grid-cols-[1.3fr_0.85fr_0.85fr]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={salonSearch}
                      onChange={(event) => setSalonSearch(event.target.value)}
                      placeholder="Поиск по названию, городу, адресу, телефону"
                      className="pl-9"
                    />
                  </div>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={salonStatusFilter}
                    onChange={(event) =>
                      setSalonStatusFilter(event.target.value as "all" | "active" | "draft" | "paused")
                    }
                  >
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="draft">Черновики</option>
                    <option value="paused">На паузе</option>
                  </select>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={salonSort}
                    onChange={(event) => setSalonSort(event.target.value as "updated" | "rating" | "reviews")}
                  >
                    <option value="updated">Сначала новые</option>
                    <option value="rating">По рейтингу</option>
                    <option value="reviews">По отзывам</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="border-border/70 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Фокус владельца</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Где сейчас чаще всего теряется конверсия и почему стоит зайти именно туда.
                  </p>
                </div>
                <Star className="mt-1 h-5 w-5 text-primary" />
              </div>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-sm font-medium text-foreground">Средний рейтинг сети</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {ownerSalonSummary.ratingAverage > 0 ? ownerSalonSummary.ratingAverage.toFixed(1) : "—"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Репутация по всем объектам владельца.</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-sm font-medium text-foreground">Неполные карточки</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {filteredSalons.filter((item) => item.readinessPercent < 100).length}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Не хватает адреса, контактов или публикации.</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-sm font-medium text-foreground">Нулевые отзывы</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {filteredSalons.filter((item) => item.reviewCount === 0).length}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Им нужен первый клиентский опыт и живые ответы.</p>
                </div>
              </div>
            </Card>
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
                          <p className="mt-1 break-words text-sm text-muted-foreground">{salon.address}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">
                          {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {reviewCount} отзывов
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Статус</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{ownerStatusLabel(status)}</p>
                      </div>
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Контакт</p>
                        <p className="mt-2 break-words text-sm font-medium text-foreground">
                          {salon.phone || salon.email || "Не указан"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Обновлён</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{formatDate(salon.updatedAt)}</p>
                      </div>
                      <div className="rounded-2xl bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Готовность</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{readinessPercent}%</p>
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
                          <span>{reviewCount} отзывов</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CirclePause className="h-4 w-4" />
                          <span>{status === "active" ? "В витрине" : "Нужен owner-апрув"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          <span>{status === "active" ? "Готов к бронированиям" : "Трафик ограничен"}</span>
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
                  Полный wizard для аккуратного старта: профиль, фото, график и подготовка к публикации.
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
              Если нужен быстрый старт без полного wizard, можно создать минимальный черновик прямо здесь.
            </p>
            <div className="mt-5 space-y-3">
              <Input
                placeholder="Название салона (RU)"
                value={salonDraft.nameRu}
                onChange={(event) => setSalonDraft((current) => ({ ...current, nameRu: event.target.value }))}
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
              <Input
                placeholder="Адрес"
                value={salonDraft.address}
                onChange={(event) => setSalonDraft((current) => ({ ...current, address: event.target.value }))}
              />
              <Textarea
                rows={4}
                placeholder="Краткое описание салона"
                value={salonDraft.descriptionRu}
                onChange={(event) =>
                  setSalonDraft((current) => ({ ...current, descriptionRu: event.target.value }))
                }
              />
              <Button className="w-full" onClick={() => void onCreateSalon()} disabled={creatingSalon}>
                {creatingSalon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                Создать черновик
              </Button>
            </div>
          </Card>
        </section>
      )}

      {activeSection === "staff" && (
        <section className="space-y-4">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Персонал владельца</h3>
                <p className="text-sm text-muted-foreground">
                  Верхний owner-уровень теперь ведёт не в нестабильный старый экран, а в живую сетку салонов и их команд.
                </p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {ownerSalonSummary.total} салонов
              </Badge>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Активные объекты</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.active}</p>
              <p className="mt-2 text-sm text-muted-foreground">Уже готовы к назначению мастеров и ролей.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Нужны доступы</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.needsAttention}</p>
              <p className="mt-2 text-sm text-muted-foreground">Проверьте публикацию, контакты и состояние карточек салонов.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Быстрый маршрут</p>
              <Button className="mt-4 w-full" onClick={() => openOwnerSection("salons")}>
                Открыть мои салоны
              </Button>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSalons.length > 0 ? (
              filteredSalons.map(({ salon, localizedName, attentionFlags, readinessPercent }) => (
                <Card key={`staff-${salon.id}`} className="border-border/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-foreground">{localizedName}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Доступы, мастера и роли открываются внутри рабочего пространства конкретного салона.
                      </p>
                    </div>
                    <Badge variant="outline" className="border-border/70">
                      {readinessPercent}% готовности
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {attentionFlags.length > 0 ? (
                      attentionFlags.slice(0, 3).map((flag) => (
                        <Badge key={`${salon.id}-${flag}`} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          {flag}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        Команда может работать без блокеров
                      </Badge>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href={`/owner/salon/${salon.id}?tab=masters`}>Открыть мастеров</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/owner/salon/${salon.id}?tab=access`}>Открыть доступы</Link>
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground lg:col-span-2">
                Сначала создайте салон, и здесь появится owner-слой для управления мастерами и доступами.
              </Card>
            )}
          </div>
        </section>
      )}

      {activeSection === "services" && (
        <section className="space-y-4">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Услуги по сети салонов</h3>
                <p className="text-sm text-muted-foreground">
                  Owner-уровень показывает, где нужно навести порядок в каталоге, а редактирование идёт уже внутри конкретного салона.
                </p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {filteredSalons.length} в фокусе
              </Badge>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Опубликованы</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.active}</p>
              <p className="mt-2 text-sm text-muted-foreground">Могут принимать трафик и бронирования.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Черновики</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.draft}</p>
              <p className="mt-2 text-sm text-muted-foreground">Им особенно важно заполнить услуги и цены.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Нулевые отзывы</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{filteredSalons.filter((item) => item.reviewCount === 0).length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Часто это значит, что каталог услуг ещё не продаёт как надо.</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSalons.length > 0 ? (
              filteredSalons.map(({ salon, localizedName, status, reviewCount }) => (
                <Card key={`services-${salon.id}`} className="border-border/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-foreground">{localizedName}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Каталог услуг, порядок на витрине и цены управляются из рабочего пространства салона.
                      </p>
                    </div>
                    <Badge variant="outline" className={ownerStatusBadgeClass(status)}>
                      {ownerStatusLabel(status)}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Отзывы</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{reviewCount}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Контур</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{status === "active" ? "Готов к росту" : "Нужен owner-апрув"}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href={`/owner/salon/${salon.id}?tab=services`}>Открыть услуги</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/owner/salon/${salon.id}?tab=public`}>Открыть витрину</Link>
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground lg:col-span-2">
                Сначала добавьте салон, и здесь появится owner-уровень для каталога услуг.
              </Card>
            )}
          </div>
        </section>
      )}

      {activeSection === "bookings" && (
        <section className="space-y-4">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Записи по сети владельца</h3>
                <p className="text-sm text-muted-foreground">
                  Вместо падающего старого advanced-bookings owner видит устойчивую точку входа в бронирования каждого салона.
                </p>
              </div>
              <Button variant="outline" onClick={() => openOwnerSection("messages")}>
                Открыть сообщения
              </Button>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Салоны в сети</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.total}</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Нужны действия</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{ownerSalonSummary.needsAttention}</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Открытые обращения</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{stats.unresolvedTickets}</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSalons.length > 0 ? (
              filteredSalons.map(({ salon, localizedName, localizedCity, status }) => (
                <Card key={`bookings-${salon.id}`} className="border-border/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-foreground">{localizedName}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {localizedCity || "Город не указан"}{salon.address ? `, ${salon.address}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={ownerStatusBadgeClass(status)}>
                      {ownerStatusLabel(status)}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Все рабочие бронирования, клиенты и статусы открываются внутри конкретного салона, где уже есть нужный контекст.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href={`/owner/salon/${salon.id}?tab=bookings`}>Открыть записи</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/owner/salon/${salon.id}?tab=clients`}>Открыть клиентов</Link>
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground lg:col-span-2">
                После создания первого салона здесь появится owner-слой по записям и CRM.
              </Card>
            )}
          </div>
        </section>
      )}

      {activeSection === "clients" && (
        <section className="space-y-4">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Клиентская база владельца</h3>
                <p className="text-sm text-muted-foreground">
                  Сводный список клиентов по всем салонам с быстрым переходом в нужный объект.
                </p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {ownerClients.length} клиентов
              </Badge>
            </div>
          </Card>

          {sectionLoading ? (
            <Card className="border-border/70 p-8 text-center text-muted-foreground shadow-sm">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
              Загружаем клиентскую базу владельца
            </Card>
          ) : ownerClients.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {ownerClients.map((client) => (
                <Card key={`${client.salonId}-${client.id}`} className="border-border/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-foreground">{client.name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{client.salonName}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {client.email && <span className="break-all">{client.email}</span>}
                        {client.phone && <span>{client.phone}</span>}
                        {client.city && <span>{client.city}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">{formatMoney(client.totalSpent)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">UZS всего</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Визиты</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{client.totalBookings}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Завершено</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{client.completedBookings}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Отмены</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{client.cancelledBookings}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Последний визит</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{formatDate(client.lastVisit)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" asChild>
                      <Link href={`/owner/salon/${client.salonId}?tab=clients`}>Открыть салон клиента</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground shadow-sm">
              После первых бронирований здесь появится живая клиентская база по всем салонам владельца.
            </Card>
          )}
        </section>
      )}

      {activeSection === "messages" && (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-border/70 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Коммуникации владельца</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Единая точка входа в сигналы по платформе, owner-support и рабочие переходы в кабинеты салонов.
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">Непрочитанные уведомления</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{stats.unreadNotifications}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Сигналы по записям, публикации и изменениям в owner-контуре.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">Открытые обращения</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{stats.unresolvedTickets}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Тикеты и переписка с платформой по модерации, доступам и техвопросам.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                Клиентские чаты лучше всего открывать прямо из рабочего пространства конкретного салона, где уже есть контекст по отзывам, клиентам и бронированиям.
              </div>
            </div>
          </Card>

          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Последние сигналы</h3>
                <p className="text-sm text-muted-foreground">Живой inbox владельца без лишнего шума.</p>
              </div>
              {stats.unreadNotifications > 0 && (
                <Button variant="outline" size="sm" onClick={() => void onMarkAllNotificationsRead()}>
                  Прочитать всё
                </Button>
              )}
            </div>
            <div className="mt-5 space-y-3">
              {notifications.length > 0 ? (
                notifications.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-foreground">{item.message || item.type}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.type}</p>
                      </div>
                      <Badge variant="outline" className={item.isRead ? "border-border/70" : "border-primary/30 bg-primary/5 text-primary"}>
                        {item.isRead ? "Прочитано" : "Новое"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</span>
                      {!item.isRead && (
                        <Button variant="ghost" size="sm" onClick={() => void onMarkNotificationRead(item.id)}>
                          Отметить прочитанным
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                  У владельца пока нет входящих сигналов. Когда появятся записи, ответы платформы или изменения статусов, они соберутся здесь.
                </div>
              )}
            </div>
          </Card>
        </section>
      )}

      {activeSection === "reviews" && (
        <section className="space-y-4">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Отзывы по сети владельца</h3>
                <p className="text-sm text-muted-foreground">
                  Сводная репутация по всем салонам с быстрым переходом в нужное рабочее пространство.
                </p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {ownerReviews.length} отзывов
              </Badge>
            </div>
          </Card>

          {sectionLoading ? (
            <Card className="border-border/70 p-8 text-center text-muted-foreground shadow-sm">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
              Загружаем отзывы по всей сети
            </Card>
          ) : ownerReviews.length > 0 ? (
            <div className="space-y-4">
              {ownerReviews.map((review) => (
                <Card key={`${review.salonId}-${review.id}`} className="border-border/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-foreground">{review.clientName || "Клиент"}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{review.salonName}</p>
                      {review.masterName && (
                        <p className="mt-1 text-sm text-muted-foreground">Мастер: {review.masterName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">{review.rating}/5</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-4 break-words text-sm leading-6 text-foreground">{review.comment}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Badge variant="outline" className={review.ownerResponse ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
                      {review.ownerResponse ? "Есть ответ владельца" : "Требует ответа"}
                    </Badge>
                    <Button variant="outline" asChild>
                      <Link href={`/owner/salon/${review.salonId}?tab=reviews`}>Открыть в салоне</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground shadow-sm">
              После первых завершённых визитов отзывы по всем салонам владельца появятся здесь.
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
                  Доход, средний чек и динамика по сети салонов без переходов в отдельные внешние панели.
                </p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {salons.length} салонов в аналитике
              </Badge>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Средний рейтинг</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {ownerSalonSummary.ratingAverage > 0 ? ownerSalonSummary.ratingAverage.toFixed(1) : "—"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Общий сигнал по качеству сети владельца.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Готовые карточки</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{filteredSalons.filter((item) => item.readinessPercent === 100).length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Полностью собранные салоны, готовые к трафику.</p>
            </Card>
            <Card className="border-border/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Точки роста</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{filteredSalons.filter((item) => item.reviewCount === 0).length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Салоны без отзывов, где важен первый клиентский опыт.</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSalons.length > 0 ? (
              filteredSalons.map(({ salon, localizedName, averageRating, reviewCount, readinessPercent }) => (
                <Card key={`analytics-${salon.id}`} className="border-border/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-foreground">{localizedName}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Внутри карточки салона уже доступна детальная аналитика по записям, отзывам и состоянию workspace.
                      </p>
                    </div>
                    <Badge variant="outline" className="border-border/70">
                      {readinessPercent}% готовности
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Рейтинг</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{averageRating > 0 ? averageRating.toFixed(1) : "—"}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Отзывы</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{reviewCount}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href={`/owner/salon/${salon.id}?tab=overview`}>Открыть салон</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/owner/salon/${salon.id}?tab=reviews`}>Открыть отзывы</Link>
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground shadow-sm lg:col-span-2">
                Сначала создайте хотя бы один салон, и здесь появится owner-аналитика по сети.
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
              Технические проблемы, модерация, платежи, клиенты и owner-вопросы в одном канале.
            </p>
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
                placeholder="Опишите вопрос или проблему"
                rows={6}
                value={supportDraft.message}
                onChange={(event) => setSupportDraft((current) => ({ ...current, message: event.target.value }))}
              />
              <Button className="w-full" onClick={() => void onSupportTicket()} disabled={sendingSupport}>
                {sendingSupport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Отправить обращение
              </Button>
            </div>
          </Card>

          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">История обращений</h3>
                <p className="text-sm text-muted-foreground">Текущие и закрытые owner-тикеты по платформе.</p>
              </div>
              <Badge variant="outline" className="border-border/70">
                {tickets.length} тикетов
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-foreground">{ticket.subject}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{ticket.category}</p>
                      </div>
                      <Badge variant="outline" className="border-border/70">{ticket.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="text-sm text-muted-foreground">Создано: {formatDate(ticket.createdAt)}</span>
                      <span className="text-sm text-muted-foreground">Обновлено: {formatDate(ticket.updatedAt)}</span>
                      {ticket.status !== "closed" && (
                        <Button variant="ghost" size="sm" onClick={() => void onCloseSupportTicket(ticket.id)}>
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
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Центр уведомлений</h3>
                <p className="text-sm text-muted-foreground">
                  Все owner-сигналы: публикация, события по салонам, статусы и ответы платформы.
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
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <Card key={item.id} className="border-border/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-foreground">{item.message || item.type}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.type}</p>
                    </div>
                    <Badge variant="outline" className={item.isRead ? "border-border/70" : "border-primary/30 bg-primary/5 text-primary"}>
                      {item.isRead ? "Прочитано" : "Новое"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</span>
                    {!item.isRead && (
                      <Button variant="ghost" size="sm" onClick={() => void onMarkNotificationRead(item.id)}>
                        Отметить прочитанным
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground shadow-sm">
                Когда по owner-панели появятся новые сигналы, они соберутся здесь.
              </Card>
            )}
          </div>
        </section>
      )}

      {activeSection === "settings" && (
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card className="border-border/70 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Настройки владельца</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Роль</p>
                <p className="mt-2 text-sm font-medium text-foreground">Владелец салона</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Салоны</p>
                <p className="mt-2 text-sm font-medium text-foreground">{salons.length} в кабинете</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Уведомления</p>
                <p className="mt-2 text-sm font-medium text-foreground">{stats.unreadNotifications} непрочитанных</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Безопасность</p>
                <p className="mt-2 text-sm font-medium text-foreground">Owner-доступ активен</p>
              </div>
            </div>
          </Card>

          <Card className="border-border/70 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Рабочие переходы</h3>
            <div className="mt-5 grid gap-3">
              <Button variant="outline" className="justify-start" onClick={() => openOwnerSection("support")}>
                <Shield className="mr-2 h-4 w-4" />
                Перейти в поддержку
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => openOwnerSection("notifications")}>
                <Bell className="mr-2 h-4 w-4" />
                Открыть уведомления
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => openOwnerSection("salons")}>
                <Store className="mr-2 h-4 w-4" />
                Управлять салонами
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => void onRefresh()}>
                <Settings className="mr-2 h-4 w-4" />
                Обновить owner-панель
              </Button>
            </div>
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
