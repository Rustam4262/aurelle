import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type {
  Master,
  Salon,
  Booking,
  Review,
  MasterWorkingHours,
  MasterPortfolio,
  Notification,
  Service,
} from "@shared/schema";

export interface EnrichedBooking extends Booking {
  salon?: Salon;
  service?: Service;
  master?: Master;
  clientName?: string;
  clientAvatar?: string | null;
  client?: {
    firstName: string;
    lastName: string;
  };
}

export interface MasterStats {
  totalEarnings: number;
  earningsByMonth: { month: string; earnings: number }[];
  popularServices: { serviceId: string; count: number; service?: Service }[];
  bookingsByStatus: { status: string; count: number }[];
  clientRetention: {
    totalClients: number;
    repeatClients: number;
    totalBookings: number;
    retentionRate: number;
  };
}

export function useMasterData(activeTab: string) {
  const { user } = useAuth();

  const masterQuery = useQuery<{
    master: Master;
    salon: Salon;
    bookings: Booking[];
    reviews: Review[];
  } | null>({
    queryKey: ["/api/master/me"],
    enabled: !!user,
    staleTime: 60000,
    retry: 1,
  });

  const statsQuery = useQuery<MasterStats>({
    queryKey: ["/api/master/stats"],
    enabled: !!user && activeTab === "analytics",
    staleTime: 120000,
  });

  const scheduleQuery = useQuery<MasterWorkingHours[]>({
    queryKey: ["/api/master/schedule"],
    enabled: !!user && activeTab === "schedule",
    staleTime: 300000,
  });

  const bookingsQuery = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/master/bookings"],
    enabled:
      !!user && (activeTab === "bookings" || activeTab === "calendar" || activeTab === "overview"),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const portfolioQuery = useQuery<MasterPortfolio[]>({
    queryKey: ["/api/master/portfolio"],
    enabled: !!user && activeTab === "portfolio",
    staleTime: 600000,
  });

  const notificationsQuery = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  return {
    masterQuery,
    statsQuery,
    scheduleQuery,
    bookingsQuery,
    portfolioQuery,
    notificationsQuery,
    isLoading:
      masterQuery.isLoading ||
      (activeTab === "analytics" && statsQuery.isLoading) ||
      (activeTab === "schedule" && scheduleQuery.isLoading),
  };
}
