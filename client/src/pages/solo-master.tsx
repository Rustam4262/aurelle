import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  ImagePlus,
  LifeBuoy,
  Loader2,
  LogOut,
  MessageSquare,
  PencilLine,
  PieChart,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PaymentHealthWidget } from "@/components/payment-health-widget";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { CalendarWeekView } from "@/components/calendar-week-view";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { goBackOrNavigate } from "@/lib/safe-back";

type LocalizedText = { en?: string; ru?: string; uz?: string } | null | undefined;

interface MasterData {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  photo: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  telegram: string | null;
  instagram: string | null;
  serviceMode: string | null;
  averageRating: string | null;
  reviewCount: number | null;
  bio: LocalizedText;
}

interface DashboardStats {
  todayBookings: number;
  weekBookings: number;
  monthRevenue: number;
  pendingBookings: number;
}

interface SoloService {
  id: string;
  name: { en: string; ru: string; uz: string };
  description?: LocalizedText;
  category: string;
  priceMin: number;
  priceMax: number | null;
  duration: number;
  serviceMode: string | null;
  isActive: boolean | null;
}

interface BookingItem {
  id: string;
  clientId: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  priceSnapshot: number | null;
  notes: string | null;
  clientName?: string | null;
  clientAvatar?: string | null;
  clientEmail?: string | null;
  service?: SoloService | null;
}

interface PortfolioItem {
  id: string;
  imageUrl: string;
  description?: LocalizedText;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  ownerResponse: string | null;
  createdAt: string | null;
  clientName: string | null;
}

interface ClientDeskItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  lastVisit: string | null;
  favoriteService: string | null;
  latestStatus: string | null;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface SupportMessage {
  id: string;
  senderType: string;
  message: string;
  createdAt: string | null;
}

interface SupportTicketDetail {
  ticket: SupportTicket;
  messages: SupportMessage[];
}

interface NotificationItem {
  id: string;
  message: string | null;
  type: string;
  isRead: boolean | null;
  createdAt: string | null;
}

interface MasterSettings {
  bufferMinutes?: number | null;
  travelBufferMinutes?: number | null;
  autoConfirmBookings?: boolean | null;
  maxAdvanceBookingDays?: number | null;
  minAdvanceBookingHours?: number | null;
}

