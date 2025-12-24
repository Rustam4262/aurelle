import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { Master, Salon, Booking, Review } from "@shared/schema";
import {
  ArrowLeft,
  Calendar,
  Star,
  Users,
  Store,
  LogOut,
  Clock,
  MessageSquare,
} from "lucide-react";

function getLocalizedText(obj: { en?: string; ru?: string; uz?: string } | null | undefined, lang: string): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

export default function MasterPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: masterData, isLoading: masterLoading } = useQuery<{
    master: Master;
    salon: Salon;
    bookings: Booking[];
    reviews: Review[];
  }>({
    queryKey: ["/api/master/me"],
    enabled: !!user,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (authLoading || masterLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-master">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-xl text-foreground ml-4">{t("marketplace.master.title")}</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 py-16">
          <Card className="p-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl text-foreground mb-2">
              {t("marketplace.master.title")}
            </h2>
            <p className="text-muted-foreground mb-6">
              No master account found for this user.
            </p>
            <Link href="/">
              <Button data-testid="button-back-home">
                Back to Home
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const { master, salon, bookings, reviews } = masterData;
  const salonName = getLocalizedText(salon?.name as any, currentLang);
  const todayBookings = bookings?.filter(b => {
    const bookingDate = new Date(b.bookingDate);
    const today = new Date();
    return bookingDate.toDateString() === today.toDateString() && b.status === "confirmed";
  }) || [];
  
  const upcomingBookings = bookings?.filter(b => {
    const bookingDate = new Date(b.bookingDate);
    const today = new Date();
    return bookingDate >= today && b.status === "confirmed";
  }).slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-master">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-serif text-xl text-foreground">{t("marketplace.master.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("marketplace.master.welcome")}, {master.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout-master">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="font-medium text-foreground">{t("marketplace.master.yourSalon")}</h2>
              <p className="text-lg text-foreground font-serif">{salonName}</p>
              <p className="text-sm text-muted-foreground">{salon?.city}</p>
            </div>
            <Link href={`/salon/${salon?.id}`}>
              <Button variant="outline" size="sm" data-testid="button-view-salon">
                View Salon
              </Button>
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Users className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{master.reviewCount || 0}</p>
            <p className="text-sm text-muted-foreground">{t("marketplace.master.clients")}</p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
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
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-md"
                  data-testid={`booking-today-${booking.id}`}
                >
                  <div>
                    <p className="font-medium text-foreground">Client #{booking.clientId.slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">{booking.startTime} - {booking.endTime}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{booking.priceSnapshot.toLocaleString()} UZS</p>
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
          <div className="flex items-center justify-between mb-4">
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
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-md"
                  data-testid={`booking-upcoming-${booking.id}`}
                >
                  <div>
                    <p className="font-medium text-foreground">Client #{booking.clientId.slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.bookingDate).toLocaleDateString()} at {booking.startTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{booking.priceSnapshot.toLocaleString()} UZS</p>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t("marketplace.master.myReviews")}
              </h3>
            </div>
            
            <div className="space-y-4">
              {reviews.slice(0, 3).map((review) => (
                <div 
                  key={review.id} 
                  className="p-4 bg-muted/50 rounded-md"
                  data-testid={`review-${review.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted"}`}
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
      </div>
    </div>
  );
}
