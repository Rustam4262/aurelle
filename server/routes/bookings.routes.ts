import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { bookings, insertBookingSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
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

    const [booking] = await db.insert(bookings).values([parsed.data as any]).returning();

    // Create notification for the master using centralized helper
    if (booking.masterId) {
      const bookingDateStr = new Date(booking.bookingDate).toISOString().split('T')[0]; // YYYY-MM-DD format
      const notification = await createNewBookingNotification(
        db,
        booking.masterId,
        bookingDateStr,
        booking.startTime,
        booking.id
      );
      if (!notification) {
        console.warn(`Failed to create notification for master ${booking.masterId} for booking ${booking.id}`);
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
    const clientId = req.user.claims.sub;
    const userBookings = await db.select().from(bookings)
      .where(eq(bookings.clientId, clientId))
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
    const clientId = req.user.claims.sub;

    const [booking] = await db.update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.clientId, clientId)))
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

export default router;
