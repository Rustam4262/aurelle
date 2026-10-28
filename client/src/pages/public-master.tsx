import { MessengerLink } from "@/components/messenger-link";
import { goBackOrNavigate } from "@/lib/safe-back";
import { matchesAudience } from "@shared/service-audience";
import { AudienceLabel, useAudience } from "@/components/audience-provider";
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getLocalizedText, formatCurrency } from "@/lib/i18n";
import { buildTelegramUrl, formatTelegramLabel } from "@/lib/social-links";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Calendar as CalendarIcon,
  Briefcase,
  Image,
  MessageSquare,
  Loader2,
  Instagram,
  Send,
  Car,
  Home,
  ArrowLeft,
  PhoneCall,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { ru, enUS, uz } from "date-fns/locale";

interface MasterData {
  id: string;
  userId?: string | null;
  name: string;
  slug: string;
  bio: { en: string; ru: string; uz: string } | null;
  photo: string | null;
  city: string | null;
  address: string | null;
  serviceMode: string | null;
  phone: string | null;
  instagram: string | null;
  telegram: string | null;
  averageRating: string;
  reviewCount: number;
  workingHours: Array<{
    dayOfWeek: number;
    isClosed: boolean;
    openTime: string;
    closeTime: string;
  }>;
  portfolio: Array<{
    id: string;
    imageUrl: string;
    description: { en: string; ru: string; uz: string } | null;
  }>;
}

interface ServiceData {
  audience?: string | null;
  id: string;
  name: { en: string; ru: string; uz: string };
  description: { en: string; ru: string; uz: string } | null;
  category: string;
  priceMin: number;
  priceMax: number | null;
  duration: number;
  serviceMode: string | null;
  mobileExtraCharge: number | null;
}

interface ReviewData {
  masterResponse?: string | null;
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  clientName: string;
}

