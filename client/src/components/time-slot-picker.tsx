import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  const { t } = useTranslation();

  // Fetch availability data
  const { data: availability, isLoading, refetch } = useQuery<AvailabilityResponse>({
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

  const getSlotVariant = (slot: TimeSlot, isSelected: boolean) => {
    if (isSelected) return "default";
    if (slot.isAvailable) return "outline";
    return "secondary";
  };

  const getSlotIcon = (slot: TimeSlot) => {
    if (slot.isAvailable) return <CheckCircle2 className="h-3 w-3" />;
    if (slot.conflictReason === "booked") return <XCircle className="h-3 w-3" />;
    if (slot.conflictReason === "pending") return <AlertCircle className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("marketplace.salon.availableSlots")}
          </span>
        </div>
        <Badge variant="secondary">
          {availability.availableSlots} / {availability.totalSlots}
        </Badge>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span>{t("marketplace.salon.available")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="h-3 w-3 text-destructive" />
          <span>{t("marketplace.salon.booked")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 text-orange-600" />
          <span>{t("marketplace.salon.pending")}</span>
        </div>
      </div>

      {/* Time slots grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
        {availability.slots.map((slot) => {
          const isSelected = selectedTime === slot.startTime;

          return (
            <Button
              key={slot.startTime}
              variant={getSlotVariant(slot, isSelected)}
              size="sm"
              disabled={!slot.isAvailable}
              onClick={() => slot.isAvailable && onTimeSelect(slot.startTime)}
              className={`
                flex flex-col items-center justify-center h-auto py-2 px-2
                ${isSelected ? "ring-2 ring-primary" : ""}
                ${!slot.isAvailable ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <div className="flex items-center gap-1 mb-0.5">
                {getSlotIcon(slot)}
                <span className="text-xs font-medium">{slot.startTime}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {slot.endTime}
              </span>
            </Button>
          );
        })}
      </div>

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
