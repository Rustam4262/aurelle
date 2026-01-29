import { useQuery } from "@tanstack/react-query";
import type { Salon, Service, Master, Review, WorkingHours } from "@shared/schema";

export function useSalonData(salonId: string | undefined) {
    const salonQuery = useQuery<Salon>({
        queryKey: ["/api/salons", salonId],
        enabled: !!salonId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const servicesQuery = useQuery<Service[]>({
        queryKey: ["/api/salons", salonId, "services"],
        enabled: !!salonId,
        staleTime: 5 * 60 * 1000,
    });

    const mastersQuery = useQuery<Master[]>({
        queryKey: ["/api/salons", salonId, "masters"],
        enabled: !!salonId,
        staleTime: 5 * 60 * 1000,
    });

    const reviewsQuery = useQuery<Review[]>({
        queryKey: ["/api/salons", salonId, "reviews"],
        enabled: !!salonId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    const hoursQuery = useQuery<WorkingHours[]>({
        queryKey: ["/api/salons", salonId, "hours"],
        enabled: !!salonId,
        staleTime: 30 * 60 * 1000, // 30 minutes
    });

    return {
        salonQuery,
        servicesQuery,
        mastersQuery,
        reviewsQuery,
        hoursQuery,
        isLoading: salonQuery.isLoading || servicesQuery.isLoading || mastersQuery.isLoading,
    };
}
