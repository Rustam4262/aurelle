import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Salon, Booking, Service, Master } from "@shared/schema";
import {
  ArrowLeft,
  Plus,
  Store,
  Calendar,
  CalendarDays,
  CalendarRange,
  Users,
  Settings,
  Star,
  Scissors,
  LogOut,
  BarChart3,
} from "lucide-react";
import { BookingCalendar } from "@/components/booking-calendar";
import { CalendarWeekView } from "@/components/calendar-week-view";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OwnerDashboardOverview } from "@/components/owner-dashboard-overview";
import { ServiceManagement } from "@/components/service-management";
import { MasterManagement } from "@/components/master-management";
import { BookingManagement } from "@/components/booking-management";
import { SalonCreationWizard } from "@/components/salon-creation-wizard";
import { SalonList } from "@/components/owner/SalonList";

interface EnrichedBooking extends Booking {
  salon?: Salon;
  service?: Service;
  master?: Master;
  clientName?: string;
}

function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

function goToAuth() {
  window.location.href = "/auth";
}

export default function OwnerPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { user, isLoading: authLoading, logout } = useAuth({ requireAuth: true });
  const [, navigate] = useLocation();
  const [showAddSalon, setShowAddSalon] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [calendarView, setCalendarView] = useState<"day" | "week">("day");

  const { data: salons, isLoading: salonsLoading } = useQuery<Salon[]>({
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

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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
            <h2 className="font-serif text-xl text-foreground mb-2">Register Your Salon</h2>
            <p className="text-muted-foreground mb-6">
              Sign in to register your salon and start attracting new clients.
            </p>
            <Button onClick={goToAuth} className="w-full" data-testid="button-login-owner">
              Sign In to Continue
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-owner-dash">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-xl text-foreground ml-4">
              {t("marketplace.owner.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout-owner"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("dashboard.title", "Dashboard")}</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("bookings.title", "Bookings")}</span>
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">
              <Scissors className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("services.title", "Services")}</span>
            </TabsTrigger>
            <TabsTrigger value="masters" data-testid="tab-masters">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("masters.title", "Masters")}</span>
            </TabsTrigger>
            <TabsTrigger value="salons" data-testid="tab-salons">
              <Store className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.owner.mySalons")}</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.calendar.title")}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("analytics.title", "Analytics")}</span>
            </TabsTrigger>
          </TabsList>

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
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-foreground">
                {t("marketplace.calendar.title")}
              </h2>
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={calendarView === "day" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCalendarView("day")}
                  className="gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  {t("marketplace.calendar.dayView", "Day")}
                </Button>
                <Button
                  variant={calendarView === "week" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCalendarView("week")}
                  className="gap-2"
                >
                  <CalendarRange className="h-4 w-4" />
                  {t("marketplace.calendar.weekView", "Week")}
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
                  console.log("Booking clicked:", booking.id);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {salons && salons.length > 0 ? (
              <div className="space-y-6">
                {salons.map((salon) => (
                  <div key={salon.id}>
                    <h3 className="font-serif text-xl text-foreground mb-4">
                      {getLocalizedText(salon.name as any, currentLang)}
                    </h3>
                    <AnalyticsDashboard salonId={salon.id} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("analytics.noData")}</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
