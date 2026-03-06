// API response shapes used throughout the mobile app

export interface Salon {
  id: string;
  name: { ru: string; en: string; uz: string } | string;
  description?: { ru: string; en: string; uz: string } | string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  phone?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  isVerified: boolean;
  rating?: number;
  reviewCount?: number;
  ownerId: string;
  status: "active" | "paused" | "pending";
}

export interface Master {
  id: string;
  userId?: string;
  salonId?: string;
  firstName: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  specialization?: string;
}

export interface Service {
  id: string;
  salonId: string;
  name: { ru: string; en: string; uz: string } | string;
  description?: string;
  durationMinutes: number;
  priceUzs: number;
  category?: string;
}

export interface Booking {
  id: string;
  clientId: string;
  salonId: string;
  masterId?: string;
  serviceId: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  priceUzs: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  notes?: string;
  createdAt: string;
  salon?: Salon;
  master?: Master;
  service?: Service;
}

export interface AvailabilitySlot {
  time: string;      // "HH:mm"
  available: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
