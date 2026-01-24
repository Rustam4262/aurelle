import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { ru, uz } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Store,
  Scissors,
  CalendarDays,
  Users,
} from "lucide-react";
import type { Booking, Service, Master, Salon } from "@shared/schema";

interface EnrichedBooking extends Booking {
  salon?: Salon;
  service?: Service;
  master?: Master;
  clientName?: string;
}

interface CalendarWeekViewProps {
  bookings: EnrichedBooking[];
  masters?: Master[];
  salons?: { id: string; name: { en: string; ru: string; uz: string } }[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  showClient?: boolean;
  isLoading?: boolean;
  onBookingClick?: (booking: EnrichedBooking) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-400 dark:bg-yellow-600",
  confirmed: "bg-blue-400 dark:bg-blue-600",
  completed: "bg-green-400 dark:bg-green-600",
  cancelled: "bg-red-300 dark:bg-red-800 opacity-50",
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  pending: "border-l-yellow-500",
  confirmed: "border-l-blue-500",
  completed: "border-l-green-500",
  cancelled: "border-l-red-400",
};

function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

function generateHourSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const [startHour] = start.split(":").map(Number);
  const [endHour] = end.split(":").map(Number);

  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
  }
  return slots;
}

export function CalendarWeekView({
  bookings,
  masters = [],
  salons = [],
  workingHoursStart = "09:00",
  workingHoursEnd = "20:00",
  showClient = false,
  isLoading = false,
  onBookingClick,
}: CalendarWeekViewProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const locale = currentLang === "ru" ? ru : currentLang === "uz" ? uz : undefined;

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedMasterId, setSelectedMasterId] = useState<string>("all");
  const [selectedSalonId, setSelectedSalonId] = useState<string>("all");

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

  const hourSlots = useMemo(() => {
    return generateHourSlots(workingHoursStart, workingHoursEnd);
  }, [workingHoursStart, workingHoursEnd]);

  const filteredBookings = useMemo(() => {
    let result = bookings.filter((b) => b.status !== "cancelled");

    if (selectedMasterId !== "all") {
      result = result.filter((b) => b.masterId === selectedMasterId);
    }

    if (selectedSalonId !== "all") {
      result = result.filter((b) => b.salonId === selectedSalonId);
    }

    return result;
  }, [bookings, selectedMasterId, selectedSalonId]);

  const bookingsByDayAndHour = useMemo(() => {
    const map = new Map<string, EnrichedBooking[]>();

    for (const booking of filteredBookings) {
      const bookingDate = new Date(booking.bookingDate);
      const dateKey = format(bookingDate, "yyyy-MM-dd");
      const startHour = parseInt(booking.startTime.split(":")[0]);

      const key = `${dateKey}-${startHour}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(booking);
    }

    return map;
  }, [filteredBookings]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getBookingsForSlot = (day: Date, hour: string): EnrichedBooking[] => {
    const dateKey = format(day, "yyyy-MM-dd");
    const hourNum = parseInt(hour.split(":")[0]);
    const key = `${dateKey}-${hourNum}`;
    return bookingsByDayAndHour.get(key) || [];
  };

  const weekRange = `${format(currentWeekStart, "d MMM", { locale })} - ${format(
    endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    "d MMM yyyy",
    { locale }
  )}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with navigation and filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            <CalendarDays className="h-4 w-4 mr-2" />
            {t("marketplace.calendar.today")}
          </Button>
          <span className="font-medium text-foreground ml-2">{weekRange}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Master filter */}
          {masters.length > 0 && (
            <Select value={selectedMasterId} onValueChange={setSelectedMasterId}>
              <SelectTrigger className="w-[180px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("marketplace.owner.selectMaster")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("marketplace.client.filter.all")}
                </SelectItem>
                {masters.map((master) => (
                  <SelectItem key={master.id} value={master.id}>
                    {master.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Salon filter */}
          {salons.length > 1 && (
            <Select value={selectedSalonId} onValueChange={setSelectedSalonId}>
              <SelectTrigger className="w-[180px]">
                <Store className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("marketplace.dashboard.selectSalon")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("marketplace.dashboard.allSalons")}
                </SelectItem>
                {salons.map((salon) => (
                  <SelectItem key={salon.id} value={salon.id}>
                    {getLocalizedText(salon.name, currentLang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-400" />
          <span>{t("marketplace.booking.status.pending")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-400" />
          <span>{t("marketplace.booking.status.confirmed")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-400" />
          <span>{t("marketplace.booking.status.completed")}</span>
        </div>
      </div>

      {/* Week grid */}
      <Card className="overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b bg-muted/50">
              <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r">
                <Clock className="h-4 w-4 mx-auto" />
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`p-3 text-center border-r last:border-r-0 ${
                    isToday(day)
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-foreground"
                  }`}
                >
                  <div className="text-sm font-medium">
                    {format(day, "EEE", { locale })}
                  </div>
                  <div className={`text-lg ${isToday(day) ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots */}
            <div className="divide-y">
              {hourSlots.map((hour) => (
                <div key={hour} className="grid grid-cols-8 min-h-[60px]">
                  {/* Hour label */}
                  <div className="p-2 text-center text-sm text-muted-foreground border-r bg-muted/30 flex items-center justify-center">
                    {hour}
                  </div>

                  {/* Day cells */}
                  {weekDays.map((day) => {
                    const dayBookings = getBookingsForSlot(day, hour);

                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={`p-1 border-r last:border-r-0 min-h-[60px] ${
                          isToday(day) ? "bg-primary/5" : ""
                        }`}
                      >
                        {dayBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className={`text-xs p-1.5 rounded mb-1 cursor-pointer hover:opacity-80 transition-opacity border-l-4 ${
                              STATUS_BORDER_COLORS[booking.status || "pending"]
                            } bg-card shadow-sm`}
                            onClick={() => onBookingClick?.(booking)}
                            title={`${booking.startTime} - ${booking.endTime}`}
                          >
                            <div className="font-medium truncate">
                              {booking.startTime} - {booking.endTime}
                            </div>
                            {booking.service && (
                              <div className="text-muted-foreground truncate flex items-center gap-1">
                                <Scissors className="h-3 w-3 flex-shrink-0" />
                                {getLocalizedText(booking.service.name as any, currentLang)}
                              </div>
                            )}
                            {booking.master && (
                              <div className="text-muted-foreground truncate flex items-center gap-1">
                                <User className="h-3 w-3 flex-shrink-0" />
                                {booking.master.name}
                              </div>
                            )}
                            {showClient && booking.clientName && (
                              <div className="text-muted-foreground truncate">
                                {booking.clientName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {filteredBookings.length} {t("marketplace.calendar.bookings")} {t("marketplace.calendar.scheduleFor").toLowerCase()} {weekRange}
        </span>
      </div>
    </div>
  );
}
