/**
 * Cron job: Send booking reminder notifications
 * Runs every 5 minutes. Picks up pending notifications whose scheduled_at <= NOW().
 */

import { db } from "../db";
import {
  scheduledNotifications,
  bookings,
  masters,
  soloMasterServices,
  userProfiles,
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq, and, lte, or, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendBookingReminder } from "../email";
import { sendBookingReminderSms } from "../sms";
import { sendBookingReminderNotification } from "../routes/push.routes";

const BATCH_SIZE = 50;
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

/** Exponential-ish backoff: 5min, 20min, 60min. */
function backoffMs(attempts: number): number {
  const steps = [5, 20, 60];
  return (steps[Math.min(attempts, steps.length) - 1] ?? 60) * 60 * 1000;
}

/**
 * bookings.clientId has historically been written as either the auth users.id
 * or the user_profiles.id, depending on which creation path wrote it — the
 * same inconsistency already handled defensively everywhere else in the app.
 * Resolves whichever form is stored back to the real users.id.
 */
async function resolveClientUserId(clientId: string): Promise<string | null> {
  const [asUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, clientId))
    .limit(1);
  if (asUser) return asUser.id;

  const [asProfile] = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.id, clientId))
    .limit(1);
  return asProfile?.userId ?? null;
}

async function processReminders(): Promise<void> {
  // Guard: ensure table exists (migration may not have run yet)
  const tableCheck = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'scheduled_notifications'
    );
  `);
  if (!tableCheck.rows[0]?.exists) return;

  const now = new Date();

  const pending = await db
    .select()
    .from(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.status, "pending"),
        lte(scheduledNotifications.scheduledAt, now),
        or(
          isNull(scheduledNotifications.nextAttemptAt),
          lte(scheduledNotifications.nextAttemptAt, now),
        ),
      ),
    )
    .limit(BATCH_SIZE);

  if (pending.length === 0) return;

  logger.info(`[Reminders] Processing ${pending.length} pending notifications`, {
    source: "booking-reminders",
  });

  for (const notif of pending) {
    // Atomically claim the row so a second worker instance polling the same
    // table at the same moment can't send it twice.
    const [claimed] = await db
      .update(scheduledNotifications)
      .set({ status: "processing" })
      .where(
        and(eq(scheduledNotifications.id, notif.id), eq(scheduledNotifications.status, "pending")),
      )
      .returning();
    if (!claimed) continue;

    try {
      // A reschedule since this row was queued bumps bookings.notificationVersion
      // and inserts fresh rows under the new version — cancelBookingReminders
      // marks this row cancelled, but double-check the version too, since a
      // background failure/retry could otherwise fire a stale reminder for a
      // time the booking no longer has.
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, claimed.bookingId));
      if (
        !booking ||
        booking.status === "cancelled" ||
        booking.notificationVersion !== claimed.version
      ) {
        await db
          .update(scheduledNotifications)
          .set({ status: "cancelled" })
          .where(eq(scheduledNotifications.id, claimed.id));
        continue;
      }

      if (claimed.channel === "email") {
        await sendReminderEmail(booking, claimed.type);
      } else if (claimed.channel === "sms") {
        await sendReminderSms(booking, claimed.type);
      } else if (claimed.channel === "push") {
        await sendReminderPush(booking, claimed.type);
      }
      await db
        .update(scheduledNotifications)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(scheduledNotifications.id, claimed.id));
    } catch (err) {
      const errMsg = String(err);
      logger.error(`[Reminders] Failed to send notification ${claimed.id}`, {
        source: "booking-reminders",
        meta: { error: errMsg },
      });

      const attempts = claimed.attempts + 1;
      if (attempts < MAX_ATTEMPTS) {
        await db
          .update(scheduledNotifications)
          .set({
            status: "pending",
            attempts,
            nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
            error: errMsg,
          })
          .where(eq(scheduledNotifications.id, claimed.id));
      } else {
        await db
          .update(scheduledNotifications)
          .set({ status: "failed", attempts, error: errMsg })
          .where(eq(scheduledNotifications.id, claimed.id));
      }
    }
  }
}

type Booking = typeof bookings.$inferSelect;

async function getServiceName(booking: Booking): Promise<string> {
  if (!booking.soloMasterServiceId) return "Appointment";
  const [svc] = await db
    .select({ name: soloMasterServices.name })
    .from(soloMasterServices)
    .where(eq(soloMasterServices.id, booking.soloMasterServiceId))
    .limit(1);
  if (!svc?.name) return "Appointment";
  const n = svc.name as { ru?: string; en?: string; uz?: string };
  return n.ru || n.en || n.uz || "Appointment";
}

async function getMasterName(booking: Booking): Promise<string | null> {
  if (!booking.masterId) return null;
  const [master] = await db
    .select({ name: masters.name })
    .from(masters)
    .where(eq(masters.id, booking.masterId))
    .limit(1);
  return master?.name ?? null;
}

async function sendReminderEmail(booking: Booking, type: string): Promise<void> {
  const resolvedUserId = await resolveClientUserId(booking.clientId);
  if (!resolvedUserId) return;

  const [client] = await db
    .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, resolvedUserId))
    .limit(1);

  if (!client?.email) return;

  const clientName = [client.firstName, client.lastName].filter(Boolean).join(" ") || "Client";
  const serviceName = await getServiceName(booking);
  const masterName = await getMasterName(booking);

  const hoursUntil = type === "REMINDER_24H" ? 24 : 2;
  const bookingDate =
    booking.bookingDate instanceof Date ? booking.bookingDate : new Date(booking.bookingDate);

  const dateStr = bookingDate.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await sendBookingReminder(
    client.email,
    {
      clientName,
      salonName: masterName || "AURELLE",
      serviceName,
      masterName,
      date: dateStr,
      time: booking.startTime,
      hoursUntil,
    },
    "ru",
  );
}

async function sendReminderSms(booking: Booking, type: string): Promise<void> {
  const resolvedUserId = await resolveClientUserId(booking.clientId);
  if (!resolvedUserId) return;

  const [clientProfile] = await db
    .select({ phone: userProfiles.phone, fullName: userProfiles.fullName })
    .from(userProfiles)
    .where(eq(userProfiles.userId, resolvedUserId))
    .limit(1);

  if (!clientProfile?.phone) return;

  const serviceName = await getServiceName(booking);
  const hoursUntil = type === "REMINDER_24H" ? 24 : 2;
  const bookingDate =
    booking.bookingDate instanceof Date ? booking.bookingDate : new Date(booking.bookingDate);
  const dateStr = bookingDate.toLocaleDateString("ru-RU");

  await sendBookingReminderSms(
    clientProfile.phone,
    clientProfile.fullName || "Клиент",
    serviceName,
    dateStr,
    booking.startTime,
    hoursUntil,
    "ru",
  );
}

async function sendReminderPush(booking: Booking, _type: string): Promise<void> {
  const resolvedUserId = await resolveClientUserId(booking.clientId);
  if (!resolvedUserId) return;

  const serviceName = await getServiceName(booking);
  const masterName = await getMasterName(booking);

  const bookingDate =
    booking.bookingDate instanceof Date ? booking.bookingDate : new Date(booking.bookingDate);
  const dateStr = bookingDate.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await sendBookingReminderNotification(resolvedUserId, {
    salonName: masterName || "AURELLE",
    serviceName,
    date: dateStr,
    time: booking.startTime,
  });
}

export function startBookingRemindersJob(): void {
  logger.info("[Reminders] Starting booking reminders job (runs every 5 minutes)", {
    source: "booking-reminders",
  });

  // Run once shortly after startup (30s delay to let DB settle)
  setTimeout(() => {
    processReminders().catch((err) => {
      logger.error("[Reminders] Initial run failed", {
        source: "booking-reminders",
        meta: { error: String(err) },
      });
    });
  }, 30_000);

  setInterval(() => {
    processReminders().catch((err) => {
      logger.error("[Reminders] Scheduled run failed", {
        source: "booking-reminders",
        meta: { error: String(err) },
      });
    });
  }, INTERVAL_MS);
}