interface ScheduleDay {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const SERVICE_CATEGORIES = ["Маникюр", "Педикюр", "Волосы", "Макияж", "Брови", "Ресницы", "Косметология", "Массаж", "SPA", "Другое"];

function localize(value: LocalizedText, lang: string) {
  if (!value) return "";
  return value[lang as "en" | "ru" | "uz"] || value.ru || value.en || value.uz || "";
}

function money(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString("ru-RU")} UZS`;
}

function date(value: string | null | undefined, locale = "ru-RU") {
  if (!value) return "—";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "—";
  return target.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

function dateTime(value: string | null | undefined, locale = "ru-RU") {
  if (!value) return "—";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "—";
  return target.toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusTone(status: string) {
  if (["confirmed", "completed", "active"].includes(status)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
  if (["pending", "open", "in_progress", "draft"].includes(status)) return "border-amber-500/30 bg-amber-500/10 text-amber-500";
  if (["cancelled", "closed", "resolved"].includes(status)) return "border-rose-500/30 bg-rose-500/10 text-rose-500";
  return "border-border bg-muted text-muted-foreground";
}

function dayName(day: number, lang: string) {
  const sets = {
    ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    uz: ["Yak", "Dush", "Sesh", "Chor", "Pay", "Juma", "Shan"],
  };
  return sets[lang as "ru" | "en" | "uz"]?.[day] || sets.ru[day];
}

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Sparkles; label: string; value: string | number; hint: string }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-3 break-words text-3xl font-semibold leading-none text-foreground">{value}</p>
          <p className="mt-2 break-words text-sm text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SoloMasterPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language || "ru";
  const tr = (ru: string, en?: string, uz?: string) => (lang === "en" ? en || ru : lang === "uz" ? uz || ru : ru);
  const locale = lang === "en" ? "en-US" : lang === "uz" ? "uz-UZ" : "ru-RU";
  const { user, isLoading: authLoading, logout } = useAuth({ requireAuth: true });
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [supportReply, setSupportReply] = useState("");
  const [reviewReplyDrafts, setReviewReplyDrafts] = useState<Record<string, string>>({});

  const masterQuery = useQuery<MasterData>({ queryKey: ["/api/solo-master/me"], enabled: !!user, staleTime: 60_000 });
  const statsQuery = useQuery<DashboardStats>({ queryKey: ["/api/solo-master/stats"], enabled: !!user, staleTime: 30_000, refetchInterval: 30_000 });
  const servicesQuery = useQuery<SoloService[]>({ queryKey: ["/api/solo-master/services"], enabled: !!user, staleTime: 60_000 });
  const bookingsQuery = useQuery<BookingItem[]>({ queryKey: ["/api/solo-master/bookings"], enabled: !!user, staleTime: 20_000, refetchInterval: 30_000 });
  const scheduleQuery = useQuery<any[]>({ queryKey: ["/api/solo-master/schedule"], enabled: !!user, staleTime: 60_000 });
  const settingsQuery = useQuery<MasterSettings>({ queryKey: ["/api/solo-master/settings"], enabled: !!user, staleTime: 60_000 });
  const reviewsQuery = useQuery<ReviewItem[]>({ queryKey: ["/api/solo-master/reviews"], enabled: !!user, staleTime: 30_000 });
  const clientsQuery = useQuery<ClientDeskItem[]>({ queryKey: ["/api/solo-master/clients"], enabled: !!user, staleTime: 30_000 });
  const notificationsQuery = useQuery<NotificationItem[]>({ queryKey: ["/api/notifications"], enabled: !!user, staleTime: 15_000, refetchInterval: 30_000 });
  const supportTicketsQuery = useQuery<SupportTicket[]>({ queryKey: ["/api/solo-master/support/tickets"], enabled: !!user, staleTime: 15_000, refetchInterval: 30_000 });
  const ticketDetailQuery = useQuery<SupportTicketDetail>({
    queryKey: ["/api/solo-master/support/tickets", selectedTicketId],
    enabled: !!user && !!selectedTicketId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/solo-master/support/tickets/${selectedTicketId}`);
      return res.json();
    },
    staleTime: 5_000,
    refetchInterval: selectedTicketId ? 20_000 : false,
  });
  const portfolioQuery = useQuery<PortfolioItem[]>({
    queryKey: ["/api/portfolio/master", masterQuery.data?.id],
    enabled: !!masterQuery.data?.id,
    queryFn: async () => {
      const res = await fetch(`/api/portfolio/master/${masterQuery.data!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load portfolio");
      return res.json();
    },
    staleTime: 60_000,
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    city: "",
    address: "",
    phone: "",
    telegram: "",
    instagram: "",
    slug: "",
    bio: "",
    serviceMode: "both",
  });
  const [settingsForm, setSettingsForm] = useState({
    bufferMinutes: 15,
    travelBufferMinutes: 30,
    autoConfirmBookings: false,
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 2,
  });
  const [scheduleForm, setScheduleForm] = useState<ScheduleDay[]>([]);
  const [newService, setNewService] = useState({
    name: "",
    category: SERVICE_CATEGORIES[0],
    price: "150000",
    duration: "60",
    serviceMode: "both",
    description: "",
  });
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "question",
    priority: "normal",
    message: "",
  });

  useEffect(() => {
    if (!masterQuery.data) return;
    setProfileForm({
      name: masterQuery.data.name || "",
      city: masterQuery.data.city || "",
      address: masterQuery.data.address || "",
      phone: masterQuery.data.phone || "",
      telegram: masterQuery.data.telegram || "",
      instagram: masterQuery.data.instagram || "",
      slug: masterQuery.data.slug || "",
      bio: localize(masterQuery.data.bio, lang),
      serviceMode: masterQuery.data.serviceMode || "both",
    });
  }, [masterQuery.data, lang]);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setSettingsForm({
      bufferMinutes: settingsQuery.data.bufferMinutes ?? 15,
      travelBufferMinutes: settingsQuery.data.travelBufferMinutes ?? 30,
      autoConfirmBookings: settingsQuery.data.autoConfirmBookings ?? false,
      maxAdvanceBookingDays: settingsQuery.data.maxAdvanceBookingDays ?? 30,
      minAdvanceBookingHours: settingsQuery.data.minAdvanceBookingHours ?? 2,
    });
  }, [settingsQuery.data]);

  useEffect(() => {
    const fallback = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      isOpen: dayOfWeek !== 0,
      openTime: "10:00",
      closeTime: "20:00",
    }));
    const rows = scheduleQuery.data || [];
    if (!rows.length) {
      setScheduleForm(fallback);
      return;
    }
    setScheduleForm(
      fallback.map((day) => {
        const row = rows.find((item) => item.dayOfWeek === day.dayOfWeek);
        return row
          ? { dayOfWeek: day.dayOfWeek, isOpen: !row.isClosed, openTime: row.openTime || day.openTime, closeTime: row.closeTime || day.closeTime }
          : day;
      }),
    );
  }, [scheduleQuery.data]);

  const services = servicesQuery.data || [];
  const bookings = bookingsQuery.data || [];
  const reviews = reviewsQuery.data || [];
  const clients = clientsQuery.data || [];
  const notifications = notificationsQuery.data || [];
  const supportTickets = supportTicketsQuery.data || [];
  const portfolio = portfolioQuery.data || [];

  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const openTickets = supportTickets.filter((item) => !["closed", "resolved"].includes(item.status)).length;
  const upcomingBookings = bookings
    .filter((item) => ["pending", "confirmed"].includes(item.status))
    .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime() || a.startTime.localeCompare(b.startTime));
  const completedBookings = bookings.filter((item) => item.status === "completed");
  const cancelledBookings = bookings.filter((item) => item.status === "cancelled");
  const revenueToday = bookings
    .filter((item) => item.status === "completed" && item.bookingDate?.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((sum, item) => sum + Number(item.priceSnapshot || 0), 0);
  const revenueWeek = bookings
    .filter((item) => item.status === "completed" && Date.now() - new Date(item.bookingDate).getTime() <= 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, item) => sum + Number(item.priceSnapshot || 0), 0);

  const profileChecklist = useMemo(
    () => [
      { label: tr("Фото профиля", "Avatar"), done: Boolean(masterQuery.data?.photo), tab: "profile" },
      { label: tr("Описание", "Bio"), done: Boolean(localize(masterQuery.data?.bio, lang)), tab: "profile" },
      { label: tr("Город", "City"), done: Boolean(masterQuery.data?.city), tab: "profile" },
      { label: tr("Услуги", "Services"), done: services.length > 0, tab: "services" },
      { label: tr("Портфолио", "Portfolio"), done: portfolio.length >= 3, tab: "portfolio" },
      { label: tr("Расписание", "Schedule"), done: scheduleForm.some((item) => item.isOpen), tab: "schedule" },
      { label: tr("Публичная страница", "Public page"), done: Boolean(masterQuery.data?.slug), tab: "publicPage" },
    ],
    [lang, masterQuery.data, portfolio.length, scheduleForm, services.length],
  );
  const profileCompletion = Math.round((profileChecklist.filter((item) => item.done).length / profileChecklist.length) * 100);

  const actionItems = useMemo(() => {
    const result: { title: string; description: string; tab: string }[] = [];
    if (statsQuery.data?.pendingBookings) result.push({ title: tr("Подтвердите новые записи", "Confirm bookings"), description: `${statsQuery.data.pendingBookings} ${tr("записей ждут решения", "bookings need action")}`, tab: "bookings" });
    if (portfolio.length < 3) result.push({ title: tr("Добавьте сильные работы", "Add portfolio"), description: tr("Три-пять работ заметно усиливают конверсию страницы.", "Three to five works improve conversion."), tab: "portfolio" });
    if (unreadNotifications > 0) result.push({ title: tr("Разберите уведомления", "Review notifications"), description: `${unreadNotifications} ${tr("обновлений ждут внимания", "updates need attention")}`, tab: "messages" });
    if (profileCompletion < 100) result.push({ title: tr("Дозаполните профиль", "Finish profile"), description: `${tr("Заполненность сейчас", "Current completion")} ${profileCompletion}%`, tab: "profile" });
    return result;
  }, [portfolio.length, profileCompletion, statsQuery.data?.pendingBookings, unreadNotifications]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((item) => {
      if (bookingFilter !== "all" && item.status !== bookingFilter) return false;
      if (!bookingSearch.trim()) return true;
      const query = bookingSearch.toLowerCase();
      return (item.clientName || "").toLowerCase().includes(query) || localize(item.service?.name, lang).toLowerCase().includes(query) || (item.notes || "").toLowerCase().includes(query);
    });
  }, [bookingFilter, bookingSearch, bookings, lang]);

  const chartData = useMemo(() => {
    const map = new Map<string, { label: string; bookings: number; revenue: number }>();
    for (const booking of bookings) {
      const key = booking.bookingDate?.slice(0, 10) || "unknown";
      const row = map.get(key) || { label: date(booking.bookingDate, locale), bookings: 0, revenue: 0 };
      row.bookings += 1;
      row.revenue += Number(booking.priceSnapshot || 0);
      map.set(key, row);
    }
    return Array.from(map.values()).slice(-7);
  }, [bookings, locale]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/solo-master/profile", {
        name: profileForm.name.trim(),
        city: profileForm.city.trim() || undefined,
        address: profileForm.address.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
        telegram: profileForm.telegram.trim() || undefined,
        instagram: profileForm.instagram.trim() || undefined,
        slug: profileForm.slug.trim() || undefined,
        bio: profileForm.bio.trim() || undefined,
        serviceMode: profileForm.serviceMode,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/me"] });
      toast({ title: tr("Профиль сохранён", "Profile saved") });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/solo-master/settings", settingsForm);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/settings"] });
      toast({ title: tr("Настройки сохранены", "Settings saved") });
    },
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/solo-master/schedule", { hours: scheduleForm });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/schedule"] });
      toast({ title: tr("Расписание обновлено", "Schedule updated") });
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/solo-master/services", {
        name: { ru: newService.name.trim(), en: newService.name.trim(), uz: newService.name.trim() },
        description: { ru: newService.description.trim(), en: newService.description.trim(), uz: newService.description.trim() },
        category: newService.category,
        priceMin: Number(newService.price) || 0,
        duration: Number(newService.duration) || 60,
        serviceMode: newService.serviceMode,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/services"] });
      setServiceDialogOpen(false);
      setNewService({ name: "", category: SERVICE_CATEGORIES[0], price: "150000", duration: "60", serviceMode: "both", description: "" });
      toast({ title: tr("Услуга добавлена", "Service added") });
    },
  });

  const toggleServiceMutation = useMutation({
    mutationFn: async (service: SoloService) => {
      const res = await apiRequest("PUT", `/api/solo-master/services/${service.id}`, { isActive: !service.isActive });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/solo-master/services"] }),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => apiRequest("DELETE", `/api/solo-master/services/${serviceId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/solo-master/services"] }),
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/solo-master/bookings/${bookingId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/clients"] });
    },
  });

  const createSupportTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/solo-master/support/tickets", {
        subject: newTicket.subject.trim(),
        category: newTicket.category,
        priority: newTicket.priority,
        message: newTicket.message.trim(),
      });
      return res.json();
    },
    onSuccess: (ticket: SupportTicket) => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/support/tickets"] });
      setSelectedTicketId(ticket.id);
      setSupportDialogOpen(false);
      setNewTicket({ subject: "", category: "question", priority: "normal", message: "" });
    },
  });

  const replySupportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/solo-master/support/tickets/${selectedTicketId}/messages`, { message: supportReply.trim() });
      return res.json();
    },
    onSuccess: () => {
      setSupportReply("");
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/support/tickets", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/support/tickets"] });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await apiRequest("PATCH", `/api/solo-master/support/tickets/${ticketId}/close`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/support/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/support/tickets", selectedTicketId] });
    },
  });

  const respondReviewMutation = useMutation({
    mutationFn: async ({ reviewId, ownerResponse }: { reviewId: string; ownerResponse: string }) => {
      const res = await apiRequest("PATCH", `/api/solo-master/reviews/${reviewId}/respond`, { ownerResponse });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/solo-master/reviews"] }),
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/portfolio/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/master", masterQuery.data?.id] });
      toast({ title: tr("Портфолио обновлено", "Portfolio updated") });
    },
    onError: (error) => {
      toast({
        title: tr("Не удалось обновить портфолио", "Could not update portfolio"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/notifications/read-all", {});
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch("/api/upload/master-photo", { method: "POST", credentials: "include", body: formData });
    if (!response.ok) throw new Error("Upload failed");
    const data = await response.json();
    await apiRequest("PUT", "/api/solo-master/profile", { photo: data.url });
    queryClient.invalidateQueries({ queryKey: ["/api/solo-master/me"] });
  }

  async function uploadPortfolio(files: FileList | null) {
    if (!files || !masterQuery.data?.id) return;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("image", file);
      const uploadResponse = await fetch("/api/upload/portfolio", { method: "POST", credentials: "include", body: formData });
      if (!uploadResponse.ok) throw new Error("Portfolio upload failed");
      const upload = await uploadResponse.json();
      await apiRequest("POST", "/api/portfolio", { masterId: masterQuery.data.id, imageUrl: upload.url });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/portfolio/master", masterQuery.data.id] });
  }

  const isLoading = authLoading || masterQuery.isLoading || statsQuery.isLoading || servicesQuery.isLoading || bookingsQuery.isLoading;
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!user || !masterQuery.data) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={AlertCircle}
          title={tr("Профиль мастера не найден", "Master profile not found")}
          description={tr("Завершите онбординг или напишите в поддержку.", "Complete onboarding or contact support.")}
          action={{ label: tr("Открыть вход", "Open auth"), onClick: () => navigate("/auth") }}
        />
      </div>
    );
  }

  const master = masterQuery.data;
  const nextBookings = upcomingBookings.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border/70 bg-card/90 p-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => goBackOrNavigate(navigate, "/")} aria-label={tr("Назад", "Back")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{tr("Кабинет фриланс-мастера", "Solo master workspace")}</p>
              <h1 className="break-words text-2xl font-semibold text-foreground">{tr("Управляйте услугами, расписанием и клиентами в одном кабинете", "Run services, schedule and clients from one place")}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => setActiveTab("messages")} className="gap-2">
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && <Badge className="border-primary/30 bg-primary/10 text-primary">{unreadNotifications}</Badge>}
            </Button>
            <Button variant="outline" onClick={() => logout()} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{tr("Выйти", "Log out")}</span>
            </Button>
          </div>
        </div>

        <section className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <Avatar className="h-20 w-20 shrink-0 rounded-[22px] border border-border/70">
                    <AvatarImage src={master.photo || undefined} />
                    <AvatarFallback className="rounded-[22px] text-lg">{master.name?.slice(0, 1)?.toUpperCase() || "M"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-primary/20 bg-primary/10 text-primary">{tr("Solo master", "Solo master")}</Badge>
                      <Badge variant="outline" className={statusTone(master.status || "draft")}>{master.status || "draft"}</Badge>
                    </div>
                    <div className="space-y-1">
                      <h2 className="break-words text-3xl font-semibold text-foreground">{master.name}</h2>
                      <p className="break-words text-sm text-muted-foreground">{[master.city, profileForm.address].filter(Boolean).join(" • ") || tr("Добавьте город и зону работы", "Add city and service area")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />{master.averageRating || "0.0"} ({master.reviewCount || 0})</span>
                      <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{clients.length} {tr("клиентов", "clients")}</span>
                      <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{services.length} {tr("услуг", "services")}</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => setActiveTab("profile")} className="gap-2"><PencilLine className="h-4 w-4" />{tr("Редактировать профиль", "Edit profile")}</Button>
                  <Button variant="outline" onClick={() => master.slug && window.open(`/master/${master.slug}`, "_blank")} className="gap-2"><ExternalLink className="h-4 w-4" />{tr("Публичная страница", "Public page")}</Button>
                  <Button variant="outline" onClick={async () => { const url = `${window.location.origin}/master/${master.slug || ""}`; await navigator.clipboard.writeText(url); toast({ title: tr("Ссылка скопирована", "Link copied") }); }} className="gap-2"><Copy className="h-4 w-4" />{tr("Поделиться", "Share")}</Button>
                  <Button variant="outline" onClick={() => setActiveTab("support")} className="gap-2"><LifeBuoy className="h-4 w-4" />{tr("Поддержка", "Support")}</Button>
                </div>
              </div>
              <Separator className="my-6" />
              <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{tr("Заполненность профиля", "Profile completeness")}</p>
                      <p className="text-sm text-muted-foreground">{tr("Чем полнее страница, тем легче клиенту довериться и записаться.", "The more complete the page is, the easier it is for clients to trust and book.")}</p>
                    </div>
                    <span className="text-lg font-semibold text-foreground">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-3" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {profileChecklist.map((item) => (
                      <button key={item.label} type="button" onClick={() => setActiveTab(item.tab)} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-left transition hover:border-primary/40">
                        <span className="min-w-0 break-words text-sm text-foreground">{item.label}</span>
                        <Badge variant="outline" className={item.done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-amber-500/30 bg-amber-500/10 text-amber-500"}>{item.done ? tr("Готово", "Done") : tr("Нужно", "Need")}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
                <Alert className="border-primary/20 bg-primary/5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <AlertTitle>{tr("Что сделать сейчас", "What to do now")}</AlertTitle>
                  <AlertDescription className="mt-3 space-y-3">
                    {actionItems.length > 0 ? actionItems.map((item) => (
                      <button key={item.title} type="button" onClick={() => setActiveTab(item.tab)} className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/85 px-4 py-3 text-left transition hover:border-primary/40">
                        <div className="min-w-0">
                          <p className="break-words font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 break-words text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    )) : <p className="text-sm text-muted-foreground">{tr("База выглядит уверенно. Можно сосредоточиться на расписании, качестве и росте выручки.", "The base looks solid. You can focus on schedule, quality and revenue growth.")}</p>}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>{tr("Ближайшие записи", "Nearest bookings")}</CardTitle>
              <CardDescription>{tr("Следующие 3–5 записей, которые формируют ваш день.", "The next 3–5 appointments that define your day.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {nextBookings.length > 0 ? nextBookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-medium text-foreground">{booking.clientName || tr("Клиент", "Client")}</p>
                        <Badge variant="outline" className={statusTone(booking.status)}>{booking.status}</Badge>
                      </div>
                      <p className="mt-1 break-words text-sm text-muted-foreground">{localize(booking.service?.name, lang) || tr("Услуга не указана", "Service is not specified")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{date(booking.bookingDate, locale)} • {booking.startTime}–{booking.endTime}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{money(booking.priceSnapshot)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {booking.status === "pending" && <Button size="sm" onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "confirmed" })}>{tr("Подтвердить", "Confirm")}</Button>}
                    {booking.status === "confirmed" && <Button size="sm" onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "completed" })}>{tr("Завершить", "Complete")}</Button>}
                    {["pending", "confirmed"].includes(booking.status) && <Button size="sm" variant="outline" onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "cancelled" })}>{tr("Отменить", "Cancel")}</Button>}
                  </div>
                </div>
              )) : <EmptyState icon={CalendarDays} title={tr("Пока нет ближайших записей", "No upcoming bookings")} description={tr("Откройте больше слотов, обновите услуги и поделитесь публичной страницей.", "Open more availability, update services and share the public page.")} action={{ label: tr("Открыть страницу", "Open page"), onClick: () => setActiveTab("publicPage") }} />}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={CalendarDays} label={tr("Сегодня", "Today")} value={statsQuery.data?.todayBookings || 0} hint={tr("Записи на текущий день", "Appointments in the current day")} />
          <StatCard icon={AlertCircle} label={tr("Ожидают решения", "Pending")} value={statsQuery.data?.pendingBookings || 0} hint={tr("Нужны подтверждение и реакция", "Need confirmation or action")} />
          <StatCard icon={Wallet} label={tr("Выручка за день", "Revenue today")} value={money(revenueToday)} hint={tr("Только завершённые услуги", "Completed bookings only")} />
          <StatCard icon={PieChart} label={tr("Выручка за неделю", "Revenue week")} value={money(revenueWeek)} hint={tr("Текущее рабочее окно", "Current rolling window")} />
          <StatCard icon={MessageSquare} label={tr("Непрочитано", "Unread")} value={unreadNotifications} hint={tr("Уведомления и обновления", "Notifications and updates")} />
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-[22px] border border-border/70 bg-card/90 p-2">
            {[
              ["overview", tr("Обзор", "Overview")],
              ["profile", tr("Профиль", "Profile")],
              ["publicPage", tr("Публичная страница", "Public page")],
              ["calendar", tr("Календарь", "Calendar")],
              ["schedule", tr("Расписание", "Schedule")],
              ["bookings", tr("Записи", "Bookings")],
              ["clients", tr("Клиенты", "Clients")],
              ["services", tr("Услуги", "Services")],
              ["portfolio", tr("Портфолио", "Portfolio")],
              ["messages", tr("Коммуникации", "Comms")],
              ["support", tr("Поддержка", "Support")],
              ["reviews", tr("Отзывы", "Reviews")],
              ["analytics", tr("Аналитика", "Analytics")],
              ["finance", tr("Финансы", "Finance")],
              ["settings", tr("Настройки", "Settings")],
              ["security", tr("Безопасность", "Security")],
            ].map(([key, label]) => <TabsTrigger key={key} value={key} className="shrink-0 rounded-2xl px-4 py-2.5">{label}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
              <Card className="border-border/70 shadow-sm">
                <CardHeader><CardTitle>{tr("Операционная сводка", "Operational snapshot")}</CardTitle><CardDescription>{tr("Главный экран для загрузки, денег и приоритетных действий.", "Main screen for load, money and priorities.")}</CardDescription></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4"><p className="text-sm text-muted-foreground">{tr("Записи за неделю", "Bookings this week")}</p><p className="mt-3 text-4xl font-semibold text-foreground">{statsQuery.data?.weekBookings || 0}</p></div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4"><p className="text-sm text-muted-foreground">{tr("Выручка за месяц", "Monthly revenue")}</p><p className="mt-3 break-words text-4xl font-semibold text-foreground">{money(statsQuery.data?.monthRevenue)}</p></div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4"><p className="text-sm text-muted-foreground">{tr("Отзывы", "Reviews")}</p><p className="mt-3 text-4xl font-semibold text-foreground">{reviews.length}</p></div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4"><p className="text-sm text-muted-foreground">{tr("Открытые обращения", "Open support")}</p><p className="mt-3 text-4xl font-semibold text-foreground">{openTickets}</p></div>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardHeader><CardTitle>{tr("Пульс выручки", "Revenue pulse")}</CardTitle><CardDescription>{tr("Последние 7 дат по вашим записям.", "The last 7 visible dates from your bookings.")}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {chartData.length ? chartData.map((row) => <div key={row.label} className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{row.label}</span><span className="font-medium text-foreground">{row.bookings} • {money(row.revenue)}</span></div><Progress value={Math.min(100, row.revenue ? (row.revenue / Math.max(...chartData.map((item) => item.revenue || 1))) * 100 : 0)} /></div>) : <EmptyState icon={PieChart} title={tr("Аналитика появится после первых записей", "No analytics yet")} description={tr("Откройте публичную страницу, услуги и расписание.", "Open your public page, services and schedule.")} action={{ label: tr("Перейти к услугам", "Go to services"), onClick: () => setActiveTab("services") }} />}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
              <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Лицо мастера", "Identity and visuals")}</CardTitle><CardDescription>{tr("Аватар, статус и первый слой доверия.", "Avatar, status and the first layer of trust.")}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-muted/20 p-6 text-center"><Avatar className="h-28 w-28 rounded-[28px] border border-border/70"><AvatarImage src={master.photo || undefined} /><AvatarFallback className="rounded-[28px] text-2xl">{master.name?.slice(0, 1)?.toUpperCase() || "M"}</AvatarFallback></Avatar><div className="space-y-1"><p className="break-words text-xl font-semibold text-foreground">{master.name}</p><p className="break-words text-sm text-muted-foreground">{localize(master.bio, lang) || tr("Добавьте короткое позиционирование", "Add a short positioning")}</p></div><Button variant="outline" onClick={() => avatarInputRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" />{tr("Сменить фото", "Change avatar")}</Button><input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { await uploadAvatar(file); toast({ title: tr("Аватар обновлён", "Avatar updated") }); } catch (error) { toast({ title: tr("Не удалось загрузить фото", "Upload failed"), description: error instanceof Error ? error.message : String(error), variant: "destructive" }); } finally { event.target.value = ""; } }} /></div></CardContent></Card>
              <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Редактор профиля", "Profile editor")}</CardTitle><CardDescription>{tr("Всё, что формирует образ мастера в глазах клиента.", "Everything that shapes how the expert looks to the client.")}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>{tr("Публичное имя", "Public name")}</Label><Input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} /></div><div className="space-y-2"><Label>{tr("Город", "City")}</Label><Input value={profileForm.city} onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))} /></div><div className="space-y-2"><Label>{tr("Район / адрес", "Area or address")}</Label><Input value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} /></div><div className="space-y-2"><Label>{tr("Телефон", "Phone")}</Label><Input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} /></div><div className="space-y-2"><Label>Telegram</Label><Input value={profileForm.telegram} onChange={(e) => setProfileForm((prev) => ({ ...prev, telegram: e.target.value }))} /></div><div className="space-y-2"><Label>Instagram</Label><Input value={profileForm.instagram} onChange={(e) => setProfileForm((prev) => ({ ...prev, instagram: e.target.value }))} /></div><div className="space-y-2"><Label>Slug / URL</Label><Input value={profileForm.slug} onChange={(e) => setProfileForm((prev) => ({ ...prev, slug: e.target.value }))} /></div><div className="space-y-2"><Label>{tr("Формат работы", "Work format")}</Label><Select value={profileForm.serviceMode} onValueChange={(value) => setProfileForm((prev) => ({ ...prev, serviceMode: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="at_master">{tr("У мастера", "At master location")}</SelectItem><SelectItem value="mobile">{tr("Выезд", "Mobile")}</SelectItem><SelectItem value="both">{tr("Оба формата", "Both")}</SelectItem></SelectContent></Select></div><div className="space-y-2 md:col-span-2"><Label>{tr("Описание", "Description")}</Label><Textarea rows={5} value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} /></div><div className="md:col-span-2"><Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending || !profileForm.name.trim()}>{updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr("Сохранить профиль", "Save profile")}</Button></div></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="publicPage" className="mt-6"><div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Управление витриной", "Public page control")}</CardTitle><CardDescription>{tr("Страница, которую клиент видит до записи.", "The page clients see before they book.")}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl border border-border/70 bg-muted/20 p-4"><p className="text-sm text-muted-foreground">URL</p><p className="mt-2 break-all text-base font-medium text-foreground">{master.slug ? `${window.location.origin}/master/${master.slug}` : "—"}</p></div><div className="grid gap-3 sm:grid-cols-2"><Button onClick={() => setActiveTab("profile")}>{tr("Редактировать контент", "Edit content")}</Button><Button variant="outline" onClick={() => master.slug && window.open(`/master/${master.slug}`, "_blank")}>{tr("Предпросмотр", "Preview")}</Button></div></CardContent></Card><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Что делает страницу сильнее", "What makes the page stronger")}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{[tr("Понятное позиционирование и описание"), tr("Минимум 5 активных услуг"), tr("Три-пять работ в портфолио"), tr("Актуальное расписание"), tr("Быстрые ответы на отзывы"), tr("Регулярное продвижение страницы")].map((item) => <div key={item} className="rounded-2xl border border-border/70 bg-muted/20 p-4"><p className="break-words text-sm text-foreground">{item}</p></div>)}</CardContent></Card></div></TabsContent>

          <TabsContent value="calendar" className="mt-6"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Рабочий календарь", "Working calendar")}</CardTitle><CardDescription>{tr("Текущие записи без прыжков между экранами.", "Current bookings without jumping between screens.")}</CardDescription></CardHeader><CardContent><CalendarWeekView bookings={bookings as any} isLoading={bookingsQuery.isLoading} showClient={true} /></CardContent></Card></TabsContent>

          <TabsContent value="schedule" className="mt-6"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Рабочее расписание", "Working schedule")}</CardTitle><CardDescription>{tr("Это напрямую влияет на доступные слоты для клиента.", "This directly affects available slots for clients.")}</CardDescription></CardHeader><CardContent className="space-y-4">{scheduleForm.map((day, index) => <div key={day.dayOfWeek} className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-[0.9fr_0.5fr_0.8fr_0.8fr] md:items-center"><div><p className="font-medium text-foreground">{dayName(day.dayOfWeek, lang)}</p></div><div className="flex items-center gap-3"><Switch checked={day.isOpen} onCheckedChange={(checked) => setScheduleForm((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, isOpen: checked } : item))} /><span className="text-sm text-muted-foreground">{day.isOpen ? tr("Открыт", "Open") : tr("Выходной", "Off")}</span></div><Input value={day.openTime} type="time" disabled={!day.isOpen} onChange={(e) => setScheduleForm((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, openTime: e.target.value } : item))} /><Input value={day.closeTime} type="time" disabled={!day.isOpen} onChange={(e) => setScheduleForm((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, closeTime: e.target.value } : item))} /></div>)}<Button onClick={() => saveScheduleMutation.mutate()} disabled={saveScheduleMutation.isPending}>{saveScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr("Сохранить расписание", "Save schedule")}</Button></CardContent></Card></TabsContent>

          <TabsContent value="bookings" className="mt-6"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Панель записей", "Booking desk")}</CardTitle><CardDescription>{tr("Поиск, фильтры и действия в одном месте.", "Search, filters and actions in one place.")}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 lg:grid-cols-[1fr_220px]"><Input value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder={tr("Поиск по клиенту, услуге или комментарию", "Search by client, service or note")} /><Select value={bookingFilter} onValueChange={setBookingFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{tr("Все статусы", "All statuses")}</SelectItem><SelectItem value="pending">{tr("Ожидают", "Pending")}</SelectItem><SelectItem value="confirmed">{tr("Подтверждены", "Confirmed")}</SelectItem><SelectItem value="completed">{tr("Завершены", "Completed")}</SelectItem><SelectItem value="cancelled">{tr("Отменены", "Cancelled")}</SelectItem></SelectContent></Select></div><div className="space-y-3">{filteredBookings.length ? filteredBookings.map((booking) => <div key={booking.id} className="rounded-3xl border border-border/70 bg-muted/20 p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><p className="break-words font-medium text-foreground">{booking.clientName || tr("Клиент", "Client")}</p><Badge variant="outline" className={statusTone(booking.status)}>{booking.status}</Badge></div><p className="break-words text-sm text-muted-foreground">{localize(booking.service?.name, lang) || tr("Услуга не указана", "Service is not specified")}</p><div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span>{date(booking.bookingDate, locale)}</span><span>{booking.startTime}–{booking.endTime}</span><span>{money(booking.priceSnapshot)}</span><span>{booking.clientEmail || "—"}</span></div>{booking.notes && <p className="break-words text-sm text-foreground/80">{booking.notes}</p>}</div><div className="flex flex-wrap gap-2">{booking.status === "pending" && <Button size="sm" onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "confirmed" })}>{tr("Подтвердить", "Confirm")}</Button>}{booking.status === "confirmed" && <Button size="sm" onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "completed" })}>{tr("Завершить", "Complete")}</Button>}{["pending", "confirmed"].includes(booking.status) && <Button size="sm" variant="outline" onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "cancelled" })}>{tr("Отменить", "Cancel")}</Button>}</div></div></div>) : <EmptyState icon={CalendarDays} title={tr("Записи не найдены", "No bookings found")} description={tr("Измените фильтры или откройте больше времени в расписании.", "Adjust filters or open more slots in the schedule.")} action={{ label: tr("Открыть расписание", "Open schedule"), onClick: () => setActiveTab("schedule") }} />}</div></CardContent></Card></TabsContent>

          <TabsContent value="clients" className="mt-6"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Клиентская база", "Client desk")}</CardTitle><CardDescription>{tr("Постоянные клиенты, история визитов и чек в одном списке.", "Repeat clients, visit history and spending in one list.")}</CardDescription></CardHeader><CardContent className="space-y-3">{clients.length ? clients.map((client) => <div key={client.id} className="rounded-3xl border border-border/70 bg-muted/20 p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><Avatar className="h-12 w-12 border border-border/70"><AvatarImage src={client.avatarUrl || undefined} /><AvatarFallback>{client.name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="break-words font-medium text-foreground">{client.name}</p><p className="break-words text-sm text-muted-foreground">{[client.city, client.email, client.phone].filter(Boolean).join(" • ") || "—"}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline" className={statusTone(client.latestStatus || "pending")}>{client.latestStatus || "pending"}</Badge>{client.favoriteService && <Badge variant="outline">{client.favoriteService}</Badge>}</div></div></div><div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2"><span>{tr("Визитов", "Visits")}: <strong className="text-foreground">{client.totalBookings}</strong></span><span>{tr("Завершено", "Completed")}: <strong className="text-foreground">{client.completedBookings}</strong></span><span>{tr("Потратил", "Spent")}: <strong className="text-foreground">{money(client.totalSpent)}</strong></span><span>{tr("Последний визит", "Last visit")}: <strong className="text-foreground">{date(client.lastVisit, locale)}</strong></span></div></div></div>) : <EmptyState icon={Users} title={tr("Пока нет клиентской базы", "No clients yet")} description={tr("Как только пойдут записи, этот раздел превратится в ваш mini CRM.", "As soon as bookings arrive, this section will become your mini CRM.")} action={{ label: tr("Открыть страницу", "Open page"), onClick: () => setActiveTab("publicPage") }} />}</CardContent></Card></TabsContent>

          <TabsContent value="services" className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold text-foreground">{tr("Услуги и прайс", "Services and pricing")}</h3><p className="text-sm text-muted-foreground">{tr("Это коммерческое ядро вашей страницы.", "This is the commercial core of your page.")}</p></div><Button onClick={() => setServiceDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />{tr("Добавить услугу", "Add service")}</Button></div>{services.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{services.map((service) => <Card key={service.id} className="border-border/70 shadow-sm"><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium text-foreground">{localize(service.name, lang)}</p><p className="mt-1 text-sm text-muted-foreground">{service.category}</p></div><Badge variant="outline" className={service.isActive ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-border bg-muted text-muted-foreground"}>{service.isActive ? tr("Активна", "Active") : tr("Скрыта", "Paused")}</Badge></div><div className="space-y-1 text-sm text-muted-foreground"><p>{money(service.priceMin)}{service.priceMax ? ` – ${money(service.priceMax)}` : ""}</p><p>{service.duration} {tr("мин", "min")}</p></div><p className="line-clamp-3 break-words text-sm text-foreground/80">{localize(service.description, lang) || tr("Описание пока не добавлено", "No description yet")}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => toggleServiceMutation.mutate(service)}>{service.isActive ? tr("Скрыть", "Hide") : tr("Включить", "Enable")}</Button><Button size="sm" variant="outline" onClick={() => deleteServiceMutation.mutate(service.id)}><Trash2 className="mr-2 h-4 w-4" />{tr("Удалить", "Delete")}</Button></div></CardContent></Card>)}</div> : <div className="mt-6"><EmptyState icon={Sparkles} title={tr("Услуги ещё не добавлены", "No services yet")} description={tr("Добавьте первую услугу, чтобы публичная страница начала конвертировать просмотр в запись.", "Add the first service so the page can start converting visitors.")} action={{ label: tr("Добавить услугу", "Add service"), onClick: () => setServiceDialogOpen(true) }} /></div>}</TabsContent>

          <TabsContent value="portfolio" className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold text-foreground">{tr("Портфолио", "Portfolio")}</h3><p className="text-sm text-muted-foreground">{tr("Портфолио должно продавать, а не просто лежать.", "Portfolio should sell, not just exist.")}</p></div><Button onClick={() => portfolioInputRef.current?.click()} className="gap-2"><ImagePlus className="h-4 w-4" />{tr("Загрузить работы", "Upload works")}</Button><input ref={portfolioInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (event) => { try { await uploadPortfolio(event.target.files); } catch (error) { toast({ title: tr("Не удалось загрузить портфолио", "Upload failed"), description: error instanceof Error ? error.message : String(error), variant: "destructive" }); } finally { event.target.value = ""; } }} /></div>{portfolio.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{portfolio.map((item) => <Card key={item.id} className="overflow-hidden border-border/70 shadow-sm"><div className="aspect-[4/3] overflow-hidden bg-muted"><img src={item.imageUrl} alt="" className="h-full w-full object-cover" /></div><CardContent className="space-y-3 p-4"><p className="break-words text-sm text-muted-foreground">{localize(item.description, lang) || tr("Работа без подписи", "Work without caption")}</p><Button size="sm" variant="outline" onClick={() => deletePortfolioMutation.mutate(item.id)}><Trash2 className="mr-2 h-4 w-4" />{tr("Удалить", "Remove")}</Button></CardContent></Card>)}</div> : <div className="mt-6"><EmptyState icon={ImagePlus} title={tr("Портфолио пока пустое", "Portfolio is empty")} description={tr("Загрузите хотя бы 5 сильных работ, чтобы клиент быстрее принимал решение.", "Upload at least 5 strong works so clients can decide faster.")} action={{ label: tr("Загрузить работу", "Upload work"), onClick: () => portfolioInputRef.current?.click() }} /></div>}</TabsContent>

          <TabsContent value="messages" className="mt-6"><div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Коммуникации", "Communication center")}</CardTitle><CardDescription>{tr("Клиентская активность и быстрые следующие шаги.", "Client activity and quick next steps.")}</CardDescription></CardHeader><CardContent className="space-y-3">{clients.slice(0, 6).map((client) => <div key={client.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium text-foreground">{client.name}</p><p className="mt-1 break-words text-sm text-muted-foreground">{client.favoriteService || tr("Пока без любимой услуги", "No favorite service yet")}</p><p className="mt-2 text-sm text-muted-foreground">{tr("Последний визит", "Last visit")}: {date(client.lastVisit, locale)}</p></div><Badge variant="outline" className={statusTone(client.latestStatus || "pending")}>{client.latestStatus || "pending"}</Badge></div></div>)}</CardContent></Card><Card className="border-border/70 shadow-sm"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{tr("Уведомления", "Notifications")}</CardTitle><CardDescription>{tr("Новые записи, смена статусов и продуктовые обновления.", "New bookings, status changes and product updates.")}</CardDescription></div><Button variant="outline" size="sm" onClick={() => markAllNotificationsMutation.mutate()}>{tr("Прочитать всё", "Read all")}</Button></div></CardHeader><CardContent>{notifications.length ? <ScrollArea className="h-[420px] pr-3"><div className="space-y-3">{notifications.map((notification) => <button key={notification.id} type="button" onClick={() => markNotificationReadMutation.mutate(notification.id)} className={`w-full rounded-2xl border p-4 text-left transition ${notification.isRead ? "border-border/60 bg-muted/10" : "border-primary/25 bg-primary/5"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium text-foreground">{notification.message || tr("Системное обновление", "System update")}</p><p className="mt-1 text-sm text-muted-foreground">{dateTime(notification.createdAt, locale)}</p></div>{!notification.isRead && <Badge className="border-primary/20 bg-primary/10 text-primary">{tr("Новое", "New")}</Badge>}</div></button>)}</div></ScrollArea> : <EmptyState icon={Bell} title={tr("Пока нет уведомлений", "No notifications")} description={tr("Как только пойдут новые записи и изменения, эта зона оживёт.", "As bookings and changes appear, this area will become alive.")} />}</CardContent></Card></div></TabsContent>

          <TabsContent value="support" className="mt-6"><div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"><Card className="border-border/70 shadow-sm"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{tr("Обращения", "Support tickets")}</CardTitle><CardDescription>{tr("Технические проблемы, споры, выплаты и вопросы по платформе.", "Technical issues, disputes, payments and platform questions.")}</CardDescription></div><Button onClick={() => setSupportDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />{tr("Новое обращение", "New ticket")}</Button></div></CardHeader><CardContent className="space-y-3">{supportTickets.length ? supportTickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => setSelectedTicketId(ticket.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedTicketId === ticket.id ? "border-primary/35 bg-primary/5" : "border-border/70 bg-muted/20"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium text-foreground">{ticket.subject}</p><p className="mt-1 break-words text-sm text-muted-foreground">{ticket.category} • {dateTime(ticket.updatedAt || ticket.createdAt, locale)}</p></div><Badge variant="outline" className={statusTone(ticket.status)}>{ticket.status}</Badge></div></button>) : <EmptyState icon={LifeBuoy} title={tr("Обращений пока нет", "No tickets yet")} description={tr("Когда платформе нужно ваше описание проблемы — начинайте отсюда.", "When the platform needs your problem description, start from here.")} action={{ label: tr("Создать обращение", "Create ticket"), onClick: () => setSupportDialogOpen(true) }} />}</CardContent></Card><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Переписка по обращению", "Ticket thread")}</CardTitle><CardDescription>{tr("Держите контекст проблемы внутри платформы.", "Keep the context of the issue inside the platform.")}</CardDescription></CardHeader><CardContent className="space-y-4">{ticketDetailQuery.data ? <><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4"><div className="min-w-0"><p className="break-words font-medium text-foreground">{ticketDetailQuery.data.ticket.subject}</p><p className="mt-1 text-sm text-muted-foreground">{ticketDetailQuery.data.ticket.category} • {ticketDetailQuery.data.ticket.status}</p></div>{ticketDetailQuery.data.ticket.status !== "closed" && <Button variant="outline" size="sm" onClick={() => closeTicketMutation.mutate(ticketDetailQuery.data!.ticket.id)}>{tr("Закрыть", "Close")}</Button>}</div><ScrollArea className="h-[320px] pr-3"><div className="space-y-3">{ticketDetailQuery.data.messages.map((message) => <div key={message.id} className={`rounded-2xl border p-4 ${message.senderType === "admin" ? "border-primary/25 bg-primary/5" : "border-border/70 bg-muted/20"}`}><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-foreground">{message.senderType === "admin" ? tr("Поддержка AURELLE", "AURELLE support") : tr("Вы", "You")}</p><p className="text-xs text-muted-foreground">{dateTime(message.createdAt, locale)}</p></div><p className="mt-2 break-words text-sm text-foreground/90">{message.message}</p></div>)}</div></ScrollArea><Textarea rows={4} value={supportReply} onChange={(e) => setSupportReply(e.target.value)} placeholder={tr("Уточните детали для администратора", "Clarify details for the admin")} /><Button onClick={() => replySupportMutation.mutate()} disabled={!supportReply.trim() || replySupportMutation.isPending}>{replySupportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr("Отправить ответ", "Send reply")}</Button></> : <EmptyState icon={MessageSquare} title={tr("Выберите обращение", "Select a ticket")} description={tr("Здесь будет вся переписка с поддержкой и текущий статус обращения.", "Here you will see the full thread and the current ticket status.")} />}</CardContent></Card></div></TabsContent>

          <TabsContent value="reviews" className="mt-6"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Отзывы и рейтинг", "Review desk")}</CardTitle><CardDescription>{tr("Следите за отзывами и отвечайте на них, не выходя из кабинета.", "Track fresh feedback and answer it without leaving the cabinet.")}</CardDescription></CardHeader><CardContent className="space-y-4">{reviews.length ? reviews.map((review) => <div key={review.id} className="rounded-3xl border border-border/70 bg-muted/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="break-words font-medium text-foreground">{review.clientName || tr("Клиент", "Client")}</p><Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500">{review.rating}/5</Badge></div><p className="mt-2 break-words text-sm text-foreground/90">{review.comment || tr("Клиент оставил только оценку", "Client left only a rating")}</p><p className="mt-2 text-xs text-muted-foreground">{dateTime(review.createdAt, locale)}</p></div></div>{review.ownerResponse ? <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4"><p className="text-xs uppercase tracking-[0.18em] text-primary">{tr("Ваш ответ", "Your reply")}</p><p className="mt-2 break-words text-sm text-foreground">{review.ownerResponse}</p></div> : <div className="mt-4 space-y-3"><Textarea rows={3} value={reviewReplyDrafts[review.id] || ""} onChange={(e) => setReviewReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))} placeholder={tr("Ответьте клиенту спокойно и профессионально", "Reply to the client professionally")} /><Button onClick={() => respondReviewMutation.mutate({ reviewId: review.id, ownerResponse: reviewReplyDrafts[review.id] || "" })} disabled={!reviewReplyDrafts[review.id]?.trim() || respondReviewMutation.isPending}>{tr("Отправить ответ", "Send reply")}</Button></div>}</div>) : <EmptyState icon={Star} title={tr("Пока нет отзывов", "No reviews yet")} description={tr("Как только появятся завершённые записи, этот блок станет вашей панелью репутации.", "As completed bookings appear, this block becomes your reputation desk.")} action={{ label: tr("Открыть записи", "Open bookings"), onClick: () => setActiveTab("bookings") }} />}</CardContent></Card></TabsContent>

          <TabsContent value="analytics" className="mt-6"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard icon={PieChart} label={tr("Повторные клиенты", "Repeat clients")} value={clients.filter((item) => item.totalBookings > 1).length} hint={tr("Хороший прокси для удержания", "Good proxy for retention")} /><StatCard icon={Star} label={tr("Средний рейтинг", "Average rating")} value={master.averageRating || "0.0"} hint={tr("Публичный показатель качества", "Your public quality score")} /><StatCard icon={Users} label={tr("Активные клиенты", "Active clients")} value={clients.length} hint={tr("Люди, которые уже записывались к вам", "People who already booked with you")} /><StatCard icon={Wallet} label={tr("Итого за месяц", "Month total")} value={money(statsQuery.data?.monthRevenue)} hint={tr("Только завершённая выручка", "Completed revenue only")} /></div></TabsContent>

          <TabsContent value="finance" className="mt-6 space-y-6"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard icon={Wallet} label={tr("За день", "Today")} value={money(revenueToday)} hint={tr("Только завершённые", "Completed only")} /><StatCard icon={Wallet} label={tr("За неделю", "Week")} value={money(revenueWeek)} hint={tr("Текущее рабочее окно", "Current rolling window")} /><StatCard icon={Wallet} label={tr("За месяц", "Month")} value={money(statsQuery.data?.monthRevenue)} hint={tr("Текущий месяц", "Current month")} /><StatCard icon={CheckCircle2} label={tr("Завершено", "Completed")} value={completedBookings.length} hint={tr("Записи, дошедшие до финала", "Bookings that reached the finish line")} /></div><PaymentHealthWidget scope="master" /></TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Правила записи", "Booking rules")}</CardTitle><CardDescription>{tr("Эти настройки влияют на логику слотов, которую видит клиент.", "These settings influence the slot logic the client sees.")}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>{tr("Буфер между записями (мин)", "Buffer between bookings (min)")}</Label><Input type="number" value={settingsForm.bufferMinutes} onChange={(e) => setSettingsForm((prev) => ({ ...prev, bufferMinutes: Number(e.target.value) || 0 }))} /></div><div className="space-y-2"><Label>{tr("Буфер на выезд (мин)", "Travel buffer (min)")}</Label><Input type="number" value={settingsForm.travelBufferMinutes} onChange={(e) => setSettingsForm((prev) => ({ ...prev, travelBufferMinutes: Number(e.target.value) || 0 }))} /></div><div className="space-y-2"><Label>{tr("Макс. глубина записи", "Max advance days")}</Label><Input type="number" value={settingsForm.maxAdvanceBookingDays} onChange={(e) => setSettingsForm((prev) => ({ ...prev, maxAdvanceBookingDays: Number(e.target.value) || 0 }))} /></div><div className="space-y-2"><Label>{tr("Мин. время до записи", "Min advance hours")}</Label><Input type="number" value={settingsForm.minAdvanceBookingHours} onChange={(e) => setSettingsForm((prev) => ({ ...prev, minAdvanceBookingHours: Number(e.target.value) || 0 }))} /></div><div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 md:col-span-2"><div className="min-w-0"><p className="font-medium text-foreground">{tr("Автоподтверждение", "Auto confirm bookings")}</p><p className="text-sm text-muted-foreground">{tr("Используйте осторожно, когда расписание действительно дисциплинировано.", "Use carefully when the schedule is disciplined.")}</p></div><Switch checked={settingsForm.autoConfirmBookings} onCheckedChange={(checked) => setSettingsForm((prev) => ({ ...prev, autoConfirmBookings: checked }))} /></div><div className="md:col-span-2"><Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>{saveSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr("Сохранить настройки", "Save settings")}</Button></div></CardContent></Card><PushNotificationSettings /></TabsContent>

          <TabsContent value="security" className="mt-6"><div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Безопасность", "Security")}</CardTitle><CardDescription>{tr("Держите доступ чистым и предсказуемым.", "Keep access clean and predictable.")}</CardDescription></CardHeader><CardContent className="space-y-3"><div className="rounded-2xl border border-border/70 bg-muted/20 p-4"><p className="text-sm text-muted-foreground">Email</p><p className="mt-2 break-words font-medium text-foreground">{user.email || "—"}</p></div><div className="rounded-2xl border border-border/70 bg-muted/20 p-4"><p className="text-sm text-muted-foreground">{tr("Телефон", "Phone")}</p><p className="mt-2 break-words font-medium text-foreground">{profileForm.phone || "—"}</p></div><Button variant="outline" onClick={() => logout()} className="gap-2"><ShieldCheck className="h-4 w-4" />{tr("Выйти из текущей сессии", "Log out current session")}</Button></CardContent></Card><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>{tr("Операционные заметки", "Operational notes")}</CardTitle><CardDescription>{tr("Честно показываем, что уже подключено и что важно держать под контролем.", "A candid look at what is connected and what you should keep under control.")}</CardDescription></CardHeader><CardContent className="space-y-3"><Alert><ExternalLink className="h-4 w-4" /><AlertTitle>{tr("Публичная страница работает", "Public page is live")}</AlertTitle><AlertDescription>{master.slug ? `${window.location.origin}/master/${master.slug}` : tr("Добавьте slug в профиле, чтобы открыть страницу.", "Add slug in the profile to open the page.")}</AlertDescription></Alert><Alert><MessageSquare className="h-4 w-4" /><AlertTitle>{tr("Коммуникации в одном месте", "Communication in one place")}</AlertTitle><AlertDescription>{tr("Кабинет уже собирает клиентов, контекст записей, обращения и уведомления в одном месте.", "The workspace already pulls clients, booking context, support and notifications into one place.")}</AlertDescription></Alert></CardContent></Card></div></TabsContent>
        </Tabs>
      </div>

      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}><DialogContent className="sm:max-w-[520px]"><DialogHeader><DialogTitle>{tr("Новая услуга", "New service")}</DialogTitle></DialogHeader><div className="grid gap-4 py-2"><div className="space-y-2"><Label>{tr("Название услуги", "Service title")}</Label><Input value={newService.name} onChange={(e) => setNewService((prev) => ({ ...prev, name: e.target.value }))} /></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>{tr("Категория", "Category")}</Label><Select value={newService.category} onValueChange={(value) => setNewService((prev) => ({ ...prev, category: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SERVICE_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>{tr("Формат", "Format")}</Label><Select value={newService.serviceMode} onValueChange={(value) => setNewService((prev) => ({ ...prev, serviceMode: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="at_master">{tr("У мастера", "At master location")}</SelectItem><SelectItem value="mobile">{tr("Выезд", "Mobile")}</SelectItem><SelectItem value="both">{tr("Оба формата", "Both")}</SelectItem></SelectContent></Select></div></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>{tr("Цена", "Price")}</Label><Input type="number" value={newService.price} onChange={(e) => setNewService((prev) => ({ ...prev, price: e.target.value }))} /></div><div className="space-y-2"><Label>{tr("Длительность (мин)", "Duration (min)")}</Label><Input type="number" value={newService.duration} onChange={(e) => setNewService((prev) => ({ ...prev, duration: e.target.value }))} /></div></div><div className="space-y-2"><Label>{tr("Описание", "Description")}</Label><Textarea rows={4} value={newService.description} onChange={(e) => setNewService((prev) => ({ ...prev, description: e.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setServiceDialogOpen(false)}>{tr("Отмена", "Cancel")}</Button><Button onClick={() => createServiceMutation.mutate()} disabled={createServiceMutation.isPending || !newService.name.trim()}>{createServiceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr("Создать услугу", "Create service")}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}><DialogContent className="sm:max-w-[560px]"><DialogHeader><DialogTitle>{tr("Создать обращение", "Create support ticket")}</DialogTitle></DialogHeader><div className="grid gap-4 py-2"><div className="space-y-2"><Label>{tr("Тема", "Subject")}</Label><Input value={newTicket.subject} onChange={(e) => setNewTicket((prev) => ({ ...prev, subject: e.target.value }))} /></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>{tr("Категория", "Category")}</Label><Select value={newTicket.category} onValueChange={(value) => setNewTicket((prev) => ({ ...prev, category: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="question">{tr("Вопрос", "Question")}</SelectItem><SelectItem value="booking">{tr("Проблема с записью", "Booking issue")}</SelectItem><SelectItem value="payment">{tr("Оплата", "Payment")}</SelectItem><SelectItem value="review">{tr("Спор по отзыву", "Review dispute")}</SelectItem><SelectItem value="technical">{tr("Техническая проблема", "Technical")}</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>{tr("Приоритет", "Priority")}</Label><Select value={newTicket.priority} onValueChange={(value) => setNewTicket((prev) => ({ ...prev, priority: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">{tr("Низкий", "Low")}</SelectItem><SelectItem value="normal">{tr("Обычный", "Normal")}</SelectItem><SelectItem value="high">{tr("Высокий", "High")}</SelectItem><SelectItem value="urgent">{tr("Срочный", "Urgent")}</SelectItem></SelectContent></Select></div></div><div className="space-y-2"><Label>{tr("Сообщение", "Message")}</Label><Textarea rows={6} value={newTicket.message} onChange={(e) => setNewTicket((prev) => ({ ...prev, message: e.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setSupportDialogOpen(false)}>{tr("Отмена", "Cancel")}</Button><Button onClick={() => createSupportTicketMutation.mutate()} disabled={createSupportTicketMutation.isPending || !newTicket.subject.trim() || !newTicket.message.trim()}>{createSupportTicketMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tr("Создать обращение", "Create ticket")}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
