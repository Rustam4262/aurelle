import { MessengerLink } from "@/components/messenger-link";
import { useCabinetTab } from "@/hooks/use-cabinet-tab";
import { BackButton } from "@/components/back-button";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Heart,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  LogOut,
  MessageCircle,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  UserCircle2,
} from "lucide-react";
import type { Notification, SupportTicket, UserProfile } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientBookings } from "@/components/client/ClientBookings";
import { ClientDashboard } from "@/components/client/ClientDashboard";
import { ClientFavorites } from "@/components/client/ClientFavorites";
import { ClientProfile } from "@/components/client/ClientProfile";
import { ClientReviews } from "@/components/client/ClientReviews";
import { ClientSupport } from "@/components/client/ClientSupport";
import { WriteReviewDialog } from "@/components/client/WriteReviewDialog";
import type {
  EnrichedBooking,
  EnrichedFavorite,
  EnrichedMasterFavorite,
  EnrichedReview,
} from "@/components/client/types";

type TicketWithCounts = SupportTicket & {
  messageCount: number;
  unreadCount: number;
};

type CabinetTab =
  | "overview"
  | "profile"
  | "bookings"
  | "favorites"
  | "reviews"
  | "messages"
  | "support"
  | "notifications"
  | "security";

type CopyDictionary = Record<
  "ru" | "uz" | "en",
  {
    pageTitle: string;
    pageSubtitle: string;
    heroEyebrow: string;
    heroTitle: string;
    heroText: string;
    profileCompletion: string;
    quickActions: string;
    whatNow: string;
    whatNowText: string;
    nearestVisit: string;
    pendingReview: string;
    inbox: string;
    safety: string;
    openSupport: string;
    allCaughtUp: string;
    allCaughtUpText: string;
    noNotifications: string;
    noNotificationsText: string;
    markAllRead: string;
    unread: string;
    read: string;
    communicationsTitle: string;
    communicationsText: string;
    bookingLinked: string;
    openSalon: string;
    openBookings: string;
    noCommunicationItems: string;
    noCommunicationItemsText: string;
    securityTitle: string;
    securityText: string;
    passwordCta: string;
    profileCta: string;
    supportCta: string;
    signOutCta: string;
    refreshCta: string;
    accountStatus: string;
    profileStatus: string;
    completeProfile: string;
    roleLabel: string;
    registrationDate: string;
    notificationsLabel: string;
    supportLabel: string;
    salonsLabel: string;
    mastersLabel: string;
    reviewsLabel: string;
    activeBookings: string;
    upcomingVisits: string;
    completedVisits: string;
    cancelledVisits: string;
    clientRole: string;
    activeStatus: string;
    incompleteStatus: string;
    securityHint: string;
    findSalon: string;
    findMaster: string;
    myBookings: string;
    favorites: string;
    myReviews: string;
    messages: string;
    support: string;
    settings: string;
  }
>;

