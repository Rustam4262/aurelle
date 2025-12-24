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
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [editReviewDialogOpen, setEditReviewDialogOpen] = useState(false);
  const [deleteReviewDialogOpen, setDeleteReviewDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<EnrichedReview | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");

  const { data: profileData, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/client/profile"],
    enabled: !!user,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/client/bookings"],
    enabled: !!user && (activeTab === "bookings" || activeTab === "calendar"),
  });

  const { data: favoritesData, isLoading: favoritesLoading } = useQuery<EnrichedFavorite[]>({
    queryKey: ["/api/client/favorites"],
    enabled: !!user && activeTab === "favorites",
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<EnrichedReview[]>({
    queryKey: ["/api/client/reviews"],
    enabled: !!user && activeTab === "reviews",
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

  const filteredBookings = () => {
    if (!bookingsData) return [];
    const now = new Date();
    
    switch (bookingFilter) {
      case "upcoming":
        return bookingsData.filter(b => {
          const bookingDate = new Date(b.bookingDate);
          return bookingDate >= now && b.status !== "cancelled" && b.status !== "completed";
        });
      case "completed":
        return bookingsData.filter(b => b.status === "completed");
      case "cancelled":
        return bookingsData.filter(b => b.status === "cancelled");
      default:
        return bookingsData;
    }
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
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout-client">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.client.tabs.profile")}</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.client.tabs.bookings")}</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <Calendar className="h-4 w-4 mr-2" />
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
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profileData.avatarUrl || undefined} />
                      <AvatarFallback>
                        <User className="h-10 w-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name="avatarUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("marketplace.client.avatarUrl")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("marketplace.client.avatarUrlPlaceholder")}
                                {...field}
                                value={field.value || ""}
                                data-testid="input-avatar-url"
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

            {bookingsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                        <div className="flex items-center gap-2">
                          <Link href={`/salon/${booking.salonId}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-salon-${booking.id}`}>
                              {t("marketplace.client.viewSalon")}
                            </Button>
                          </Link>
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
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    </div>
  );
}
