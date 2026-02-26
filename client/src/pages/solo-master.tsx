import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  Settings,
  Briefcase,
  Image,
  BarChart3,
  Loader2,
  Plus,
  ExternalLink,
  AlertCircle,
  LogOut,
} from "lucide-react";

interface MasterData {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  photo: string | null;
  city: string | null;
  serviceMode: string | null;
  averageRating: string | null;
  reviewCount: number | null;
}

interface DashboardStats {
  todayBookings: number;
  weekBookings: number;
  monthRevenue: number;
  pendingBookings: number;
}

export default function SoloMasterPage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch master data
  const { data: masterData, isLoading: masterLoading } = useQuery<MasterData>({
    queryKey: ["/api/solo-master/me"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/solo-master/me");
      if (!res.ok) throw new Error("Failed to fetch master data");
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Fetch dashboard stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/solo-master/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/solo-master/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!user && !!masterData,
  });

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t("soloMaster.notFound", "Profile Not Found")}</CardTitle>
            <CardDescription>
              {t("soloMaster.notFoundDesc", "You need to complete your solo master setup first.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/solo-master/onboarding")} className="w-full">
              {t("soloMaster.startSetup", "Start Setup")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDraft = masterData.status === "draft";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                {masterData.photo ? (
                  <img
                    src={masterData.photo}
                    alt={masterData.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <Briefcase className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{masterData.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isDraft ? "secondary" : "default"}>
                    {isDraft
                      ? t("soloMaster.status.draft", "Draft")
                      : t("soloMaster.status.active", "Active")}
                  </Badge>
                  {masterData.city && (
                    <span className="text-sm text-muted-foreground">{masterData.city}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {masterData.slug && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/master/${masterData.slug}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("soloMaster.viewPublicPage", "View Page")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/solo-master/onboarding")}
              >
                <Settings className="h-4 w-4 mr-2" />
                {t("soloMaster.editProfile", "Edit Profile")}
              </Button>
              <LanguageSwitcher variant="outline" />
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Warning */}
      {isDraft && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <div className="container py-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">
                {t(
                  "soloMaster.draftWarning",
                  "Your profile is in draft mode. Add services and activate to start accepting bookings.",
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t("soloMaster.tabs.overview", "Overview")}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              {t("soloMaster.tabs.calendar", "Calendar")}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <Clock className="h-4 w-4" />
              {t("soloMaster.tabs.bookings", "Bookings")}
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Briefcase className="h-4 w-4" />
              {t("soloMaster.tabs.services", "Services")}
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="gap-2">
              <Image className="h-4 w-4" />
              {t("soloMaster.tabs.portfolio", "Portfolio")}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              {t("soloMaster.tabs.settings", "Settings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("soloMaster.stats.todayBookings", "Today's Bookings")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.todayBookings || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("soloMaster.stats.weekBookings", "This Week")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.weekBookings || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("soloMaster.stats.monthRevenue", "Month Revenue")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(stats?.monthRevenue || 0).toLocaleString()} UZS
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("soloMaster.stats.pending", "Pending")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {stats?.pendingBookings || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t("soloMaster.quickActions", "Quick Actions")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={() => setActiveTab("services")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("soloMaster.addService", "Add Service")}
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("calendar")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  {t("soloMaster.viewCalendar", "View Calendar")}
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("portfolio")}>
                  <Image className="h-4 w-4 mr-2" />
                  {t("soloMaster.addPortfolio", "Add Portfolio")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>{t("soloMaster.tabs.calendar", "Calendar")}</CardTitle>
                <CardDescription>
                  {t("soloMaster.calendarDesc", "View and manage your schedule")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  {t("soloMaster.comingSoon", "Coming soon...")}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>{t("soloMaster.tabs.bookings", "Bookings")}</CardTitle>
                <CardDescription>
                  {t("soloMaster.bookingsDesc", "Manage your appointments")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  {t("soloMaster.noBookings", "No bookings yet")}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("soloMaster.tabs.services", "Services")}</CardTitle>
                  <CardDescription>
                    {t("soloMaster.servicesDesc", "Services you offer to clients")}
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("soloMaster.addService", "Add Service")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  {t(
                    "soloMaster.noServices",
                    "No services added yet. Add your first service to start accepting bookings.",
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("soloMaster.tabs.portfolio", "Portfolio")}</CardTitle>
                  <CardDescription>
                    {t("soloMaster.portfolioDesc", "Showcase your work")}
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("soloMaster.addPhoto", "Add Photo")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  {t(
                    "soloMaster.noPortfolio",
                    "No portfolio items yet. Add photos to showcase your work.",
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{t("soloMaster.tabs.settings", "Settings")}</CardTitle>
                <CardDescription>
                  {t("soloMaster.settingsDesc", "Manage your profile and preferences")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/solo-master/onboarding")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t("soloMaster.editProfile", "Edit Profile")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
