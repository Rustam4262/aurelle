import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle2, XCircle, AlertCircle, Star, Flame, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  analyzeTimeSlot,
  groupSlotsByPeriod,
  findRecommendedSlots,
  calculateDayInsights,
  getPeriodLabel,
  getDayQualityIcon,
  getDayQualityVariant,
  type TimeSlotAnalysis,
} from "@/lib/slot-insights";

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  conflictReason: string | null;
}

interface AvailabilityResponse {
  masterId: string;
  date: Date;
  serviceDuration: number;
  bufferMinutes: number;
  slots: TimeSlot[];
  totalSlots: number;
  availableSlots: number;
}

interface TimeSlotPickerProps {
  masterId: string | null;
  serviceId: string | null;
  date: string;
  selectedTime: string;
  onTimeSelect: (time: string) => void;
}

export function TimeSlotPicker({
  masterId,
  serviceId,
  date,
  selectedTime,
  onTimeSelect,
}: TimeSlotPickerProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  // Fetch availability data
  const {
    data: availability,
    isLoading,
    refetch,
  } = useQuery<AvailabilityResponse>({
    queryKey: ["/api/salons/masters", masterId, "availability", { date, serviceId }],
    queryFn: async (): Promise<AvailabilityResponse> => {
      if (!masterId || !date) {
        throw new Error("Master ID and date are required");
      }
      const params = new URLSearchParams({ date });
      if (serviceId) {
        params.append("serviceId", serviceId);
      }
      const res = await apiRequest("GET", `/api/salons/masters/${masterId}/availability?${params}`);
      return res.json() as Promise<AvailabilityResponse>;
    },
    enabled: !!masterId && !!date,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Refetch when masterId, serviceId, or date changes
  useEffect(() => {
    if (masterId && date) {
      refetch();
    }
  }, [masterId, serviceId, date, refetch]);

  // Calculate insights and recommendations
  const { insights, recommendedTimes, groupedSlots } = useMemo(() => {
    if (!availability?.slots) {
      return { insights: null, recommendedTimes: [] as string[], groupedSlots: null };
    }

    const insights = calculateDayInsights(availability.slots, currentLang);
    const recommendedTimes = findRecommendedSlots(availability.slots, 2).map((s) => s.startTime);
    const groupedSlots = groupSlotsByPeriod(availability.slots);

    return { insights, recommendedTimes, groupedSlots };
  }, [availability?.slots, currentLang]);

  if (!masterId) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{t("marketplace.salon.selectMasterFirst")}</p>
      </div>
    );
  }

  if (!date) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{t("marketplace.salon.selectDateFirst")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (!availability || availability.slots.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <XCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
        <p>{t("marketplace.salon.noSlotsAvailable")}</p>
      </div>
    );
  }

  const getSlotVariant = (slot: TimeSlot, isSelected: boolean, isRecommended: boolean) => {
    if (isSelected) return "default";
    if (isRecommended && slot.isAvailable) return "outline";
    if (slot.isAvailable) return "outline";
    return "secondary";
  };

  const getSlotIcon = (slot: TimeSlot, isRecommended: boolean) => {
    if (isRecommended && slot.isAvailable) return <Star className="h-3 w-3 text-amber-500" />;
    if (slot.isAvailable) return <CheckCircle2 className="h-3 w-3" />;
    if (slot.conflictReason === "booked") return <XCircle className="h-3 w-3" />;
    if (slot.conflictReason === "pending") return <AlertCircle className="h-3 w-3" />;
    return null;
  };

  const getSlotClasses = (slot: TimeSlot, isSelected: boolean, isRecommended: boolean) => {
    const analysis = analyzeTimeSlot(slot.startTime);
    let classes = "flex flex-col items-center justify-center h-auto py-2 px-2 transition-all";

    if (isSelected) {
      classes += " ring-2 ring-primary";
    }

    if (!slot.isAvailable) {
      classes += " opacity-50 cursor-not-allowed";
    }

    if (isRecommended && slot.isAvailable) {
      classes +=
        " border-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50";
    } else if (slot.isAvailable && analysis.isPrimeTime) {
      classes +=
        " border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40";
    }

    return classes;
  };

  // Render slot group
  const renderSlotGroup = (period: TimeSlotAnalysis["period"], slots: TimeSlot[], icon: string) => {
    if (slots.length === 0) return null;

    const availableCount = slots.filter((s) => s.isAvailable).length;
    const hasPrimeTime = slots.some((s) => analyzeTimeSlot(s.startTime).isPrimeTime);

    return (
      <div key={period} className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span>{icon}</span>
            <span className="font-medium text-muted-foreground">
              {getPeriodLabel(period, currentLang)}
            </span>
            {hasPrimeTime && period !== "morning" && period !== "evening" && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                <Flame className="h-3 w-3 mr-0.5 text-orange-500" />
                {t("marketplace.calendar.popular", "Popular")}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {availableCount}/{slots.length}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedTime === slot.startTime;
            const isRecommended = recommendedTimes.includes(slot.startTime);

            return (
              <Button
                key={slot.startTime}
                variant={getSlotVariant(slot, isSelected, isRecommended)}
                size="sm"
                disabled={!slot.isAvailable}
                onClick={() => slot.isAvailable && onTimeSelect(slot.startTime)}
                className={getSlotClasses(slot, isSelected, isRecommended)}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  {getSlotIcon(slot, isRecommended)}
                  <span className="text-xs font-medium">{slot.startTime}</span>
                </div>
                {isRecommended && slot.isAvailable && (
                  <span className="text-[9px] text-amber-600 dark:text-amber-400">
                    {t("marketplace.calendar.recommended", "Recommended")}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Smart Header with Insights */}
      {insights && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getDayQualityIcon(insights.dayQuality)}</span>
              <span className="font-medium text-sm">{insights.recommendation}</span>
            </div>
            <Badge variant={getDayQualityVariant(insights.dayQuality)}>
              {insights.availableSlots} {t("marketplace.calendar.freeSlots", "free")}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              {insights.peakHours}
            </span>
            {insights.primeTimeAvailable > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                {insights.primeTimeAvailable}{" "}
                {t("marketplace.calendar.primeTimeSlots", "prime slots")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recommended Slots Section */}
      {recommendedTimes.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">
              {t("marketplace.calendar.recommendedTimes", "Recommended Times")}
            </span>
          </div>
          <div className="flex gap-2">
            {recommendedTimes.map((time) => {
              const slot = availability.slots.find((s) => s.startTime === time);
              if (!slot) return null;

              return (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  onClick={() => onTimeSelect(time)}
                  className="border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900"
                >
                  <Star className="h-3 w-3 mr-1 text-amber-500" />
                  {time}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs pb-2 border-b">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span>{t("marketplace.salon.available")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="h-3 w-3 text-amber-500" />
          <span>{t("marketplace.calendar.recommended", "Recommended")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="h-3 w-3 text-orange-500" />
          <span>{t("marketplace.calendar.primeTime", "Prime time")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="h-3 w-3 text-destructive" />
          <span>{t("marketplace.salon.booked")}</span>
        </div>
      </div>

      {/* Grouped Time Slots */}
      {groupedSlots && (
        <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
          {renderSlotGroup("morning", groupedSlots.morning, "🌅")}
          {renderSlotGroup("midday", groupedSlots.midday, "☀️")}
          {renderSlotGroup("afternoon", groupedSlots.afternoon, "🌤️")}
          {renderSlotGroup("evening", groupedSlots.evening, "🌙")}
        </div>
      )}

      {/* Info message */}
      {availability.availableSlots === 0 && (
        <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground text-center">
          <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
          {t("marketplace.salon.fullyBooked")}
        </div>
      )}

      {availability.bufferMinutes > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t("marketplace.salon.bufferInfo", { minutes: availability.bufferMinutes })}
        </p>
      )}
    </div>
  );
}
