import { z } from "zod";

export const reviewInput = z.object({
  bookingId: z.string().min(1).max(255),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(5000).optional(),
  salonId: z.string().min(1).nullable().optional(),
  masterId: z.string().min(1).nullable().optional(),
});

export function reviewEligibility(
  booking: {
    clientId: string;
    status: string | null;
    salonId: string | null;
    masterId: string | null;
  },
  userId: string,
  profileId: string,
  input: z.infer<typeof reviewInput>,
): { status: number; error: string } | null {
  // Historical records used profile IDs; new bookings use the authenticated user ID.
  if (booking.clientId !== userId && booking.clientId !== profileId)
    return { status: 403, error: "You can only review your own bookings" };
  if (booking.status !== "completed")
    return { status: 400, error: "You can only review completed bookings" };
  if (
    (input.salonId !== undefined && input.salonId !== booking.salonId) ||
    (input.masterId !== undefined && input.masterId !== booking.masterId)
  )
    return { status: 400, error: "Review target must match the booking" };
  if (!booking.salonId && !booking.masterId)
    return { status: 400, error: "Booking has no reviewable business" };
  return null;
}
