import { useAudience } from "@/components/audience-provider";
import { useQuery } from "@tanstack/react-query";
import type { Salon } from "@shared/schema";

export interface MarketplaceStats {
  salonsCount: number;
  citiesCount: number;
  reviewsCount: number;
  averageRating: number;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string | null;
  clientName: string | null;
  salonName: { en?: string; ru?: string; uz?: string } | null;
  masterName: string | null;
}

export function useMarketplaceData() {
  const { audience } = useAudience();
  const salonsQuery = useQuery<Salon[]>({
    queryKey: ["/api/salons", { audience }],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const statsQuery = useQuery<MarketplaceStats>({
    queryKey: ["/api/salons/stats/public"],
    staleTime: 5 * 60 * 1000,
  });

  const reviewsQuery = useQuery<PublicReview[]>({
    queryKey: ["/api/reviews/public/latest", { limit: 5 }],
    staleTime: 5 * 60 * 1000,
  });

  return {
    salonsQuery,
    statsQuery,
    reviewsQuery,
    isLoading: salonsQuery.isLoading,
    salons: salonsQuery.data || [],
    stats: statsQuery.data,
    reviews: reviewsQuery.data || [],
  };
}
