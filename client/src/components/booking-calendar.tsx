import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  format,
  parseISO,
  startOfDay,
  isAfter,
  isBefore,
  addDays,
  isSameDay as isSameDayFns,
} from "date-fns";
import {
  Clock,
  User,
  Store,
  Scissors,
  CalendarDays,
  Flame,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Booking, Service, Master, Salon } from "@shared/schema";
import {
  analyzeTimeSlot,
  getPeriodLabel,
  getDayQualityIcon,
  type TimeSlotAnalysis,
} from "@/lib/slot-insights";

interface EnrichedBooking extends Booking {
  salon?: Salon;
  service?: Service;
  master?: Master;
  clientName?: string;
}

interface BookingCalendarProps {
  bookings: EnrichedBooking[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  showClient?: boolean;
  showMaster?: boolean;
  showSalon?: boolean;
  isLoading?: boolean;
  maxAdvanceBookingDays?: number;
  disablePastDates?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

interface TimeSlotData {
  time: string;
  period: TimeSlotAnalysis["period"];
  isPrimeTime: boolean;
}

function generateTimeSlots(start: string, end: string): TimeSlotData[] {
  const slots: TimeSlotData[] = [];
  const [startHour] = start.split(":").map(Number);
  const [endHour] = end.split(":").map(Number);

  for (let hour = startHour; hour < endHour; hour++) {
    const time1 = `${hour.toString().padStart(2, "0")}:00`;
    const time2 = `${hour.toString().padStart(2, "0")}:30`;
    const analysis1 = analyzeTimeSlot(time1);
    const analysis2 = analyzeTimeSlot(time2);

    slots.push({ time: time1, period: analysis1.period, isPrimeTime: analysis1.isPrimeTime });
    slots.push({ time: time2, period: analysis2.period, isPrimeTime: analysis2.isPrimeTime });
  }
  return slots;
}

function isTimeSlotBooked(slot: string, bookings: EnrichedBooking[]): EnrichedBooking | null {
  const slotMinutes = parseInt(slot.split(":")[0]) * 60 + parseInt(slot.split(":")[1]);

  for (const booking of bookings) {
    if (booking.status === "cancelled") continue;

    const startMinutes =
      parseInt(booking.startTime.split(":")[0]) * 60 + parseInt(booking.startTime.split(":")[1]);
    const endMinutes =
      parseInt(booking.endTime.split(":")[0]) * 60 + parseInt(booking.endTime.split(":")[1]);

    if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
      return booking;
    }
  }
  return null;
}

function groupSlotsByPeriod(
  slots: TimeSlotData[],
): Record<TimeSlotAnalysis["period"], TimeSlotData[]> {
  const groups: Record<TimeSlotAnalysis["period"], TimeSlotData[]> = {
    morning: [],
    midday: [],
    afternoon: [],
    evening: [],
  };

  for (const slot of slots) {
    groups[slot.period].push(slot);
  }

  return groups;
}

export function BookingCalendar({
  bookings,
  workingHoursStart = "09:00",
  workingHoursEnd = "20:00",
  showClient = false,
  showMaster = false,
  showSalon = false,
  isLoading = false,
  maxAdvanceBookingDays = 90,
  disablePastDates = true,
}: BookingCalendarProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const today = startOfDay(new Date());
  const maxDate = maxAdvanceBookingDays ? addDays(today, maxAdvanceBookingDays) : undefined;

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, EnrichedBooking[]>();
    for (const booking of bookings) {
      const dateKey = format(new Date(booking.bookingDate), "yyyy-MM-dd");
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(booking);
    }
    return map;
  }, [bookings]);

  const datesWithBookings = useMemo(() => {
    return Array.from(bookingsByDate.keys()).map((d) => parseISO(d));
  }, [bookingsByDate]);

  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return bookingsByDate.get(dateKey) || [];
  }, [selectedDate, bookingsByDate]);

  const timeSlots = useMemo(() => {
    return generateTimeSlots(workingHoursStart, workingHoursEnd);
  }, [workingHoursStart, workingHoursEnd]);

  const groupedSlots = useMemo(() => {
    return groupSlotsByPeriod(timeSlots);
  }, [timeSlots]);

  const activeBookings = selectedDateBookings.filter((b) => b.status !== "cancelled");

  // Calculate day insights
  const dayInsights = useMemo(() => {
    const freeSlots = timeSlots.filter((slot) => {
      return !isTimeSlotBooked(slot.time, selectedDateBookings);
    });

    const primeTimeFree = freeSlots.filter((s) => s.isPrimeTime).length;
    const totalFree = freeSlots.length;
    const totalSlots = timeSlots.length;

    let quality: "excellent" | "good" | "limited" | "full" = "excellent";
    const ratio = totalFree / totalSlots;
    if (ratio === 0) quality = "full";
    else if (ratio < 0.2) quality = "limited";
    else if (ratio < 0.5) quality = "good";

    const recommendations: Record<typeof quality, string> = {
      excellent: t("marketplace.calendar.recommendations.excellent"),
      good: t("marketplace.calendar.recommendations.good"),
      limited: t("marketplace.calendar.recommendations.limited"),
      full: t("marketplace.calendar.recommendations.full"),
    };

    return {
      totalFree,
      primeTimeFree,
      quality,
      recommendation: recommendations[quality],
    };
  }, [timeSlots, selectedDateBookings, currentLang]);

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  const isDateDisabled = (date: Date) => {
    if (disablePastDates && isBefore(startOfDay(date), today)) {
      return true;
    }
    if (maxDate && isAfter(startOfDay(date), maxDate)) {
      return true;
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  // Render slot group with smart styling
  const renderSlotGroup = (
    period: TimeSlotAnalysis["period"],
    slots: TimeSlotData[],
    icon: string,
  ) => {
    if (slots.length === 0) return null;

    const periodBookings = slots.filter((s) => isTimeSlotBooked(s.time, selectedDateBookings));
    const periodFree = slots.length - periodBookings.length;
    const hasPrimeTime = slots.some((s) => s.isPrimeTime);

    return (
      <div key={period} className="space-y-1">
        <div className="flex items-center justify-between text-xs sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
          <div className="flex items-center gap-2">
            <span>{icon}</span>
            <span className="font-medium text-muted-foreground">
              {getPeriodLabel(period, currentLang)}
            </span>
            {hasPrimeTime && period !== "morning" && period !== "evening" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Flame className="h-2.5 w-2.5 mr-0.5 text-orange-500" />
                {t("marketplace.calendar.popular", "Popular")}
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground">
            {periodFree}/{slots.length} {t("marketplace.calendar.free", "free")}
          </span>
        </div>

        {slots.map((slotData) => {
          const booking = isTimeSlotBooked(slotData.time, selectedDateBookings);
          const isFree = !booking;

          return (
            <div
              key={slotData.time}
              className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                isFree
                  ? slotData.isPrimeTime
                    ? "bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50 border-l-2 border-orange-400"
                    : "bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50"
                  : booking?.status === "cancelled"
                    ? "bg-muted/30"
                    : "bg-muted"
              }`}
              data-testid={`timeslot-${slotData.time}`}
            >
              <span className="text-sm font-mono w-12 text-muted-foreground">{slotData.time}</span>
              {isFree ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {t("marketplace.calendar.free")}
                  </span>
                  {slotData.isPrimeTime && <Flame className="h-3 w-3 text-orange-500" />}
                </div>
              ) : (
                booking && (
                  <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={STATUS_COLORS[booking.status || "pending"]}>
                        {t(`marketplace.bookings.status.${booking.status || "pending"}`)}
                      </Badge>
                      {showSalon && booking.salon && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {getLocalizedText(booking.salon.name as any, currentLang)}
                        </span>
                      )}
                      {showMaster && booking.master && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Scissors className="h-3 w-3" />
                          {booking.master.name}
                        </span>
                      )}
                      {showClient && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {booking.clientName || `#${booking.clientId.slice(-6)}`}
                        </span>
                      )}
                    </div>
                    {booking.service && (
                      <span className="text-xs text-muted-foreground">
                        {getLocalizedText(booking.service.name as any, currentLang)}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("marketplace.calendar.selectDate")}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTodayClick}
            className="flex items-center gap-1.5"
          >
            <CalendarDays className="h-4 w-4" />
            {t("marketplace.calendar.today")}
          </Button>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={isDateDisabled}
          modifiers={{
            booked: datesWithBookings,
            today: [today],
          }}
          modifiersClassNames={{
            booked: "bg-primary/20 font-semibold",
            today: "bg-accent text-accent-foreground font-bold",
          }}
          className="rounded-md border"
          data-testid="booking-calendar"
        />

        <div className="mt-4 space-y-2">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-accent" />
              <span>{t("marketplace.calendar.today")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/20" />
              <span>{t("marketplace.calendar.hasBookings")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>{t("marketplace.calendar.selected")}</span>
            </div>
          </div>

          {/* Info about date restrictions */}
          {(disablePastDates || maxAdvanceBookingDays) && (
            <p className="text-xs text-muted-foreground">
              {disablePastDates && maxAdvanceBookingDays
                ? t("marketplace.calendar.bookingWindow.maxDaysAdvance", {
                    days: maxAdvanceBookingDays,
                  })
                : disablePastDates
                  ? t("marketplace.calendar.bookingWindow.pastDatesDisabled")
                  : t("marketplace.calendar.bookingWindow.maxDaysAdvance", {
                      days: maxAdvanceBookingDays,
                    })}
            </p>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium text-foreground mb-4">
          {selectedDate
            ? format(selectedDate, "d MMMM yyyy")
            : t("marketplace.calendar.noDateSelected")}
        </h3>

        {selectedDate && (
          <>
            {/* Smart Header with Day Insights */}
            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getDayQualityIcon(dayInsights.quality)}</span>
                  <span className="font-medium text-sm">{dayInsights.recommendation}</span>
                </div>
                {selectedDate && isSameDayFns(selectedDate, today) && (
                  <Badge className="bg-accent text-accent-foreground">
                    {t("marketplace.calendar.today")}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                <Badge variant="outline" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {activeBookings.length} {t("marketplace.calendar.bookings")}
                </Badge>
                <Badge
                  variant="outline"
                  className={dayInsights.totalFree > 0 ? "bg-green-100 dark:bg-green-900" : ""}
                >
                  {dayInsights.totalFree} {t("marketplace.calendar.freeSlots")}
                </Badge>
                {dayInsights.primeTimeFree > 0 && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900"
                  >
                    <Flame className="h-3 w-3 text-orange-500" />
                    {dayInsights.primeTimeFree} {t("marketplace.calendar.primeTimeSlots", "prime")}
                  </Badge>
                )}
              </div>
            </div>

            {/* Mini Insights */}
            <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                {t("marketplace.calendar.peakHoursHint", "Peak: 12:00-16:00")}
              </span>
              <span className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                {t("marketplace.calendar.primeTimeHint", "Prime time = most popular")}
              </span>
            </div>

            {/* Grouped Slots by Time Period */}
            <ScrollArea className="h-[360px]">
              <div className="space-y-4 pr-4">
                {renderSlotGroup("morning", groupedSlots.morning, "🌅")}
                {renderSlotGroup("midday", groupedSlots.midday, "☀️")}
                {renderSlotGroup("afternoon", groupedSlots.afternoon, "🌤️")}
                {renderSlotGroup("evening", groupedSlots.evening, "🌙")}
              </div>
            </ScrollArea>
          </>
        )}

        {!selectedDate && (
          <p className="text-center text-muted-foreground py-8">
            {t("marketplace.calendar.selectDatePrompt")}
          </p>
        )}
      </Card>
    </div>
  );
}
