/** Waitlist dates are calendar days in the marketplace's Tashkent timezone. */
export function isValidWaitlistDate(value: string | null | undefined, now = new Date()): boolean {
  if (value == null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const today = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return value >= today;
}
