import { db } from "../db";
import { scheduledNotifications } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";
import { combineDateAndTime } from "./booking-availability";
import { getSmsConfig } from "../config/sms";

/** Either the module-level db, or a transaction handle from db.transaction(). */
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function buildChannels(): Array<"email" | "sms" | "push"> {
  const channels: Array<"email" | "sms" | "push"> = ["email", "push"];
  if (getSmsConfig()) {
    channels.push("sms");
  }
  return channels;
}

export function buildDedupeKey(
  bookingId: string,
  version: number,
  type: string,
  channel: string,
): string {
  return `${bookingId}:v${version}:${type}:${channel}`;
}

export function computeReminderTimes(
  bookingDateISO: string,
  startTime: string,
  now: Date = new Date(),
): Array<{ type: "REMINDER_24H" | "REMINDER_2H"; scheduledAt: Date }> {
  const bookingAt = combineDateAndTime(bookingDateISO.slice(0, 10), startTime);
  const reminder24h = new Date(bookingAt.getTime() - 24 * 60 * 60 * 1000);
  const reminder2h = new Date(bookingAt.getTime() - 2 * 60 * 60 * 1000);

  const result: Array<{ type: "REMINDER_24H" | "REMINDER_2H"; scheduledAt: Date }> = [];
  // Only schedule reminders that are still in the future — a booking made
  // less than 2 hours out never gets a backdated "reminder" fired immediately.
  if (reminder24h.getTime() > now.getTime()) {
    result.push({ type: "REMINDER_24H", scheduledAt: reminder24h });
  }
  if (reminder2h.getTime() > now.getTime()) {
    result.push({ type: "REMINDER_2H", scheduledAt: reminder2h });
  }
  return result;
}

/**
 * Schedules the 24h/2h reminders for a booking at a given (date, time, version).
 * `version` must match bookings.notificationVersion for this booking at the
 * time of the call — pass 0 for a brand-new booking, or the freshly-bumped
 * value when called as part of a reschedule.
 */
export async function scheduleBookingReminders(
  bookingId: string,
  bookingDateISO: string,
  startTime: string,
  version = 0,
  dbClient: DbClient = db,
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
      version,
      dedupeKey: buildDedupeKey(bookingId, version, type, channel),
      status: "pending" as const,
    })),
  );

  try {
    await dbClient
      .insert(scheduledNotifications)
      .values(rows)
      .onConflictDoNothing({ target: scheduledNotifications.dedupeKey });
  } catch (err) {
    logger.error("Failed to schedule booking reminders", {
      source: "reminders",
      meta: { bookingId, version, error: String(err) },
    });
  }
}

/** Marks a booking's not-yet-sent reminders as cancelled. Already-sent rows are left alone (audit history). */
export async function cancelBookingReminders(
  bookingId: string,
  dbClient: DbClient = db,
): Promise<void> {
  try {
    await dbClient
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

/**
 * Cancels the old reminders and schedules new ones for the new time/version.
 * The caller is responsible for having already bumped and persisted
 * bookings.notificationVersion (ideally in the same transaction as the
 * booking's own date/time update) and for passing that same `tx` here so the
 * whole reschedule commits — or fails — as one unit.
 */
export async function rescheduleBookingReminders(
  bookingId: string,
  newDateISO: string,
  newStartTime: string,
  newVersion: number,
  dbClient: DbClient = db,
): Promise<void> {
  await cancelBookingReminders(bookingId, dbClient);
  await scheduleBookingReminders(bookingId, newDateISO, newStartTime, newVersion, dbClient);
}
