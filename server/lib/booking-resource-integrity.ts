const constraints = new Set([
  "bookings_master_id_masters_id_fk",
  "bookings_service_id_services_id_fk",
]);

export function isBookingResourceReferenceError(error: unknown): boolean {
  const pgError = error as { code?: string; constraint?: string } | null;
  return pgError?.code === "23503" && !!pgError.constraint && constraints.has(pgError.constraint);
}

export const bookingResourceDeletionError = {
  code: "BOOKING_HISTORY_EXISTS",
  error: "Cannot delete a service or master with existing bookings",
  message: "Booking history must be preserved. Deactivate the service or master instead.",
};
