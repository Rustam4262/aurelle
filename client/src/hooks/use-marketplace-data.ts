import { useQuery } from "@tanstack/react-query";
import type { Salon } from "@shared/schema";

export function useMarketplaceData() {
  const salonsQuery = useQuery<Salon[]>({
    queryKey: ["/api/salons"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    salonsQuery,
    isLoading: salonsQuery.isLoading,
    salons: salonsQuery.data || [],
  };
}
