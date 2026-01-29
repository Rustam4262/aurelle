import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserProfile } from "@shared/schema";
import { BookingCalendar } from "@/components/booking-calendar";
import {
  ArrowLeft,
  Calendar,
  Heart,
  MessageSquare,
  LogOut,
  User,
  CheckCircle,
  Wallet,
  Loader2,
  BarChart3,
  CalendarRange,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

// Import new components
import { ClientProfile } from "@/components/client/ClientProfile";
import { ClientBookings } from "@/components/client/ClientBookings";
import { ClientAnalytics } from "@/components/client/ClientAnalytics";
import { ClientReviews } from "@/components/client/ClientReviews";
import { ClientFavorites } from "@/components/client/ClientFavorites";
import { WriteReviewDialog } from "@/components/client/WriteReviewDialog";
import type { EnrichedBooking, EnrichedFavorite, EnrichedReview } from "@/components/client/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export default function ClientPage() {
  const { t, i18n } = useTranslation();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("profile");

  // State for actions lifted up
  const [writeReviewDialogOpen, setWriteReviewDialogOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<EnrichedBooking | null>(null);

  const { data: profileData, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/client/profile"],
    enabled: !!user,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/client/bookings"],
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const { data: favoritesData, isLoading: favoritesLoading } = useQuery<EnrichedFavorite[]>({
    queryKey: ["/api/client/favorites"],
    enabled: !!user,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<EnrichedReview[]>({
    queryKey: ["/api/client/reviews"],
    enabled: !!user,
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("DELETE", `/api/client/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      toast({ title: t("marketplace.client.bookingCancelled") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: {
      bookingId: string;
      salonId: string;
      masterId?: string;
      rating: number;
      comment: string;
    }) => {
      return apiRequest("POST", "/api/client/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      setWriteReviewDialogOpen(false);
      setReviewBooking(null);
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

  const handleCancelBooking = (bookingId: string) => {
    cancelBookingMutation.mutate(bookingId);
  };

  const handleOpenWriteReview = (booking: EnrichedBooking) => {
    setReviewBooking(booking);
    setWriteReviewDialogOpen(true);
  };

  const handleSubmitReview = (data: { rating: number; comment: string }) => {
    if (reviewBooking) {
      createReviewMutation.mutate({
        bookingId: reviewBooking.id,
        salonId: reviewBooking.salonId,
        masterId: reviewBooking.masterId || undefined,
        rating: data.rating,
        comment: data.comment,
      });
    }
  };

  const hasReviewForBooking = (bookingId: string) => {
    return reviewsData?.some((r) => r.bookingId === bookingId) || false;
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
              <h1 className="font-serif text-xl text-foreground">
                {t("marketplace.client.title")}
              </h1>
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
            <p className="text-muted-foreground mb-6">{t("marketplace.client.noAccount")}</p>
            <Link href="/">
              <Button data-testid="button-back-home">{t("marketplace.client.backHome")}</Button>
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

  // Calculate high-level stats for header
  const stats = {
    totalBookings: bookingsData?.length || 0,
    completedBookings: bookingsData?.filter((b) => b.status === "completed").length || 0,
    totalSpent:
      bookingsData
        ?.filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + (b.priceSnapshot || 0), 0) || 0,
    favoritesCount: favoritesData?.length || 0,
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
                <h1 className="font-serif text-xl text-foreground">
                  {t("marketplace.client.title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("marketplace.client.welcome")},{" "}
                  {profileData.fullName || user.firstName || user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="button-logout-client"
              >
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
                {profileData.fullName ||
                  `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                  t("marketplace.client.unnamed")}
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
              <p className="text-xs text-muted-foreground">
                {t("marketplace.client.stats.totalBookings")}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600">
                <CheckCircle className="h-5 w-5" />
                {stats.completedBookings}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("marketplace.client.stats.completed")}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-lg">{formatCurrency(stats.totalSpent)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("marketplace.client.stats.totalSpent")}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground">
                <Heart className="h-5 w-5 text-pink-500" />
                {stats.favoritesCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("marketplace.client.stats.favorites")}
              </p>
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

          <TabsContent
            value="profile"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <ClientProfile profileData={profileData} />
          </TabsContent>

          <TabsContent
            value="bookings"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <ClientBookings
              bookings={bookingsData}
              isLoading={bookingsLoading}
              onCancelBooking={handleCancelBooking}
              isCancelling={cancelBookingMutation.isPending}
              onOpenWriteReview={handleOpenWriteReview}
              hasReviewForBooking={hasReviewForBooking}
            />
          </TabsContent>

          <TabsContent
            value="analytics"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <ClientAnalytics bookings={bookingsData} />
          </TabsContent>

          <TabsContent
            value="calendar"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <BookingCalendar
              bookings={bookingsData || []}
              isLoading={bookingsLoading}
              showSalon={true}
              showMaster={true}
            />
          </TabsContent>

          <TabsContent
            value="favorites"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <ClientFavorites favorites={favoritesData} isLoading={favoritesLoading} />
          </TabsContent>

          <TabsContent
            value="reviews"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <ClientReviews reviews={reviewsData} isLoading={reviewsLoading} />
          </TabsContent>
        </Tabs>
      </div>

      <WriteReviewDialog
        open={writeReviewDialogOpen}
        onOpenChange={setWriteReviewDialogOpen}
        booking={reviewBooking}
        onSubmit={handleSubmitReview}
        isPending={createReviewMutation.isPending}
      />
    </div>
  );
}
