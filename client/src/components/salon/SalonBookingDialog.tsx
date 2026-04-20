import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeSlotPicker } from "@/components/time-slot-picker";
import { WaitlistButton } from "@/components/waitlist-button";
import { getLocalizedText, formatCurrency } from "@/lib/i18n";
import type { Service, Master } from "@shared/schema";

interface SalonBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string | undefined;
  selectedService: Service | null;
  selectedMaster: Master | null;
  bookingDate: string;
  setBookingDate: (date: string) => void;
  bookingTime: string;
  setBookingTime: (time: string) => void;
  bookingNotes: string;
  setBookingNotes: (notes: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function SalonBookingDialog({
  open,
  onOpenChange,
  salonId,
  selectedService,
  selectedMaster,
  bookingDate,
  setBookingDate,
  bookingTime,
  setBookingTime,
  bookingNotes,
  setBookingNotes,
  onSubmit,
  isSubmitting,
}: SalonBookingDialogProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-[425px] flex-col overflow-hidden p-0">
        <DialogHeader>
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogTitle className="font-serif text-2xl">
              {t("marketplace.salon.bookService")}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {selectedService && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="font-medium text-foreground">
                {getLocalizedText(
                  selectedService.name as { en?: string; ru?: string; uz?: string },
                  currentLang,
                )}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <span>
                  {selectedService.duration} {t("marketplace.salon.minutes")}
                </span>
                <span>•</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(selectedService.priceMin)}
                </span>
              </p>
            </div>
          )}
          {selectedMaster && (
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-medium">
                {t("marketplace.salon.withMaster")}: {selectedMaster.name}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("marketplace.salon.date")}
            </Label>
            <Input
              type="date"
              className="rounded-lg"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          {bookingDate && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("marketplace.salon.time")}
              </Label>
              {selectedMaster ? (
                <div className="rounded-lg border border-input p-1">
                  <TimeSlotPicker
                    masterId={selectedMaster.id}
                    serviceId={selectedService?.id || null}
                    date={bookingDate}
                    selectedTime={bookingTime}
                    onTimeSelect={setBookingTime}
                  />
                </div>
              ) : (
                <Input
                  type="time"
                  className="rounded-lg"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  placeholder="09:00"
                />
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("marketplace.salon.notes")} ({t("marketplace.salon.optional")})
            </Label>
            <Textarea
              className="rounded-lg resize-none"
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder={t("marketplace.salon.notesPlaceholder")}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 flex-col gap-3 border-t bg-background px-4 py-4 sm:flex-row sm:px-6">
          <div className="flex-1 w-full">
            {selectedService && salonId && (
              <WaitlistButton
                salonId={salonId}
                serviceId={selectedService.id}
                masterId={selectedMaster?.id}
              />
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              className="flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)}
            >
              {t("marketplace.salon.cancel")}
            </Button>
            <Button
              className="flex-1 sm:flex-none min-w-[100px]"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("marketplace.salon.booking") : t("marketplace.salon.confirm")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
