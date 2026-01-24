import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Salon } from "@shared/schema";
import {
  ArrowLeft,
  Calendar,
  Heart,
  Star,
  LogOut,
  Clock,
  MapPin,
  User,
  Scissors,
  XCircle,
  Edit,
  MessageSquare,
  TrendingUp,
  Wallet,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: string;
  salonId: string;
  masterId?: string;
  bookingId?: string;
  rating: number;
  comment: string;
  ownerResponse?: string;
  createdAt: string;
  salon?: {
    name: string | { en: string; ru: string; uz: string };
  };
  master?: {
    name: string;
  };
}

interface ClientStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  favoriteServicesCount: number;
  memberSince: string;
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    city: "",
    avatarUrl: "",
  });

  // Review editing state
  const [editReviewDialog, setEditReviewDialog] = useState<{
    open: boolean;
    review?: Review;
  }>({ open: false });
  const [editReviewForm, setEditReviewForm] = useState({
    rating: 5,
    comment: "",
  });

  const [deleteReviewDialog, setDeleteReviewDialog] = useState<{
    open: boolean;
    reviewId?: string;
  }>({ open: false });

  // Fetch client profile
  const { data: profile } = useQuery<any>({
    queryKey: ["/api/client/profile"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/client/profile");
        return res.json();
      } catch {
        return null;
      }
    },
    enabled: !!user,
  });

  // Fetch bookings
  const { data: bookings } = useQuery<any[]>({
    queryKey: ["/api/client/bookings"],
    enabled: !!user,
  });

  // Fetch favorites
  const { data: favorites } = useQuery<Salon[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // Fetch reviews
  const { data: reviews } = useQuery<Review[]>({
    queryKey: ["/api/client/reviews"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/client/reviews");
      return res.json();
    },
    enabled: !!user,
  });

  // Calculate statistics from bookings
  const stats: ClientStats = {
    totalBookings: bookings?.length || 0,
    completedBookings: bookings?.filter((b) => b.status === "completed").length || 0,
    cancelledBookings: bookings?.filter((b) => b.status === "cancelled").length || 0,
    totalSpent: bookings
      ?.filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + (b.priceSnapshot || 0), 0) || 0,
    favoriteServicesCount: favorites?.length || 0,
    memberSince: user?.createdAt ? (typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString()) : new Date().toISOString(),
  };

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("DELETE", `/api/client/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      toast({
        title: t("marketplace.profile.bookingCancelled"),
        description: t("marketplace.profile.bookingCancelledDescription"),
      });
    },
    onError: () => {
      toast({
        title: t("marketplace.profile.error"),
        description: t("marketplace.profile.cancelError"),
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await apiRequest("PUT", "/api/client/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("marketplace.client.profileUpdated"),
      });
      setIsEditingProfile(false);
    },
    onError: () => {
      toast({
        title: t("marketplace.common.error"),
        description: t("marketplace.client.error"),
        variant: "destructive",
      });
    },
  });

  // Update review mutation
  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { rating: number; comment: string } }) => {
      const res = await apiRequest("PUT", `/api/client/reviews/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] });
      toast({
        title: t("marketplace.client.reviewUpdated"),
      });
      setEditReviewDialog({ open: false });
    },
    onError: () => {
      toast({
        title: t("marketplace.common.error"),
        description: t("marketplace.client.error"),
        variant: "destructive",
      });
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/client/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] });
      toast({
        title: t("marketplace.client.reviewDeleted"),
      });
      setDeleteReviewDialog({ open: false });
    },
    onError: () => {
      toast({
        title: t("marketplace.common.error"),
        description: t("marketplace.client.error"),
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
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

  // Redirect admins to admin panel
  if (user.isAdmin) {
    navigate("/admin");
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleStartEditProfile = () => {
    setProfileForm({
      fullName: profile?.fullName || user.firstName || "",
      phone: profile?.phone || user.phoneNumber || "",
      city: profile?.city || "",
      avatarUrl: profile?.avatarUrl || user.profileImageUrl || "",
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleOpenEditReview = (review: Review) => {
    // Check if within 24 hours
    const createdAt = new Date(review.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      toast({
        title: t("marketplace.client.error"),
        description: t("marketplace.client.canEdit"),
        variant: "destructive",
      });
      return;
    }

    setEditReviewForm({
      rating: review.rating,
      comment: review.comment,
    });
    setEditReviewDialog({ open: true, review });
  };

  const handleSaveReview = () => {
    if (editReviewDialog.review) {
      updateReviewMutation.mutate({
        id: editReviewDialog.review.id,
        data: editReviewForm,
      });
    }
  };

  const canEditReview = (review: Review) => {
    const createdAt = new Date(review.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  const getLocalizedName = (name: any) => {
    if (typeof name === "object" && name) {
      return name[i18n.language] || name.en || name.ru || "";
    }
    return name || "";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-profile">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-serif text-xl text-foreground">{t("marketplace.profile.title")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Card */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {(profile?.avatarUrl || user.profileImageUrl) && (
                  <AvatarImage src={profile?.avatarUrl || user.profileImageUrl} alt="" />
                )}
                <AvatarFallback>
                  {profile?.fullName?.[0] || user.firstName?.[0] || user.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium text-foreground text-lg">
                  {profile?.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || t("marketplace.client.unnamed")}
                </h2>
                <p className="text-muted-foreground">{user.email}</p>
                {profile?.phone && (
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleStartEditProfile}>
              <Edit className="h-4 w-4 mr-2" />
              {t("marketplace.client.editProfile")}
            </Button>
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
                {formatCurrency(stats.totalSpent)}
              </div>
              <p className="text-xs text-muted-foreground">{t("marketplace.client.stats.totalSpent")}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground">
                <Heart className="h-5 w-5 text-pink-500" />
                {stats.favoriteServicesCount}
              </div>
              <p className="text-xs text-muted-foreground">{t("marketplace.client.stats.favorites")}</p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="w-full justify-start mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="bookings" data-testid="tab-bookings" className="flex-1 sm:flex-none">
              <Calendar className="h-4 w-4 mr-2" />
              {t("marketplace.profile.bookings")}
            </TabsTrigger>
            <TabsTrigger value="favorites" data-testid="tab-favorites" className="flex-1 sm:flex-none">
              <Heart className="h-4 w-4 mr-2" />
              {t("marketplace.profile.favorites")}
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews" className="flex-1 sm:flex-none">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t("marketplace.profile.reviews")}
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            {bookings && bookings.length > 0 ? (
              bookings.map((booking) => (
                <Card key={booking.id} className="p-5" data-testid={`card-booking-${booking.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {booking.salon && (
                        <Link href={`/salon/${booking.salonId}`}>
                          <h3 className="font-semibold text-foreground text-lg hover:text-primary transition-colors">
                            {getLocalizedName(booking.salon.name)}
                          </h3>
                        </Link>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm">
                        {booking.service && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Scissors className="h-4 w-4" />
                            <span className="font-medium">
                              {getLocalizedName(booking.service.name)}
                            </span>
                          </span>
                        )}
                        {booking.master && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{booking.master.name}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {new Date(booking.bookingDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {booking.startTime}
                        </span>
                        {booking.priceSnapshot && (
                          <span className="font-semibold text-foreground">
                            {formatCurrency(booking.priceSnapshot)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          booking.status === "confirmed" ? "default" :
                          booking.status === "completed" ? "default" :
                          booking.status === "cancelled" ? "destructive" :
                          "secondary"
                        }
                        className={booking.status === "completed" ? "bg-green-600" : ""}
                      >
                        {t(`marketplace.booking.status.${booking.status}`)}
                      </Badge>

                      {(booking.status === "pending" || booking.status === "confirmed") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelBookingMutation.mutate(booking.id)}
                          disabled={cancelBookingMutation.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {t("marketplace.profile.cancelBooking")}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("marketplace.profile.noBookings")}</p>
                <Link href="/">
                  <Button className="mt-4" data-testid="button-explore-salons">
                    {t("marketplace.client.browseSalons")}
                  </Button>
                </Link>
              </Card>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4">
            {favorites && favorites.length > 0 ? (
              favorites.map((salon) => (
                <Link key={salon.id} href={`/salon/${salon.id}`}>
                  <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer" data-testid={`card-favorite-${salon.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                        {salon.photos && (salon.photos as string[])[0] ? (
                          <img
                            src={(salon.photos as string[])[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">
                          {getLocalizedName(salon.name)}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {getLocalizedName(salon.city)}
                        </div>
                        {salon.averageRating && Number(salon.averageRating) > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{Number(salon.averageRating).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <Heart className="h-5 w-5 fill-pink-500 text-pink-500" />
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <Card className="p-8 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("marketplace.profile.noFavorites")}</p>
                <Link href="/">
                  <Button className="mt-4" data-testid="button-explore-salons-fav">
                    {t("marketplace.client.browseSalons")}
                  </Button>
                </Link>
              </Card>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            {reviews && reviews.length > 0 ? (
              reviews.map((review) => (
                <Card key={review.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {review.salon && (
                        <Link href={`/salon/${review.salonId}`}>
                          <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                            {getLocalizedName(review.salon.name)}
                          </h3>
                        </Link>
                      )}

                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>

                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}

                      {review.ownerResponse && (
                        <div className="bg-muted/50 rounded-md p-3 mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t("marketplace.client.ownerResponse")}
                          </p>
                          <p className="text-sm">{review.ownerResponse}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(review.createdAt).toLocaleDateString()}
                        {canEditReview(review) && (
                          <span className="text-green-600">• {t("marketplace.client.canEdit")}</span>
                        )}
                      </div>
                    </div>

                    {canEditReview(review) && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditReview(review)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteReviewDialog({ open: true, reviewId: review.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("marketplace.client.noReviews")}</p>
                <p className="text-sm text-muted-foreground mt-2">{t("marketplace.client.beFirst")}</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.editProfile")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">{t("marketplace.client.fullName")}</Label>
              <Input
                id="fullName"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                placeholder={t("marketplace.client.fullNamePlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="phone">{t("marketplace.client.phone")}</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder={t("marketplace.client.phonePlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="city">{t("marketplace.client.city")}</Label>
              <Input
                id="city"
                value={profileForm.city}
                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                placeholder={t("marketplace.client.cityPlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="avatarUrl">{t("marketplace.client.avatarUrl")}</Label>
              <Input
                id="avatarUrl"
                value={profileForm.avatarUrl}
                onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                placeholder={t("marketplace.client.avatarUrlPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
              {t("marketplace.common.cancel")}
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? t("marketplace.common.saving") : t("marketplace.client.saveProfile")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Review Dialog */}
      <Dialog open={editReviewDialog.open} onOpenChange={(open) => setEditReviewDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.editReview")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t("marketplace.client.rating")}</Label>
              <div className="flex gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEditReviewForm({ ...editReviewForm, rating: i + 1 })}
                    className="p-1"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        i < editReviewForm.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground hover:text-yellow-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="comment">{t("marketplace.client.comment")}</Label>
              <Textarea
                id="comment"
                value={editReviewForm.comment}
                onChange={(e) => setEditReviewForm({ ...editReviewForm, comment: e.target.value })}
                placeholder={t("marketplace.client.commentPlaceholder")}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReviewDialog({ open: false })}>
              {t("marketplace.common.cancel")}
            </Button>
            <Button onClick={handleSaveReview} disabled={updateReviewMutation.isPending}>
              {updateReviewMutation.isPending ? t("marketplace.common.saving") : t("marketplace.client.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Review Confirmation Dialog */}
      <Dialog open={deleteReviewDialog.open} onOpenChange={(open) => setDeleteReviewDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.deleteReview")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{t("marketplace.client.deleteReviewConfirm")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteReviewDialog({ open: false })}>
              {t("marketplace.common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteReviewDialog.reviewId && deleteReviewMutation.mutate(deleteReviewDialog.reviewId)}
              disabled={deleteReviewMutation.isPending}
            >
              {deleteReviewMutation.isPending ? t("marketplace.common.submitting") : t("marketplace.client.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
