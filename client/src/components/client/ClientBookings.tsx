import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ru, uz } from "date-fns/locale";
import {
  Search,
  Filter,
  SortAsc,
  RefreshCw,
  Calendar,
  Store,
  User,
  Clock,
  Info,
  ExternalLink,
  Star,
  CheckCircle,
  RotateCcw,
  Bell,
  X,
  Copy,
  Share2,
} from "lucide-react";
import type { EnrichedBooking } from "./types";
import { useBookingFilters } from "./useBookingFilters";
import { BookingCardSkeleton } from "@/components/skeletons";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type LocalizedText = { en?: string; ru?: string; uz?: string };

// Helper functions (duplicated for now, could be shared)
function getLocalizedText(obj: LocalizedText | null | undefined, lang: string): string {
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

interface ClientBookingsProps {
  bookings: EnrichedBooking[] | undefined;
  isLoading: boolean;
  onCancelBooking: (bookingId: string) => void;
  isCancelling: boolean;
  onOpenWriteReview: (booking: EnrichedBooking) => void;
  hasReviewForBooking: (bookingId: string) => boolean;
}

export function ClientBookings({
  bookings,
  isLoading,
  onCancelBooking,
  isCancelling,
  onOpenWriteReview,
  hasReviewForBooking,
}: ClientBookingsProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<EnrichedBooking | null>(null);

  const {
    filteredBookings,
    uniqueServices,
    bookingFilter,
    setBookingFilter,
    serviceFilter,
    setServiceFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    clearFilters,
    hasActiveFilters,
  } = useBookingFilters({ bookings });

  const isUpcomingBooking = (booking: EnrichedBooking) => {
    const now = new Date();
    const bookingDate = new Date(booking.bookingDate);
    return bookingDate >= now && booking.status !== "cancelled" && booking.status !== "completed";
  };

  const isBookingSoon = (booking: EnrichedBooking) => {
    if (!isUpcomingBooking(booking)) return false;
    const now = new Date();
    const bookingDate = new Date(booking.bookingDate);
    const [hours, minutes] = booking.startTime.split(":").map(Number);
    bookingDate.setHours(hours, minutes, 0, 0);
    const hoursUntil = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil <= 24;
  };

  const openCancelDialog = (bookingId: string) => {
    setCancelBookingId(bookingId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (cancelBookingId) {
      onCancelBooking(cancelBookingId);
      setCancelDialogOpen(false);
    }
  };

  const openBookingDetails = (booking: EnrichedBooking) => {
    setSelectedBooking(booking);
    setBookingDetailsOpen(true);
  };

  const copyBookingToClipboard = async (booking: EnrichedBooking) => {
    const salonName = getLocalizedText(booking.salon?.name as LocalizedText, currentLang);
    const serviceName = getLocalizedText(booking.service?.name as LocalizedText, currentLang);
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString(
      currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    );

    const bookingText = `
${t("marketplace.client.bookingDetails")}
━━━━━━━━━━━━━━━━━━━━━━

📍 ${salonName}
${booking.salon?.address || ""}

💇 ${serviceName}
⏱ ${booking.service?.duration} ${t("marketplace.client.minutes")}

${booking.master ? `👤 ${booking.master.name}` : ""}

📅 ${bookingDate}
🕐 ${booking.startTime} - ${booking.endTime}

💰 ${formatCurrency(booking.priceSnapshot || 0)}

━━━━━━━━━━━━━━━━━━━━━━
ID: ${booking.id.slice(0, 8)}
    `.trim();

    try {
      await navigator.clipboard.writeText(bookingText);
      toast({ title: t("marketplace.client.copied") });
    } catch {
      toast({ title: t("marketplace.client.copyError"), variant: "destructive" });
    }
  };

  const shareBooking = async (booking: EnrichedBooking) => {
    const salonName = getLocalizedText(booking.salon?.name as LocalizedText, currentLang);
    const serviceName = getLocalizedText(booking.service?.name as LocalizedText, currentLang);
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString(
      currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
      { weekday: "long", day: "numeric", month: "long" },
    );

    const shareData = {
      title: t("marketplace.client.shareBookingTitle"),
      text: `${serviceName} @ ${salonName}\n${bookingDate}, ${booking.startTime}`,
      url: `${window.location.origin}/salon/${booking.salonId}`,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        copyBookingToClipboard(booking);
      }
    } else {
      copyBookingToClipboard(booking);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Header */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("marketplace.client.filter.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {t("marketplace.client.filter.byDate")}
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("marketplace.client.filter.newest")}</SelectItem>
              <SelectItem value="oldest">{t("marketplace.client.filter.oldest")}</SelectItem>
              <SelectItem value="priceHigh">{t("marketplace.client.filter.priceHigh")}</SelectItem>
              <SelectItem value="priceLow">{t("marketplace.client.filter.priceLow")}</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t("marketplace.client.filter.clearFilters")}
            </Button>
          )}
        </div>

        {/* Status Filter Buttons */}
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

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Service Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("marketplace.client.filter.byService")}
                </label>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("marketplace.client.filter.allServices")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("marketplace.client.filter.allServices")}
                    </SelectItem>
                    {uniqueServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("marketplace.client.filter.dateFrom")}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFrom
                        ? format(dateFrom, "PPP", {
                            locale:
                              currentLang === "ru" ? ru : currentLang === "uz" ? uz : undefined,
                          })
                        : t("marketplace.client.filter.dateFrom")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={currentLang === "ru" ? ru : currentLang === "uz" ? uz : undefined}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("marketplace.client.filter.dateTo")}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateTo
                        ? format(dateTo, "PPP", {
                            locale:
                              currentLang === "ru" ? ru : currentLang === "uz" ? uz : undefined,
                          })
                        : t("marketplace.client.filter.dateTo")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={currentLang === "ru" ? ru : currentLang === "uz" ? uz : undefined}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="text-sm text-muted-foreground">
          {filteredBookings.length} {t("marketplace.client.analytics.visits")}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t("marketplace.client.noBookings")}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const salonName = getLocalizedText(booking.salon?.name as LocalizedText, currentLang);
            const serviceName = getLocalizedText(
              booking.service?.name as LocalizedText,
              currentLang,
            );
            const bookingDate = new Date(booking.bookingDate);
            const isUpcoming = isUpcomingBooking(booking);

            return (
              <Card
                key={booking.id}
                className="p-4 transition-all hover:shadow-md hover:border-primary/50"
                data-testid={`booking-card-${booking.id}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-medium text-foreground">{serviceName}</h3>
                      <Badge className={STATUS_COLORS[booking.status || "pending"]}>
                        {t(`marketplace.client.status.${booking.status}`)}
                      </Badge>
                      {isBookingSoon(booking) && (
                        <Badge
                          variant="outline"
                          className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20"
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          {t("marketplace.client.comingSoon")}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span>{salonName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={booking.master?.photo ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {booking.master?.name?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{booking.master?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {bookingDate.toLocaleDateString(
                            currentLang === "ru"
                              ? "ru-RU"
                              : currentLang === "uz"
                                ? "uz-UZ"
                                : "en-US",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 font-medium text-foreground">
                      {booking.priceSnapshot?.toLocaleString()} UZS
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openBookingDetails(booking)}
                      data-testid={`button-booking-details-${booking.id}`}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      {t("marketplace.client.details")}
                    </Button>
                    <Link href={`/salon/${booking.salonId}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-salon-${booking.id}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        {t("marketplace.client.viewSalon")}
                      </Button>
                    </Link>
                    {booking.status === "completed" && (
                      <>
                        {!hasReviewForBooking(booking.id) ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onOpenWriteReview(booking)}
                            data-testid={`button-write-review-${booking.id}`}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            {t("marketplace.client.writeReview")}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t("marketplace.client.reviewed")}
                          </Badge>
                        )}
                        <Link
                          href={`/salon/${booking.salonId}?serviceId=${booking.serviceId}${booking.masterId ? `&masterId=${booking.masterId}` : ""}`}
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            data-testid={`button-rebook-${booking.id}`}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {t("marketplace.client.rebook")}
                          </Button>
                        </Link>
                      </>
                    )}
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

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.cancelBooking")}</DialogTitle>
            <DialogDescription>{t("marketplace.client.cancelBookingConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              data-testid="button-cancel-dialog-close"
            >
              {t("marketplace.client.close")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              data-testid="button-confirm-cancel"
            >
              {t("marketplace.client.confirmCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.bookingDetails")}</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("marketplace.client.status.label")}
                </span>
                <Badge className={STATUS_COLORS[selectedBooking.status || "pending"]}>
                  {t(`marketplace.client.status.${selectedBooking.status}`)}
                </Badge>
              </div>

              {/* Service Info */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-primary mt-0.5">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {getLocalizedText(
                        selectedBooking.service?.name as LocalizedText,
                        currentLang,
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedBooking.service?.duration} {t("marketplace.client.minutes")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Store className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {getLocalizedText(selectedBooking.salon?.name as LocalizedText, currentLang)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedBooking.salon?.address}
                    </p>
                  </div>
                </div>

                {selectedBooking.master && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{selectedBooking.master.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("marketplace.client.master")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("marketplace.client.date")}</p>
                    <p className="font-medium">
                      {new Date(selectedBooking.bookingDate).toLocaleDateString(
                        currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
                        { weekday: "short", day: "numeric", month: "long" },
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("marketplace.client.time")}</p>
                    <p className="font-medium">
                      {selectedBooking.startTime} - {selectedBooking.endTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-muted-foreground">{t("marketplace.client.price")}</span>
                <span className="text-xl font-bold">
                  {formatCurrency(selectedBooking.priceSnapshot || 0)}
                </span>
              </div>

              {/* Booking ID */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t("marketplace.client.bookingId")}: {selectedBooking.id.slice(0, 8)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyBookingToClipboard(selectedBooking)}
                    className="h-8 w-8 p-0"
                    title={t("marketplace.client.copyDetails")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => shareBooking(selectedBooking)}
                    className="h-8 w-8 p-0"
                    title={t("marketplace.client.share")}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {selectedBooking && (
              <>
                <Link href={`/salon/${selectedBooking.salonId}`}>
                  <Button variant="outline" onClick={() => setBookingDetailsOpen(false)}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t("marketplace.client.viewSalon")}
                  </Button>
                </Link>
                {selectedBooking.status === "completed" && (
                  <Link
                    href={`/salon/${selectedBooking.salonId}?serviceId=${selectedBooking.serviceId}${selectedBooking.masterId ? `&masterId=${selectedBooking.masterId}` : ""}`}
                  >
                    <Button onClick={() => setBookingDetailsOpen(false)}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {t("marketplace.client.rebook")}
                    </Button>
                  </Link>
                )}
                {new Date(selectedBooking.bookingDate) >= new Date() &&
                  selectedBooking.status !== "cancelled" &&
                  selectedBooking.status !== "completed" && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setBookingDetailsOpen(false);
                        openCancelDialog(selectedBooking.id);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t("marketplace.client.cancelBooking")}
                    </Button>
                  )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
