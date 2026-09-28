import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { bookings, insertBookingSchema, userProfiles } from "@shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { createNewBookingNotification } from "../notifications";
import { logger } from "../lib/logger";
import type { AuthedRequest } from "../types/authed-request";
import {
  scheduleBookingReminders,
  cancelBookingReminders,
  rescheduleBookingReminders,
} from "../lib/reminders";
import { fireConfirmationEmail, fireCancellationEmail } from "../lib/booking-emails";
import { broadcast, broadcastToUser } from "../lib/websocket";
import { sendBookingCreatedSms, sendBookingCancelledSms, sendBookingRescheduledSms } from "../sms";
import { getBookingConflictError } from "../lib/booking-db-errors";
import { validateBookingSlot } from "../lib/booking-availability";

const router = Router();

// Create booking
router.post("/", createLimiter, isAuthenticated, async (req: any, res) => {
  try {
    const clientId = req.user.claims.sub;
    const body = {
      ...req.body,
      clientId,
      bookingDate: req.body.bookingDate ? new Date(req.body.bookingDate) : undefined,
    };
    const parsed = insertBookingSchema.safeParse(body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid booking data", details: parsed.error.errors });
    }

    // Duration, working-hours, break and conflict checks live in one shared
    // module used by every booking write path. The client-supplied
    // endTime/priceSnapshot (still accepted for request-shape compatibility
    // with existing callers) are never trusted — they're overwritten below
    // with the server-computed values.
    const dateISO = String(req.body.bookingDate).slice(0, 10);
    const validation = await validateBookingSlot({
      salonId: parsed.data.salonId ?? null,
      masterId: parsed.data.masterId ?? null,
      serviceId: parsed.data.serviceId ?? null,
      soloMasterServiceId: parsed.data.soloMasterServiceId ?? null,
      dateISO,
      startTime: parsed.data.startTime,
    });

    if (!validation.ok) {
      return res.status(409).json({
        code: validation.code,
        error: "Time slot not available",
        message: "This time slot is not available. Please choose a different time.",
      });
    }

    parsed.data.endTime = validation.endTime;
    parsed.data.priceSnapshot = validation.priceMin;

    let booking: typeof bookings.$inferSelect;
    try {
      [booking] = await db
        .insert(bookings)
        .values([parsed.data as any])
        .returning();
    } catch (insertErr) {
      const conflict = getBookingConflictError(insertErr);
      if (conflict) {
        return res.status(409).json(conflict);
      }
      throw insertErr;
    }

    // Create in-app notification for the master
    if (booking.masterId) {
      const bookingDateStr = new Date(booking.bookingDate).toISOString().split("T")[0];
      const notification = await createNewBookingNotification(
        db,
        booking.masterId,
        bookingDateStr,
        booking.startTime,
        booking.id,
      );
      if (!notification) {
        logger.warn(
          `Failed to create notification for master ${booking.masterId} for booking ${booking.id}`,
          { source: "bookings-routes" },
        );
      }
    }

    // Confirmation email (fire-and-forget)
    fireConfirmationEmail(booking.id);

    // Schedule reminders (fire-and-forget)
    scheduleBookingReminders(
      booking.id,
      new Date(booking.bookingDate).toISOString(),
      booking.startTime,
    ).catch((err) =>
      logger.error("Failed to schedule reminders", {
        source: "bookings-routes",
        meta: { bookingId: booking.id, error: String(err) },
      }),
    );

    // SMS notification (fire-and-forget)
    void (async () => {
      const [clientProfile] = await db
        .select({ phone: userProfiles.phone, fullName: userProfiles.fullName })
        .from(userProfiles)
        .where(eq(userProfiles.userId, booking.clientId));
      if (clientProfile?.phone) {
        const dateStr = new Date(booking.bookingDate).toLocaleDateString("ru-RU");
        sendBookingCreatedSms(
          clientProfile.phone,
          clientProfile.fullName || "Клиент",
          "запись",
          dateStr,
          booking.startTime,
        ).catch(() => {});
      }
    })();

    // WebSocket: notify salon owner + confirm to client
    broadcast(`salon_${booking.salonId}`, "new_booking", {
      bookingId: booking.id,
      salonId: booking.salonId,
      time: booking.startTime,
      date: booking.bookingDate,
    });
    if (booking.clientId) {
      broadcastToUser(booking.clientId, "booking_confirmed", {
        bookingId: booking.id,
        salonId: booking.salonId,
        time: booking.startTime,
      });
    }

    return res.status(201).json(booking);
  } catch (error) {
    logger.error("Create booking error:", error);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

// Get user's bookings
router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

    if (!profile) {
      return res.json([]);
    }

    const userBookings = await db
      .select()
      .from(bookings)
      .where(inArray(bookings.clientId, [userId, profile.id]))
      .orderBy(desc(bookings.bookingDate));
    return res.json(userBookings);
  } catch (error) {
    logger.error("Get bookings error:", error);
    return res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Cancel booking
router.patch("/:id/cancel", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.claims.sub;

    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // clientId has historically been stored as either the auth user id or the
    // user_profiles row id depending on which creation path wrote it — accept both,
    // matching the convention already used by DELETE /api/client/bookings/:id.
    const [booking] = await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(bookings.id, id), inArray(bookings.clientId, [userId, profile.id])))
      .returning();

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    cancelBookingReminders(booking.id).catch((err) =>
      logger.error("Failed to cancel reminders", {
        source: "bookings-routes",
        meta: { bookingId: booking.id, error: String(err) },
      }),
    );
    // Cancellation email (fire-and-forget)
    fireCancellationEmail(booking.id);
    if (profile.phone) {
      const dateStr = new Date(booking.bookingDate).toLocaleDateString("ru-RU");
      sendBookingCancelledSms(profile.phone, profile.fullName || "Клиент", "запись", dateStr).catch(
        () => {},
      );
    }
    return res.json(booking);
  } catch (error) {
    logger.error("Cancel booking error:", error);
    return res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Reschedule booking
router.patch("/:id/reschedule", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { newStartTime, newBookingDate, newMasterId, reason } = req.body;
    const userId = req.user.claims.sub;

    // newEndTime is intentionally not accepted here — it's always derived
    // server-side from the booking's own service duration (see validation below).
    if (!newStartTime || !newBookingDate) {
      return res
        .status(400)
        .json({ error: "Missing required fields: newStartTime, newBookingDate" });
    }

    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // clientId has historically been stored as either the auth user id or the
    // user_profiles row id depending on which creation path wrote it — accept both,
    // matching the convention already used by DELETE /api/client/bookings/:id.
    const [currentBooking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), inArray(bookings.clientId, [userId, profile.id])));

    if (!currentBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (currentBooking.status === "cancelled" || currentBooking.status === "completed") {
      return res.status(400).json({ error: `Cannot reschedule ${currentBooking.status} booking` });
    }

    // Same shared validation as booking creation — duration/hours/breaks are
    // re-derived from the booking's own service, not trusted from the client's
    // newEndTime.
    const newMaster = newMasterId || currentBooking.masterId;
    const dateISO = String(newBookingDate).slice(0, 10);
    const validation = await validateBookingSlot({
      salonId: currentBooking.salonId,
      masterId: newMaster,
      serviceId: currentBooking.serviceId,
      soloMasterServiceId: currentBooking.soloMasterServiceId,
      dateISO,
      startTime: newStartTime,
      excludeBookingId: id,
    });

    if (!validation.ok) {
      return res.status(409).json({
        code: validation.code,
        error: "Time slot not available",
        message: "This time slot is not available. Please choose a different time.",
      });
    }

    const resolvedEndTime = validation.endTime;

    const modificationEntry = {
      timestamp: new Date().toISOString(),
      action: "reschedule",
      changedBy: userId,
      changes: {
        oldStartTime: currentBooking.startTime,
        oldEndTime: currentBooking.endTime,
        oldBookingDate: currentBooking.bookingDate,
        oldMasterId: currentBooking.masterId,
        newStartTime,
        newEndTime: resolvedEndTime,
        newBookingDate,
        newMasterId: newMaster,
        reason: reason || "No reason provided",
      },
    };

    const currentHistory = (currentBooking.modificationHistory || []) as any[];

    let updatedBooking: typeof bookings.$inferSelect;
    try {
      updatedBooking = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(bookings)
          .set({
            startTime: newStartTime,
            endTime: resolvedEndTime,
            bookingDate: new Date(newBookingDate),
            masterId: newMaster,
            modifiedBy: userId,
            modificationHistory: [...currentHistory, modificationEntry],
            updatedAt: new Date(),
            notificationVersion: sql`${bookings.notificationVersion} + 1`,
          })
          .where(and(eq(bookings.id, id), inArray(bookings.clientId, [userId, profile.id])))
          .returning();

        await rescheduleBookingReminders(
          updated.id,
          new Date(updated.bookingDate).toISOString(),
          updated.startTime,
          updated.notificationVersion,
          tx,
        );

        return updated;
      });
    } catch (updateErr) {
      const conflict = getBookingConflictError(updateErr);
      if (conflict) {
        return res.status(409).json(conflict);
      }
      throw updateErr;
    }

    // SMS notification for reschedule (fire-and-forget)
    void (async () => {
      const [clientProfile] = await db
        .select({ phone: userProfiles.phone, fullName: userProfiles.fullName })
        .from(userProfiles)
        .where(eq(userProfiles.userId, updatedBooking.clientId));
      if (clientProfile?.phone) {
        const dateStr = new Date(updatedBooking.bookingDate).toLocaleDateString("ru-RU");
        sendBookingRescheduledSms(
          clientProfile.phone,
          clientProfile.fullName || "Клиент",
          "запись",
          dateStr,
          updatedBooking.startTime,
        ).catch(() => {});
      }
    })();

    return res.json(updatedBooking);
  } catch (error) {
    logger.error("Reschedule booking error:", error);
    return res.status(500).json({ error: "Failed to reschedule booking" });
  }
});

export default router;
