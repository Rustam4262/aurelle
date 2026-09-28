/**
 * Shared booking-validation logic used by every create/reschedule endpoint
 * (server/routes/client.routes.ts, bookings.routes.ts, owner.routes.ts) so a
 * slot that the read-only availability endpoint (salons.routes.ts) shows as
 * free is the same slot the write endpoints will actually accept — and so a
 * client can never bypass working-hours/duration/break rules by calling the
 * write endpoint directly with a hand-crafted startTime/endTime.
 */
import { and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import {
  masters,
  services,
  soloMasterServices,
  masterServices,
  masterWorkingHours,
  salonWorkingHours,
  salonBreaks,
  salonExceptions,
  salonSettings,
  soloMasterSettings,
  bookings,
} from "@shared/schema";

// Uzbekistan has used a single fixed UTC+5 offset (no DST) since 2000, so a
// literal offset is correct here and doesn't need a timezone-database
// dependency the project doesn't otherwise have.
export const TASHKENT_OFFSET = "+05:00";

/** Builds the absolute instant for a "YYYY-MM-DD" + "HH:MM" pair in Asia/Tashkent. */
export function combineDateAndTime(dateISO: string, hhmm: string): Date {
  return new Date(`${dateISO}T${hhmm}:00${TASHKENT_OFFSET}`);
}

/**
 * Day-of-week for a "YYYY-MM-DD" calendar date, independent of the server
 * process's own timezone. `new Date(dateISO).getDay()` (the pattern this
 * replaces) is wrong whenever the server's local timezone is behind UTC,
 * since UTC midnight can fall on the previous local day.
 */
export function dayOfWeekFor(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export type BookingErrorCode =
  | "BOOKING_SERVICE_UNAVAILABLE"
  | "BOOKING_SCHEDULE_UNAVAILABLE"
  | "BOOKING_DATE_IN_PAST"
  | "BOOKING_OUTSIDE_WORKING_HOURS"
  | "BOOKING_TIME_UNAVAILABLE";

export interface WorkingWindow {
  closed: boolean;
  openTime?: string;
  closeTime?: string;
  reason?: string;
  source?: "exception" | "master" | "salon";
  breaks: Array<{ startTime: string; endTime: string }>;
}

interface WorkingWindowParams {
  masterId?: string | null;
  salonId?: string | null;
  dateISO: string;
}

/** Resolves exception -> master hours -> salon hours, exactly as the public availability endpoint did. */
export async function getWorkingWindow({
  masterId,
  salonId,
  dateISO,
}: WorkingWindowParams): Promise<WorkingWindow> {
  let exception: typeof salonExceptions.$inferSelect | undefined;
  if (salonId) {
    [exception] = await db
      .select()
      .from(salonExceptions)
      .where(and(eq(salonExceptions.salonId, salonId), eq(salonExceptions.exceptionDate, dateISO)));
  }

  if (exception?.isClosed) {
    return { closed: true, reason: exception.reason || "Salon closed on this date", breaks: [] };
  }

  const dayOfWeek = dayOfWeekFor(dateISO);

  let masterHours: typeof masterWorkingHours.$inferSelect | undefined;
  if (masterId) {
    [masterHours] = await db
      .select()
      .from(masterWorkingHours)
      .where(
        and(eq(masterWorkingHours.masterId, masterId), eq(masterWorkingHours.dayOfWeek, dayOfWeek)),
      );
  }

  let salonHours: typeof salonWorkingHours.$inferSelect | undefined;
  if (!masterHours && salonId) {
    [salonHours] = await db
      .select()
      .from(salonWorkingHours)
      .where(
        and(eq(salonWorkingHours.salonId, salonId), eq(salonWorkingHours.dayOfWeek, dayOfWeek)),
      );
  }

  if (exception && !exception.isClosed && exception.openTime && exception.closeTime) {
    const breaks = salonId ? await getBreaksForDay(salonId, dayOfWeek) : [];
    return {
      closed: false,
      openTime: exception.openTime,
      closeTime: exception.closeTime,
      source: "exception",
      breaks,
    };
  }

  const resolved = masterHours || salonHours;
  if (!resolved || resolved.isClosed) {
    return {
      closed: true,
      reason: resolved?.isClosed ? "Closed on this day" : "No working hours configured",
      breaks: [],
    };
  }

  const breaks = salonId ? await getBreaksForDay(salonId, dayOfWeek) : [];
  return {
    closed: false,
    openTime: resolved.openTime,
    closeTime: resolved.closeTime,
    source: masterHours ? "master" : "salon",
    breaks,
  };
}

async function getBreaksForDay(salonId: string, dayOfWeek: number) {
  const rows = await db
    .select()
    .from(salonBreaks)
    .where(and(eq(salonBreaks.salonId, salonId), eq(salonBreaks.dayOfWeek, dayOfWeek)));
  return rows.map((b) => ({ startTime: b.startTime, endTime: b.endTime }));
}

export async function getBufferMinutes({
  salonId,
  masterId,
  isSoloMaster,
}: {
  salonId?: string | null;
  masterId?: string | null;
  isSoloMaster?: boolean;
}): Promise<number> {
  if (salonId) {
    const [settings] = await db
      .select()
      .from(salonSettings)
      .where(eq(salonSettings.salonId, salonId));
    return settings?.bufferMinutes ?? 10;
  }
  if (isSoloMaster && masterId) {
    const [settings] = await db
      .select()
      .from(soloMasterSettings)
      .where(eq(soloMasterSettings.masterId, masterId));
    return settings?.bufferMinutes ?? 10;
  }
  return 10;
}

interface ServiceInfo {
  duration: number;
  priceMin: number;
}

/** Resolves and validates a service (salon service or solo-master service) — never trusts client-supplied duration/price. */
export async function getServiceInfo({
  serviceId,
  soloMasterServiceId,
  salonId,
}: {
  serviceId?: string | null;
  soloMasterServiceId?: string | null;
  salonId?: string | null;
}): Promise<{ ok: true; info: ServiceInfo } | { ok: false }> {
  if (serviceId) {
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    if (!service || !service.isActive || service.duration <= 0) return { ok: false };
    if (salonId && service.salonId !== salonId) return { ok: false };
    return { ok: true, info: { duration: service.duration, priceMin: service.priceMin } };
  }
  if (soloMasterServiceId) {
    const [service] = await db
      .select()
      .from(soloMasterServices)
      .where(eq(soloMasterServices.id, soloMasterServiceId));
    if (!service || !service.isActive || service.duration <= 0) return { ok: false };
    return { ok: true, info: { duration: service.duration, priceMin: service.priceMin } };
  }
  return { ok: false };
}

/**
 * A salon may curate which of its masters perform a given service via the
 * master_services pivot table. Most salons in practice never populate it, so
 * an empty assignment set for a service means "unrestricted" (matches the
 * long-standing behavior of the team/booking UI) rather than "nobody can do
 * this" — only an explicit, non-empty assignment list is enforced.
 */
async function masterCanPerformService(masterId: string, serviceId: string): Promise<boolean> {
  const assigned = await db
    .select({ masterId: masterServices.masterId })
    .from(masterServices)
    .where(eq(masterServices.serviceId, serviceId));
  if (assigned.length === 0) return true;
  return assigned.some((row) => row.masterId === masterId);
}

export interface ValidateBookingSlotParams {
  salonId?: string | null;
  masterId?: string | null;
  serviceId?: string | null;
  soloMasterServiceId?: string | null;
  isSoloMaster?: boolean;
  dateISO: string;
  startTime: string;
  /** Existing booking to exclude from the conflict check (reschedule of itself). */
  excludeBookingId?: string;
  /** Salon opted into allowing overlapping bookings — skip the DB-row conflict check only. */
  skipConflictCheck?: boolean;
}

export type ValidateBookingSlotResult =
  | { ok: true; endTime: string; durationMinutes: number; priceMin: number }
  | { ok: false; code: BookingErrorCode };

export async function validateBookingSlot(
  params: ValidateBookingSlotParams,
): Promise<ValidateBookingSlotResult> {
  const { masterId, serviceId, soloMasterServiceId, dateISO, startTime } = params;
  let { salonId, isSoloMaster } = params;

  // A master's own record is the source of truth for which salon (if any) it
  // belongs to — a solo master's caller typically has no salonId to pass at
  // all, so backfill from the master rather than requiring the caller to
  // already know it.
  if (masterId) {
    const [master] = await db.select().from(masters).where(eq(masters.id, masterId));
    if (!master || !master.isActive) return { ok: false, code: "BOOKING_SERVICE_UNAVAILABLE" };
    if (salonId && master.salonId !== salonId) {
      return { ok: false, code: "BOOKING_SERVICE_UNAVAILABLE" };
    }
    salonId = master.salonId ?? salonId;
    isSoloMaster = master.isSoloMaster ?? isSoloMaster;
    if (serviceId && !(await masterCanPerformService(masterId, serviceId))) {
      return { ok: false, code: "BOOKING_SERVICE_UNAVAILABLE" };
    }
  }

  const serviceResult = await getServiceInfo({ serviceId, soloMasterServiceId, salonId });
  if (!serviceResult.ok) {
    return { ok: false, code: "BOOKING_SERVICE_UNAVAILABLE" };
  }
  const { duration, priceMin } = serviceResult.info;

  const window = await getWorkingWindow({ masterId, salonId, dateISO });
  if (window.closed || !window.openTime || !window.closeTime) {
    return { ok: false, code: "BOOKING_SCHEDULE_UNAVAILABLE" };
  }

  const openMinutes = parseTimeToMinutes(window.openTime);
  const closeMinutes = parseTimeToMinutes(window.closeTime);
  // Guards against a misconfigured schedule silently behaving like an
  // overnight window instead of a clear, explicit rejection.
  if (closeMinutes <= openMinutes) {
    return { ok: false, code: "BOOKING_SCHEDULE_UNAVAILABLE" };
  }

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = startMinutes + duration;
  const endTime = formatMinutesToTime(endMinutes);

  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    return { ok: false, code: "BOOKING_OUTSIDE_WORKING_HOURS" };
  }

  const startInstant = combineDateAndTime(dateISO, startTime);
  if (startInstant.getTime() <= Date.now()) {
    return { ok: false, code: "BOOKING_DATE_IN_PAST" };
  }

  const overlapsBreak = window.breaks.some((b) => {
    const breakStart = parseTimeToMinutes(b.startTime);
    const breakEnd = parseTimeToMinutes(b.endTime);
    return startMinutes < breakEnd && breakStart < endMinutes;
  });
  if (overlapsBreak) {
    return { ok: false, code: "BOOKING_TIME_UNAVAILABLE" };
  }

  const bufferMinutes = await getBufferMinutes({ salonId, masterId, isSoloMaster });
  const conflictConditions = params.skipConflictCheck
    ? undefined
    : masterId
      ? and(
          eq(bookings.masterId, masterId),
          eq(bookings.bookingDate, new Date(`${dateISO}T00:00:00Z`)),
        )
      : salonId
        ? and(
            eq(bookings.salonId, salonId),
            eq(bookings.bookingDate, new Date(`${dateISO}T00:00:00Z`)),
          )
        : undefined;

  if (conflictConditions) {
    const existing = await db
      .select({
        id: bookings.id,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        masterId: bookings.masterId,
      })
      .from(bookings)
      .where(and(conflictConditions, ne(bookings.status, "cancelled")));

    const hasConflict = existing.some((b) => {
      if (params.excludeBookingId && b.id === params.excludeBookingId) return false;
      if (!masterId && b.masterId) return false; // "any master" slot only conflicts with other unassigned bookings
      const bStart = parseTimeToMinutes(b.startTime) - bufferMinutes;
      const bEnd = parseTimeToMinutes(b.endTime) + bufferMinutes;
      return startMinutes < bEnd && bStart < endMinutes;
    });

    if (hasConflict) {
      return { ok: false, code: "BOOKING_TIME_UNAVAILABLE" };
    }
  }

  return { ok: true, endTime, durationMinutes: duration, priceMin };
}
