import type { Booking, Salon, Service, Master, Review } from "@shared/schema";

export interface EnrichedBooking extends Booking {
  salon?: Salon;
  service?: Service;
  master?: Master;
}

export interface EnrichedFavorite {
  id: string;
  userId: string;
  salonId: string;
  createdAt: Date | null;
  salon?: Salon;
}

export interface EnrichedReview extends Review {
  salon?: Salon | null;
  master?: Master | null;
}
