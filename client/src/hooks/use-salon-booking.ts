import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { clearPendingBooking } from "@/lib/booking-context";
import type { Service, Master } from "@shared/schema";

const BOOKING_ERROR_CODES = [
  "BOOKING_TIME_UNAVAILABLE",
  "BOOKING_OUTSIDE_WORKING_HOURS",
  "BOOKING_DATE_IN_PAST",
  "BOOKING_SCHEDULE_UNAVAILABLE",
  "BOOKING_SERVICE_UNAVAILABLE",
] as const;
type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

function isBookingErrorCode(code: string | undefined): code is BookingErrorCode {
  return !!code && (BOOKING_ERROR_CODES as readonly string[]).includes(code);
}

interface BookServiceRestore {
  bookingDate?: string;
  bookingTime?: string;
}

export function useSalonBooking(salonId: string | undefined) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");

  // Tracks the (date, service, master) combination the current bookingTime was
  // chosen for. When any of the three actually changes, the previously picked
  // time may no longer be valid for the new combination, so it must be cleared
  // rather than silently carried over into a submission for the wrong slot.
  const bookingKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${bookingDate}|${selectedService?.id ?? ""}|${selectedMaster?.id ?? ""}`;
    if (bookingKeyRef.current !== null && bookingKeyRef.current !== key) {
      setBookingTime("");
    }
    bookingKeyRef.current = key;
  }, [bookingDate, selectedService?.id, selectedMaster?.id]);

  const createBookingMutation = useMutation({
    mutationFn: async (data: {
      salonId: string | undefined;
      serviceId: string;
      masterId: string | null;
      bookingDate: string;
      startTime: string;
      notes: string;
    }) => {
      return apiRequest("POST", "/api/client/bookings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      clearPendingBooking();
      setBookingDialogOpen(false);
      resetForm();
      toast({
        title: t("marketplace.salon.bookingCreated"),
        description: t("marketplace.salon.bookingSuccess"),
      });
    },
    onError: (error: Error & { code?: string }) => {
      const description = isBookingErrorCode(error.code)
        ? t(`marketplace.salon.errors.${error.code}`)
        : error.message;

      if (error.code === "BOOKING_TIME_UNAVAILABLE") {
        // The slot was taken while the form was open — clear the stale pick
        // and force the picker to re-fetch instead of letting the user
        // resubmit the same, now-unavailable time.
        setBookingTime("");
        queryClient.invalidateQueries({ queryKey: ["/api/salons/masters"] });
      }

      toast({
        title: t("marketplace.salon.bookingFailed"),
        description,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedService(null);
    setSelectedMaster(null);
    setBookingDate("");
    setBookingTime("");
    setBookingNotes("");
  };

  // `restore` is only ever passed when re-opening the dialog from a preserved
  // pre-login context (see booking-context.ts) — a plain "book" click or a
  // "book again" prefill must NOT inherit a stale date/time from whatever was
  // left over in state from a previous, unrelated booking attempt.
  const handleBookService = (service: Service, master?: Master, restore?: BookServiceRestore) => {
    setSelectedService(service);
    setSelectedMaster(master || null);
    setBookingDate(restore?.bookingDate || "");
    setBookingTime(restore?.bookingTime || "");
    setBookingNotes("");
    setBookingDialogOpen(true);
  };

  const handleSubmitBooking = () => {
    if (!selectedService || !bookingDate || !bookingTime) {
      toast({
        title: t("marketplace.salon.missingFields"),
        description: t("marketplace.salon.pleaseFillAll"),
        variant: "destructive",
      });
      return;
    }

    createBookingMutation.mutate({
      salonId,
      serviceId: selectedService.id,
      masterId: selectedMaster?.id || null,
      bookingDate,
      startTime: bookingTime,
      notes: bookingNotes,
    });
  };

  return {
    bookingDialogOpen,
    setBookingDialogOpen,
    selectedService,
    setSelectedService,
    selectedMaster,
    setSelectedMaster,
    bookingDate,
    setBookingDate,
    bookingTime,
    setBookingTime,
    bookingNotes,
    setBookingNotes,
    createBookingMutation,
    handleBookService,
    handleSubmitBooking,
    resetForm,
  };
}