const copy: CopyDictionary = {
  ru: {
    pageTitle: "Личный кабинет клиента",
    pageSubtitle: "Записи, избранное, отзывы, поддержка и все важные действия в одном месте.",
    heroEyebrow: "Персональное пространство AURELLE",
    heroTitle: "Управляйте визитами, любимыми салонами и своей историей без лишних шагов",
    heroText:
      "Собрали для вас живой кабинет клиента: ближайшие визиты, быстрые действия, уведомления, отзывы и поддержка в одной понятной системе.",
    profileCompletion: "Профиль заполнен",
    quickActions: "Быстрые действия",
    whatNow: "Нужно сделать сейчас",
    whatNowText: "Короткая операционная сводка по вашему кабинету.",
    nearestVisit: "Ближайший визит",
    pendingReview: "Ждут отзыва",
    inbox: "Непрочитано",
    safety: "Безопасность",
    openSupport: "Открытые обращения",
    allCaughtUp: "Сейчас всё спокойно",
    allCaughtUpText: "Новых задач нет: можно искать следующий визит или обновить профиль.",
    noNotifications: "Уведомлений пока нет",
    noNotificationsText:
      "Когда появятся новые записи, изменения статусов или ответы, они соберутся здесь.",
    markAllRead: "Прочитать всё",
    unread: "Непрочитано",
    read: "Прочитано",
    communicationsTitle: "Связь с салонами и мастерами",
    communicationsText:
      "Контакты салонов и мастеров, к которым вы записаны, и обращение в поддержку.",
    bookingLinked: "Связано с записью",
    openSalon: "Открыть салон",
    openBookings: "К записям",
    noCommunicationItems: "Контактов пока нет",
    noCommunicationItemsText: "После первой записи здесь появятся контакты салона или мастера.",
    securityTitle: "Безопасность и настройки аккаунта",
    securityText:
      "Управляйте доступом, переходите к восстановлению пароля и держите профиль в актуальном состоянии.",
    passwordCta: "Сменить пароль",
    profileCta: "Редактировать профиль",
    supportCta: "Открыть поддержку",
    signOutCta: "Выйти из аккаунта",
    refreshCta: "Обновить",
    accountStatus: "Статус аккаунта",
    profileStatus: "Статус профиля",
    completeProfile: "Заполнить профиль",
    roleLabel: "Роль",
    registrationDate: "Дата регистрации",
    notificationsLabel: "Уведомления",
    supportLabel: "Поддержка",
    salonsLabel: "Салоны",
    mastersLabel: "Мастера",
    reviewsLabel: "Отзывы",
    activeBookings: "Активные записи",
    upcomingVisits: "Предстоящие визиты",
    completedVisits: "Завершённые",
    cancelledVisits: "Отменённые",
    clientRole: "Клиент",
    activeStatus: "Активен",
    incompleteStatus: "Нужно дополнить",
    securityHint:
      "Удаление аккаунта и чувствительные вопросы лучше отправлять через поддержку, чтобы не потерять историю визитов.",
    findSalon: "Найти салон",
    findMaster: "Найти мастера",
    myBookings: "Мои записи",
    favorites: "Избранное",
    myReviews: "Мои отзывы",
    messages: "Мессенджер",
    support: "Поддержка",
    settings: "Настройки",
  },
  uz: {
    pageTitle: "Mijoz kabineti",
    pageSubtitle: "Yozuvlar, sevimlilar, fikrlar, yordam va muhim amallar bitta joyda.",
    heroEyebrow: "AURELLE shaxsiy maydoni",
    heroTitle: "Tashriflar, sevimli salonlar va tarixni ortiqcha qadamlarsiz boshqaring",
    heroText:
      "Siz uchun jonli mijoz kabinetini yig'dik: yaqin tashriflar, tezkor amallar, bildirishnomalar, fikrlar va yordam bitta tizimda.",
    profileCompletion: "Profil to'ldirilgan",
    quickActions: "Tezkor amallar",
    whatNow: "Hozir bajarish kerak",
    whatNowText: "Kabinet bo'yicha qisqa operatsion ko'rinish.",
    nearestVisit: "Eng yaqin tashrif",
    pendingReview: "Fikr kutmoqda",
    inbox: "O'qilmagan",
    safety: "Xavfsizlik",
    openSupport: "Ochiq murojaatlar",
    allCaughtUp: "Hozir hammasi joyida",
    allCaughtUpText:
      "Yangi vazifalar yo'q: keyingi tashrifni izlash yoki profilni yangilash mumkin.",
    noNotifications: "Hozircha bildirishnomalar yo'q",
    noNotificationsText:
      "Yangi yozuvlar, status o'zgarishlari yoki javoblar paydo bo'lsa, ular shu yerda ko'rinadi.",
    markAllRead: "Hammasini o'qilgan qilish",
    unread: "O'qilmagan",
    read: "O'qilgan",
    communicationsTitle: "Tashriflar bo'yicha aloqa markazi",
    communicationsText:
      "Bog'liq salonlar, ustalar va yordam kerak bo'ladigan nuqtalarga tezkor kirish.",
    bookingLinked: "Yozuv bilan bog'liq",
    openSalon: "Salon sahifasi",
    openBookings: "Yozuvlarga o'tish",
    noCommunicationItems: "Hozircha faol aloqa yo'q",
    noCommunicationItemsText:
      "Birinchi yozuvdan keyin shu yerda kontaktlar va yordam ssenariylari paydo bo'ladi.",
    securityTitle: "Xavfsizlik va akkaunt sozlamalari",
    securityText:
      "Kirishni boshqaring, parolni tiklashga o'ting va profilingizni doim yangilab turing.",
    passwordCta: "Parolni almashtirish",
    profileCta: "Profilni tahrirlash",
    supportCta: "Yordamga o'tish",
    signOutCta: "Akkauntdan chiqish",
    refreshCta: "Yangilash",
    accountStatus: "Akkaunt holati",
    profileStatus: "Profil holati",
    completeProfile: "Profilni to'ldirish",
    roleLabel: "Rol",
    registrationDate: "Ro'yxatdan o'tgan sana",
    notificationsLabel: "Bildirishnomalar",
    supportLabel: "Yordam",
    salonsLabel: "Salonlar",
    mastersLabel: "Ustalar",
    reviewsLabel: "Fikrlar",
    activeBookings: "Faol yozuvlar",
    upcomingVisits: "Kelayotgan tashriflar",
    completedVisits: "Yakunlangan",
    cancelledVisits: "Bekor qilingan",
    clientRole: "Mijoz",
    activeStatus: "Faol",
    incompleteStatus: "To'ldirish kerak",
    securityHint:
      "Akkauntni o'chirish yoki sezgir masalalarni yordam orqali yuborish xavfsizroq bo'ladi.",
    findSalon: "Salon topish",
    findMaster: "Usta topish",
    myBookings: "Yozuvlarim",
    favorites: "Sevimlilar",
    myReviews: "Fikrlarim",
    messages: "Messenjer",
    support: "Yordam",
    settings: "Sozlamalar",
  },
  en: {
    pageTitle: "Client cabinet",
    pageSubtitle: "Bookings, favorites, reviews, support, and every important action in one place.",
    heroEyebrow: "Your AURELLE space",
    heroTitle: "Manage visits, favorite salons, and your beauty history without extra friction",
    heroText:
      "This cabinet brings upcoming visits, quick actions, reviews, notifications, and support into one premium workspace.",
    profileCompletion: "Profile completion",
    quickActions: "Quick actions",
    whatNow: "What needs attention",
    whatNowText: "A short operational view of your account.",
    nearestVisit: "Nearest visit",
    pendingReview: "Waiting for review",
    inbox: "Unread",
    safety: "Security",
    openSupport: "Open tickets",
    allCaughtUp: "You are all caught up",
    allCaughtUpText:
      "No urgent tasks right now. You can plan the next visit or refine your profile.",
    noNotifications: "No notifications yet",
    noNotificationsText:
      "New bookings, status updates, and replies will appear here as they arrive.",
    markAllRead: "Mark all as read",
    unread: "Unread",
    read: "Read",
    communicationsTitle: "Visit communication hub",
    communicationsText: "Fast access to salons, masters, and the journeys where you may need help.",
    bookingLinked: "Linked to booking",
    openSalon: "Open salon",
    openBookings: "Open bookings",
    noCommunicationItems: "No active communication yet",
    noCommunicationItemsText:
      "After your first booking, related contacts and help flows will appear here.",
    securityTitle: "Security and account settings",
    securityText:
      "Keep access under control, move to password recovery, and keep your profile fresh.",
    passwordCta: "Change password",
    profileCta: "Edit profile",
    supportCta: "Open support",
    signOutCta: "Sign out",
    refreshCta: "Refresh",
    accountStatus: "Account status",
    profileStatus: "Profile status",
    completeProfile: "Complete profile",
    roleLabel: "Role",
    registrationDate: "Registration date",
    notificationsLabel: "Notifications",
    supportLabel: "Support",
    salonsLabel: "Salons",
    mastersLabel: "Masters",
    reviewsLabel: "Reviews",
    activeBookings: "Active bookings",
    upcomingVisits: "Upcoming visits",
    completedVisits: "Completed",
    cancelledVisits: "Cancelled",
    clientRole: "Client",
    activeStatus: "Active",
    incompleteStatus: "Needs updates",
    securityHint:
      "For account deletion and sensitive requests, it is safer to contact support so your history is not lost unexpectedly.",
    findSalon: "Find a salon",
    findMaster: "Find a master",
    myBookings: "My bookings",
    favorites: "Favorites",
    myReviews: "My reviews",
    messages: "Messenger",
    support: "Support",
    settings: "Settings",
  },
};

