import { db } from "../db";
import { scheduledNotifications } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

type ReminderChannel = "email" | "sms" | "push";
type ReminderType = "REMINDER_24H" | "REMINDER_2H";

const SMS_ENABLED = process.env.SMS_ENABLED !== "false" && !!process.env.TWILIO_ACCOUNT_SID;

function buildChannels(): ReminderChannel[] {
  const channels: ReminderChannel[] = ["email", "push"];
  if (SMS_ENABLED) channels.push("sms");
  return channels;
}

function computeReminderTimes(
  bookingDateISO: string,
  startTime: string,
): { type: ReminderType; scheduledAt: Date }[] {
  const [hour, minute] = startTime.split(":").map(Number);
  const bookingAt = new Date(bookingDateISO);
  bookingAt.setHours(hour, minute, 0, 0);

  const reminder24h = new Date(bookingAt.getTime() - 24 * 60 * 60 * 1000);
  const reminder2h = new Date(bookingAt.getTime() - 2 * 60 * 60 * 1000);

  const now = new Date();
  const result: { type: ReminderType; scheduledAt: Date }[] = [];
  if (reminder24h > now) result.push({ type: "REMINDER_24H", scheduledAt: reminder24h });
  if (reminder2h > now) result.push({ type: "REMINDER_2H", scheduledAt: reminder2h });
  return result;
}

export async function scheduleBookingReminders(
  bookingId: string,
  bookingDateISO: string,
  startTime: string,
): Promise<void> {
  const channels = buildChannels();
  const reminders = computeReminderTimes(bookingDateISO, startTime);

  if (reminders.length === 0) return;

  const rows = reminders.flatMap(({ type, scheduledAt }) =>
    channels.map((channel) => ({
      bookingId,
      type,
      channel,
      scheduledAt,
      dedupeKey: `${bookingId}:${type}:${channel}`,
      status: "pending" as const,
    })),
  );

  try {
    await db
      .insert(scheduledNotifications)
      .values(rows)
      .onConflictDoNothing({ target: scheduledNotifications.dedupeKey });
  } catch (err) {
    logger.error("Failed to schedule booking reminders", {
      source: "reminders",
      meta: { bookingId, error: String(err) },
    });
  }
}

export async function cancelBookingReminders(bookingId: string): Promise<void> {
  try {
    await db
      .update(scheduledNotifications)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(scheduledNotifications.bookingId, bookingId),
          eq(scheduledNotifications.status, "pending"),
        ),
      );
  } catch (err) {
    logger.error("Failed to cancel booking reminders", {
      source: "reminders",
      meta: { bookingId, error: String(err) },
    });
  }
}

export async function rescheduleBookingReminders(
  bookingId: string,
  newDateISO: string,
  newStartTime: string,
): Promise<void> {
  await cancelBookingReminders(bookingId);
  await scheduleBookingReminders(bookingId, newDateISO, newStartTime);
}
