import { useState } from "react";
import { useLocation } from "wouter";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRef } from "react";
import {
  Calendar,
  Clock,
  Settings,
  Briefcase,
  Image,
  BarChart3,
  Loader2,
  Plus,
  ExternalLink,
  AlertCircle,
  LogOut,
  Trash2,
  Upload,
  Camera,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  MapPin,
  User,
  Star,
  Zap,
  Power,
  CalendarDays,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const SERVICE_CATEGORIES = [
  "Маникюр", "Педикюр", "Ресницы", "Брови",
  "Волосы", "Макияж", "Массаж", "Спа",
  "Эпиляция", "Косметология", "Другое",
];

interface SoloService {
  id: string;
  name: { en: string; ru: string; uz: string };
  category: string;
  priceMin: number;
  priceMax: number | null;
  duration: number;
  serviceMode: string | null;
  isActive: boolean;
}

interface PortfolioItem {
  id: string;
  masterId: string;
  imageUrl: string;
  title: { en: string; ru: string; uz: string } | null;
  createdAt: string;
}

interface MasterData {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  photo: string | null;
  city: string | null;
  serviceMode: string | null;
  averageRating: string | null;
  reviewCount: number | null;
  phone: string | null;
  telegram: string | null;
  instagram: string | null;
  bio: { ru?: string; en?: string; uz?: string } | null;
}

interface Booking {
  id: string;
  masterId: string;
  clientId: string | null;
  soloMasterServiceId: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  priceSnapshot: number | null;
  notes: string | null;
  isMobileBooking: boolean | null;
}

interface DashboardStats {
  todayBookings: number;
  weekBookings: number;
  monthRevenue: number;
  pendingBookings: number;
}

export default function SoloMasterPage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Avatar upload ref
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Portfolio upload ref
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const [portfolioUploading, setPortfolioUploading] = useState(false);

  // Bookings filter
  const [bookingFilter, setBookingFilter] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  // Calendar week offset
  const [calWeekOffset, setCalWeekOffset] = useState(0);

  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTelegram, setEditTelegram] = useState("");
  const [editServiceMode, setEditServiceMode] = useState("both");
  const [editBio, setEditBio] = useState("");

  // Schedule state
  const [scheduleHours, setScheduleHours] = useState<
    { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }[]
  >([]);
  const [scheduleSynced, setScheduleSynced] = useState(false);

  // Service dialog state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [serviceMode, setServiceMode] = useState("both");

  // Fetch master data
  const { data: masterData, isLoading: masterLoading } = useQuery<MasterData>({
    queryKey: ["/api/solo-master/me"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/solo-master/me");
      if (!res.ok) throw new Error("Failed to fetch master data");
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Sync profile edit fields when masterData loads
  const [profileSynced, setProfileSynced] = useState(false);
  if (masterData && !profileSynced) {
    setEditName(masterData.name || "");
    setEditCity(masterData.city || "");
    setEditPhone(masterData.phone || "");
    setEditTelegram(masterData.telegram || "");
    setEditServiceMode(masterData.serviceMode || "both");
    setEditBio(masterData.bio?.ru || "");
    setProfileSynced(true);
  }

  // Fetch dashboard stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/solo-master/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/solo-master/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!user && !!masterData,
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery<SoloService[]>({
    queryKey: ["/api/solo-master/services"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/solo-master/services");
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
    enabled: !!user && !!masterData,
  });

  const createServiceMutation = useMutation({
    mutationFn: async () => {
      const price = parseInt(servicePrice, 10);
      if (!serviceName.trim() || !serviceCategory || isNaN(price) || price < 0) {
        throw new Error("Заполните обязательные поля");
      }
      const res = await apiRequest("POST", "/api/solo-master/services", {
        name: { ru: serviceName.trim(), en: serviceName.trim(), uz: serviceName.trim() },
        category: serviceCategory,
        priceMin: price,
        duration: parseInt(serviceDuration, 10) || 60,
        serviceMode,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка создания услуги");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/services"] });
      setServiceDialogOpen(false);
      setServiceName("");
      setServiceCategory("");
      setServicePrice("");
      setServiceDuration("60");
      setServiceMode("both");
      toast({ title: "Услуга добавлена" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/solo-master/services/${id}`);
      if (!res.ok) throw new Error("Ошибка удаления");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/services"] });
      toast({ title: "Услуга удалена" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // Portfolio queries — only when masterData loaded (need masterId)
  const { data: portfolio = [], isLoading: portfolioLoading } = useQuery<PortfolioItem[]>({
    queryKey: ["/api/portfolio/master", masterData?.id],
    queryFn: async () => {
      const res = await fetch(`/api/portfolio/master/${masterData!.id}`);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled: !!masterData?.id,
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("DELETE", `/api/portfolio/${itemId}`);
      if (!res.ok) throw new Error("Ошибка удаления фото");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/master", masterData?.id] });
      toast({ title: "Фото удалено" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // Bookings query
  const { data: masterBookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/solo-master/bookings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/solo-master/bookings");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    enabled: !!masterData,
    refetchInterval: 30000, // poll every 30s
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/solo-master/bookings/${id}/status`, { status });
      if (!res.ok) throw new Error("Ошибка обновления статуса");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/stats"] });
      toast({ title: "Статус записи обновлён" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/solo-master/profile", {
        name: editName.trim() || masterData?.name,
        city: editCity.trim() || undefined,
        phone: editPhone.trim() || undefined,
        telegram: editTelegram.trim() || undefined,
        serviceMode: editServiceMode,
        bio: editBio.trim() || undefined,
        lang: "ru",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка сохранения");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/me"] });
      toast({ title: "Профиль обновлён" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/solo-master/complete-onboarding", {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Ошибка активации");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/me"] });
      toast({ title: "Профиль активирован! Клиенты теперь могут вас найти." });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleServiceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/solo-master/services/${id}`, { isActive });
      if (!res.ok) throw new Error("Ошибка обновления услуги");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/services"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // Schedule query
  const { data: scheduleData } = useQuery<
    { dayOfWeek: number; isClosed: boolean; openTime: string; closeTime: string }[]
  >({
    queryKey: ["/api/solo-master/schedule"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/solo-master/schedule");
      if (!res.ok) throw new Error("Failed to fetch schedule");
      return res.json();
    },
    enabled: !!masterData,
  });

  // Sync schedule state from server data (one-time, mirrors profileSynced pattern)
  if (scheduleData && !scheduleSynced) {
    const days = [0, 1, 2, 3, 4, 5, 6].map((d) => {
      const found = scheduleData.find((h) => h.dayOfWeek === d);
      return {
        dayOfWeek: d,
        isOpen: found ? !found.isClosed : d !== 0 && d !== 6,
        openTime: found?.openTime ?? "09:00",
        closeTime: found?.closeTime ?? "18:00",
      };
    });
    setScheduleHours(days);
    setScheduleSynced(true);
  }

  const updateScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/solo-master/schedule", {
        hours: scheduleHours,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка сохранения расписания");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/schedule"] });
      toast({ title: "Расписание сохранено" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !masterData) return;
    setPortfolioUploading(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        // Step 1: upload file
        const formData = new FormData();
        formData.append("image", file);
        const uploadRes = await fetch("/api/upload/portfolio", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Ошибка загрузки файла");
        const { url } = await uploadRes.json();

        // Step 2: create portfolio item
        const itemRes = await apiRequest("POST", "/api/portfolio", {
          masterId: masterData.id,
          imageUrl: url,
        });
        if (!itemRes.ok) throw new Error("Ошибка сохранения фото");
        successCount++;
      } catch (err) {
        toast({ title: (err as Error).message, variant: "destructive" });
      }
    }
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/master", masterData.id] });
      toast({ title: `Добавлено фото: ${successCount}` });
    }
    setPortfolioUploading(false);
    // reset input so same files can be re-selected
    if (portfolioInputRef.current) portfolioInputRef.current.value = "";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const uploadRes = await fetch("/api/upload/master-photo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Ошибка загрузки фото");
      const { url } = await uploadRes.json();

      const updateRes = await apiRequest("PUT", "/api/solo-master/profile", { photo: url });
      if (!updateRes.ok) throw new Error("Ошибка сохранения фото");

      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/me"] });
      toast({ title: "Фото профиля обновлено" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  if (authLoading || masterLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!masterData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t("soloMaster.notFound", "Profile Not Found")}</CardTitle>
            <CardDescription>
              {t("soloMaster.notFoundDesc", "You need to complete your solo master setup first.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/solo-master/onboarding")} className="w-full">
              {t("soloMaster.startSetup", "Start Setup")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDraft = masterData.status === "draft";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Hidden avatar file input */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                className="relative h-16 w-16 rounded-full group focus:outline-none"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                title="Изменить фото профиля"
              >
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {avatarUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : masterData.photo ? (
                    <img
                      src={masterData.photo}
                      alt={masterData.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <Briefcase className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </button>
              <div>
                <h1 className="text-2xl font-bold">{masterData.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant={isDraft ? "secondary" : "default"}>
                    {isDraft ? "Черновик" : "Активный"}
                  </Badge>
                  {masterData.city && (
                    <span className="text-sm text-muted-foreground">{masterData.city}</span>
                  )}
                  {masterData.averageRating && parseFloat(masterData.averageRating) > 0 && (
                    <span className="flex items-center gap-1 text-sm text-amber-500 font-medium">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      {parseFloat(masterData.averageRating).toFixed(1)}
                      {masterData.reviewCount ? (
                        <span className="text-muted-foreground font-normal">({masterData.reviewCount})</span>
                      ) : null}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {masterData.slug && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/master/${masterData.slug}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("soloMaster.viewPublicPage", "View Page")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/solo-master/onboarding")}
              >
                <Settings className="h-4 w-4 mr-2" />
                {t("soloMaster.editProfile", "Edit Profile")}
              </Button>
              <LanguageSwitcher variant="outline" />
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Warning */}
      {isDraft && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <div className="container py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="text-sm">
                  Профиль в черновике — клиенты не могут вас найти.
                  {services.length === 0 && " Сначала добавьте хотя бы одну услугу."}
                </span>
              </div>
              {services.length > 0 && (
                <Button
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                >
                  {activateMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  Активировать профиль
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t("soloMaster.tabs.overview", "Overview")}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              {t("soloMaster.tabs.calendar", "Calendar")}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {t("soloMaster.tabs.schedule", "Schedule")}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <Clock className="h-4 w-4" />
              {t("soloMaster.tabs.bookings", "Bookings")}
              {(stats?.pendingBookings ?? 0) > 0 && (
                <span className="ml-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {stats!.pendingBookings}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Briefcase className="h-4 w-4" />
              {t("soloMaster.tabs.services", "Services")}
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="gap-2">
              <Image className="h-4 w-4" />
              {t("soloMaster.tabs.portfolio", "Portfolio")}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              {t("soloMaster.tabs.settings", "Settings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Draft warning */}
              {isDraft && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800 dark:text-amber-300">Профиль не опубликован</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">Клиенты не могут найти вас в поиске. Заполните профиль и активируйте его.</p>
                  </div>
                </div>
              )}

              {/* Pending bookings alert */}
              {(stats?.pendingBookings ?? 0) > 0 && (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  onClick={() => setActiveTab("bookings")}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300">
                        {stats!.pendingBookings} {stats!.pendingBookings === 1 ? "новая запись" : "новых записи"} ожидают подтверждения
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">Нажмите чтобы перейти к записям</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Сегодня</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.todayBookings || 0}</div>
                    <p className="text-xs text-muted-foreground">записей</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Неделя</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.weekBookings || 0}</div>
                    <p className="text-xs text-muted-foreground">записей</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Выручка / месяц</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(stats?.monthRevenue || 0).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">UZS</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ожидают</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(stats?.pendingBookings || 0) > 0 ? "text-amber-600" : ""}`}>
                      {stats?.pendingBookings || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">записей</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Profile completeness */}
                {(() => {
                  const checks = [
                    { label: "Фото профиля", done: !!masterData.photo, tab: "settings" },
                    { label: "Услуги добавлены", done: services.length > 0, tab: "services" },
                    { label: "О себе заполнено", done: !!(masterData.bio?.ru || editBio), tab: "settings" },
                    { label: "Город указан", done: !!masterData.city, tab: "settings" },
                    { label: "Телефон или Telegram", done: !!(masterData.phone || masterData.telegram), tab: "settings" },
                    { label: "Портфолио добавлено", done: portfolio.length > 0, tab: "portfolio" },
                  ];
                  const done = checks.filter((c) => c.done).length;
                  const pct = Math.round((done / checks.length) * 100);
                  return (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Заполненность профиля</CardTitle>
                          <span className={`text-sm font-semibold ${pct === 100 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-500"}`}>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {checks.map((c) => (
                          <button
                            key={c.label}
                            className="flex items-center gap-2.5 w-full text-left hover:opacity-80 transition-opacity"
                            onClick={() => !c.done && setActiveTab(c.tab as typeof activeTab)}
                          >
                            {c.done ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                            )}
                            <span className={`text-sm ${c.done ? "text-foreground" : "text-muted-foreground"}`}>{c.label}</span>
                            {!c.done && <span className="text-xs text-primary ml-auto">Добавить →</span>}
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Recent bookings */}
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Ближайшие записи</CardTitle>
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setActiveTab("bookings")}
                    >
                      Все записи →
                    </button>
                  </CardHeader>
                  <CardContent>
                    {bookingsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (() => {
                      const upcoming = masterBookings
                        .filter((b) => b.status !== "cancelled" && b.status !== "completed")
                        .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime())
                        .slice(0, 4);
                      if (upcoming.length === 0) return (
                        <p className="text-sm text-muted-foreground text-center py-4">Нет предстоящих записей</p>
                      );
                      return (
                        <div className="space-y-2.5">
                          {upcoming.map((b) => {
                            const svc = services.find((s) => s.id === b.soloMasterServiceId);
                            const date = new Date(b.bookingDate);
                            const isToday = date.toDateString() === new Date().toDateString();
                            const dateStr = isToday ? "Сегодня" : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
                            return (
                              <div key={b.id} className="flex items-center gap-3 text-sm">
                                <div className={`shrink-0 text-center w-10 rounded-md py-0.5 ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                  <div className="text-xs font-semibold leading-none">{dateStr}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-medium">{svc?.name?.ru || "Услуга"}</p>
                                  <p className="text-xs text-muted-foreground">{b.startTime}–{b.endTime}</p>
                                </div>
                                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${b.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"}`}>
                                  {b.status === "pending" ? "Ожидает" : "Подтверждена"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("soloMaster.quickActions", "Quick Actions")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={() => setActiveTab("services")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить услугу
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("calendar")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Календарь
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("portfolio")}>
                    <Image className="h-4 w-4 mr-2" />
                    Добавить фото
                  </Button>
                  {masterData.slug && (
                    <Button variant="outline" asChild>
                      <a href={`/master/${masterData.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Моя страница
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Календарь</CardTitle>
                    <CardDescription>Записи по дням недели</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCalWeekOffset((o) => o - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCalWeekOffset(0)}>
                      Сегодня
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCalWeekOffset((o) => o + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const today = new Date();
                  const startOfWeek = new Date(today);
                  // Monday as start
                  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
                  startOfWeek.setDate(today.getDate() - dow + calWeekOffset * 7);
                  startOfWeek.setHours(0, 0, 0, 0);

                  const days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(startOfWeek);
                    d.setDate(startOfWeek.getDate() + i);
                    return d;
                  });

                  const weekStart = days[0];
                  const weekEnd = days[6];
                  const weekLabel = `${weekStart.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — ${weekEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`;

                  const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground text-center">{weekLabel}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                        {days.map((day, idx) => {
                          const isToday = day.toDateString() === today.toDateString();
                          const dayBookings = masterBookings.filter((b) => {
                            const bd = new Date(b.bookingDate);
                            return bd.toDateString() === day.toDateString() && b.status !== "cancelled";
                          });
                          return (
                            <div
                              key={idx}
                              className={`rounded-lg border p-2 min-h-[80px] ${isToday ? "border-primary bg-primary/5" : "border-border"}`}
                            >
                              <div className={`text-xs font-semibold mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                                {DAY_NAMES[idx]} {day.getDate()}
                              </div>
                              {dayBookings.length === 0 ? (
                                <div className="text-xs text-muted-foreground/50 text-center py-2">—</div>
                              ) : (
                                <div className="space-y-1">
                                  {dayBookings.map((b) => {
                                    const svc = services.find((s) => s.id === b.soloMasterServiceId);
                                    const colors: Record<string, string> = {
                                      pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
                                      confirmed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
                                      completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
                                    };
                                    return (
                                      <div
                                        key={b.id}
                                        className={`text-xs rounded px-1 py-0.5 truncate ${colors[b.status] || "bg-muted"}`}
                                        title={`${b.startTime} ${svc?.name?.ru || "Услуга"}`}
                                      >
                                        {b.startTime} {svc?.name?.ru || "Услуга"}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle>{t("soloMaster.tabs.bookings", "Bookings")}</CardTitle>
                    <CardDescription>Управление записями клиентов</CardDescription>
                  </div>
                  {/* Filter pills */}
                  <div className="flex gap-2 flex-wrap">
                    {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setBookingFilter(f)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          bookingFilter === f
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {{ all: "Все", pending: "Ожидают", confirmed: "Подтверждены", completed: "Завершены", cancelled: "Отменены" }[f]}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (() => {
                  const filtered = bookingFilter === "all"
                    ? masterBookings
                    : masterBookings.filter((b) => b.status === bookingFilter);
                  if (filtered.length === 0) return (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Записей пока нет</p>
                    </div>
                  );
                  return (
                    <div className="space-y-3">
                      {filtered.map((booking) => {
                        const date = new Date(booking.bookingDate);
                        const dateStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
                        const svc = services.find((s) => s.id === booking.soloMasterServiceId);
                        const statusColors: Record<string, string> = {
                          pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                          confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                          completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                          cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                        };
                        const statusLabel: Record<string, string> = {
                          pending: "Ожидает", confirmed: "Подтверждена", completed: "Завершена", cancelled: "Отменена",
                        };
                        return (
                          <div key={booking.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <p className="font-medium">{svc?.name?.ru || "Услуга"}</p>
                                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {dateStr}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {booking.startTime}–{booking.endTime}
                                  </span>
                                  {booking.isMobileBooking && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" />
                                      Выезд
                                    </span>
                                  )}
                                  {booking.priceSnapshot != null && (
                                    <span className="font-medium text-foreground">
                                      {booking.priceSnapshot.toLocaleString()} UZS
                                    </span>
                                  )}
                                </div>
                                {booking.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">"{booking.notes}"</p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusColors[booking.status] || ""}`}>
                                {statusLabel[booking.status] || booking.status}
                              </span>
                            </div>
                            {/* Action buttons */}
                            {booking.status === "pending" && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => updateBookingStatusMutation.mutate({ id: booking.id, status: "confirmed" })}
                                  disabled={updateBookingStatusMutation.isPending}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Подтвердить
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-destructive hover:text-destructive"
                                  onClick={() => updateBookingStatusMutation.mutate({ id: booking.id, status: "cancelled" })}
                                  disabled={updateBookingStatusMutation.isPending}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Отменить
                                </Button>
                              </div>
                            )}
                            {booking.status === "confirmed" && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5"
                                  onClick={() => updateBookingStatusMutation.mutate({ id: booking.id, status: "completed" })}
                                  disabled={updateBookingStatusMutation.isPending}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Завершить
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1.5 text-destructive hover:text-destructive"
                                  onClick={() => updateBookingStatusMutation.mutate({ id: booking.id, status: "cancelled" })}
                                  disabled={updateBookingStatusMutation.isPending}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Отменить
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("soloMaster.tabs.services", "Services")}</CardTitle>
                  <CardDescription>
                    {t("soloMaster.servicesDesc", "Services you offer to clients")}
                  </CardDescription>
                </div>
                <Button onClick={() => setServiceDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("soloMaster.addService", "Add Service")}
                </Button>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>
                      {t(
                        "soloMaster.noServices",
                        "No services added yet. Add your first service to start accepting bookings.",
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((svc) => (
                      <div
                        key={svc.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium truncate ${!svc.isActive ? "text-muted-foreground line-through" : ""}`}>
                              {svc.name.ru}
                            </p>
                            {!svc.isActive && (
                              <Badge variant="secondary" className="text-xs shrink-0">Пауза</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">{svc.category}</Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {svc.duration} мин
                            </span>
                            <span className="font-medium text-foreground">
                              {svc.priceMin.toLocaleString()} UZS
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={svc.isActive ? "text-green-600 hover:text-amber-500" : "text-muted-foreground hover:text-green-600"}
                            title={svc.isActive ? "Поставить на паузу" : "Включить услугу"}
                            onClick={() => toggleServiceMutation.mutate({ id: svc.id, isActive: !svc.isActive })}
                            disabled={toggleServiceMutation.isPending}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => deleteServiceMutation.mutate(svc.id)}
                            disabled={deleteServiceMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            {/* Hidden file input — accepts images, multiple */}
            <input
              ref={portfolioInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePortfolioUpload}
            />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("soloMaster.tabs.portfolio", "Portfolio")}</CardTitle>
                  <CardDescription>
                    {t("soloMaster.portfolioDesc", "Showcase your work")}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => portfolioInputRef.current?.click()}
                  disabled={portfolioUploading}
                >
                  {portfolioUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {portfolioUploading ? "Загрузка..." : t("soloMaster.addPhoto", "Add Photo")}
                </Button>
              </CardHeader>
              <CardContent>
                {portfolioLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : portfolio.length === 0 ? (
                  <div
                    className="text-center py-16 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => portfolioInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="text-muted-foreground">
                      {t(
                        "soloMaster.noPortfolio",
                        "No portfolio items yet. Add photos to showcase your work.",
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Нажмите чтобы выбрать фотографии
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {portfolio.map((item) => (
                      <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={item.imageUrl}
                          alt="Portfolio"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => deletePortfolioMutation.mutate(item.id)}
                            disabled={deletePortfolioMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* Add more tile */}
                    <div
                      className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => portfolioInputRef.current?.click()}
                    >
                      <Plus className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Рабочее расписание
                </CardTitle>
                <CardDescription>Укажите рабочие часы для каждого дня недели</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {([1, 2, 3, 4, 5, 6, 0] as number[]).map((dayNum) => {
                  const DAY_NAMES: Record<number, string> = {
                    0: "Воскресенье",
                    1: "Понедельник",
                    2: "Вторник",
                    3: "Среда",
                    4: "Четверг",
                    5: "Пятница",
                    6: "Суббота",
                  };
                  const slot = scheduleHours.find((h) => h.dayOfWeek === dayNum);
                  if (!slot) return null;
                  const idx = scheduleHours.indexOf(slot);
                  return (
                    <div
                      key={dayNum}
                      className="flex items-center gap-3 py-2 border-b last:border-0"
                    >
                      <Switch
                        checked={slot.isOpen}
                        onCheckedChange={(checked) => {
                          const updated = [...scheduleHours];
                          updated[idx] = { ...updated[idx], isOpen: checked };
                          setScheduleHours(updated);
                        }}
                      />
                      <span className="w-28 text-sm font-medium shrink-0">
                        {DAY_NAMES[dayNum]}
                      </span>
                      {slot.isOpen ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={slot.openTime}
                            onChange={(e) => {
                              const updated = [...scheduleHours];
                              updated[idx] = { ...updated[idx], openTime: e.target.value };
                              setScheduleHours(updated);
                            }}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                          />
                          <span className="text-muted-foreground text-sm">—</span>
                          <input
                            type="time"
                            value={slot.closeTime}
                            onChange={(e) => {
                              const updated = [...scheduleHours];
                              updated[idx] = { ...updated[idx], closeTime: e.target.value };
                              setScheduleHours(updated);
                            }}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Выходной</span>
                      )}
                    </div>
                  );
                })}
                <Button
                  className="mt-4 gap-2"
                  onClick={() => updateScheduleMutation.mutate()}
                  disabled={updateScheduleMutation.isPending || scheduleHours.length === 0}
                >
                  {updateScheduleMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Сохранить расписание
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-4">
              {/* Photo upload card */}
              <Card>
                <CardHeader>
                  <CardTitle>Фото профиля</CardTitle>
                  <CardDescription>Ваше фото видят клиенты на странице поиска</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative shrink-0">
                      <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {avatarUploading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        ) : masterData.photo ? (
                          <img
                            src={masterData.photo}
                            alt={masterData.name}
                            className="h-24 w-24 rounded-full object-cover"
                          />
                        ) : (
                          <Briefcase className="h-10 w-10 text-primary" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        {masterData.photo ? "Изменить фото" : "Загрузить фото"}
                      </Button>
                      <p className="text-xs text-muted-foreground">JPG, PNG до 5 МБ</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile edit inline form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Данные профиля
                  </CardTitle>
                  <CardDescription>Отображаются на вашей публичной странице</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-name">Имя *</Label>
                      <Input
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Ваше имя"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-city">Город</Label>
                      <Input
                        id="edit-city"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="Ташкент"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-phone" className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Телефон
                      </Label>
                      <Input
                        id="edit-phone"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-telegram" className="flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" /> Telegram
                      </Label>
                      <Input
                        id="edit-telegram"
                        value={editTelegram}
                        onChange={(e) => setEditTelegram(e.target.value)}
                        placeholder="@username"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Режим работы</Label>
                    <Select value={editServiceMode} onValueChange={setEditServiceMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="at_master">У мастера</SelectItem>
                        <SelectItem value="mobile">Выезд к клиенту</SelectItem>
                        <SelectItem value="both">Оба варианта</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-bio">О себе</Label>
                    <Textarea
                      id="edit-bio"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Расскажите о своём опыте и специализации..."
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => updateProfileMutation.mutate()}
                    disabled={updateProfileMutation.isPending || !editName.trim()}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Сохранить изменения
                  </Button>
                </CardContent>
              </Card>
              <PushNotificationSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t("soloMaster.addService", "Add Service")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="svc-name">Название услуги *</Label>
              <Input
                id="svc-name"
                placeholder="Маникюр классический"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="svc-category">Категория *</Label>
              <Select value={serviceCategory} onValueChange={setServiceCategory}>
                <SelectTrigger id="svc-category" className="mt-1">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="svc-price">Цена (UZS) *</Label>
                <Input
                  id="svc-price"
                  type="number"
                  placeholder="100000"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="svc-duration">Длительность (мин) *</Label>
                <Input
                  id="svc-duration"
                  type="number"
                  placeholder="60"
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="svc-mode">Формат работы</Label>
              <Select value={serviceMode} onValueChange={setServiceMode}>
                <SelectTrigger id="svc-mode" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="at_master">У мастера</SelectItem>
                  <SelectItem value="mobile">Выезд</SelectItem>
                  <SelectItem value="both">У мастера и выезд</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => createServiceMutation.mutate()}
              disabled={createServiceMutation.isPending || !serviceName.trim() || !serviceCategory || !servicePrice}
            >
              {createServiceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
