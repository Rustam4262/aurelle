import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Master, Salon, Booking, Review, MasterWorkingHours, MasterPortfolio, Service, Notification } from "@shared/schema";
import { BookingCalendar } from "@/components/booking-calendar";
import { ImageUpload } from "@/components/image-upload";
import {
  ArrowLeft,
  Calendar,
  Star,
  Users,
  Store,
  LogOut,
  Clock,
  MessageSquare,
  DollarSign,
  CalendarDays,
  Image,
  BarChart3,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
  Bell,
  CalendarCheck,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface EnrichedBooking extends Booking {
  salon?: Salon;
  service?: Service;
  master?: Master;
  clientName?: string;
}

function getLocalizedText(obj: { en?: string; ru?: string; uz?: string } | null | undefined, lang: string): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const PIE_COLORS = ["#fbbf24", "#3b82f6", "#22c55e", "#ef4444"];

interface MasterStats {
  totalEarnings: number;
  earningsByMonth: { month: string; earnings: number }[];
  popularServices: { serviceId: string; count: number; service?: Service }[];
  bookingsByStatus: { status: string; count: number }[];
  clientRetention: {
    totalClients: number;
    repeatClients: number;
    totalBookings: number;
    retentionRate: number;
  };
}

interface ScheduleDay {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export default function MasterPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [newPortfolioUrl, setNewPortfolioUrl] = useState("");
  const [newPortfolioDesc, setNewPortfolioDesc] = useState("");
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);

  const { data: masterData, isLoading: masterLoading } = useQuery<{
    master: Master;
    salon: Salon;
    bookings: Booking[];
    reviews: Review[];
  }>({
    queryKey: ["/api/master/me"],
    enabled: !!user,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<MasterStats>({
    queryKey: ["/api/master/stats"],
    enabled: !!user && activeTab === "analytics",
  });

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery<MasterWorkingHours[]>({
    queryKey: ["/api/master/schedule"],
    enabled: !!user && activeTab === "schedule",
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/master/bookings"],
    enabled: !!user && (activeTab === "bookings" || activeTab === "calendar"),
  });

  const { data: portfolioData, isLoading: portfolioLoading } = useQuery<MasterPortfolio[]>({
    queryKey: ["/api/master/portfolio"],
    enabled: !!user && activeTab === "portfolio",
  });

  const { data: notificationsData } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notificationsData?.filter(n => !n.isRead).length || 0;

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status, cancellationReason }: { bookingId: string; status: string; cancellationReason?: string }) => {
      return apiRequest("PATCH", `/api/master/bookings/${bookingId}/status`, { status, cancellationReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/master/me"] });
      toast({ title: t("marketplace.master.bookingUpdated") });
    },
    onError: () => {
      toast({ title: t("marketplace.master.error"), variant: "destructive" });
    },
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async (scheduleData: ScheduleDay[]) => {
      return apiRequest("PUT", "/api/master/schedule", scheduleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/schedule"] });
      toast({ title: t("marketplace.master.scheduleSaved") });
    },
    onError: () => {
      toast({ title: t("marketplace.master.error"), variant: "destructive" });
    },
  });

  const addPortfolioMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; description?: { en: string; ru: string; uz: string } }) => {
      return apiRequest("POST", "/api/master/portfolio", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/portfolio"] });
      setPortfolioDialogOpen(false);
      setNewPortfolioUrl("");
      setNewPortfolioDesc("");
      toast({ title: t("marketplace.master.photoAdded") });
    },
    onError: () => {
      toast({ title: t("marketplace.master.error"), variant: "destructive" });
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/master/portfolio/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/portfolio"] });
      toast({ title: t("marketplace.master.photoDeleted") });
    },
    onError: () => {
      toast({ title: t("marketplace.master.error"), variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleConfirmBooking = (bookingId: string) => {
    updateBookingStatusMutation.mutate({ bookingId, status: "confirmed" });
  };

  const handleCompleteBooking = (bookingId: string) => {
    updateBookingStatusMutation.mutate({ bookingId, status: "completed" });
  };

  const handleCancelBooking = () => {
    if (cancelBookingId) {
      updateBookingStatusMutation.mutate({
        bookingId: cancelBookingId,
        status: "cancelled",
        cancellationReason: cancelReason,
      });
      setCancelDialogOpen(false);
      setCancelBookingId(null);
      setCancelReason("");
    }
  };

  const openCancelDialog = (bookingId: string) => {
    setCancelBookingId(bookingId);
    setCancelDialogOpen(true);
  };

  const handleAddPortfolio = () => {
    if (newPortfolioUrl) {
      addPortfolioMutation.mutate({
        imageUrl: newPortfolioUrl,
        description: newPortfolioDesc
          ? { en: newPortfolioDesc, ru: newPortfolioDesc, uz: newPortfolioDesc }
          : undefined,
      });
    }
  };

  const initializeSchedule = () => {
    if (scheduleData && scheduleData.length > 0) {
      const mapped = scheduleData.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed ?? false,
      }));
      setSchedule(mapped);
    } else if (schedule.length === 0) {
      const defaultSchedule: ScheduleDay[] = [];
      for (let i = 0; i < 7; i++) {
        defaultSchedule.push({
          dayOfWeek: i,
          openTime: "09:00",
          closeTime: "18:00",
          isClosed: i === 0,
        });
      }
      setSchedule(defaultSchedule);
    }
  };

  const updateScheduleDay = (dayOfWeek: number, field: keyof ScheduleDay, value: any) => {
    setSchedule((prev) =>
      prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day))
    );
  };

  const handleSaveSchedule = () => {
    saveScheduleMutation.mutate(schedule);
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
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-master">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="font-serif text-xl text-foreground">{t("marketplace.master.title")}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 py-16">
          <Card className="p-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl text-foreground mb-2">
              {t("marketplace.master.title")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("marketplace.master.noAccount")}
            </p>
            <Link href="/">
              <Button data-testid="button-back-home">
                {t("marketplace.master.backHome")}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const { master, salon, bookings, reviews } = masterData;
  const salonName = getLocalizedText(salon?.name as any, currentLang);
  const todayBookings =
    bookings?.filter((b) => {
      const bookingDate = new Date(b.bookingDate);
      const today = new Date();
      return bookingDate.toDateString() === today.toDateString() && b.status === "confirmed";
    }) || [];

  const upcomingBookings =
    bookings
      ?.filter((b) => {
        const bookingDate = new Date(b.bookingDate);
        const today = new Date();
        return bookingDate >= today && b.status === "confirmed";
      })
      .slice(0, 5) || [];

  const filteredBookings =
    bookingFilter === "all"
      ? bookingsData || []
      : (bookingsData || []).filter((b) => b.status === bookingFilter);

  if (activeTab === "schedule" && scheduleData && schedule.length === 0) {
    initializeSchedule();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-master">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-serif text-xl text-foreground">{t("marketplace.master.title")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("marketplace.master.welcome")}, {master.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center" data-testid="notification-badge">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
                    <h4 className="font-medium text-sm">{t("marketplace.notifications.title")}</h4>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllNotificationsReadMutation.mutate()}
                        data-testid="button-mark-all-read"
                      >
                        {t("marketplace.notifications.markAllRead")}
                      </Button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsData && notificationsData.length > 0 ? (
                      notificationsData.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b last:border-b-0 cursor-pointer hover-elevate ${
                            !notification.isRead ? "bg-muted/50" : ""
                          }`}
                          onClick={() => {
                            if (!notification.isRead) {
                              markNotificationReadMutation.mutate(notification.id);
                            }
                            if (notification.relatedId) {
                              setActiveTab("bookings");
                            }
                          }}
                          data-testid={`notification-item-${notification.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {t("marketplace.notifications.newBooking")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {(() => {
                                  // 1. First try structured metadata for new_booking
                                  if (notification.type === "new_booking" && notification.metadata?.bookingDate) {
                                    try {
                                      const parsedDate = new Date(notification.metadata.bookingDate);
                                      if (isNaN(parsedDate.getTime())) {
                                        throw new Error("Invalid date");
                                      }
                                      return t("marketplace.notifications.newBookingMessage", {
                                        date: parsedDate.toLocaleDateString(
                                          currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US"
                                        ),
                                        time: notification.metadata.startTime || "",
                                      });
                                    } catch (error) {
                                      console.error("Failed to parse notification metadata:", error, notification.metadata);
                                    }
                                  }
                                  // 2. Try legacy message field
                                  if (notification.message) {
                                    return notification.message;
                                  }
                                  // 3. Try to extract any useful info from raw metadata
                                  if (notification.metadata && typeof notification.metadata === "object") {
                                    const meta = notification.metadata;
                                    const parts: string[] = [];
                                    if (meta.bookingDate) parts.push(`Date: ${meta.bookingDate}`);
                                    if (meta.startTime) parts.push(`Time: ${meta.startTime}`);
                                    if (parts.length > 0) {
                                      return parts.join(", ");
                                    }
                                    // Show raw JSON if has other data
                                    const otherKeys = Object.keys(meta).filter(k => k !== "bookingDate" && k !== "startTime");
                                    if (otherKeys.length > 0) {
                                      try {
                                        return JSON.stringify(meta);
                                      } catch {
                                        // ignore
                                      }
                                    }
                                  }
                                  // 4. Generic fallback
                                  return t("marketplace.notifications.newBookingFallback");
                                })()}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notification.createdAt!).toLocaleString()}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        {t("marketplace.notifications.noNotifications")}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout-master">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Store className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.overview")}</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">
              <CalendarDays className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.schedule")}</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.bookings")}</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <CalendarCheck className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.calendar.title")}</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-portfolio">
              <Image className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.portfolio")}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.analytics")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Store className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-medium text-foreground">{t("marketplace.master.yourSalon")}</h2>
                  <p className="text-lg text-foreground font-serif truncate">{salonName}</p>
                  <p className="text-sm text-muted-foreground">{salon?.city}</p>
                </div>
                <Link href={`/salon/${salon?.id}`}>
                  <Button variant="outline" size="sm" data-testid="button-view-salon">
                    {t("marketplace.master.viewSalon")}
                  </Button>
                </Link>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-6 text-center">
                <DollarSign className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {statsData?.totalEarnings?.toLocaleString() || "0"} UZS
                </p>
                <p className="text-sm text-muted-foreground">{t("marketplace.master.totalEarnings")}</p>
              </Card>
              <Card className="p-6 text-center">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{upcomingBookings.length}</p>
                <p className="text-sm text-muted-foreground">{t("marketplace.master.upcomingAppointments")}</p>
              </Card>
              <Card className="p-6 text-center">
                <Star className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{master.averageRating || "0.0"}</p>
                <p className="text-sm text-muted-foreground">{t("marketplace.master.rating")}</p>
              </Card>
              <Card className="p-6 text-center">
                <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{master.reviewCount || 0}</p>
                <p className="text-sm text-muted-foreground">{t("marketplace.master.clients")}</p>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t("marketplace.master.todaysAppointments")}
                </h3>
              </div>

              {todayBookings.length > 0 ? (
                <div className="space-y-3">
                  {todayBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-md flex-wrap"
                      data-testid={`booking-today-${booking.id}`}
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {t("marketplace.master.client")} #{booking.clientId.slice(-6)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.startTime} - {booking.endTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {booking.priceSnapshot.toLocaleString()} UZS
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t("marketplace.master.noAppointments")}
                </p>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("marketplace.master.upcomingAppointments")}
                </h3>
              </div>

              {upcomingBookings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-md flex-wrap"
                      data-testid={`booking-upcoming-${booking.id}`}
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {t("marketplace.master.client")} #{booking.clientId.slice(-6)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.bookingDate).toLocaleDateString()} at {booking.startTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {booking.priceSnapshot.toLocaleString()} UZS
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t("marketplace.master.noAppointments")}
                </p>
              )}
            </Card>

            {reviews && reviews.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {t("marketplace.master.myReviews")}
                  </h3>
                </div>

                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="p-4 bg-muted/50 rounded-md" data-testid={`review-${review.id}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-foreground">{review.comment}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(review.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {t("marketplace.master.workingHours")}
                </h3>
                <Button
                  onClick={handleSaveSchedule}
                  disabled={saveScheduleMutation.isPending}
                  data-testid="button-save-schedule"
                >
                  {saveScheduleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {t("marketplace.master.saveSchedule")}
                </Button>
              </div>

              {scheduleLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
                    const day = schedule.find((d) => d.dayOfWeek === dayOfWeek) || {
                      dayOfWeek,
                      openTime: "09:00",
                      closeTime: "18:00",
                      isClosed: dayOfWeek === 0,
                    };
                    return (
                      <div
                        key={dayOfWeek}
                        className="flex items-center gap-4 p-4 bg-muted/50 rounded-md flex-wrap"
                        data-testid={`schedule-day-${dayOfWeek}`}
                      >
                        <div className="w-28 font-medium text-foreground">
                          {t(`marketplace.days.${DAY_NAMES[dayOfWeek]}`)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!day.isClosed}
                            onCheckedChange={(checked) => updateScheduleDay(dayOfWeek, "isClosed", !checked)}
                            data-testid={`switch-day-${dayOfWeek}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {day.isClosed ? t("marketplace.master.closed") : t("marketplace.master.open")}
                          </span>
                        </div>
                        {!day.isClosed && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Input
                              type="time"
                              value={day.openTime}
                              onChange={(e) => updateScheduleDay(dayOfWeek, "openTime", e.target.value)}
                              className="w-32"
                              data-testid={`input-open-time-${dayOfWeek}`}
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                              type="time"
                              value={day.closeTime}
                              onChange={(e) => updateScheduleDay(dayOfWeek, "closeTime", e.target.value)}
                              className="w-32"
                              data-testid={`input-close-time-${dayOfWeek}`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("marketplace.master.manageBookings")}
                </h3>
              </div>

              <div className="flex gap-2 mb-6 flex-wrap">
                {["all", "pending", "confirmed", "completed", "cancelled"].map((status) => (
                  <Button
                    key={status}
                    variant={bookingFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBookingFilter(status)}
                    data-testid={`filter-${status}`}
                  >
                    {t(`marketplace.master.filter.${status}`)}
                  </Button>
                ))}
              </div>

              {bookingsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredBookings.length > 0 ? (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 bg-muted/50 rounded-md"
                      data-testid={`booking-${booking.id}`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">
                              {t("marketplace.master.client")} #{booking.clientId.slice(-6)}
                            </p>
                            <Badge className={STATUS_COLORS[booking.status || "pending"] || ""} variant="secondary">
                              {t(`marketplace.master.status.${booking.status || "pending"}`)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.bookingDate).toLocaleDateString()} | {booking.startTime} -{" "}
                            {booking.endTime}
                          </p>
                          <p className="text-sm text-foreground">{booking.priceSnapshot.toLocaleString()} UZS</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {booking.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleConfirmBooking(booking.id)}
                              disabled={updateBookingStatusMutation.isPending}
                              data-testid={`button-confirm-${booking.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {t("marketplace.master.confirm")}
                            </Button>
                          )}
                          {booking.status === "confirmed" && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteBooking(booking.id)}
                              disabled={updateBookingStatusMutation.isPending}
                              data-testid={`button-complete-${booking.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {t("marketplace.master.complete")}
                            </Button>
                          )}
                          {(booking.status === "pending" || booking.status === "confirmed") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCancelDialog(booking.id)}
                              disabled={updateBookingStatusMutation.isPending}
                              data-testid={`button-cancel-${booking.id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              {t("marketplace.master.cancel")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t("marketplace.master.noBookings")}
                </p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <BookingCalendar
              bookings={bookingsData || []}
              isLoading={bookingsLoading}
              showClient={true}
            />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  {t("marketplace.master.myPortfolio")}
                </h3>
                <Button onClick={() => setPortfolioDialogOpen(true)} data-testid="button-add-photo">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("marketplace.master.addPhoto")}
                </Button>
              </div>

              {portfolioLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : portfolioData && portfolioData.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {portfolioData.map((item) => (
                    <div key={item.id} className="relative group" data-testid={`portfolio-${item.id}`}>
                      <img
                        src={item.imageUrl}
                        alt={getLocalizedText(item.description as any, currentLang) || "Portfolio"}
                        className="w-full aspect-square object-cover rounded-md"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deletePortfolioMutation.mutate(item.id)}
                        disabled={deletePortfolioMutation.isPending}
                        data-testid={`button-delete-portfolio-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-2 truncate">
                          {getLocalizedText(item.description as any, currentLang)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t("marketplace.master.noPortfolio")}
                </p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : statsData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6">
                    <h3 className="font-medium text-foreground mb-2">{t("marketplace.master.totalEarnings")}</h3>
                    <p className="text-3xl font-bold text-foreground">
                      {statsData.totalEarnings.toLocaleString()} UZS
                    </p>
                  </Card>
                  <Card className="p-6">
                    <h3 className="font-medium text-foreground mb-2">{t("marketplace.master.clientRetention")}</h3>
                    <p className="text-3xl font-bold text-foreground">
                      {(statsData.clientRetention.retentionRate * 100).toFixed(0)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {statsData.clientRetention.repeatClients} / {statsData.clientRetention.totalClients}{" "}
                      {t("marketplace.master.repeatClients")}
                    </p>
                  </Card>
                </div>

                <Card className="p-6">
                  <h3 className="font-medium text-foreground mb-4">{t("marketplace.master.earningsByMonth")}</h3>
                  {statsData.earningsByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={statsData.earningsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [`${value.toLocaleString()} UZS`, t("marketplace.master.earnings")]}
                        />
                        <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">{t("marketplace.master.noData")}</p>
                  )}
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="font-medium text-foreground mb-4">{t("marketplace.master.popularServices")}</h3>
                    {statsData.popularServices.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={statsData.popularServices} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey={(entry) =>
                              getLocalizedText(entry.service?.name as any, currentLang) || entry.serviceId.slice(-6)
                            }
                            width={120}
                          />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">{t("marketplace.master.noData")}</p>
                    )}
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-medium text-foreground mb-4">{t("marketplace.master.bookingsByStatus")}</h3>
                    {statsData.bookingsByStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={statsData.bookingsByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            dataKey="count"
                            nameKey="status"
                            label={({ name, percent }) => `${t(`marketplace.master.status.${name}`)} ${(percent * 100).toFixed(0)}%`}
                          >
                            {statsData.bookingsByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, t(`marketplace.master.status.${name}`)]} />
                          <Legend
                            formatter={(value) => t(`marketplace.master.status.${value}`)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">{t("marketplace.master.noData")}</p>
                    )}
                  </Card>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t("marketplace.master.noData")}</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.master.cancelBooking")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t("marketplace.master.cancelReasonPlaceholder")}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              data-testid="input-cancel-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              {t("marketplace.master.close")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={updateBookingStatusMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {t("marketplace.master.confirmCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.master.addPhoto")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ImageUpload
              value={newPortfolioUrl}
              onChange={setNewPortfolioUrl}
              uploadType="portfolio"
              label={t("marketplace.master.uploadPhoto")}
              preview={true}
            />
            <Textarea
              placeholder={t("marketplace.master.descriptionPlaceholder")}
              value={newPortfolioDesc}
              onChange={(e) => setNewPortfolioDesc(e.target.value)}
              data-testid="input-portfolio-desc"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortfolioDialogOpen(false)}>
              {t("marketplace.master.close")}
            </Button>
            <Button
              onClick={handleAddPortfolio}
              disabled={!newPortfolioUrl || addPortfolioMutation.isPending}
              data-testid="button-save-portfolio"
            >
              {addPortfolioMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t("marketplace.master.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
