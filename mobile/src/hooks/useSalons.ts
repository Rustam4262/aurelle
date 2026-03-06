import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Salon, Service, Master, PaginatedResponse } from "../types/api";

export interface SalonFilters {
  city?: string;
  category?: string;
  query?: string;
  page?: number;
  limit?: number;
}

export function useSalons(filters: SalonFilters = {}) {
  return useQuery({
    queryKey: ["salons", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Salon>>("/api/salons", {
        params: { ...filters, limit: filters.limit ?? 20 },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalon(salonId: string) {
  return useQuery({
    queryKey: ["salon", salonId],
    queryFn: async () => {
      const { data } = await api.get<Salon>(`/api/salons/${salonId}`);
      return data;
    },
    enabled: !!salonId,
  });
}

export function useSalonServices(salonId: string) {
  return useQuery({
    queryKey: ["salon-services", salonId],
    queryFn: async () => {
      const { data } = await api.get<Service[]>(`/api/salons/${salonId}/services`);
      return data;
    },
    enabled: !!salonId,
  });
}

export function useSalonMasters(salonId: string) {
  return useQuery({
    queryKey: ["salon-masters", salonId],
    queryFn: async () => {
      const { data } = await api.get<Master[]>(`/api/salons/${salonId}/masters`);
      return data;
    },
    enabled: !!salonId,
  });
}

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data } = await api.get<string[]>("/api/salons/list/all-cities");
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}
