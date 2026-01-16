import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    masterId?: string;
  } | null;
}

export function BookingRescheduleDialog({ open, onOpenChange, booking }: RescheduleDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newDate, setNewDate] = useState<Date>();
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [reason, setReason] = useState("");

  // Reset form when booking changes
  useEffect(() => {
    if (booking) {
      setNewDate(new Date(booking.bookingDate));
      setNewStartTime(booking.startTime);
      setNewEndTime(booking.endTime);
      setReason("");
    }
  }, [booking]);

  const rescheduleMutation = useMutation({
    mutationFn: async (data: {
      bookingId: string;
      newBookingDate: string;
      newStartTime: string;
      newEndTime: string;
      reason: string;
    }) => {
      return apiRequest("PATCH", `/bookings/${data.bookingId}/reschedule`, {
        newBookingDate: data.newBookingDate,
        newStartTime: data.newStartTime,
        newEndTime: data.newEndTime,
        reason: data.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      toast({
        title: t("bookings.reschedule.success", "Booking rescheduled"),
        description: t("bookings.reschedule.successDesc", "The booking has been successfully rescheduled"),
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Reschedule error:", error);
      const errorMessage = error.response?.data?.error || error.message;
      toast({
        title: t("bookings.reschedule.error", "Reschedule failed"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!booking || !newDate || !newStartTime || !newEndTime) {
      toast({
        title: t("common.error", "Error"),
        description: t("bookings.reschedule.missingFields", "Please fill in all fields"),
        variant: "destructive",
      });
      return;
    }

    // Validation: end time must be after start time
    if (newStartTime >= newEndTime) {
      toast({
        title: t("common.error", "Error"),
        description: t("bookings.reschedule.invalidTime", "End time must be after start time"),
        variant: "destructive",
      });
      return;
    }

    rescheduleMutation.mutate({
      bookingId: booking.id,
      newBookingDate: format(newDate, "yyyy-MM-dd"),
      newStartTime,
      newEndTime,
      reason,
    });
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("bookings.reschedule.title", "Reschedule Booking")}</DialogTitle>
          <DialogDescription>
            {t("bookings.reschedule.description", "Change the date and time of this booking")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current booking info */}
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">{t("bookings.reschedule.current", "Current:")}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(booking.bookingDate), "PPP")} • {booking.startTime} - {booking.endTime}
            </p>
          </div>

          {/* New date */}
          <div className="space-y-2">
            <Label>{t("bookings.reschedule.newDate", "New Date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, "PPP") : t("bookings.reschedule.pickDate", "Pick a date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* New start time */}
          <div className="space-y-2">
            <Label htmlFor="newStartTime">{t("bookings.reschedule.newStartTime", "New Start Time")}</Label>
            <Input
              id="newStartTime"
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
            />
          </div>

          {/* New end time */}
          <div className="space-y-2">
            <Label htmlFor="newEndTime">{t("bookings.reschedule.newEndTime", "New End Time")}</Label>
            <Input
              id="newEndTime"
              type="time"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              {t("bookings.reschedule.reason", "Reason")} <span className="text-muted-foreground">({t("common.optional", "Optional")})</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={t("bookings.reschedule.reasonPlaceholder", "Why are you rescheduling this booking?")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={rescheduleMutation.isPending}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rescheduleMutation.isPending}
          >
            {rescheduleMutation.isPending
              ? t("bookings.reschedule.saving", "Rescheduling...")
              : t("bookings.reschedule.save", "Reschedule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
