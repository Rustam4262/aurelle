import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Booking, AvailabilitySlot } from "../types/api";

export function useMyBookings() {
  return useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: async () => {
      const { data } = await api.get<Booking[]>("/api/client/bookings");
      return data;
    },
  });
}

export function useBooking(bookingId: string) {
  return useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data } = await api.get<Booking>(`/api/bookings/${bookingId}`);
      return data;
    },
    enabled: !!bookingId,
  });
}

export function useAvailability(masterId: string, date: string) {
  return useQuery({
    queryKey: ["availability", masterId, date],
    queryFn: async () => {
      const { data } = await api.get<AvailabilitySlot[]>(
        `/api/salons/masters/${masterId}/availability`,
        { params: { date } },
      );
      return data;
    },
    enabled: !!masterId && !!date,
    staleTime: 60_000,
  });
}

export interface CreateBookingPayload {
  salonId: string;
  serviceId: string;
  masterId?: string;
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const { data } = await api.post<Booking>("/api/bookings", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", "mine"] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      await api.delete(`/api/client/bookings/${bookingId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", "mine"] });
    },
  });
}
