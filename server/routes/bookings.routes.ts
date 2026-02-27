import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { bookings, insertBookingSchema, userProfiles } from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { createNewBookingNotification } from "../notifications";
import { logger } from "../lib/logger";
import type { AuthedRequest } from "../types/authed-request";
import {
  scheduleBookingReminders,
  cancelBookingReminders,
  rescheduleBookingReminders,
} from "../lib/reminders";
import { fireConfirmationEmail, fireCancellationEmail } from "../lib/booking-emails";
import {
  sendBookingCreatedSms,
  sendBookingCancelledSms,
  sendBookingRescheduledSms,
} from "../sms";

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

    // Slot conflict protection (only when booking a specific master)
    if (parsed.data.masterId) {
      const masterId = parsed.data.masterId;
      const bookingDate = parsed.data.bookingDate;
      const startTime = parsed.data.startTime;
      const endTime = parsed.data.endTime;

      // 1. Exact-match idempotency: same master + date + startTime already pending/confirmed
      const [existing] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.masterId, masterId),
            eq(bookings.bookingDate, bookingDate),
            eq(bookings.startTime, startTime),
            inArray(bookings.status, ["pending", "confirmed"]),
          ),
        )
        .limit(1);

      if (existing) {
        return res.status(409).json({
          error: "Slot already booked",
          bookingId: existing.id,
        });
      }

      // 2. Overlap conflict: any booking that overlaps the requested time window
      if (endTime) {
        const [conflict] = await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.masterId, masterId),
              eq(bookings.bookingDate, bookingDate),
              inArray(bookings.status, ["pending", "confirmed"]),
              sql`${bookings.startTime} < ${endTime}`,
              sql`${bookings.endTime} > ${startTime}`,
            ),
          )
          .limit(1);

        if (conflict) {
          return res.status(409).json({ error: "Time slot is no longer available" });
        }
      }
    }

    const [booking] = await db
      .insert(bookings)
      .values([parsed.data as any])
      .returning();

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
        .where(eq(userProfiles.id, booking.clientId));
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
      .where(eq(bookings.clientId, profile.id))
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

    const [booking] = await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.clientId, profile.id)))
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
      sendBookingCancelledSms(
        profile.phone,
        profile.fullName || "Клиент",
        "запись",
        dateStr,
      ).catch(() => {});
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
    const { newStartTime, newEndTime, newBookingDate, newMasterId, reason } = req.body;
    const userId = req.user.claims.sub;

    if (!newStartTime || !newEndTime || !newBookingDate) {
      return res
        .status(400)
        .json({ error: "Missing required fields: newStartTime, newEndTime, newBookingDate" });
    }

    const [currentBooking] = await db.select().from(bookings).where(eq(bookings.id, id));

    if (!currentBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (currentBooking.status === "cancelled" || currentBooking.status === "completed") {
      return res.status(400).json({ error: `Cannot reschedule ${currentBooking.status} booking` });
    }

    // Check for slot conflicts
    const conflictingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.masterId, newMasterId || currentBooking.masterId),
          eq(bookings.bookingDate, new Date(newBookingDate)),
          eq(bookings.status, "confirmed"),
          sql`(${bookings.startTime} < ${newEndTime} AND ${bookings.endTime} > ${newStartTime})`,
        ),
      );

    if (conflictingBookings.length > 0 && conflictingBookings[0].id !== id) {
      return res.status(409).json({
        error: "Slot is already booked",
        conflicts: conflictingBookings,
      });
    }

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
        newEndTime,
        newBookingDate,
        newMasterId: newMasterId || currentBooking.masterId,
        reason: reason || "No reason provided",
      },
    };

    const currentHistory = (currentBooking.modificationHistory || []) as any[];

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        startTime: newStartTime,
        endTime: newEndTime,
        bookingDate: new Date(newBookingDate),
        masterId: newMasterId || currentBooking.masterId,
        modifiedBy: userId,
        modificationHistory: [...currentHistory, modificationEntry],
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    rescheduleBookingReminders(
      updatedBooking.id,
      new Date(updatedBooking.bookingDate).toISOString(),
      updatedBooking.startTime,
    ).catch((err) =>
      logger.error("Failed to reschedule reminders", {
        source: "bookings-routes",
        meta: { bookingId: updatedBooking.id, error: String(err) },
      }),
    );

    // SMS notification for reschedule (fire-and-forget)
    void (async () => {
      const [clientProfile] = await db
        .select({ phone: userProfiles.phone, fullName: userProfiles.fullName })
        .from(userProfiles)
        .where(eq(userProfiles.id, updatedBooking.clientId));
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
