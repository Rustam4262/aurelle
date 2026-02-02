import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Service, Master } from "@shared/schema";

export function useSalonBooking(salonId: string | undefined) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/client/bookings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      setBookingDialogOpen(false);
      resetForm();
      toast({
        title: t("marketplace.salon.bookingCreated"),
        description: t("marketplace.salon.bookingSuccess"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("marketplace.salon.bookingFailed"),
        description: error.message,
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

  const handleBookService = (service: Service, master?: Master) => {
    setSelectedService(service);
    setSelectedMaster(master || null);
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
