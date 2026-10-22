import { eq } from "drizzle-orm";
import {
  masters,
  salons,
  notifications,
  newBookingNotificationSchema,
  insertNotificationSchema,
} from "@shared/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@shared/schema";
import { logger } from "./lib/logger";
import { resolveClientUserId } from "./lib/resolve-client-user";

function toDateStr(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export async function createNewBookingNotification(
  db: NodePgDatabase<typeof schema>,
  masterId: string,
  bookingDate: string,
  startTime: string,
  relatedId: string,
): Promise<typeof notifications.$inferSelect | null> {
  const [master] = await db.select().from(masters).where(eq(masters.id, masterId));
  if (!master || !master.userId) {
    return null;
  }

  const notificationPayload = {
    userId: master.userId,
    type: "new_booking" as const,
    metadata: {
      bookingDate,
      startTime,
    },
    isRead: false,
    relatedId,
  };

  const parsed = newBookingNotificationSchema.safeParse(notificationPayload);
  if (!parsed.success) {
    logger.error("Notification validation failed", new Error(JSON.stringify(parsed.error.errors)), {
      source: "notifications",
    });
    return null;
  }

  const [notification] = await db.insert(notifications).values([parsed.data]).returning();
  return notification;
}

/** Notify the salon-employed master (if any) and the salon owner (if any) that a client cancelled. */
export async function createBookingCancelledNotifications(
  db: NodePgDatabase<typeof schema>,
  booking: {
    id: string;
    salonId: string | null;
    masterId: string | null;
    bookingDate: Date | string;
    startTime: string;
  },
): Promise<void> {
  const metadata = { bookingDate: toDateStr(booking.bookingDate), startTime: booking.startTime };
  const recipientUserIds = new Set<string>();

  if (booking.masterId) {
    const [master] = await db
      .select({ userId: masters.userId })
      .from(masters)
      .where(eq(masters.id, booking.masterId));
    if (master?.userId) recipientUserIds.add(master.userId);
  }
  if (booking.salonId) {
    const [salon] = await db
      .select({ ownerId: salons.ownerId })
      .from(salons)
      .where(eq(salons.id, booking.salonId));
    if (salon?.ownerId) recipientUserIds.add(salon.ownerId);
  }

  for (const userId of Array.from(recipientUserIds)) {
    const parsed = insertNotificationSchema.safeParse({
      userId,
      type: "booking_cancelled",
      metadata,
      isRead: false,
      relatedId: booking.id,
    });
    if (!parsed.success) continue;
    await db
      .insert(notifications)
      .values(parsed.data)
      .catch((err) =>
        logger.error("Failed to create booking_cancelled notification", err as Error, {
          source: "notifications",
          meta: { userId, bookingId: booking.id },
        }),
      );
  }
}

/** Notify the client that the salon/master changed their booking's status. */
export async function createBookingStatusChangedNotification(
  db: NodePgDatabase<typeof schema>,
  booking: { id: string; clientId: string; bookingDate: Date | string; startTime: string },
  newStatus: string,
): Promise<void> {
  const userId = await resolveClientUserId(booking.clientId);
  if (!userId) return;

  const parsed = insertNotificationSchema.safeParse({
    userId,
    type: "booking_status_changed",
    metadata: {
      bookingDate: toDateStr(booking.bookingDate),
      startTime: booking.startTime,
      status: newStatus,
    },
    isRead: false,
    relatedId: booking.id,
  });
  if (!parsed.success) return;
  await db
    .insert(notifications)
    .values(parsed.data)
    .catch((err) =>
      logger.error("Failed to create booking_status_changed notification", err as Error, {
        source: "notifications",
        meta: { userId, bookingId: booking.id },
      }),
    );
}
