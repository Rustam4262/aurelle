import { eq } from "drizzle-orm";
import { 
  masters, 
  notifications, 
  newBookingNotificationSchema 
} from "@shared/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@shared/schema";

export async function createNewBookingNotification(
  db: NodePgDatabase<typeof schema>,
  masterId: string,
  bookingDate: string,
  startTime: string,
  relatedId: string
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
    console.error("Notification validation failed:", parsed.error.errors);
    return null;
  }

  const [notification] = await db.insert(notifications).values([parsed.data]).returning();
  return notification;
}
