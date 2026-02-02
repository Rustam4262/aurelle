import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle,
  Wallet,
  Heart,
  Star,
  Search,
  CalendarPlus,
  ArrowRight,
  MapPin,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import type { UserProfile } from "@shared/schema";
import type { EnrichedBooking, EnrichedFavorite } from "./types";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ru, uz, enUS } from "date-fns/locale";

type LocalizedName = { en: string; ru: string; uz: string } | string;

function getLocalizedName(name: LocalizedName | undefined, lang: string): string {
  if (!name) return "";
  if (typeof name === "string") return name;
  return name[lang as keyof typeof name] || name.en || "";
}

interface ClientDashboardProps {
  profileData: UserProfile;
  bookings?: EnrichedBooking[];
  favorites?: EnrichedFavorite[];
  onNavigateToTab: (tab: string) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

export function ClientDashboard({
  profileData,
  bookings,
  favorites,
  onNavigateToTab,
}: ClientDashboardProps) {
  const { t, i18n } = useTranslation();

  const getLocale = () => {
    switch (i18n.language) {
      case "ru":
        return ru;
      case "uz":
        return uz;
      default:
        return enUS;
    }
  };

  // Calculate stats
  const stats = {
    totalBookings: bookings?.length || 0,
    completedBookings: bookings?.filter((b) => b.status === "completed").length || 0,
    totalSpent:
      bookings
        ?.filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + (b.priceSnapshot || 0), 0) || 0,
    favoritesCount: favorites?.length || 0,
  };

  // Get upcoming bookings (confirmed, pending) sorted by date
  const upcomingBookings = bookings
    ?.filter((b) => b.status === "confirmed" || b.status === "pending")
    .sort((a, b) => {
      const dateA = new Date(a.bookingDate);
      const dateB = new Date(b.bookingDate);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3);

  // Get recent completed bookings for "repeat" section
  const recentCompleted = bookings
    ?.filter((b) => b.status === "completed")
    .sort((a, b) => {
      const dateA = new Date(a.bookingDate);
      const dateB = new Date(b.bookingDate);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 4);

  const formatBookingDate = (dateStr: Date | string) => {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (isToday(date)) {
      return t("marketplace.client.dashboard.today");
    }
    if (isTomorrow(date)) {
      return t("marketplace.client.dashboard.tomorrow");
    }
    return format(date, "d MMMM", { locale: getLocale() });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section with Quick Stats */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-primary/20">
            <AvatarImage src={profileData.avatarUrl || undefined} />
            <AvatarFallback className="text-xl bg-primary/10">
              {profileData.fullName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-serif text-2xl text-foreground">
              {t("marketplace.client.dashboard.welcome")},{" "}
              {profileData.fullName?.split(" ")[0] || t("marketplace.client.unnamed")}!
            </h2>
            <p className="text-muted-foreground mt-1">
              {t("marketplace.client.dashboard.subtitle")}
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-background/50 rounded-lg p-4 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
              <Calendar className="h-5 w-5 text-primary" />
              {stats.totalBookings}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("marketplace.client.stats.totalBookings")}
            </p>
          </div>
          <div className="bg-background/50 rounded-lg p-4 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-green-600">
              <CheckCircle className="h-5 w-5" />
              {stats.completedBookings}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("marketplace.client.stats.completed")}
            </p>
          </div>
          <div className="bg-background/50 rounded-lg p-4 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 text-xl font-bold text-foreground">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="truncate">{formatCurrency(stats.totalSpent)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("marketplace.client.stats.totalSpent")}
            </p>
          </div>
          <div className="bg-background/50 rounded-lg p-4 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
              <Heart className="h-5 w-5 text-pink-500" />
              {stats.favoritesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("marketplace.client.stats.favorites")}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/">
          <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{t("marketplace.client.dashboard.findSalon")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("marketplace.client.dashboard.findSalonDesc")}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Card
          className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
          onClick={() => onNavigateToTab("bookings")}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20 group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
              <CalendarPlus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">{t("marketplace.client.dashboard.myBookings")}</p>
              <p className="text-sm text-muted-foreground">
                {t("marketplace.client.dashboard.myBookingsDesc")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      {upcomingBookings && upcomingBookings.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t("marketplace.client.dashboard.upcomingBookings")}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigateToTab("bookings")}>
              {t("marketplace.client.dashboard.viewAll")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 w-16 text-center">
                  <div className="text-xs text-muted-foreground uppercase">
                    {formatBookingDate(booking.bookingDate)}
                  </div>
                  <div className="text-lg font-bold text-primary">{booking.startTime}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {getLocalizedName(booking.service?.name, i18n.language) || t("marketplace.client.unknownService")}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    {booking.salon && (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{getLocalizedName(booking.salon.name, i18n.language)}</span>
                      </>
                    )}
                    {booking.master && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="truncate">{booking.master.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge
                  variant={booking.status === "confirmed" ? "default" : "secondary"}
                  className="flex-shrink-0"
                >
                  {t(`marketplace.client.status.${booking.status}`)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state for no upcoming bookings */}
      {(!upcomingBookings || upcomingBookings.length === 0) && (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">
            {t("marketplace.client.dashboard.noUpcoming")}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t("marketplace.client.dashboard.noUpcomingDesc")}
          </p>
          <Link href="/">
            <Button>
              <Search className="h-4 w-4 mr-2" />
              {t("marketplace.client.dashboard.findSalon")}
            </Button>
          </Link>
        </Card>
      )}

      {/* Recommend to Repeat */}
      {recentCompleted && recentCompleted.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              {t("marketplace.client.dashboard.repeatBooking")}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentCompleted.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors group cursor-pointer"
                onClick={() => {
                  if (booking.salon) {
                    window.location.href = `/salon/${booking.salonId}`;
                  }
                }}
              >
                <div className="p-2 rounded-full bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {getLocalizedName(booking.service?.name, i18n.language) || t("marketplace.client.unknownService")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getLocalizedName(booking.salon?.name, i18n.language)}
                    {booking.master && ` • ${booking.master.name}`}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Favorites Preview */}
      {favorites && favorites.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              {t("marketplace.client.dashboard.favorites")}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigateToTab("favorites")}>
              {t("marketplace.client.dashboard.viewAll")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {favorites.slice(0, 4).map((fav) => {
              const salonName = getLocalizedName(fav.salon?.name, i18n.language);
              return (
                <Link key={fav.id} href={`/salon/${fav.salonId}`}>
                  <div className="text-center p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <Avatar className="h-14 w-14 mx-auto mb-2">
                      <AvatarImage src={fav.salon?.photos?.[0] || undefined} />
                      <AvatarFallback className="text-sm">
                        {salonName?.[0] || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium truncate">{salonName}</p>
                    {fav.salon?.averageRating && Number(fav.salon.averageRating) > 0 && (
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {fav.salon.averageRating}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
