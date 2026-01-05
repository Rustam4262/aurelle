import { Router } from "express";
import { db } from "../db";
import { salons, masters, services, salonWorkingHours, reviews, bookings, salonSettings } from "@shared/schema";
import { eq, and, desc, ne } from "drizzle-orm";

const router = Router();

// Get all active salons (for map display)
router.get("/", async (req, res) => {
  try {
    const { city, minLat, maxLat, minLng, maxLng } = req.query;

    let query = db.select().from(salons).where(eq(salons.isActive, true));

    const result = await query.orderBy(desc(salons.averageRating));
    return res.json(result);
  } catch (error) {
    console.error("Get salons error:", error);
    return res.status(500).json({ error: "Failed to get salons" });
  }
});

// Get single salon with details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [salon] = await db.select().from(salons).where(eq(salons.id, id));
    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    const salonMasters = await db.select().from(masters)
      .where(and(eq(masters.salonId, id), eq(masters.isActive, true)));

    const salonServices = await db.select().from(services)
      .where(and(eq(services.salonId, id), eq(services.isActive, true)));

    const workingHours = await db.select().from(salonWorkingHours)
      .where(eq(salonWorkingHours.salonId, id));

    const salonReviews = await db.select().from(reviews)
      .where(eq(reviews.salonId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    return res.json({
      ...salon,
      masters: salonMasters,
      services: salonServices,
      workingHours,
      reviews: salonReviews,
    });
  } catch (error) {
    console.error("Get salon error:", error);
    return res.status(500).json({ error: "Failed to get salon" });
  }
});

// Get salon services
router.get("/:id/services", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(services)
      .where(and(eq(services.salonId, id), eq(services.isActive, true)));
    return res.json(result);
  } catch (error) {
    console.error("Get services error:", error);
    return res.status(500).json({ error: "Failed to get services" });
  }
});

// Get salon masters
router.get("/:id/masters", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(masters)
      .where(and(eq(masters.salonId, id), eq(masters.isActive, true)));
    return res.json(result);
  } catch (error) {
    console.error("Get masters error:", error);
    return res.status(500).json({ error: "Failed to get masters" });
  }
});

// Get salon working hours
router.get("/:id/hours", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(salonWorkingHours)
      .where(eq(salonWorkingHours.salonId, id));
    return res.json(result);
  } catch (error) {
    console.error("Get hours error:", error);
    return res.status(500).json({ error: "Failed to get hours" });
  }
});

// Get salon reviews
router.get("/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(reviews)
      .where(eq(reviews.salonId, id))
      .orderBy(desc(reviews.createdAt));
    return res.json(result);
  } catch (error) {
    console.error("Get reviews error:", error);
    return res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Get master details (public endpoint)
router.get("/masters/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [master] = await db.select().from(masters).where(eq(masters.id, id));
    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    const masterReviews = await db.select().from(reviews)
      .where(eq(reviews.masterId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    return res.json({ ...master, reviews: masterReviews });
  } catch (error) {
    console.error("Get master error:", error);
    return res.status(500).json({ error: "Failed to get master" });
  }
});

// Get master availability for a specific date (public endpoint)
router.get("/masters/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { date, serviceId } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date parameter is required" });
    }

    // Get master to verify it exists and get salonId
    const [master] = await db.select().from(masters).where(eq(masters.id, id));
    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    // Get salon settings for buffer time
    const [settings] = await db.select().from(salonSettings)
      .where(eq(salonSettings.salonId, master.salonId));
    const bufferMinutes = settings?.bufferMinutes ?? 10;

    // Get service duration if serviceId provided
    let serviceDuration = 60; // Default 1 hour
    if (serviceId && typeof serviceId === 'string') {
      const [service] = await db.select().from(services)
        .where(eq(services.id, serviceId));
      if (service) {
        serviceDuration = service.duration;
      }
    }

    // Parse the date
    const bookingDate = new Date(date as string);

    // Get all bookings for this master on this date (excluding cancelled)
    const existingBookings = await db.select({
      id: bookings.id,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
    }).from(bookings)
      .where(
        and(
          eq(bookings.masterId, id),
          eq(bookings.bookingDate, bookingDate),
          ne(bookings.status, "cancelled")
        )
      );

    // Helper function to convert time string to minutes
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Helper function to convert minutes back to time string
    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    // Generate all possible time slots (every 30 minutes from 9:00 to 20:00)
    const slots = [];
    const startHour = 9;
    const endHour = 20;
    const slotInterval = 30; // 30 minute intervals

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const slotStartMinutes = hour * 60 + minute;
        const slotEndMinutes = slotStartMinutes + serviceDuration;

        // Don't create slots that would end after closing time
        if (slotEndMinutes > endHour * 60) continue;

        const slotStart = formatTime(slotStartMinutes);
        const slotEnd = formatTime(slotEndMinutes);

        // Check if this slot conflicts with any existing booking
        let isAvailable = true;
        let conflictReason = null;

        for (const booking of existingBookings) {
          const bookingStart = parseTime(booking.startTime);
          const bookingEnd = parseTime(booking.endTime);

          // Add buffer to both the slot and the existing booking
          const slotBufferedStart = slotStartMinutes - bufferMinutes;
          const slotBufferedEnd = slotEndMinutes + bufferMinutes;
          const bookingBufferedStart = bookingStart - bufferMinutes;
          const bookingBufferedEnd = bookingEnd + bufferMinutes;

          // Check for overlap: (start1 < end2) AND (start2 < end1)
          const hasOverlap = (slotBufferedStart < bookingBufferedEnd) &&
                             (bookingBufferedStart < slotBufferedEnd);

          if (hasOverlap) {
            isAvailable = false;
            conflictReason = booking.status === "confirmed" ? "booked" : "pending";
            break;
          }
        }

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable,
          conflictReason,
        });
      }
    }

    return res.json({
      masterId: id,
      date: bookingDate,
      serviceDuration,
      bufferMinutes,
      slots,
      totalSlots: slots.length,
      availableSlots: slots.filter(s => s.isAvailable).length,
    });
  } catch (error) {
    console.error("Get master availability error:", error);
    return res.status(500).json({ error: "Failed to get availability" });
  }
});

export default router;
