/**
 * Cron job: Send booking reminder notifications
 * Runs every 5 minutes. Picks up pending notifications whose scheduled_at <= NOW().
 */

import { db } from "../db";
import { scheduledNotifications, bookings, masters, soloMasterServices, userProfiles } from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq, and, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendBookingReminder } from "../email";
import { sendBookingReminderSms } from "../sms";
import { sendBookingReminderNotification } from "../routes/push.routes";

const BATCH_SIZE = 50;
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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
      ),
    )
    .limit(BATCH_SIZE);

  if (pending.length === 0) return;

  logger.info(`[Reminders] Processing ${pending.length} pending notifications`, {
    source: "booking-reminders",
  });

  for (const notif of pending) {
    try {
      if (notif.channel === "email") {
        await sendReminderEmail(notif.bookingId, notif.type);
      } else if (notif.channel === "sms") {
        await sendReminderSms(notif.bookingId, notif.type);
      } else if (notif.channel === "push") {
        await sendReminderPush(notif.bookingId, notif.type);
      }
      await db
        .update(scheduledNotifications)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(scheduledNotifications.id, notif.id));
    } catch (err) {
      const errMsg = String(err);
      logger.error(`[Reminders] Failed to send notification ${notif.id}`, {
        source: "booking-reminders",
        meta: { error: errMsg },
      });
      await db
        .update(scheduledNotifications)
        .set({ status: "failed", error: errMsg })
        .where(eq(scheduledNotifications.id, notif.id));
    }
  }
}

async function sendReminderEmail(bookingId: string, type: string): Promise<void> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking || booking.status === "cancelled") return;

  const [client] = await db
    .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, booking.clientId))
    .limit(1);

  if (!client?.email) return;

  const clientName = [client.firstName, client.lastName].filter(Boolean).join(" ") || "Client";

  // Determine service name for solo master bookings
  let serviceName = "Appointment";
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

  // Determine master name for solo master bookings
  let masterName: string | null = null;
  if (booking.masterId) {
    const [master] = await db
      .select({ name: masters.name })
      .from(masters)
      .where(eq(masters.id, booking.masterId))
      .limit(1);
    masterName = master?.name ?? null;
  }

  const hoursUntil = type === "REMINDER_24H" ? 24 : 2;
  const bookingDate = booking.bookingDate instanceof Date
    ? booking.bookingDate
    : new Date(booking.bookingDate);

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

async function sendReminderSms(bookingId: string, type: string): Promise<void> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking || booking.status === "cancelled") return;

  const [clientProfile] = await db
    .select({ phone: userProfiles.phone, fullName: userProfiles.fullName })
    .from(userProfiles)
    .where(eq(userProfiles.userId, booking.clientId))
    .limit(1);

  if (!clientProfile?.phone) return;

  let serviceName = "Appointment";
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

  const hoursUntil = type === "REMINDER_24H" ? 24 : 2;
  const bookingDate = booking.bookingDate instanceof Date
    ? booking.bookingDate
    : new Date(booking.bookingDate);
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

async function sendReminderPush(bookingId: string, type: string): Promise<void> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking || booking.status === "cancelled") return;

  // booking.clientId = users.id (auth user ID)
  let serviceName = "Appointment";
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

  let masterName: string | null = null;
  if (booking.masterId) {
    const [master] = await db
      .select({ name: masters.name })
      .from(masters)
      .where(eq(masters.id, booking.masterId))
      .limit(1);
    masterName = master?.name ?? null;
  }

  const hoursUntil = type === "REMINDER_24H" ? 24 : 2;
  const bookingDate = booking.bookingDate instanceof Date
    ? booking.bookingDate
    : new Date(booking.bookingDate);
  const dateStr = bookingDate.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await sendBookingReminderNotification(booking.clientId, {
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
