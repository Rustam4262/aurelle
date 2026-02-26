import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRef } from "react";
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
  Trash2,
  Upload,
} from "lucide-react";

const SERVICE_CATEGORIES = [
  "Маникюр", "Педикюр", "Ресницы", "Брови",
  "Волосы", "Макияж", "Массаж", "Спа",
  "Эпиляция", "Косметология", "Другое",
];

interface SoloService {
  id: string;
  name: { en: string; ru: string; uz: string };
  category: string;
  priceMin: number;
  priceMax: number | null;
  duration: number;
  serviceMode: string | null;
  isActive: boolean;
}

interface PortfolioItem {
  id: string;
  masterId: string;
  imageUrl: string;
  title: { en: string; ru: string; uz: string } | null;
  createdAt: string;
}

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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Portfolio upload ref
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const [portfolioUploading, setPortfolioUploading] = useState(false);

  // Service dialog state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [serviceMode, setServiceMode] = useState("both");

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

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery<SoloService[]>({
    queryKey: ["/api/solo-master/services"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/solo-master/services");
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
    enabled: !!user && !!masterData,
  });

  const createServiceMutation = useMutation({
    mutationFn: async () => {
      const price = parseInt(servicePrice, 10);
      if (!serviceName.trim() || !serviceCategory || isNaN(price) || price < 0) {
        throw new Error("Заполните обязательные поля");
      }
      const res = await apiRequest("POST", "/api/solo-master/services", {
        name: { ru: serviceName.trim(), en: serviceName.trim(), uz: serviceName.trim() },
        category: serviceCategory,
        priceMin: price,
        duration: parseInt(serviceDuration, 10) || 60,
        serviceMode,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка создания услуги");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/services"] });
      setServiceDialogOpen(false);
      setServiceName("");
      setServiceCategory("");
      setServicePrice("");
      setServiceDuration("60");
      setServiceMode("both");
      toast({ title: "Услуга добавлена" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/solo-master/services/${id}`);
      if (!res.ok) throw new Error("Ошибка удаления");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/services"] });
      toast({ title: "Услуга удалена" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // Portfolio queries — only when masterData loaded (need masterId)
  const { data: portfolio = [], isLoading: portfolioLoading } = useQuery<PortfolioItem[]>({
    queryKey: ["/api/portfolio/master", masterData?.id],
    queryFn: async () => {
      const res = await fetch(`/api/portfolio/master/${masterData!.id}`);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled: !!masterData?.id,
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("DELETE", `/api/portfolio/${itemId}`);
      if (!res.ok) throw new Error("Ошибка удаления фото");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/master", masterData?.id] });
      toast({ title: "Фото удалено" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !masterData) return;
    setPortfolioUploading(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        // Step 1: upload file
        const formData = new FormData();
        formData.append("image", file);
        const uploadRes = await fetch("/api/upload/portfolio", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Ошибка загрузки файла");
        const { url } = await uploadRes.json();

        // Step 2: create portfolio item
        const itemRes = await apiRequest("POST", "/api/portfolio", {
          masterId: masterData.id,
          imageUrl: url,
        });
        if (!itemRes.ok) throw new Error("Ошибка сохранения фото");
        successCount++;
      } catch (err) {
        toast({ title: (err as Error).message, variant: "destructive" });
      }
    }
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/master", masterData.id] });
      toast({ title: `Добавлено фото: ${successCount}` });
    }
    setPortfolioUploading(false);
    // reset input so same files can be re-selected
    if (portfolioInputRef.current) portfolioInputRef.current.value = "";
  };

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
                <Button onClick={() => setServiceDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("soloMaster.addService", "Add Service")}
                </Button>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>
                      {t(
                        "soloMaster.noServices",
                        "No services added yet. Add your first service to start accepting bookings.",
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((svc) => (
                      <div
                        key={svc.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{svc.name.ru}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">{svc.category}</Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {svc.duration} мин
                            </span>
                            <span className="font-medium text-foreground">
                              {svc.priceMin.toLocaleString()} UZS
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => deleteServiceMutation.mutate(svc.id)}
                          disabled={deleteServiceMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            {/* Hidden file input — accepts images, multiple */}
            <input
              ref={portfolioInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePortfolioUpload}
            />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("soloMaster.tabs.portfolio", "Portfolio")}</CardTitle>
                  <CardDescription>
                    {t("soloMaster.portfolioDesc", "Showcase your work")}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => portfolioInputRef.current?.click()}
                  disabled={portfolioUploading}
                >
                  {portfolioUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {portfolioUploading ? "Загрузка..." : t("soloMaster.addPhoto", "Add Photo")}
                </Button>
              </CardHeader>
              <CardContent>
                {portfolioLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : portfolio.length === 0 ? (
                  <div
                    className="text-center py-16 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => portfolioInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="text-muted-foreground">
                      {t(
                        "soloMaster.noPortfolio",
                        "No portfolio items yet. Add photos to showcase your work.",
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Нажмите чтобы выбрать фотографии
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {portfolio.map((item) => (
                      <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={item.imageUrl}
                          alt="Portfolio"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => deletePortfolioMutation.mutate(item.id)}
                            disabled={deletePortfolioMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* Add more tile */}
                    <div
                      className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => portfolioInputRef.current?.click()}
                    >
                      <Plus className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                  </div>
                )}
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

      {/* Add Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t("soloMaster.addService", "Add Service")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="svc-name">Название услуги *</Label>
              <Input
                id="svc-name"
                placeholder="Маникюр классический"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="svc-category">Категория *</Label>
              <Select value={serviceCategory} onValueChange={setServiceCategory}>
                <SelectTrigger id="svc-category" className="mt-1">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="svc-price">Цена (UZS) *</Label>
                <Input
                  id="svc-price"
                  type="number"
                  placeholder="100000"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="svc-duration">Длительность (мин) *</Label>
                <Input
                  id="svc-duration"
                  type="number"
                  placeholder="60"
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="svc-mode">Формат работы</Label>
              <Select value={serviceMode} onValueChange={setServiceMode}>
                <SelectTrigger id="svc-mode" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="at_master">У мастера</SelectItem>
                  <SelectItem value="mobile">Выезд</SelectItem>
                  <SelectItem value="both">У мастера и выезд</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => createServiceMutation.mutate()}
              disabled={createServiceMutation.isPending || !serviceName.trim() || !serviceCategory || !servicePrice}
            >
              {createServiceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
