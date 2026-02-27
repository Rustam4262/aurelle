/**
 * Fire-and-forget booking email helpers.
 * Handles all DB lookups needed to send confirmation/cancellation emails.
 */

import { db } from "../db";
import { bookings, userProfiles, masters, soloMasterServices } from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { sendBookingConfirmation, sendBookingCancellation } from "../email";
import { logger } from "./logger";

async function lookupClientEmail(
  clientProfileId: string,
): Promise<{ email: string; fullName: string } | null> {
  const [profile] = await db
    .select({ userId: userProfiles.userId, fullName: userProfiles.fullName })
    .from(userProfiles)
    .where(eq(userProfiles.userId, clientProfileId))
    .limit(1);

  if (!profile) return null;

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, profile.userId))
    .limit(1);

  if (!user?.email) return null;
  return { email: user.email, fullName: profile.fullName || "Клиент" };
}

async function resolveBookingMeta(
  booking: { masterId: string | null; soloMasterServiceId: string | null },
): Promise<{ salonName: string; serviceName: string; masterName: string | null }> {
  let salonName = "AURELLE";
  let serviceName = "Услуга";
  let masterName: string | null = null;

  if (booking.masterId) {
    const [master] = await db
      .select({ name: masters.name })
      .from(masters)
      .where(eq(masters.id, booking.masterId))
      .limit(1);
    if (master) {
      masterName = master.name;
      salonName = master.name; // solo master: their name is the "salon"
    }
  }

  if (booking.soloMasterServiceId) {
    const [svc] = await db
      .select({ name: soloMasterServices.name })
      .from(soloMasterServices)
      .where(eq(soloMasterServices.id, booking.soloMasterServiceId))
      .limit(1);
    if (svc?.name) {
      const n = svc.name as { ru?: string; en?: string; uz?: string };
      serviceName = n.ru || n.en || n.uz || serviceName;
    }
  }

  return { salonName, serviceName, masterName };
}

/** Fire-and-forget: send booking confirmation email to client */
export function fireConfirmationEmail(bookingId: string): void {
  void (async () => {
    try {
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!booking) return;

      const client = await lookupClientEmail(booking.clientId);
      if (!client) return;

      const { salonName, serviceName, masterName } = await resolveBookingMeta(booking);

      const bookingDate =
        booking.bookingDate instanceof Date ? booking.bookingDate : new Date(booking.bookingDate);
      const dateStr = bookingDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      await sendBookingConfirmation(
        client.email,
        {
          clientName: client.fullName,
          salonName,
          serviceName,
          masterName,
          date: dateStr,
          time: booking.startTime,
          price: booking.priceSnapshot,
          bookingId: booking.id,
        },
        "ru",
      );
    } catch (err) {
      logger.error("fireConfirmationEmail failed", {
        source: "booking-emails",
        meta: { bookingId, error: String(err) },
      });
    }
  })();
}

/** Fire-and-forget: send booking cancellation email to client */
export function fireCancellationEmail(bookingId: string): void {
  void (async () => {
    try {
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!booking) return;

      const client = await lookupClientEmail(booking.clientId);
      if (!client) return;

      const { salonName, serviceName } = await resolveBookingMeta(booking);

      const bookingDate =
        booking.bookingDate instanceof Date ? booking.bookingDate : new Date(booking.bookingDate);
      const dateStr = bookingDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      await sendBookingCancellation(
        client.email,
        {
          clientName: client.fullName,
          salonName,
          serviceName,
          date: dateStr,
          time: booking.startTime,
        },
        "ru",
      );
    } catch (err) {
      logger.error("fireCancellationEmail failed", {
        source: "booking-emails",
        meta: { bookingId, error: String(err) },
      });
    }
  })();
}
