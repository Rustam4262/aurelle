import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { Salon, Booking, Service, Master } from "@shared/schema";
import {
  ArrowLeft,
  Store,
  Calendar,
  CalendarDays,
  CalendarRange,
  Users,
  Scissors,
  LogOut,
  Bell,
  Zap,
  User,
} from "lucide-react";
import { BookingCalendar } from "@/components/booking-calendar";
import { CalendarWeekView } from "@/components/calendar-week-view";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OwnerDashboardOverview } from "@/components/owner-dashboard-overview";
import { ServiceManagement } from "@/components/service-management";
import { MasterManagement } from "@/components/master-management";
import { BookingManagement } from "@/components/booking-management";
import { SalonList } from "@/components/owner/SalonList";
import { RevenueAnalytics } from "@/components/revenue-analytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OwnerDashboardNavigation } from "@/components/owner-dashboard-navigation";

interface EnrichedBooking extends Booking {
  salon?: Salon;
  service?: Service;
  master?: Master;
  clientName?: string;
}

function goToAuth() {
  window.location.href = "/auth";
}

export default function OwnerPage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading, logout } = useAuth({ requireAuth: true });
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [calendarView, setCalendarView] = useState<"day" | "week">("day");

  const { data: salons } = useQuery<Salon[]>({
    queryKey: ["/api/owner/salons"],
    enabled: !!user,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/owner/bookings"],
    enabled: !!user && activeTab === "calendar",
  });

  const { data: mastersData } = useQuery<Master[]>({
    queryKey: ["/api/owner/masters"],
    enabled: !!user && activeTab === "calendar",
  });

  const handleLogout = () => {
    logout();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-owner">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="font-serif text-xl text-foreground ml-4">
                {t("marketplace.owner.title")}
              </h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 py-16">
          <Card className="p-8 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl text-foreground mb-2">{t("owner.registerSalon")}</h2>
            <p className="text-muted-foreground mb-6">{t("owner.registerSalonDesc")}</p>
            <Button onClick={goToAuth} className="w-full" data-testid="button-login-owner">
              {t("owner.signInToContinue")}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-owner-dash">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-lg md:text-xl text-foreground ml-2 md:ml-4">
              {t("marketplace.owner.title")}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {/* Quick Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  data-testid="button-quick-actions"
                >
                  <Zap className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {t("marketplace.owner.quickActions", "Quick Actions")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("bookings")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  {t("marketplace.bookings.manual.title", "Create Booking")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("services")}>
                  <Scissors className="h-4 w-4 mr-2" />
                  {t("marketplace.owner.addService")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("masters")}>
                  <Users className="h-4 w-4 mr-2" />
                  {t("marketplace.owner.addMaster")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("salons")}>
                  <Store className="h-4 w-4 mr-2" />
                  {t("marketplace.owner.addSalon")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
              {/* Badge for pending bookings - you can connect this to real data */}
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                3
              </span>
            </Button>

            <LanguageSwitcher />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                  data-testid="button-profile"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user?.profileImageUrl || ""}
                      alt={user?.firstName || "User"}
                    />
                    <AvatarFallback>
                      {user?.firstName?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.firstName
                        ? `${user.firstName} ${user.lastName || ""}`
                        : t("marketplace.client.unnamed", "Unnamed")}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/client")}>
                  <User className="h-4 w-4 mr-2" />
                  {t("marketplace.client.editProfile", "My Profile")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("marketplace.profile.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 md:px-6 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <OwnerDashboardNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          <TabsContent value="dashboard" className="space-y-6">
            <OwnerDashboardOverview />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <BookingManagement />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <ServiceManagement />
          </TabsContent>

          <TabsContent value="masters" className="space-y-6">
            <MasterManagement />
          </TabsContent>

          <TabsContent value="salons" className="space-y-6">
            <SalonList />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            {/* Calendar View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl md:text-2xl text-foreground">
                {t("marketplace.calendar.title")}
              </h2>
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={calendarView === "day" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCalendarView("day")}
                  className="gap-2 text-xs md:text-sm"
                >
                  <CalendarDays className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">
                    {t("marketplace.calendar.dayView", "Day")}
                  </span>
                </Button>
                <Button
                  variant={calendarView === "week" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCalendarView("week")}
                  className="gap-2 text-xs md:text-sm"
                >
                  <CalendarRange className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">
                    {t("marketplace.calendar.weekView", "Week")}
                  </span>
                </Button>
              </div>
            </div>

            {calendarView === "day" ? (
              <BookingCalendar
                bookings={bookingsData || []}
                isLoading={bookingsLoading}
                showMaster={true}
                showClient={true}
              />
            ) : (
              <CalendarWeekView
                bookings={bookingsData || []}
                masters={mastersData || []}
                salons={
                  salons?.map((s) => ({
                    id: s.id,
                    name: s.name as { en: string; ru: string; uz: string },
                  })) || []
                }
                isLoading={bookingsLoading}
                showClient={true}
                onBookingClick={(booking) => {
                  // Could open booking details modal here
                  logger.info(`Booking clicked: ${booking.id}`, { source: "owner-page" });
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <RevenueAnalytics
              salons={
                salons?.map((s) => ({
                  id: s.id,
                  name: s.name as { [key: string]: string },
                })) || []
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
