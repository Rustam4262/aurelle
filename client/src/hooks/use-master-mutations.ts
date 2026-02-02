import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function useMasterMutations() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({
      bookingId,
      status,
      cancellationReason,
    }: {
      bookingId: string;
      status: string;
      cancellationReason?: string;
    }) => {
      return apiRequest("PATCH", `/api/master/bookings/${bookingId}/status`, {
        status,
        cancellationReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/master/me"] });
      toast({ title: t("marketplace.master.bookingUpdated") });
    },
    onError: () => {
      toast({ title: t("marketplace.master.error"), variant: "destructive" });
    },
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async (scheduleData: any[]) => {
      return apiRequest("PUT", "/api/master/schedule", scheduleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/schedule"] });
      toast({ title: t("marketplace.master.scheduleSaved") });
    },
    onError: () => {
      toast({ title: t("marketplace.master.error"), variant: "destructive" });
    },
  });

  const addPortfolioMutation = useMutation({
    mutationFn: async (data: {
      imageUrl: string;
      description?: { en: string; ru: string; uz: string };
    }) => {
      return apiRequest("POST", "/api/master/portfolio", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/portfolio"] });
      toast({ title: t("marketplace.master.photoAdded") });
    },
    onError: () => {
      toast({ title: t("marketplace.master.error"), variant: "destructive" });
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/master/portfolio/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/portfolio"] });
      toast({ title: t("marketplace.master.photoDeleted") });
    },
    onError: () => {
      toast({ title: t("marketplace.master.error"), variant: "destructive" });
    },
  });

  return {
    markNotificationReadMutation,
    markAllNotificationsReadMutation,
    updateBookingStatusMutation,
    saveScheduleMutation,
    addPortfolioMutation,
    deletePortfolioMutation,
  };
}
