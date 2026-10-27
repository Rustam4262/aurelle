import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";

// Public input is an allowlist. Never use the database insert schema directly
// for a client request: lifecycle, payment and audit fields belong to the server.
export const clientBookingInput = insertBookingSchema
  .pick({
    salonId: true,
    masterId: true,
    serviceId: true,
    soloMasterServiceId: true,
    bookingDate: true,
    startTime: true,
    notes: true,
  })
  .extend({
    // Mobile pricing is not calculated by this endpoint yet.
    isMobileBooking: z.literal(false).optional(),
  });
