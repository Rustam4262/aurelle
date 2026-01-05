import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking, Salon } from "@shared/schema";
import {
  ArrowLeft,
  Calendar,
  Heart,
  Star,
  Settings,
  LogOut,
  Clock,
  MapPin,
  User,
  Scissors,
  XCircle,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: bookings } = useQuery<any[]>({
    queryKey: ["/api/client/bookings"],
    enabled: !!user,
  });

  const { toast } = useToast();

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

  const { data: favorites } = useQuery<Salon[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  if (isLoading) {
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

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
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
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={user.firstName || ""} />}
              <AvatarFallback>
                {user.firstName?.[0] || user.email?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-medium text-foreground text-lg">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="bookings" data-testid="tab-bookings">
              <Calendar className="h-4 w-4 mr-2" />
              {t("marketplace.profile.bookings")}
            </TabsTrigger>
            <TabsTrigger value="favorites" data-testid="tab-favorites">
              <Heart className="h-4 w-4 mr-2" />
              {t("marketplace.profile.favorites")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            {bookings && bookings.length > 0 ? (
              bookings.map((booking) => (
                <Card key={booking.id} className="p-5" data-testid={`card-booking-${booking.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Salon name */}
                      {booking.salon && (
                        <Link href={`/salon/${booking.salonId}`}>
                          <h3 className="font-semibold text-foreground text-lg hover:text-primary transition-colors">
                            {typeof booking.salon.name === "object" && booking.salon.name
                              ? (booking.salon.name as any)[t("language")] || (booking.salon.name as any).en
                              : booking.salon.name}
                          </h3>
                        </Link>
                      )}

                      {/* Service and Master */}
                      <div className="flex flex-wrap gap-3 text-sm">
                        {booking.service && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Scissors className="h-4 w-4" />
                            <span className="font-medium">
                              {typeof booking.service.name === "object" && booking.service.name
                                ? (booking.service.name as any)[t("language")] || (booking.service.name as any).en
                                : booking.service.name}
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

                      {/* Date, Time, Price */}
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
                            {booking.priceSnapshot.toLocaleString()} UZS
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge and Cancel Button */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          booking.status === "confirmed" ? "default" :
                          booking.status === "cancelled" ? "destructive" :
                          "secondary"
                        }
                      >
                        {t(`marketplace.booking.status.${booking.status}`)}
                      </Badge>

                      {booking.status === "pending" && (
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
                    Explore Salons
                  </Button>
                </Link>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {favorites && favorites.length > 0 ? (
              favorites.map((salon) => (
                <Link key={salon.id} href={`/salon/${salon.id}`}>
                  <Card className="p-4 hover-elevate cursor-pointer" data-testid={`card-favorite-${salon.id}`}>
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
                      <div>
                        <h3 className="font-medium text-foreground">
                          {typeof salon.name === "object" && salon.name ? (salon.name as any).en : salon.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {typeof salon.city === "object" && salon.city ? (salon.city as any).en : salon.city}
                        </div>
                      </div>
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
                    Explore Salons
                  </Button>
                </Link>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