interface AvailabilityData {
  available: boolean;
  slots: Array<{ time: string; available: boolean }>;
  message?: string;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PublicMasterPage() {
  const { slug } = useParams<{ slug: string }>();
  const { audience } = useAudience();
  const [showAllServices, setShowAllServices] = useState(false);
  const [activeTab, setActiveTab] = useState("services");
  const servicesTabsRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as "en" | "ru" | "uz";
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const restoredService = useRef(false);

  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [isMobileBooking, setIsMobileBooking] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState<{
    status: "idle" | "loading" | "ok" | "out_of_range" | "error";
    distance?: number;
    withinRange?: boolean;
    workRadius?: number;
    estimatedTravelTime?: number;
    mobileExtraCharge?: number;
    errorMsg?: string;
  }>({ status: "idle" });

  // Fetch master data
  const { data: master, isLoading: masterLoading } = useQuery<MasterData>({
    queryKey: [`/api/masters/${slug}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/masters/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch master");
      return res.json();
    },
    enabled: !!slug,
  });

  // Fetch services
  const { data: services } = useQuery<ServiceData[]>({
    queryKey: [`/api/masters/${slug}/services`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/masters/${slug}/services`);
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
    enabled: !!slug && !!master,
  });
  const primaryService = services?.find(
    (service) => showAllServices || matchesAudience(service.audience, audience),
  );

  // Fetch reviews
  const { data: reviews } = useQuery<ReviewData[]>({
    queryKey: [`/api/masters/${slug}/reviews`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/masters/${slug}/reviews`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!slug && !!master,
  });

  // Fetch availability for selected date
  const {
    data: availability,
    isFetching: availabilityLoading,
    isError: availabilityError,
  } = useQuery<AvailabilityData>({
    queryKey: [
      `/api/masters/${slug}/availability`,
      selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
      selectedService?.id,
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/masters/${slug}/availability?date=${selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined}&serviceId=${selectedService?.id || ""}`,
      );
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
    enabled: !!slug && !!selectedDate && !!selectedService,
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedService || !selectedDate || !selectedTime) {
        throw new Error("Missing booking data");
      }

      // Calculate end time based on service duration
      const [startHour, startMinute] = selectedTime.split(":").map(Number);
      const endMinutes = startHour * 60 + startMinute + selectedService.duration;
      const endHour = Math.floor(endMinutes / 60);
      const endMinute = endMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

      const res = await apiRequest("POST", "/api/bookings", {
        masterId: master?.id,
        soloMasterServiceId: selectedService.id,
        bookingDate: format(selectedDate, "yyyy-MM-dd"),
        startTime: selectedTime,
        endTime,
        priceSnapshot:
          selectedService.priceMin + (isMobileBooking ? selectedService.mobileExtraCharge || 0 : 0),
        notes: bookingNotes || null,
        isMobileBooking,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create booking");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("publicMaster.bookingSuccess", "Booking Created"),
        description: t(
          "publicMaster.bookingSuccessDesc",
          "Your booking has been submitted for confirmation.",
        ),
      });
      setBookingDialogOpen(false);
      setSelectedService(null);
      setSelectedDate(undefined);
      setSelectedTime(null);
      setBookingNotes("");
      queryClient.invalidateQueries({ queryKey: [`/api/masters/${slug}/availability`] });
    },
    onError: (error: Error & { code?: string }) => {
      const bookingCodes = [
        "BOOKING_SERVICE_UNAVAILABLE",
        "BOOKING_SCHEDULE_UNAVAILABLE",
        "BOOKING_DATE_IN_PAST",
        "BOOKING_OUTSIDE_WORKING_HOURS",
        "BOOKING_TIME_UNAVAILABLE",
      ];
      const knownError = !!error.code && bookingCodes.includes(error.code);
      if (knownError) {
        setSelectedTime(null);
        queryClient.invalidateQueries({ queryKey: [`/api/masters/${slug}/availability`] });
      }
      toast({
        title: t("marketplace.salon.bookingFailed"),
        description: knownError
          ? t(`marketplace.salon.errors.${error.code}`)
          : t("marketplace.client.error"),
        variant: "destructive",
      });
    },
  });

  const checkDistance = () => {
    if (!slug) return;
    setDistanceInfo({ status: "loading" });
    if (!navigator.geolocation) {
      setDistanceInfo({ status: "error", errorMsg: "Геолокация недоступна в вашем браузере" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await apiRequest("POST", `/api/masters/${slug}/check-distance`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            setDistanceInfo({
              status: "error",
              errorMsg: err.error || "Ошибка проверки расстояния",
            });
            return;
          }
          const data = await res.json();
          setDistanceInfo({
            status: data.withinRange ? "ok" : "out_of_range",
            distance: data.distance,
            withinRange: data.withinRange,
            workRadius: data.workRadius,
            estimatedTravelTime: data.estimatedTravelTime,
            mobileExtraCharge: data.mobileExtraCharge,
          });
        } catch {
          setDistanceInfo({ status: "error", errorMsg: "Ошибка соединения с сервером" });
        }
      },
      () => {
        setDistanceInfo({
          status: "error",
          errorMsg: "Не удалось определить ваше местоположение. Разрешите доступ к геолокации.",
        });
      },
      { timeout: 10000 },
    );
  };

  const handleBookService = (service: ServiceData) => {
    if (!user) {
      // Preserve the selected service and language through the guest login flow.
      try {
        sessionStorage.setItem(
          "redirectAfterLogin",
          `${window.location.pathname}?serviceId=${encodeURIComponent(service.id)}`,
        );
      } catch {
        // sessionStorage unavailable — fall back to the default post-login route.
      }
      navigate("/auth");
      return;
    }
    setSelectedService(service);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setIsMobileBooking(false);
    setDistanceInfo({ status: "idle" });
    setBookingDialogOpen(true);
  };

  useEffect(() => {
    if (restoredService.current || authLoading || !master || !services) return;
    const serviceId = new URLSearchParams(search).get("serviceId");
    if (!serviceId) return;
    restoredService.current = true;
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setShowAllServices(true);
      handleBookService(service);
      if (user) navigate(window.location.pathname, { replace: true });
    }
    // A URL service is restored once, after account and service data are available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, master, services, search]);

  const handleBookNow = () => {
    if (primaryService) {
      handleBookService(primaryService);
      return;
    }
    // Let the client explicitly choose from all services when the audience filter
    // hides them; never silently book an unrelated service or disable this entry point.
    setShowAllServices(true);
    setActiveTab("services");
    requestAnimationFrame(() => {
      servicesTabsRef.current
        ?.querySelector<HTMLElement>('[role="tab"]')
        ?.focus({ preventScroll: true });
      servicesTabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const getDateLocale = () => {
    switch (currentLang) {
      case "ru":
        return ru;
      case "uz":
        return uz;
      default:
        return enUS;
    }
  };

  if (masterLoading) {
    return (
      <div className="page-backdrop min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!master) {
    return (
      <div className="page-backdrop min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md mx-auto">
          <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl text-foreground mb-4">
            {t("publicMaster.notFound", "Master not found")}
          </h2>
          <Button onClick={() => goBackOrNavigate(navigate, "/")} className="w-full">
            {t("publicMaster.goHome", "Go Home")}
          </Button>
        </Card>
      </div>
    );
  }

  const bio = getLocalizedText(master.bio, currentLang);
  const telegramUrl = buildTelegramUrl(master.telegram);
  const telegramLabel = formatTelegramLabel(master.telegram);

  return (
    <div className="page-backdrop min-h-screen">
      {/* Header */}
      <div className="px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="cabinet-hero mx-auto max-w-5xl !p-6 sm:!p-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="relative mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back", "Back")}
          </Button>

          <div className="relative flex flex-col items-start gap-7 md:flex-row">
            <div className="relative h-36 w-36 flex-shrink-0 animate-scale-in">
              <div className="absolute -inset-1.5 rounded-[2.4rem] bg-gradient-to-br from-primary to-[hsl(15_90%_62%)] opacity-80 blur-[2px]" />
              <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] border-4 border-card bg-card shadow-2xl">
                {master.photo ? (
                  <img src={master.photo} alt={master.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10">
                    <span className="font-serif text-6xl font-light text-primary">
                      {master.name.charAt(0).toUpperCase()}
                    </span>
                    <Briefcase className="absolute bottom-3 right-3 h-5 w-5 text-primary/40" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 animate-fade-up">
              <h1 className="mb-3 font-serif text-4xl font-light leading-tight tracking-[-0.02em] text-foreground sm:text-5xl">
                {master.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mb-3">
                {master.averageRating && Number(master.averageRating) > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{master.averageRating}</span>
                    <span className="text-muted-foreground">({master.reviewCount})</span>
                  </div>
                )}

                {master.city && (
                  <Badge variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {master.city}
                  </Badge>
                )}

                {master.serviceMode && (
                  <Badge variant="outline" className="gap-1">
                    {master.serviceMode === "mobile" ? (
                      <>
                        <Car className="h-3 w-3" />
                        {t("publicMaster.mobile", "Mobile")}
                      </>
                    ) : master.serviceMode === "both" ? (
                      <>
                        <Home className="h-3 w-3" />
                        {t("publicMaster.bothModes", "At location & Mobile")}
                      </>
                    ) : (
                      <>
                        <Home className="h-3 w-3" />
                        {t("publicMaster.atLocation", "At location")}
                      </>
                    )}
                  </Badge>
                )}
              </div>

              {bio && <p className="text-muted-foreground mb-4">{bio}</p>}

              {/* Primary CTA — always visible */}
              <div className="flex flex-wrap gap-3 mt-4">
                {master.userId && <MessengerLink recipientId={master.userId} />}
                {services && services.length > 0 ? (
                  <Button
                    size="lg"
                    className="gap-2 shadow-lg shadow-primary/20"
                    onClick={handleBookNow}
                    disabled={authLoading}
                  >
                    <CalendarIcon className="h-5 w-5" />
                    {t("publicMaster.bookNow", "Book Now")}
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" className="gap-2" disabled>
                    <CalendarIcon className="h-5 w-5" />
                    {t("publicMaster.noServicesYet", "Услуги не добавлены")}
                  </Button>
                )}
                {master.phone && (
                  <Button size="lg" variant="outline" className="gap-2" asChild>
                    <a href={`tel:${master.phone}`}>
                      <PhoneCall className="h-5 w-5" />
                      {t("publicMaster.call", "Позвонить")}
                    </a>
                  </Button>
                )}
                {telegramUrl && (
                  <Button size="lg" variant="outline" className="gap-2" asChild>
                    <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                      <Send className="h-5 w-5" />
                      Telegram
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs
              ref={servicesTabsRef}
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full scroll-mt-4"
            >
              <TabsList className="mb-6 h-auto w-full justify-start gap-1 rounded-none border-b border-foreground/10 bg-transparent p-0 backdrop-blur-none">
                <TabsTrigger
                  value="services"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  {t("publicMaster.services", "Services")}
                </TabsTrigger>
                <TabsTrigger
                  value="portfolio"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <Image className="h-4 w-4 mr-2" />
                  {t("publicMaster.portfolio", "Portfolio")}
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t("publicMaster.reviews", "Reviews")} ({master.reviewCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="services">
                <AudienceLabel />
                <div className="mb-4">
                  <Button variant="outline" onClick={() => setShowAllServices(!showAllServices)}>
                    {t(showAllServices ? "audience.matching" : "audience.all")}
                  </Button>
                </div>
                {!showAllServices &&
                  services &&
                  !services.some((s) => matchesAudience(s.audience, audience)) && (
                    <p className="mb-4 text-muted-foreground">{t("audience.empty")}</p>
                  )}
                {services && services.length > 0 ? (
                  <div className="space-y-4">
                    {services
                      .filter(
                        (service) => showAllServices || matchesAudience(service.audience, audience),
                      )
                      .map((service) => (
                        <Card key={service.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">
                                  {getLocalizedText(service.name, currentLang)}
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {t(
                                    service.audience
                                      ? `audience.${service.audience}`
                                      : "audience.askSpecialist",
                                  )}
                                </p>
                                {service.description && (
                                  <p className="text-muted-foreground text-sm mt-1">
                                    {getLocalizedText(service.description, currentLang)}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {service.duration} {t("common.min", "min")}
                                  </span>
                                  <Badge variant="secondary">{service.category}</Badge>
                                  {service.serviceMode === "mobile" && (
                                    <Badge variant="outline" className="gap-1">
                                      <Car className="h-3 w-3" />
                                      {t("publicMaster.mobile", "Mobile")}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg">
                                  {formatCurrency(service.priceMin)}
                                  {service.priceMax && service.priceMax !== service.priceMin && (
                                    <span> - {formatCurrency(service.priceMax)}</span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => handleBookService(service)}
                                >
                                  <CalendarIcon className="h-4 w-4 mr-1" />
                                  {t("publicMaster.book", "Book")}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-muted-foreground mb-4">
                      {t("publicMaster.noServices", "No services available")}
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t(
                        "publicMaster.noServicesContact",
                        "Свяжитесь с мастером напрямую для записи",
                      )}
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {master.phone && (
                        <Button variant="outline" className="gap-2" asChild>
                          <a href={`tel:${master.phone}`}>
                            <PhoneCall className="h-4 w-4" />
                            {master.phone}
                          </a>
                        </Button>
                      )}
                      {telegramUrl && (
                        <Button variant="outline" className="gap-2" asChild>
                          <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                            <Send className="h-4 w-4" />
                            {telegramLabel || "Telegram"}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="portfolio">
                {master.portfolio && master.portfolio.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {master.portfolio.map((item) => (
                      <div
                        key={item.id}
                        className="aspect-square rounded-lg overflow-hidden bg-muted"
                      >
                        <img
                          src={item.imageUrl}
                          alt={
                            item.description
                              ? getLocalizedText(item.description, currentLang)
                              : "Portfolio"
                          }
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {t("publicMaster.noPortfolio", "No portfolio items yet")}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews">
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold">{review.clientName}</div>
                              <div className="flex items-center gap-1 mt-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(review.createdAt), "PP", {
                                locale: getDateLocale(),
                              })}
                            </div>
                          </div>
                          {review.masterResponse && <div className="mt-3 rounded-lg bg-muted p-3"><p className="font-medium text-sm">{t("employeeMaster.response")}</p><p className="whitespace-pre-wrap break-words">{review.masterResponse}</p></div>}
                          {review.comment && (
                            <p className="mt-3 text-muted-foreground">{review.comment}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {t("publicMaster.noReviews", "No reviews yet")}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-6 sticky top-24">
              {services && services.length > 0 ? (
                <Button
                  className="w-full mb-6 font-medium shadow-lg shadow-primary/20"
                  size="lg"
                  onClick={handleBookNow}
                  disabled={authLoading}
                >
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  {t("publicMaster.bookNow", "Book Now")}
                </Button>
              ) : (
                <div className="mb-6 space-y-2">
                  {master.phone && (
                    <Button className="w-full gap-2" size="lg" asChild>
                      <a href={`tel:${master.phone}`}>
                        <PhoneCall className="h-5 w-5" />
                        {t("publicMaster.call", "Позвонить")}
                      </a>
                    </Button>
                  )}
                  {telegramUrl && (
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                        <Send className="h-5 w-5" />
                        Telegram
                      </a>
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-6">
                {master.address && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {t("publicMaster.location", "Location")}
                    </h4>
                    <div className="flex items-start gap-2 text-foreground text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>{master.address}</span>
                    </div>
                  </div>
                )}

                {master.phone && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {t("publicMaster.contact", "Contact")}
                    </h4>
                    <div className="flex items-center gap-2 text-foreground text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <a
                        href={`tel:${master.phone}`}
                        className="hover:text-primary transition-colors"
                      >
                        {master.phone}
                      </a>
                    </div>
                  </div>
                )}

                {(master.instagram || telegramUrl) && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {t("publicMaster.social", "Social")}
                    </h4>
                    <div className="flex gap-2">
                      {master.instagram && (
                        <a
                          href={`https://instagram.com/${master.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                        >
                          <Instagram className="h-4 w-4" />@{master.instagram}
                        </a>
                      )}
                      {telegramUrl && (
                        <a
                          href={telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                        >
                          <Send className="h-4 w-4" />
                          {telegramLabel || "Telegram"}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Working Hours */}
            {master.workingHours && master.workingHours.length > 0 && (
              <Card className="p-6">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                  {t("publicMaster.workingHours", "Working Hours")}
                </h4>
                <div className="space-y-2 text-sm">
                  {master.workingHours.map((h) => (
                    <div key={h.dayOfWeek} className="flex justify-between">
                      <span className="text-muted-foreground">{dayNames[h.dayOfWeek]}</span>
                      <span>
                        {h.isClosed ? (
                          <span className="text-muted-foreground">
                            {t("common.closed", "Closed")}
                          </span>
                        ) : (
                          `${h.openTime} - ${h.closeTime}`
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog
        open={bookingDialogOpen}
        onOpenChange={(open) => {
          setBookingDialogOpen(open);
          if (!open) setDistanceInfo({ status: "idle" });
        }}
      >
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-[500px] flex-col overflow-hidden p-0">
          <DialogHeader>
            <div className="px-4 pt-4 sm:px-6 sm:pt-6">
              <DialogTitle>{t("publicMaster.bookService", "Book Service")}</DialogTitle>
            </div>
            <DialogDescription>
              {selectedService && getLocalizedText(selectedService.name, currentLang)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
            {/* Service Mode Toggle */}
            {selectedService &&
              master.serviceMode !== "at_master" &&
              selectedService.serviceMode !== "at_master" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("publicMaster.serviceMode", "Service Mode")}
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={!isMobileBooking ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsMobileBooking(false);
                        setDistanceInfo({ status: "idle" });
                      }}
                    >
                      <Home className="h-4 w-4 mr-1" />
                      {t("publicMaster.atMasterLocation", "At master's location")}
                    </Button>
                    <Button
                      type="button"
                      variant={isMobileBooking ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsMobileBooking(true);
                        checkDistance();
                      }}
                    >
                      <Car className="h-4 w-4 mr-1" />
                      {t("publicMaster.mobileService", "Mobile service")}
                      {selectedService.mobileExtraCharge &&
                        selectedService.mobileExtraCharge > 0 && (
                          <span className="ml-1 text-xs">
                            (+{formatCurrency(selectedService.mobileExtraCharge)})
                          </span>
                        )}
                    </Button>
                  </div>

                  {/* Distance check result */}
                  {isMobileBooking && distanceInfo.status === "loading" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Определяем ваше местоположение…
                    </div>
                  )}
                  {isMobileBooking && distanceInfo.status === "ok" && (
                    <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-2 mt-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Мастер приедет к вам — вы в зоне доступа ({distanceInfo.distance} км). Время
                        в пути ~{distanceInfo.estimatedTravelTime} мин.
                      </span>
                    </div>
                  )}
                  {isMobileBooking && distanceInfo.status === "out_of_range" && (
                    <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-2 mt-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Вы находитесь за пределами зоны выезда мастера ({distanceInfo.distance} км,
                        максимум {distanceInfo.workRadius} км). Выберите визит к мастеру.
                      </span>
                    </div>
                  )}
                  {isMobileBooking && distanceInfo.status === "error" && (
                    <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2 mt-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{distanceInfo.errorMsg}</span>
                    </div>
                  )}
                </div>
              )}

            {/* Date Selection */}
            <div className="min-w-0">
              <label className="text-sm font-medium mb-2 block">
                {t("publicMaster.selectDate", "Select Date")}
              </label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                locale={getDateLocale()}
                className="w-full rounded-md border"
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("publicMaster.selectTime", "Select Time")}
                </label>
                {availabilityLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !availabilityError &&
                  availability?.available &&
                  availability.slots.some((slot) => slot.available) ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availability.slots
                      .filter((slot) => slot.available)
                      .map((slot) => (
                        <Button
                          key={slot.time}
                          type="button"
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(slot.time)}
                        >
                          {slot.time}
                        </Button>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {availabilityError
                      ? t("marketplace.client.error")
                      : t("publicMaster.noSlots", "No available time slots")}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            {selectedTime && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("publicMaster.notes", "Notes")} ({t("common.optional", "optional")})
                </label>
                <Textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder={t("publicMaster.notesPlaceholder", "Any special requests...")}
                  rows={3}
                />
              </div>
            )}

            {/* Summary */}
            {selectedService && selectedDate && selectedTime && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">
                    {t("publicMaster.summary", "Booking Summary")}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{t("publicMaster.service", "Service")}:</span>
                      <span>{getLocalizedText(selectedService.name, currentLang)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("publicMaster.date", "Date")}:</span>
                      <span>{format(selectedDate, "PP", { locale: getDateLocale() })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("publicMaster.time", "Time")}:</span>
                      <span>{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("publicMaster.duration", "Duration")}:</span>
                      <span>
                        {selectedService.duration} {t("common.min", "min")}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>{t("publicMaster.total", "Total")}:</span>
                      <span>
                        {formatCurrency(
                          selectedService.priceMin +
                            (isMobileBooking ? selectedService.mobileExtraCharge || 0 : 0),
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("marketplace.salon.cancellationPolicy")}
            </p>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background px-4 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => createBookingMutation.mutate()}
              disabled={
                !selectedDate ||
                !selectedTime ||
                availabilityLoading ||
                availabilityError ||
                createBookingMutation.isPending ||
                (isMobileBooking && distanceInfo.status === "out_of_range")
              }
            >
              {createBookingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("publicMaster.confirmBooking", "Confirm Booking")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
