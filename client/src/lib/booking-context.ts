/**
 * Preserves an in-progress booking attempt across a guest's detour through
 * /auth (login, register, OAuth), so they land back on the same service
 * instead of starting the search over. sessionStorage (not localStorage) is
 * deliberate — this is a one-tab, one-attempt handoff, not a persistent
 * preference, and it must never survive into a different account's session
 * on a shared device beyond that single handoff.
 */

const STORAGE_KEY = "pendingBooking";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CONTEXT_VERSION = 1;

export interface PendingBookingContext {
  v: typeof CONTEXT_VERSION;
  savedAt: number;
  salonId: string;
  serviceId?: string;
  masterId?: string;
  bookingDate?: string;
  bookingTime?: string;
  step?: string;
}

export function savePendingBooking(ctx: Omit<PendingBookingContext, "v" | "savedAt">): void {
  try {
    const full: PendingBookingContext = { ...ctx, v: CONTEXT_VERSION, savedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // sessionStorage unavailable (private browsing, storage blocked) — the
    // guest simply won't get the context restored, nothing else breaks.
  }
}

/** Returns the saved context, or null if absent, expired, or corrupted. Never throws. */
export function readPendingBooking(): PendingBookingContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingBookingContext>;
    if (parsed.v !== CONTEXT_VERSION || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    if (typeof parsed.salonId !== "string" || !parsed.salonId) return null;
    return parsed as PendingBookingContext;
  } catch {
    return null;
  }
}

export function clearPendingBooking(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
