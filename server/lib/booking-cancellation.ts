import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { bookings } from "@shared/schema";
import { createBookingCancelledNotifications } from "../notifications";

export function canClientCancelBooking(
  booking: { status: string | null; bookingDate: Date; startTime: string },
  now = new Date(),
): boolean {
  if (booking.status !== "pending" && booking.status !== "confirmed") return false;
  const date = new Date(booking.bookingDate);
  if (!Number.isFinite(date.getTime()) || !/^\d{2}:\d{2}$/.test(booking.startTime)) return false;
  // Booking dates are calendar dates; startTime is the salon's Asia/Tashkent time.
  const start = new Date(`${date.toISOString().slice(0, 10)}T${booking.startTime}:00+05:00`);
  return Number.isFinite(start.getTime()) && start.getTime() > now.getTime();
}

export async function cancelClientBooking(id: string, clientIds: string[]) {
  return db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), inArray(bookings.clientId, clientIds)))
      .for("update");
    if (!booking) return { ok: false as const, status: 404, error: "Booking not found" };
    if (!canClientCancelBooking(booking)) {
      return {
        ok: false as const,
        status: 409,
        error: "Only upcoming pending or confirmed bookings can be cancelled",
      };
    }
    const [updated] = await tx
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    await createBookingCancelledNotifications(tx, updated);
    return { ok: true as const, booking: updated };
  });
}
