import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { bookings } from "@shared/schema";
import { canClientCancelBooking } from "./booking-cancellation";

export const rescheduleInput = z.object({
  newBookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }),
  newStartTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  newMasterId: z.string().min(1).max(200).optional(),
  reason: z.string().max(2000).optional(),
});

export class BookingRescheduleConflict extends Error {}
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Recheck the exact snapshot after slot validation, while holding the same lock
// used by cancellations and status transitions. Never overwrite a concurrent edit.
export async function lockRescheduleSnapshot(tx: Transaction, snapshot: typeof bookings.$inferSelect) {
  const [current] = await tx.select().from(bookings).where(eq(bookings.id, snapshot.id)).for("update");
  if (!current || !canClientCancelBooking(current) || JSON.stringify(current) !== JSON.stringify(snapshot)) {
    throw new BookingRescheduleConflict("Booking changed or can no longer be rescheduled");
  }
  return current;
}
