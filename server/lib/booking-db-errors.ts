import { isBookingResourceReferenceError } from "./booking-resource-integrity";

const BOOKING_CONFLICT_CONSTRAINTS = new Set([
  "uidx_bookings_master_exact_active_slot",
  "uidx_bookings_salon_exact_active_slot",
  "excl_bookings_master_active_time_overlap",
  "excl_bookings_salon_unassigned_active_time_overlap",
]);

export function getBookingConflictError(
  error: unknown,
): { code: "BOOKING_TIME_UNAVAILABLE" | "BOOKING_RESOURCE_UNAVAILABLE"; error: string; message: string } | null {
  const pgError = error as { code?: string; constraint?: string } | null;

  if (isBookingResourceReferenceError(error)) {
    return {
      code: "BOOKING_RESOURCE_UNAVAILABLE",
      error: "Service or master no longer available",
      message: "Please refresh the available services and masters before booking again.",
    };
  }

  if (!pgError?.code) {
    return null;
  }

  if (
    (pgError.code === "23505" || pgError.code === "23P01") &&
    pgError.constraint &&
    BOOKING_CONFLICT_CONSTRAINTS.has(pgError.constraint)
  ) {
    return {
      code: "BOOKING_TIME_UNAVAILABLE",
      error: "Time slot not available",
      message:
        "This time slot overlaps with an existing active booking. Please choose a different time.",
    };
  }

  return null;
}
