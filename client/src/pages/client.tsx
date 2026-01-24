import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ru, uz } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { UserProfile, Salon, Booking, Review, Service, Master } from "@shared/schema";
import { BookingCalendar } from "@/components/booking-calendar";
import {
  ArrowLeft,
  Calendar,
  Star,
  Heart,
  MessageSquare,
  LogOut,
  User,
  X,
  Trash2,
  Loader2,
  Edit,
  MapPin,
  Clock,
  Store,
  CheckCircle,
  Wallet,
  RotateCcw,
  ExternalLink,
  Info,
  Phone,
  Scissors,
  Share2,
  Copy,
  Bell,
  TrendingUp,
  BarChart3,
  PieChart,
  Download,
  CalendarRange,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  RefreshCw,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ImageUpload } from "@/components/image-upload";
import {
  BookingCardSkeleton,
  ClientProfileSkeleton,
  AnalyticsCardsSkeleton,
  FavoriteCardSkeleton,
  ClientReviewSkeleton,
} from "@/components/skeletons";

function getLocalizedText(obj: { en?: string; ru?: string; uz?: string } | null | undefined, lang: string): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface EnrichedBooking extends Booking {
  salon?: Salon;
  service?: Service;
  master?: Master;
}

interface EnrichedFavorite {
  id: string;
  userId: string;
  salonId: string;
  createdAt: Date | null;
  salon?: Salon;
}

interface EnrichedReview extends Review {
  salon?: Salon | null;
  master?: Master | null;
}

const profileFormSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(20).optional(),
  avatarUrl: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ClientPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [editReviewDialogOpen, setEditReviewDialogOpen] = useState(false);
  const [deleteReviewDialogOpen, setDeleteReviewDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<EnrichedReview | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<EnrichedBooking | null>(null);
  const [writeReviewDialogOpen, setWriteReviewDialogOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<EnrichedBooking | null>(null);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState("");

  const { data: profileData, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/client/profile"],
    enabled: !!user,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/client/bookings"],
    enabled: !!user,
  });

  const { data: favoritesData, isLoading: favoritesLoading } = useQuery<EnrichedFavorite[]>({
    queryKey: ["/api/client/favorites"],
    enabled: !!user,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<EnrichedReview[]>({
    queryKey: ["/api/client/reviews"],
    enabled: !!user,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      avatarUrl: "",
      city: "",
    },
  });

  useEffect(() => {
    if (profileData) {
      form.reset({
        fullName: profileData.fullName || "",
        phone: profileData.phone || "",
        avatarUrl: profileData.avatarUrl || "",
        city: profileData.city || "",
      });
    }
  }, [profileData, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return apiRequest("PUT", "/api/client/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] });
      toast({ title: t("marketplace.client.profileUpdated") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("DELETE", `/api/client/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      setCancelDialogOpen(false);
      setCancelBookingId(null);
      toast({ title: t("marketplace.client.bookingCancelled") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (salonId: string) => {
      return apiRequest("DELETE", `/api/client/favorites/${salonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/favorites"] });
      toast({ title: t("marketplace.client.favoriteRemoved") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const editReviewMutation = useMutation({
    mutationFn: async ({ id, rating, comment }: { id: string; rating: number; comment: string }) => {
      return apiRequest("PUT", `/api/client/reviews/${id}`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] });
      setEditReviewDialogOpen(false);
      setSelectedReview(null);
      toast({ title: t("marketplace.client.reviewUpdated") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/client/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] });
      setDeleteReviewDialogOpen(false);
      setSelectedReview(null);
      toast({ title: t("marketplace.client.reviewDeleted") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: { bookingId: string; salonId: string; masterId?: string; rating: number; comment: string }) => {
      return apiRequest("POST", "/api/client/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      setWriteReviewDialogOpen(false);
      setReviewBooking(null);
      setNewReviewRating(5);
      setNewReviewComment("");
      toast({ title: t("marketplace.client.reviewSuccess") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.submitError"), variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleCancelBooking = () => {
    if (cancelBookingId) {
      cancelBookingMutation.mutate(cancelBookingId);
    }
  };

  const openCancelDialog = (bookingId: string) => {
    setCancelBookingId(bookingId);
    setCancelDialogOpen(true);
  };

  const openEditReviewDialog = (review: EnrichedReview) => {
    setSelectedReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || "");
    setEditReviewDialogOpen(true);
  };

  const openDeleteReviewDialog = (review: EnrichedReview) => {
    setSelectedReview(review);
    setDeleteReviewDialogOpen(true);
  };

  const handleEditReview = () => {
    if (selectedReview) {
      editReviewMutation.mutate({ id: selectedReview.id, rating: editRating, comment: editComment });
    }
  };

  const handleDeleteReview = () => {
    if (selectedReview) {
      deleteReviewMutation.mutate(selectedReview.id);
    }
  };

  const openBookingDetails = (booking: EnrichedBooking) => {
    setSelectedBooking(booking);
    setBookingDetailsOpen(true);
  };

  const openWriteReviewDialog = (booking: EnrichedBooking) => {
    setReviewBooking(booking);
    setNewReviewRating(5);
    setNewReviewComment("");
    setWriteReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (reviewBooking && newReviewRating > 0) {
      createReviewMutation.mutate({
        bookingId: reviewBooking.id,
        salonId: reviewBooking.salonId,
        masterId: reviewBooking.masterId || undefined,
        rating: newReviewRating,
        comment: newReviewComment,
      });
    }
  };

  const hasReviewForBooking = (bookingId: string) => {
    return reviewsData?.some(r => r.bookingId === bookingId) || false;
  };

  const copyBookingToClipboard = async (booking: EnrichedBooking) => {
    const salonName = getLocalizedText(booking.salon?.name as any, currentLang);
    const serviceName = getLocalizedText(booking.service?.name as any, currentLang);
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString(
      currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    );

    const bookingText = `
${t("marketplace.client.bookingDetails")}
━━━━━━━━━━━━━━━━━━━━━━

📍 ${salonName}
${booking.salon?.address || ""}

💇 ${serviceName}
⏱ ${booking.service?.duration} ${t("marketplace.client.minutes")}

${booking.master ? `👤 ${booking.master.name}` : ""}

📅 ${bookingDate}
🕐 ${booking.startTime} - ${booking.endTime}

💰 ${formatCurrency(booking.priceSnapshot || 0)}

━━━━━━━━━━━━━━━━━━━━━━
ID: ${booking.id.slice(0, 8)}
    `.trim();

    try {
      await navigator.clipboard.writeText(bookingText);
      toast({ title: t("marketplace.client.copied") });
    } catch (err) {
      toast({ title: t("marketplace.client.copyError"), variant: "destructive" });
    }
  };

  const shareBooking = async (booking: EnrichedBooking) => {
    const salonName = getLocalizedText(booking.salon?.name as any, currentLang);
    const serviceName = getLocalizedText(booking.service?.name as any, currentLang);
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString(
      currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
      { weekday: "long", day: "numeric", month: "long" }
    );

    const shareData = {
      title: t("marketplace.client.shareBookingTitle"),
      text: `${serviceName} @ ${salonName}\n${bookingDate}, ${booking.startTime}`,
      url: `${window.location.origin}/salon/${booking.salonId}`,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        copyBookingToClipboard(booking);
      }
    } else {
      // Fallback to clipboard copy
      copyBookingToClipboard(booking);
    }
  };

  const isUpcomingBooking = (booking: EnrichedBooking) => {
    const now = new Date();
    const bookingDate = new Date(booking.bookingDate);
    return bookingDate >= now && booking.status !== "cancelled" && booking.status !== "completed";
  };

  const isBookingSoon = (booking: EnrichedBooking) => {
    if (!isUpcomingBooking(booking)) return false;
    const now = new Date();
    const bookingDate = new Date(booking.bookingDate);
    const [hours, minutes] = booking.startTime.split(":").map(Number);
    bookingDate.setHours(hours, minutes, 0, 0);
    const hoursUntil = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil <= 24;
  };

  const canEditReview = (review: EnrichedReview) => {
    if (!review.createdAt) return false;
    const reviewDate = new Date(review.createdAt);
    const now = new Date();
    const hoursSinceReview = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceReview <= 24;
  };

  const onSubmitProfile = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  if (authLoading || profileLoading) {
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

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-client">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="font-serif text-xl text-foreground">{t("marketplace.client.title")}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 py-16">
          <Card className="p-8 text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl text-foreground mb-2">
              {t("marketplace.client.title")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("marketplace.client.noAccount")}
            </p>
            <Link href="/">
              <Button data-testid="button-back-home">
                {t("marketplace.client.backHome")}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (profileData.role !== "client") {
    navigate("/");
    return null;
  }

  // Calculate statistics
  const stats = {
    totalBookings: bookingsData?.length || 0,
    completedBookings: bookingsData?.filter(b => b.status === "completed").length || 0,
    totalSpent: bookingsData
      ?.filter(b => b.status === "completed")
      .reduce((sum, b) => sum + (b.priceSnapshot || 0), 0) || 0,
    favoritesCount: favoritesData?.length || 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
  };

  // Calculate analytics data
  const calculateAnalytics = () => {
    const completedBookings = bookingsData?.filter(b => b.status === "completed") || [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // This month spending
    const thisMonthBookings = completedBookings.filter(b => {
      const date = new Date(b.bookingDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const thisMonthSpent = thisMonthBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0);

    // This year spending
    const thisYearBookings = completedBookings.filter(b => {
      const date = new Date(b.bookingDate);
      return date.getFullYear() === currentYear;
    });
    const thisYearSpent = thisYearBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0);

    // Average check
    const averageCheck = completedBookings.length > 0
      ? Math.round(completedBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0) / completedBookings.length)
      : 0;

    // Most expensive visit
    const mostExpensive = completedBookings.length > 0
      ? completedBookings.reduce((max, b) => (b.priceSnapshot || 0) > (max.priceSnapshot || 0) ? b : max, completedBookings[0])
      : null;

    // Monthly breakdown for chart (last 6 months)
    const monthlyData: { month: string; amount: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthBookings = completedBookings.filter(b => {
        const bDate = new Date(b.bookingDate);
        return bDate.getMonth() === date.getMonth() && bDate.getFullYear() === date.getFullYear();
      });
      const monthNames = currentLang === "ru"
        ? ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
        : currentLang === "uz"
        ? ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"]
        : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthlyData.push({
        month: monthNames[date.getMonth()],
        amount: monthBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0),
        count: monthBookings.length,
      });
    }

    // Service breakdown
    const serviceStats: { name: string; count: number; amount: number }[] = [];
    completedBookings.forEach(b => {
      const serviceName = getLocalizedText(b.service?.name as any, currentLang) || "Unknown";
      const existing = serviceStats.find(s => s.name === serviceName);
      if (existing) {
        existing.count++;
        existing.amount += b.priceSnapshot || 0;
      } else {
        serviceStats.push({ name: serviceName, count: 1, amount: b.priceSnapshot || 0 });
      }
    });
    serviceStats.sort((a, b) => b.amount - a.amount);

    return {
      thisMonthSpent,
      thisMonthVisits: thisMonthBookings.length,
      thisYearSpent,
      thisYearVisits: thisYearBookings.length,
      averageCheck,
      mostExpensive,
      monthlyData,
      serviceStats: serviceStats.slice(0, 5), // Top 5 services
    };
  };

  const analytics = calculateAnalytics();

  // Get unique services for filter dropdown
  const uniqueServices = () => {
    if (!bookingsData) return [];
    const services = new Map<string, string>();
    bookingsData.forEach(b => {
      const serviceName = getLocalizedText(b.service?.name as any, currentLang);
      if (serviceName && b.serviceId) {
        services.set(b.serviceId, serviceName);
      }
    });
    return Array.from(services, ([id, name]) => ({ id, name }));
  };

  const clearFilters = () => {
    setBookingFilter("all");
    setServiceFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setSortBy("newest");
  };

  const hasActiveFilters = bookingFilter !== "all" || serviceFilter !== "all" || dateFrom || dateTo || searchQuery;

  const filteredBookings = () => {
    if (!bookingsData) return [];
    const now = new Date();

    let result = [...bookingsData];

    // Status filter
    switch (bookingFilter) {
      case "upcoming":
        result = result.filter(b => {
          const bookingDate = new Date(b.bookingDate);
          return bookingDate >= now && b.status !== "cancelled" && b.status !== "completed";
        });
        break;
      case "completed":
        result = result.filter(b => b.status === "completed");
        break;
      case "cancelled":
        result = result.filter(b => b.status === "cancelled");
        break;
    }

    // Service filter
    if (serviceFilter !== "all") {
      result = result.filter(b => b.serviceId === serviceFilter);
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter(b => new Date(b.bookingDate) >= dateFrom);
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(b => new Date(b.bookingDate) <= endOfDay);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => {
        const salonName = getLocalizedText(b.salon?.name as any, currentLang).toLowerCase();
        const serviceName = getLocalizedText(b.service?.name as any, currentLang).toLowerCase();
        const masterName = (b.master?.name || "").toLowerCase();
        return salonName.includes(query) || serviceName.includes(query) || masterName.includes(query);
      });
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime());
        break;
      case "priceHigh":
        result.sort((a, b) => (b.priceSnapshot || 0) - (a.priceSnapshot || 0));
        break;
      case "priceLow":
        result.sort((a, b) => (a.priceSnapshot || 0) - (b.priceSnapshot || 0));
        break;
    }

    return result;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-client">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-serif text-xl text-foreground">{t("marketplace.client.title")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("marketplace.client.welcome")}, {profileData.fullName || user.firstName || user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout-client">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Profile Card with Statistics */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profileData.avatarUrl || undefined} />
              <AvatarFallback className="text-xl">
                {profileData.fullName?.[0] || user.firstName?.[0] || user.email?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-medium text-foreground text-lg">
                {profileData.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || t("marketplace.client.unnamed")}
              </h2>
              <p className="text-muted-foreground">{user.email}</p>
              {profileData.phone && (
                <p className="text-sm text-muted-foreground">{profileData.phone}</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground">
                <Calendar className="h-5 w-5 text-primary" />
                {stats.totalBookings}
              </div>
              <p className="text-xs text-muted-foreground">{t("marketplace.client.stats.totalBookings")}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600">
                <CheckCircle className="h-5 w-5" />
                {stats.completedBookings}
              </div>
              <p className="text-xs text-muted-foreground">{t("marketplace.client.stats.completed")}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-lg">{formatCurrency(stats.totalSpent)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("marketplace.client.stats.totalSpent")}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground">
                <Heart className="h-5 w-5 text-pink-500" />
                {stats.favoritesCount}
              </div>
              <p className="text-xs text-muted-foreground">{t("marketplace.client.stats.favorites")}</p>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.client.tabs.profile")}</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.client.tabs.bookings")}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.client.tabs.analytics")}</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <CalendarRange className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.calendar.title")}</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" data-testid="tab-favorites">
              <Heart className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.client.tabs.favorites")}</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.client.tabs.reviews")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <h2 className="font-serif text-lg text-foreground mb-6">{t("marketplace.client.editProfile")}</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
                    <div className="flex flex-col items-center gap-3">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={form.watch("avatarUrl") || profileData.avatarUrl || undefined} />
                        <AvatarFallback className="text-2xl">
                          <User className="h-12 w-12" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 w-full">
                      <FormField
                        control={form.control}
                        name="avatarUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("marketplace.client.avatar")}</FormLabel>
                            <FormControl>
                              <ImageUpload
                                value={field.value || ""}
                                onChange={(url) => field.onChange(url)}
                                onRemove={() => field.onChange("")}
                                uploadType="avatars"
                                maxSize={5}
                                preview={false}
                                label=""
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("marketplace.client.fullName")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("marketplace.client.fullNamePlaceholder")}
                            {...field}
                            data-testid="input-full-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("marketplace.client.phone")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("marketplace.client.phonePlaceholder")}
                            {...field}
                            value={field.value || ""}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("marketplace.client.city")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("marketplace.client.cityPlaceholder")}
                            {...field}
                            value={field.value || ""}
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {t("marketplace.client.saveProfile")}
                  </Button>
                </form>
              </Form>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            {/* Search and Filter Header */}
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("marketplace.client.filter.search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {t("marketplace.client.filter.byDate")}
                </Button>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SortAsc className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t("marketplace.client.filter.newest")}</SelectItem>
                    <SelectItem value="oldest">{t("marketplace.client.filter.oldest")}</SelectItem>
                    <SelectItem value="priceHigh">{t("marketplace.client.filter.priceHigh")}</SelectItem>
                    <SelectItem value="priceLow">{t("marketplace.client.filter.priceLow")}</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {t("marketplace.client.filter.clearFilters")}
                  </Button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {["all", "upcoming", "completed", "cancelled"].map((filter) => (
                  <Button
                    key={filter}
                    variant={bookingFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBookingFilter(filter)}
                    data-testid={`filter-${filter}`}
                  >
                    {t(`marketplace.client.filter.${filter}`)}
                  </Button>
                ))}
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <Card className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Service Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t("marketplace.client.filter.byService")}</label>
                      <Select value={serviceFilter} onValueChange={setServiceFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("marketplace.client.filter.allServices")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("marketplace.client.filter.allServices")}</SelectItem>
                          {uniqueServices().map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date From */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t("marketplace.client.filter.dateFrom")}</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateFrom ? format(dateFrom, "PPP", { locale: currentLang === "ru" ? ru : currentLang === "uz" ? uz : undefined }) : t("marketplace.client.filter.dateFrom")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                            locale={currentLang === "ru" ? ru : currentLang === "uz" ? uz : undefined}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Date To */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t("marketplace.client.filter.dateTo")}</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateTo ? format(dateTo, "PPP", { locale: currentLang === "ru" ? ru : currentLang === "uz" ? uz : undefined }) : t("marketplace.client.filter.dateTo")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                            locale={currentLang === "ru" ? ru : currentLang === "uz" ? uz : undefined}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Results count */}
            {!bookingsLoading && (
              <div className="text-sm text-muted-foreground">
                {filteredBookings().length} {t("marketplace.client.analytics.visits")}
              </div>
            )}

            {bookingsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <BookingCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredBookings().length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("marketplace.client.noBookings")}</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredBookings().map((booking) => {
                  const salonName = getLocalizedText(booking.salon?.name as any, currentLang);
                  const serviceName = getLocalizedText(booking.service?.name as any, currentLang);
                  const bookingDate = new Date(booking.bookingDate);
                  const isUpcoming = bookingDate >= new Date() && booking.status !== "cancelled" && booking.status !== "completed";
                  
                  return (
                    <Card key={booking.id} className="p-4" data-testid={`booking-card-${booking.id}`}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-medium text-foreground">{serviceName}</h3>
                            <Badge className={STATUS_COLORS[booking.status || "pending"]}>
                              {t(`marketplace.client.status.${booking.status}`)}
                            </Badge>
                            {isBookingSoon(booking) && (
                              <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20">
                                <Bell className="h-3 w-3 mr-1" />
                                {t("marketplace.client.comingSoon")}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              <span>{salonName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{booking.master?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {bookingDate.toLocaleDateString(currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{booking.startTime} - {booking.endTime}</span>
                            </div>
                          </div>
                          <p className="mt-2 font-medium text-foreground">
                            {booking.priceSnapshot?.toLocaleString()} UZS
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openBookingDetails(booking)}
                            data-testid={`button-booking-details-${booking.id}`}
                          >
                            <Info className="h-4 w-4 mr-1" />
                            {t("marketplace.client.details")}
                          </Button>
                          <Link href={`/salon/${booking.salonId}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-salon-${booking.id}`}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              {t("marketplace.client.viewSalon")}
                            </Button>
                          </Link>
                          {booking.status === "completed" && (
                            <>
                              {!hasReviewForBooking(booking.id) ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => openWriteReviewDialog(booking)}
                                  data-testid={`button-write-review-${booking.id}`}
                                >
                                  <Star className="h-4 w-4 mr-1" />
                                  {t("marketplace.client.writeReview")}
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t("marketplace.client.reviewed")}
                                </Badge>
                              )}
                              <Link href={`/salon/${booking.salonId}?serviceId=${booking.serviceId}${booking.masterId ? `&masterId=${booking.masterId}` : ""}`}>
                                <Button variant="secondary" size="sm" data-testid={`button-rebook-${booking.id}`}>
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  {t("marketplace.client.rebook")}
                                </Button>
                              </Link>
                            </>
                          )}
                          {isUpcoming && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openCancelDialog(booking.id)}
                              data-testid={`button-cancel-booking-${booking.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* This Month */}
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <CalendarRange className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t("marketplace.client.analytics.thisMonth")}</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(analytics.thisMonthSpent)}</p>
                <p className="text-xs text-muted-foreground">{analytics.thisMonthVisits} {t("marketplace.client.analytics.visits")}</p>
              </Card>

              {/* This Year */}
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t("marketplace.client.analytics.thisYear")}</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(analytics.thisYearSpent)}</p>
                <p className="text-xs text-muted-foreground">{analytics.thisYearVisits} {t("marketplace.client.analytics.visits")}</p>
              </Card>

              {/* Average Check */}
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Wallet className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t("marketplace.client.analytics.averageCheck")}</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(analytics.averageCheck)}</p>
              </Card>

              {/* All Time */}
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Star className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t("marketplace.client.analytics.allTime")}</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
                <p className="text-xs text-muted-foreground">{stats.completedBookings} {t("marketplace.client.analytics.visits")}</p>
              </Card>
            </div>

            {/* Monthly Chart */}
            <Card className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t("marketplace.client.analytics.monthlyExpenses")}
              </h3>
              {analytics.monthlyData.some(m => m.amount > 0) ? (
                <div className="space-y-3">
                  {analytics.monthlyData.map((month, index) => {
                    const maxAmount = Math.max(...analytics.monthlyData.map(m => m.amount));
                    const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-12 text-sm text-muted-foreground">{month.month}</span>
                        <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          >
                            {month.amount > 0 && (
                              <span className="text-xs text-primary-foreground font-medium">
                                {month.count}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="w-32 text-sm font-medium text-right">
                          {formatCurrency(month.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t("marketplace.client.analytics.noData")}</p>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Most Expensive Visit */}
              {analytics.mostExpensive && (
                <Card className="p-6">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {t("marketplace.client.analytics.mostExpensive")}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {getLocalizedText(analytics.mostExpensive.service?.name as any, currentLang)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {getLocalizedText(analytics.mostExpensive.salon?.name as any, currentLang)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(analytics.mostExpensive.bookingDate).toLocaleDateString(
                          currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US"
                        )}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-primary mt-2">
                      {formatCurrency(analytics.mostExpensive.priceSnapshot || 0)}
                    </p>
                  </div>
                </Card>
              )}

              {/* Service Breakdown */}
              <Card className="p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  {t("marketplace.client.analytics.serviceBreakdown")}
                </h3>
                {analytics.serviceStats.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.serviceStats.map((service, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: [
                                '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'
                              ][index % 5]
                            }}
                          />
                          <span className="text-sm">{service.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {service.count}
                          </Badge>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(service.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("marketplace.client.analytics.noData")}</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <BookingCalendar
              bookings={bookingsData || []}
              isLoading={bookingsLoading}
              showSalon={true}
              showMaster={true}
            />
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            {favoritesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <FavoriteCardSkeleton key={i} />
                ))}
              </div>
            ) : !favoritesData || favoritesData.length === 0 ? (
              <Card className="p-8 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("marketplace.client.noFavorites")}</p>
                <Link href="/">
                  <Button variant="outline" className="mt-4" data-testid="button-browse-salons">
                    {t("marketplace.client.browseSalons")}
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favoritesData.map((favorite) => {
                  const salonName = getLocalizedText(favorite.salon?.name as any, currentLang);
                  
                  return (
                    <Card key={favorite.id} className="p-4" data-testid={`favorite-card-${favorite.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">{salonName}</h3>
                          {favorite.salon && (
                            <div className="space-y-1 text-sm text-muted-foreground mt-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate">{favorite.salon.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-amber-500" />
                                <span>{favorite.salon.averageRating} ({favorite.salon.reviewCount} {t("marketplace.salon.reviews")})</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/salon/${favorite.salonId}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-favorite-${favorite.id}`}>
                              {t("marketplace.client.viewSalon")}
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFavoriteMutation.mutate(favorite.salonId)}
                            disabled={removeFavoriteMutation.isPending}
                            data-testid={`button-remove-favorite-${favorite.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {reviewsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ClientReviewSkeleton key={i} />
                ))}
              </div>
            ) : !reviewsData || reviewsData.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("marketplace.client.noReviews")}</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviewsData.map((review) => {
                  const salonName = getLocalizedText(review.salon?.name as any, currentLang);
                  const canEdit = canEditReview(review);
                  
                  return (
                    <Card key={review.id} className="p-4" data-testid={`review-card-${review.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-medium text-foreground">{salonName}</h3>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground">{review.comment}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(review.createdAt!).toLocaleDateString(currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US")}
                            {canEdit && (
                              <span className="ml-2 text-primary">({t("marketplace.client.canEdit")})</span>
                            )}
                          </p>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditReviewDialog(review)}
                              data-testid={`button-edit-review-${review.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteReviewDialog(review)}
                              data-testid={`button-delete-review-${review.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.cancelBooking")}</DialogTitle>
            <DialogDescription>{t("marketplace.client.cancelBookingConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} data-testid="button-cancel-dialog-close">
              {t("marketplace.client.close")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={cancelBookingMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelBookingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("marketplace.client.confirmCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editReviewDialogOpen} onOpenChange={setEditReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.editReview")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("marketplace.client.rating")}</label>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEditRating(i + 1)}
                    className="focus:outline-none"
                    data-testid={`star-rating-${i + 1}`}
                  >
                    <Star
                      className={`h-6 w-6 ${i < editRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("marketplace.client.comment")}</label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder={t("marketplace.client.commentPlaceholder")}
                className="mt-2"
                data-testid="textarea-edit-comment"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditReviewDialogOpen(false)}>
              {t("marketplace.client.close")}
            </Button>
            <Button
              onClick={handleEditReview}
              disabled={editReviewMutation.isPending}
              data-testid="button-save-review"
            >
              {editReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("marketplace.client.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteReviewDialogOpen} onOpenChange={setDeleteReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.deleteReview")}</DialogTitle>
            <DialogDescription>{t("marketplace.client.deleteReviewConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteReviewDialogOpen(false)}>
              {t("marketplace.client.close")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteReview}
              disabled={deleteReviewMutation.isPending}
              data-testid="button-confirm-delete-review"
            >
              {deleteReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("marketplace.client.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.bookingDetails")}</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("marketplace.client.status.label")}</span>
                <Badge className={STATUS_COLORS[selectedBooking.status || "pending"]}>
                  {t(`marketplace.client.status.${selectedBooking.status}`)}
                </Badge>
              </div>

              {/* Service Info */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <Scissors className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{getLocalizedText(selectedBooking.service?.name as any, currentLang)}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedBooking.service?.duration} {t("marketplace.client.minutes")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Store className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{getLocalizedText(selectedBooking.salon?.name as any, currentLang)}</p>
                    <p className="text-sm text-muted-foreground">{selectedBooking.salon?.address}</p>
                  </div>
                </div>

                {selectedBooking.master && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{selectedBooking.master.name}</p>
                      <p className="text-sm text-muted-foreground">{t("marketplace.client.master")}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("marketplace.client.date")}</p>
                    <p className="font-medium">
                      {new Date(selectedBooking.bookingDate).toLocaleDateString(
                        currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
                        { weekday: "short", day: "numeric", month: "long" }
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("marketplace.client.time")}</p>
                    <p className="font-medium">{selectedBooking.startTime} - {selectedBooking.endTime}</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-muted-foreground">{t("marketplace.client.price")}</span>
                <span className="text-xl font-bold">{formatCurrency(selectedBooking.priceSnapshot || 0)}</span>
              </div>

              {/* Booking ID */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("marketplace.client.bookingId")}: {selectedBooking.id.slice(0, 8)}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyBookingToClipboard(selectedBooking)}
                    className="h-8 w-8 p-0"
                    title={t("marketplace.client.copyDetails")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => shareBooking(selectedBooking)}
                    className="h-8 w-8 p-0"
                    title={t("marketplace.client.share")}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {selectedBooking && (
              <>
                <Link href={`/salon/${selectedBooking.salonId}`}>
                  <Button variant="outline" onClick={() => setBookingDetailsOpen(false)}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t("marketplace.client.viewSalon")}
                  </Button>
                </Link>
                {selectedBooking.status === "completed" && (
                  <Link href={`/salon/${selectedBooking.salonId}?serviceId=${selectedBooking.serviceId}${selectedBooking.masterId ? `&masterId=${selectedBooking.masterId}` : ""}`}>
                    <Button onClick={() => setBookingDetailsOpen(false)}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {t("marketplace.client.rebook")}
                    </Button>
                  </Link>
                )}
                {new Date(selectedBooking.bookingDate) >= new Date() &&
                 selectedBooking.status !== "cancelled" &&
                 selectedBooking.status !== "completed" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setBookingDetailsOpen(false);
                      openCancelDialog(selectedBooking.id);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("marketplace.client.cancelBooking")}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Write Review Dialog */}
      <Dialog open={writeReviewDialogOpen} onOpenChange={setWriteReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.writeReview")}</DialogTitle>
            <DialogDescription>
              {reviewBooking && getLocalizedText(reviewBooking.salon?.name as any, currentLang)}
            </DialogDescription>
          </DialogHeader>
          {reviewBooking && (
            <div className="space-y-4">
              {/* Service & Master Info */}
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Scissors className="h-4 w-4 text-primary" />
                  <span className="font-medium">{getLocalizedText(reviewBooking.service?.name as any, currentLang)}</span>
                </div>
                {reviewBooking.master && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{reviewBooking.master.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(reviewBooking.bookingDate).toLocaleDateString(
                      currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US"
                    )}
                  </span>
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium">{t("marketplace.client.yourRating")}</label>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewReviewRating(i + 1)}
                      className="focus:outline-none transition-transform hover:scale-110"
                      data-testid={`new-star-rating-${i + 1}`}
                    >
                      <Star
                        className={`h-8 w-8 ${i < newReviewRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="text-sm font-medium">{t("marketplace.client.yourComment")}</label>
                <Textarea
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder={t("marketplace.client.commentPlaceholder")}
                  className="mt-2"
                  rows={4}
                  data-testid="textarea-new-review-comment"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWriteReviewDialogOpen(false)}>
              {t("marketplace.client.close")}
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={createReviewMutation.isPending || newReviewRating === 0}
              data-testid="button-submit-new-review"
            >
              {createReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("marketplace.client.submitReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
