import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { bookings, salons, masters } from "@shared/schema";
import { createBookingStatusChangedNotification } from "../notifications";

type Actor = { kind: "owner" | "solo_master" | "master"; userId: string };
const targets = new Set(["confirmed", "cancelled", "completed", "in_progress", "no_show"]);

export function bookingStatusError(
  booking: { status: string | null; bookingDate: Date; endTime: string; startTime?: string },
  target: string,
  now = new Date(),
): string | undefined {
  if (!targets.has(target)) return "Invalid booking status";
  if (booking.status === target) return undefined;
  const allowed =
    booking.status === "pending"
      ? ["confirmed", "cancelled"]
      : booking.status === "confirmed"
        ? ["completed", "cancelled", "in_progress", "no_show"]
        : booking.status === "in_progress"
          ? ["completed", "cancelled"]
          : [];
  if (!allowed.includes(target)) return "Booking status transition is not allowed";
  if (target === "completed" || target === "in_progress" || target === "no_show") {
    const date = new Date(booking.bookingDate);
    const time = target === "completed" ? booking.endTime : booking.startTime;
    if (!Number.isFinite(date.getTime()) || !time || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return "Invalid booking time";
    }
    const boundary = new Date(`${date.toISOString().slice(0, 10)}T${time}:00+05:00`);
    if (boundary.getTime() > now.getTime())
      return "Booking has not reached the required scheduled time";
  }
  return undefined;
}

export async function changeBookingStatus(
  id: string,
  target: unknown,
  actor: Actor,
  options?: { cancellationReason?: string },
) {
  if (typeof target !== "string" || !targets.has(target)) {
    return { ok: false as const, status: 400, error: "Invalid booking status" };
  }
  const result = await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, id)).for("update");
    if (!booking) return { ok: false as const, status: 404, error: "Booking not found" };
    if (actor.kind === "owner") {
      const [salon] = booking.salonId
        ? await tx
            .select({ id: salons.id })
            .from(salons)
            .where(and(eq(salons.id, booking.salonId), eq(salons.ownerId, actor.userId)))
            .for("share")
        : [];
      if (!salon) return { ok: false as const, status: 403, error: "Not authorized" };
    } else if (actor.kind === "master") {
      // Salon-employed master acting on a booking assigned to them — works
      // for both salon bookings and (defensively) salon-less ones.
      const [master] = booking.masterId
        ? await tx
            .select({ id: masters.id })
            .from(masters)
            .where(and(eq(masters.id, booking.masterId), eq(masters.userId, actor.userId)))
            .for("share")
        : [];
      if (!master) return { ok: false as const, status: 403, error: "Not authorized" };
    } else {
      const [master] =
        !booking.salonId && booking.masterId
          ? await tx
              .select({ id: masters.id })
              .from(masters)
              .where(and(eq(masters.id, booking.masterId), eq(masters.userId, actor.userId)))
              .for("share")
          : [];
      if (!master) return { ok: false as const, status: 403, error: "Not authorized" };
    }
    const error = bookingStatusError(booking, target);
    if (error) return { ok: false as const, status: 409, error };
    if (booking.status === target) return { ok: true as const, changed: false, booking };
    const [updated] = await tx
      .update(bookings)
      .set({
        status: target,
        updatedAt: new Date(),
        ...(options?.cancellationReason ? { cancellationReason: options.cancellationReason } : {}),
      })
      .where(eq(bookings.id, id))
      .returning();
    await createBookingStatusChangedNotification(tx, updated, target);
    return { ok: true as const, changed: true, booking: updated };
  });
  return result;
}
