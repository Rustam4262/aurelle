import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { bookings, insertBookingSchema, userProfiles } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createNewBookingNotification } from "../notifications";

const router = Router();

// Create booking
router.post("/", createLimiter, isAuthenticated, async (req: any, res) => {
  try {
    const clientId = req.user.claims.sub;
    const parsed = insertBookingSchema.safeParse({ ...req.body, clientId });

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid booking data", details: parsed.error.errors });
    }

    const [booking] = await db
      .insert(bookings)
      .values([parsed.data as any])
      .returning();

    // Create notification for the master using centralized helper
    if (booking.masterId) {
      const bookingDateStr = new Date(booking.bookingDate).toISOString().split("T")[0]; // YYYY-MM-DD format
      const notification = await createNewBookingNotification(
        db,
        booking.masterId,
        bookingDateStr,
        booking.startTime,
        booking.id,
      );
      if (!notification) {
        console.warn(
          `Failed to create notification for master ${booking.masterId} for booking ${booking.id}`,
        );
      }
    }

    return res.status(201).json(booking);
  } catch (error) {
    console.error("Create booking error:", error);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

// Get user's bookings
router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    // Get user's profile to find their client profile ID
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
    console.error("Get bookings error:", error);
    return res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Cancel booking
router.patch("/:id/cancel", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.claims.sub;

    // Get user's profile to find their client profile ID
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
    return res.json(booking);
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Reschedule booking (Phase 8)
router.patch("/:id/reschedule", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { newStartTime, newEndTime, newBookingDate, newMasterId, reason } = req.body;
    const userId = req.user.claims.sub;

    // Validation
    if (!newStartTime || !newEndTime || !newBookingDate) {
      return res
        .status(400)
        .json({ error: "Missing required fields: newStartTime, newEndTime, newBookingDate" });
    }

    // Get current booking
    const [currentBooking] = await db.select().from(bookings).where(eq(bookings.id, id));

    if (!currentBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if booking can be rescheduled (not cancelled or completed)
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
          // Check time overlap
          sql`(${bookings.startTime} < ${newEndTime} AND ${bookings.endTime} > ${newStartTime})`,
        ),
      );

    if (conflictingBookings.length > 0 && conflictingBookings[0].id !== id) {
      return res.status(409).json({
        error: "Slot is already booked",
        conflicts: conflictingBookings,
      });
    }

    // Build modification history entry
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

    // Update booking
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

    return res.json(updatedBooking);
  } catch (error) {
    console.error("Reschedule booking error:", error);
    return res.status(500).json({ error: "Failed to reschedule booking" });
  }
});

export default router;