const langMap = {
  ru: "ru-RU",
  uz: "uz-UZ",
  en: "en-US",
} as const;

function localeFor(language: string) {
  return langMap[(language as keyof typeof langMap) || "ru"] || "ru-RU";
}

function localizedName(
  value:
    | string
    | {
        en?: string;
        ru?: string;
        uz?: string;
      }
    | null
    | undefined,
  language: string,
) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language as keyof typeof value] || value.ru || value.en || value.uz || "";
}

function formatDate(value: string | Date | null | undefined, language: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(localeFor(language), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function profileCompletion(profile: UserProfile | null) {
  if (!profile) return 25;
  const checks = [
    !!profile.fullName,
    !!profile.phone,
    !!profile.city,
    !!profile.avatarUrl,
    !!profile.gender,
    !!profile.birthday,
  ];
  const completed = checks.filter(Boolean).length;
  return Math.max(25, Math.round((completed / checks.length) * 100));
}

const BOOKING_STATUS_LABELS: Record<string, Record<string, string>> = {
  confirmed: { en: "confirmed", ru: "подтверждена", uz: "tasdiqlandi" },
  cancelled: { en: "cancelled", ru: "отменена", uz: "bekor qilindi" },
  completed: { en: "completed", ru: "завершена", uz: "yakunlandi" },
  in_progress: { en: "in progress", ru: "в процессе", uz: "jarayonda" },
  no_show: { en: "marked as no-show", ru: "отмечена как неявка", uz: "kelmadi deb belgilandi" },
};

function buildNotificationMessage(notification: Notification, language: string) {
  if (notification.message) return notification.message;

  const bookingDate = notification.metadata?.bookingDate;
  const startTime = notification.metadata?.startTime;
  const datePart = bookingDate ? formatDate(bookingDate, language) : null;

  switch (notification.type) {
    case "new_booking":
      return language === "en"
        ? `New booking${datePart ? ` on ${datePart}` : ""}${startTime ? ` at ${startTime}` : ""}.`
        : language === "uz"
          ? `Yangi yozuv${datePart ? `: ${datePart}` : ""}${startTime ? `, ${startTime}` : ""}.`
          : `Новая запись${datePart ? `: ${datePart}` : ""}${startTime ? `, ${startTime}` : ""}.`;
    case "booking_cancelled":
      return language === "en"
        ? `Your booking${datePart ? ` on ${datePart}` : ""}${startTime ? ` at ${startTime}` : ""} was cancelled.`
        : language === "uz"
          ? `Yozuvingiz${datePart ? `: ${datePart}` : ""}${startTime ? `, ${startTime}` : ""} bekor qilindi.`
          : `Ваша запись${datePart ? `: ${datePart}` : ""}${startTime ? `, ${startTime}` : ""} была отменена.`;
    case "booking_status_changed": {
      const rawStatus = String(notification.metadata?.status ?? "");
      const status =
        BOOKING_STATUS_LABELS[rawStatus]?.[language] ??
        BOOKING_STATUS_LABELS[rawStatus]?.en ??
        rawStatus;
      return language === "en"
        ? `Your booking${datePart ? ` on ${datePart}` : ""}${startTime ? ` at ${startTime}` : ""} is now ${status}.`
        : language === "uz"
          ? `Yozuvingiz${datePart ? `: ${datePart}` : ""}${startTime ? `, ${startTime}` : ""} holati: ${status}.`
          : `Ваша запись${datePart ? `: ${datePart}` : ""}${startTime ? `, ${startTime}` : ""} теперь: ${status}.`;
    }
    default:
      return notification.type.replace(/_/g, " ");
  }
}

function NotificationCenter({
  notifications,
  unreadCount,
  language,
  markRead,
  markAllRead,
  isMarkingAll,
}: {
  notifications: Notification[];
  unreadCount: number;
  language: string;
  markRead: (id: string) => void;
  markAllRead: () => void;
  isMarkingAll: boolean;
}) {
  const current = copy[(language as keyof typeof copy) || "ru"];

  if (!notifications.length) {
    return (
      <Card className="border-border/70 p-10 text-center">
        <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
        <h3 className="text-lg font-semibold text-foreground">{current.noNotifications}</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          {current.noNotificationsText}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{current.notificationsLabel}</h3>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} ${current.unread.toLowerCase()}` : current.read}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={markAllRead}
          disabled={!unreadCount || isMarkingAll}
          data-testid="button-mark-all-notifications-read"
        >
          {isMarkingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {current.markAllRead}
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`border-border/70 p-4 transition-colors ${
              notification.isRead ? "bg-background" : "bg-primary/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={notification.isRead ? "secondary" : "default"}>
                    {notification.isRead ? current.read : current.unread}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(notification.createdAt, language)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground">
                  {buildNotificationMessage(notification, language)}
                </p>
              </div>
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markRead(notification.id)}
                  data-testid={`button-mark-notification-read-${notification.id}`}
                >
                  {current.markAllRead}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function CommunicationsTab({
  bookings,
  language,
  onOpenSupport,
  onOpenBookings,
}: {
  bookings: EnrichedBooking[];
  language: string;
  onOpenSupport: () => void;
  onOpenBookings: () => void;
}) {
  const { t } = useTranslation();
  const current = copy[(language as keyof typeof copy) || "ru"];
  const communicationItems = bookings.slice(0, 6);

  if (!communicationItems.length) {
    return (
      <Card className="border-border/70 p-10 text-center">
        <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
        <h3 className="text-lg font-semibold text-foreground">{current.noCommunicationItems}</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          {current.noCommunicationItemsText}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={onOpenBookings}>{current.openBookings}</Button>
          <Button variant="outline" onClick={onOpenSupport}>
            {current.supportCta}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 p-6">
        <h3 className="text-lg font-semibold text-foreground">{current.communicationsTitle}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{current.communicationsText}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {communicationItems.map((booking) => (
          <Card key={booking.id} className="border-border/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {current.bookingLinked}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {localizedName(booking.service?.name, language) || "Service"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {localizedName(booking.salon?.name, language) || "Salon"}
                </p>
                {booking.master?.name && (
                  <p className="mt-1 text-sm text-muted-foreground">{booking.master.name}</p>
                )}
              </div>
              <Badge className={BOOKING_STATUS_COLORS[booking.status || "pending"]}>
                {t(`marketplace.client.status.${booking.status}`)}
              </Badge>
            </div>
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p>{formatDate(booking.bookingDate, language)}</p>
              <p>
                {booking.startTime}
                {booking.endTime ? ` - ${booking.endTime}` : ""}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/salon/${booking.salonId}`}>{current.openSalon}</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenBookings}>
                {current.openBookings}
              </Button>
              <Button variant="ghost" size="sm" onClick={onOpenSupport}>
                {current.supportCta}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SecurityTab({
  profile,
  language,
  unreadNotifications,
  openSupport,
  onEditProfile,
  onOpenSupport,
  onLogout,
  isLoggingOut,
}: {
  profile: UserProfile | null;
  language: string;
  unreadNotifications: number;
  openSupport: number;
  onEditProfile: () => void;
  onOpenSupport: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  const current = copy[(language as keyof typeof copy) || "ru"];
  const completion = profileCompletion(profile);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/70 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">{current.securityTitle}</h3>
            <p className="text-sm text-muted-foreground">{current.securityText}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{current.accountStatus}</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{current.activeStatus}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {current.roleLabel}: {current.clientRole}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{current.profileStatus}</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{completion}%</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {completion < 100 ? current.incompleteStatus : current.activeStatus}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{current.notificationsLabel}</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{unreadNotifications}</p>
            <p className="mt-3 text-xs text-muted-foreground">{current.unread}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{current.supportLabel}</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{openSupport}</p>
            <p className="mt-3 text-xs text-muted-foreground">{current.openSupport}</p>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{current.securityHint}</p>
      </Card>

      <Card className="border-border/70 p-6">
        <h3 className="text-lg font-semibold text-foreground">{current.settings}</h3>
        <div className="mt-5 space-y-3">
          <Button className="w-full justify-start" variant="outline" onClick={onEditProfile}>
            <UserCircle2 className="mr-2 h-4 w-4" />
            {current.profileCta}
          </Button>
          <Button className="w-full justify-start" variant="outline" asChild>
            <Link href="/auth/forgot-password">
              <LockKeyhole className="mr-2 h-4 w-4" />
              {current.passwordCta}
            </Link>
          </Button>
          <Button className="w-full justify-start" variant="outline" onClick={onOpenSupport}>
            <LifeBuoy className="mr-2 h-4 w-4" />
            {current.supportCta}
          </Button>
          <Separator className="my-4" />
          <Button
            className="w-full justify-start"
            variant="destructive"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {current.signOutCta}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function ClientPage() {
  const { i18n } = useTranslation();
  const language = (i18n.language as keyof typeof copy) || "ru";
  const current = copy[language] || copy.ru;
  const { user, isLoading, logout, isLoggingOut } = useAuth({
    requireAuth: true,
    redirectTo: "/auth",
  });

  const [activeTab, setCabinetTab] = useCabinetTab<CabinetTab>("overview");
  const [, navigateToMessenger] = useLocation();
  const setActiveTab = (tab: CabinetTab) =>
    tab === "messages" ? navigateToMessenger("/messenger") : setCabinetTab(tab);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [bookingForReview, setBookingForReview] = useState<EnrichedBooking | null>(null);

  const messengerQuery = useQuery<{ unread: number }[]>({
    queryKey: ["messenger", user?.id, "chats"],
    queryFn: async () => (await apiRequest("GET", "/api/messenger/conversations")).json(),
    enabled: !!user,
    refetchInterval: 5000,
  });
  const unreadMessages = messengerQuery.data?.reduce((sum, chat) => sum + chat.unread, 0) || 0;

  const profileQuery = useQuery<UserProfile | null>({
    queryKey: ["/api/client/profile"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const bookingsQuery = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/client/bookings"],
    enabled: !!user,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const favoritesQuery = useQuery<EnrichedFavorite[]>({
    queryKey: ["/api/client/favorites"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const masterFavoritesQuery = useQuery<EnrichedMasterFavorite[]>({
    queryKey: ["/api/client/master-favorites"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const reviewsQuery = useQuery<EnrichedReview[]>({
    queryKey: ["/api/client/reviews"],
    enabled: !!user,
    staleTime: 15_000,
  });

  const ticketsQuery = useQuery<TicketWithCounts[]>({
    queryKey: ["/api/client/support/tickets"],
    enabled: !!user,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const notificationsQuery = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/client/favorites"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/client/master-favorites"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/client/support/tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
      ]);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) =>
      apiRequest("DELETE", `/api/client/bookings/${bookingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (payload: { bookingId: string; rating: number; comment: string }) =>
      apiRequest("POST", "/api/client/reviews", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      setReviewDialogOpen(false);
      setBookingForReview(null);
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", "/api/notifications/read-all", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const bookings = bookingsQuery.data || [];
  const favorites = favoritesQuery.data || [];
  const masterFavorites = masterFavoritesQuery.data || [];
  const reviews = reviewsQuery.data || [];
  const tickets = ticketsQuery.data || [];
  const notifications = notificationsQuery.data || [];

  const fallbackProfile = useMemo(
    () =>
      ({
        userId: user?.id || "",
        role: "client",
        fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as UserProfile,
    [user],
  );

  const profileData = profileQuery.data || fallbackProfile;

  const stats = useMemo(() => {
    const upcoming = bookings.filter((booking) =>
      ["pending", "confirmed"].includes(booking.status ?? ""),
    );
    const active = bookings.filter(
      (booking) => !["completed", "cancelled"].includes(booking.status ?? ""),
    );
    const completed = bookings.filter((booking) => booking.status === "completed");
    const cancelled = bookings.filter((booking) => booking.status === "cancelled");
    const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;
    const unreadSupport = tickets.reduce((sum, ticket) => sum + ticket.unreadCount, 0);
    const pendingReviewBookings = completed.filter(
      (booking) => !reviews.some((review) => review.bookingId === booking.id),
    );

    return {
      activeCount: active.length,
      upcomingCount: upcoming.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      favoritesCount: favorites.length,
      masterFavoritesCount: masterFavorites.length,
      reviewsCount: reviews.length,
      unreadNotifications,
      unreadSupport,
      openSupportCount: tickets.filter(
        (ticket) => !["closed", "resolved"].includes(ticket.status || ""),
      ).length,
      pendingReviewBookings,
    };
  }, [bookings, favorites.length, masterFavorites.length, notifications, reviews, tickets]);

  const nextBooking = useMemo(
    () =>
      [...bookings]
        .filter((booking) => ["pending", "confirmed"].includes(booking.status ?? ""))
        .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime())[0] ||
      null,
    [bookings],
  );

  const heroActions = [
    { id: "find-salon", label: current.findSalon, icon: Search, href: "/search" },
    { id: "find-master", label: current.findMaster, icon: Sparkles, href: "/search?tab=masters" },
    {
      id: "bookings",
      label: current.myBookings,
      icon: CalendarClock,
      tab: "bookings" as CabinetTab,
    },
    { id: "favorites", label: current.favorites, icon: Heart, tab: "favorites" as CabinetTab },
    { id: "reviews", label: current.myReviews, icon: Star, tab: "reviews" as CabinetTab },
    { id: "messages", label: current.messages, icon: MessageCircle, tab: "messages" as CabinetTab },
    { id: "support", label: current.support, icon: LifeBuoy, tab: "support" as CabinetTab },
    { id: "settings", label: current.settings, icon: Settings2, tab: "security" as CabinetTab },
  ];

  const tabBadges: Partial<Record<CabinetTab, number>> = {
    bookings: stats.activeCount,
    favorites: stats.favoritesCount + stats.masterFavoritesCount,
    reviews: stats.pendingReviewBookings.length,
    messages: unreadMessages,
    support: stats.openSupportCount,
    notifications: stats.unreadNotifications,
  };

  const openReviewDialog = (booking: EnrichedBooking) => {
    setBookingForReview(booking);
    setReviewDialogOpen(true);
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName =
    profileData.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Client";
  const profileScore = profileCompletion(profileData);
  const globalLoading =
    profileQuery.isLoading ||
    bookingsQuery.isLoading ||
    favoritesQuery.isLoading ||
    masterFavoritesQuery.isLoading ||
    reviewsQuery.isLoading ||
    ticketsQuery.isLoading ||
    notificationsQuery.isLoading;

  return (
    <div className="audience-client-surface min-h-screen">
      <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="cabinet-topbar flex flex-col gap-4 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <BackButton fallback="/" />
            <div className="min-w-0">
              <h1 className="font-serif text-2xl leading-tight tracking-[-0.01em] text-foreground sm:text-[1.7rem]">
                {current.pageTitle}
              </h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground sm:max-w-2xl">
                {current.pageSubtitle}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            <ThemeToggle />
            <MessengerLink userId={user?.id} />
            <LanguageSwitcher />
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              {refreshMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              <span className="truncate">{current.refreshCta}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => void logout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              <span className="truncate">{current.signOutCta}</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <Tabs
          value={activeTab === "notifications" ? "messages" : activeTab}
          onValueChange={(value) => setActiveTab(value as CabinetTab)}
          orientation="vertical"
          className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]"
        >
          <aside className="cabinet-sidebar min-w-0 lg:sticky lg:top-28" aria-label={current.pageTitle}>
            <TabsList className="flex h-auto w-full flex-row items-stretch justify-start gap-1 overflow-x-auto no-scrollbar bg-transparent p-0 lg:flex-col lg:overflow-visible">
              {[
                ["overview", language === "ru" ? "Личный кабинет" : current.pageTitle, UserCircle2],
                ["profile", current.profileCta, UserCircle2],
                ["bookings", current.myBookings, CalendarClock],
                ["reviews", current.myReviews, Star],
                ["favorites", current.favorites, Heart],
                ["messages", current.messages, MessageCircle],
                ["support", current.support, LifeBuoy],
                ["security", current.settings, Settings2],
              ].map(([tabId, label, Icon]) => {
                const id = tabId as CabinetTab;
                const NavIcon = Icon as typeof UserCircle2;
                const nested = ["profile", "bookings", "reviews", "favorites"].includes(id);
                const count =
                  id === "messages"
                    ? stats.unreadSupport + stats.unreadNotifications
                    : tabBadges[id];
                return (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className={
                      "cabinet-nav-item w-auto shrink-0 justify-start whitespace-nowrap data-[state=active]:bg-transparent lg:w-full lg:whitespace-normal " +
                      (nested ? "lg:pl-8" : "font-semibold") +
                      (id === "messages" ? " lg:mt-3" : "")
                    }
                  >
                    <NavIcon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label as string}</span>
                    {count ? (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground shadow-sm shadow-primary/40">
                        {count}
                      </span>
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </aside>
          <div className="min-w-0">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <section className="grid gap-5">
                <Card className="overflow-hidden rounded-[2rem] border-0 bg-transparent p-0 shadow-none">
                  <div className="cabinet-hero">
                    <div className="relative flex flex-col gap-5">
                      <div className="flex items-center gap-4 min-w-0">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 ring-4 ring-primary/25 ring-offset-4 ring-offset-card shadow-glow">
                          <AvatarImage
                            src={profileData.avatarUrl || user.profileImageUrl || undefined}
                            alt={displayName}
                          />
                          <AvatarFallback>{displayName[0]?.toUpperCase() || "C"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground mb-1">
                            {current.heroEyebrow}
                          </p>
                          <h2 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-[-0.01em] break-words">
                            {displayName}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {current.pageSubtitle}
                          </p>
                          {profileData.city && (
                            <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                              <UserCircle2 className="h-3.5 w-3.5" />
                              {profileData.city}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={() => setActiveTab("profile")}>
                          {current.profileCta}
                        </Button>
                        <Button variant="outline" onClick={() => setActiveTab("messages")}>
                          {current.messages}
                          {unreadMessages > 0 && <Badge className="ml-2">{unreadMessages}</Badge>}
                        </Button>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                          <span>{current.profileCompletion}</span>
                          <span className="font-semibold text-foreground">{profileScore}%</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6 bg-border/60" />

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">{current.quickActions}</p>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {heroActions.map((action) =>
                          action.href ? (
                            <Button
                              key={action.id}
                              asChild
                              variant="outline"
                              className="group h-auto flex-col items-start sm:flex-row sm:items-center gap-2.5 justify-start rounded-2xl border-foreground/10 bg-card/70 px-3.5 py-3.5 text-left whitespace-normal hover:-translate-y-0.5 hover:shadow-md"
                            >
                              <Link href={action.href}>
                                <action.icon className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 break-normal hyphens-none">
                                  {action.label}
                                </span>
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              key={action.id}
                              variant="outline"
                              className="group h-auto flex-col items-start sm:flex-row sm:items-center gap-2.5 justify-start rounded-2xl border-foreground/10 bg-card/70 px-3.5 py-3.5 text-left whitespace-normal hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => action.tab && setActiveTab(action.tab)}
                            >
                              <action.icon className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 break-normal hyphens-none">
                                {action.label}
                              </span>
                            </Button>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border-border/70 p-6 shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{current.whatNow}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{current.whatNowText}</p>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">{current.nearestVisit}</p>
                        <CalendarClock className="h-4 w-4 text-primary" />
                      </div>
                      <p className="mt-3 break-words text-xl font-semibold text-foreground">
                        {nextBooking
                          ? localizedName(nextBooking.service?.name, language) || "Service"
                          : current.allCaughtUp}
                      </p>
                      <p className="mt-2 break-words text-sm text-muted-foreground">
                        {nextBooking
                          ? `${formatDate(nextBooking.bookingDate, language)} · ${nextBooking.startTime}`
                          : current.allCaughtUpText}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">{current.pendingReview}</p>
                        <Star className="h-4 w-4 text-amber-500" />
                      </div>
                      <p className="mt-3 text-xl font-semibold text-foreground">
                        {stats.pendingReviewBookings.length}
                      </p>
                      <Button
                        variant="ghost"
                        className="mt-2 h-auto p-0 text-primary"
                        onClick={() => setActiveTab("reviews")}
                      >
                        {current.myReviews}
                      </Button>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">{current.openSupport}</p>
                        <LifeBuoy className="h-4 w-4 text-primary" />
                      </div>
                      <p className="mt-3 text-xl font-semibold text-foreground">
                        {stats.openSupportCount}
                      </p>
                      <Button
                        variant="ghost"
                        className="mt-2 h-auto p-0 text-primary"
                        onClick={() => setActiveTab("support")}
                      >
                        {current.support}
                      </Button>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">{current.safety}</p>
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      </div>
                      <p className="mt-3 text-xl font-semibold text-foreground">
                        {current.activeStatus}
                      </p>
                      <Button
                        variant="ghost"
                        className="mt-2 h-auto p-0 text-primary"
                        onClick={() => setActiveTab("security")}
                      >
                        {current.settings}
                      </Button>
                    </div>
                  </div>
                </Card>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70 p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">{current.activeBookings}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{stats.activeCount}</p>
                </Card>
                <Card className="border-border/70 p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">{current.upcomingVisits}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {stats.upcomingCount}
                  </p>
                </Card>
                <Card className="border-border/70 p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">{current.completedVisits}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {stats.completedCount}
                  </p>
                </Card>
                <Card className="border-border/70 p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">{current.cancelledVisits}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {stats.cancelledCount}
                  </p>
                </Card>
              </section>

              <ClientDashboard
                bookings={bookings}
                favorites={favorites}
                hideQuickActions
                onNavigateToTab={(tab) => setActiveTab(tab as CabinetTab)}
              />
            </TabsContent>

            <TabsContent value="profile" className="mt-0">
              <ClientProfile profileData={profileData} />
            </TabsContent>

            <TabsContent value="bookings" className="mt-0">
              <ClientBookings
                bookings={bookings}
                isLoading={bookingsQuery.isLoading}
                onCancelBooking={(bookingId) => cancelBookingMutation.mutate(bookingId)}
                isCancelling={cancelBookingMutation.isPending}
                onOpenWriteReview={openReviewDialog}
                hasReviewForBooking={(bookingId) =>
                  reviews.some((review) => review.bookingId === bookingId)
                }
              />
            </TabsContent>

            <TabsContent value="favorites" className="mt-0">
              <ClientFavorites
                favorites={favorites}
                masterFavorites={masterFavorites}
                isLoading={favoritesQuery.isLoading}
                isMasterFavoritesLoading={masterFavoritesQuery.isLoading}
              />
            </TabsContent>

            <TabsContent value="reviews" className="mt-0">
              <ClientReviews
                reviews={reviews}
                isLoading={reviewsQuery.isLoading}
                pendingReviewBookings={stats.pendingReviewBookings}
                onWriteReview={openReviewDialog}
              />
            </TabsContent>

            <TabsContent value="messages" className="mt-0">
              <div className="mb-4">
                <MessengerLink userId={user?.id} />
              </div>
              <CommunicationsTab
                bookings={bookings}
                language={language}
                onOpenSupport={() => setActiveTab("support")}
                onOpenBookings={() => setActiveTab("bookings")}
              />
              <div className="mt-6">
                <NotificationCenter
                  notifications={notifications}
                  unreadCount={stats.unreadNotifications}
                  language={language}
                  markRead={(id) => markNotificationReadMutation.mutate(id)}
                  markAllRead={() => markAllNotificationsReadMutation.mutate()}
                  isMarkingAll={markAllNotificationsReadMutation.isPending}
                />
              </div>
            </TabsContent>

            <TabsContent value="support" className="mt-0">
              <ClientSupport />
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <SecurityTab
                profile={profileQuery.data ?? null}
                language={language}
                unreadNotifications={stats.unreadNotifications}
                openSupport={stats.openSupportCount}
                onEditProfile={() => setActiveTab("profile")}
                onOpenSupport={() => setActiveTab("support")}
                onLogout={() => void logout()}
                isLoggingOut={isLoggingOut}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <WriteReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        booking={bookingForReview}
        onSubmit={(payload) => {
          if (!bookingForReview) return;
          createReviewMutation.mutate({
            bookingId: bookingForReview.id,
            rating: payload.rating,
            comment: payload.comment,
          });
        }}
        isPending={createReviewMutation.isPending || globalLoading}
      />
    </div>
  );
}
