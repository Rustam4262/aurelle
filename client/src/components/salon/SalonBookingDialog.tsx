import { format } from "date-fns";
import { useState } from "react";
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
import type { Service, Master, WorkingHours } from "@shared/schema";

interface SalonBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string | undefined;
  selectedService: Service | null;
  selectedMaster: Master | null;
  workingHours?: WorkingHours[];
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
  workingHours,
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
  const [slotStatus, setSlotStatus] = useState({ isFetching: false, isError: false });

  // Working hours for the selected date's weekday, used to constrain the
  // plain time input shown when no specific master (with real slot data) is picked.
  const dayHours = bookingDate
    ? workingHours?.find((h) => h.dayOfWeek === new Date(`${bookingDate}T00:00:00`).getDay())
    : undefined;
  const isClosedOnSelectedDay = Boolean(dayHours?.isClosed);
  const isTimeOutsideHours =
    !selectedMaster &&
    !!bookingTime &&
    !!dayHours?.openTime &&
    !!dayHours?.closeTime &&
    (bookingTime < dayHours.openTime || bookingTime > dayHours.closeTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-[460px] flex-col overflow-hidden rounded-[2rem] p-0">
        <DialogHeader>
          <div className="relative overflow-hidden px-5 pb-2 pt-6 sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_100%_0%,hsl(var(--primary)/0.22),transparent_70%)]" />
            <DialogTitle className="relative font-serif text-3xl font-light tracking-[-0.01em]">
              {t("marketplace.salon.bookService")}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-7">
          {selectedService && (
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
              <p className="font-serif text-xl text-foreground">
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
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/30">
                  {formatCurrency(selectedService.priceMin)}
                </span>
              </p>
            </div>
          )}
          {selectedMaster && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-foreground/[0.07] bg-card/60 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px] shadow-emerald-500/70 animate-pulse" />
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

              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>
          {bookingDate && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("marketplace.salon.time")}
              </Label>
              {selectedMaster ? (
                <div className="rounded-2xl border border-foreground/10 bg-card/50 p-2">
                  <TimeSlotPicker
                    masterId={selectedMaster.id}
                    serviceId={selectedService?.id || null}
                    date={bookingDate}
                    selectedTime={bookingTime}
                    onTimeSelect={setBookingTime}
                    onStatusChange={setSlotStatus}
                  />
                </div>
              ) : isClosedOnSelectedDay ? (
                <p className="text-sm text-destructive py-2">
                  {t("marketplace.salon.closedOnThisDay")}
                </p>
              ) : (
                <>
                  <Input
                    type="time"

                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    min={dayHours?.openTime || undefined}
                    max={dayHours?.closeTime || undefined}
                    placeholder="09:00"
                  />
                  {dayHours?.openTime && dayHours?.closeTime && (
                    <p
                      className={`text-xs ${isTimeOutsideHours ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {t("marketplace.salon.workingHoursHint", {
                        open: dayHours.openTime,
                        close: dayHours.closeTime,
                      })}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("marketplace.salon.notes")} ({t("marketplace.salon.optional")})
            </Label>
            <Textarea
              className="resize-none rounded-2xl"
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder={t("marketplace.salon.notesPlaceholder")}
              rows={3}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("marketplace.salon.cancellationPolicy")}
          </p>
        </div>
        <DialogFooter className="glass sticky bottom-0 flex-col gap-3 border-x-0 border-b-0 px-5 py-4 sm:flex-col sm:space-x-0 sm:px-7">
          <div className="w-full [&_button]:w-full [&_button]:whitespace-normal">
            {selectedService && salonId && (
              <WaitlistButton
                salonId={salonId}
                serviceId={selectedService.id}
                masterId={selectedMaster?.id}
              />
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("marketplace.salon.cancel")}
            </Button>
            <Button
              size="lg"
              className="flex-[2]"
              onClick={onSubmit}
              disabled={
                isSubmitting ||
                isClosedOnSelectedDay ||
                isTimeOutsideHours ||
                !bookingTime ||
                slotStatus.isFetching ||
                slotStatus.isError
              }
            >
              {isSubmitting ? t("marketplace.salon.booking") : t("marketplace.salon.confirm")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
