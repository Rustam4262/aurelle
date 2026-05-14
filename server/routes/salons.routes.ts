import { Router } from "express";
import { db } from "../db";
import {
  salons,
  masters,
  services,
  salonWorkingHours,
  masterWorkingHours,
  reviews,
  bookings,
  salonSettings,
  salonBreaks,
  salonExceptions,
  users,
} from "@shared/schema";
import { eq, and, desc, ne, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { trackEvent } from "../lib/analytics";

const router = Router();

const publicSalonWhere = and(
  eq(salons.isActive, true),
  sql`NOT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = ${salons.ownerId}
      AND u.is_blocked = true
  )`,
);

// Get all active salons (for map display)
router.get("/", async (req, res) => {
  try {
    const { city, minLat, maxLat, minLng, maxLng } = req.query;

    const query = db.select().from(salons).where(publicSalonWhere);

    const result = await query.orderBy(desc(salons.averageRating));

    trackEvent({
      eventName: "search_performed",
      userId: (req as any).user?.claims?.sub ?? null,
      req,
      properties: { city: city ?? null, resultCount: result.length },
    });

    return res.json(result);
  } catch (error) {
    logger.error("Get salons error:", error);
    return res.status(500).json({ error: "Failed to get salons" });
  }
});

// Public marketplace statistics. Keep these numbers factual: no marketing estimates.
router.get("/stats/public", async (_req, res) => {
  try {
    const [stats] = await db
      .select({
        salonsCount: sql<number>`COUNT(*)`,
        citiesCount: sql<number>`COUNT(DISTINCT ${salons.city})`,
        reviewsCount: sql<number>`COALESCE(SUM(${salons.reviewCount}), 0)`,
        averageRating: sql<string>`
          COALESCE(
            ROUND(
              SUM((COALESCE(${salons.averageRating}, '0'))::numeric * COALESCE(${salons.reviewCount}, 0))
              / NULLIF(SUM(COALESCE(${salons.reviewCount}, 0)), 0),
              1
            ),
            0
          )::text
        `,
      })
      .from(salons)
      .where(publicSalonWhere);

    const [bookingStats] = await db
      .select({
        bookingsCount: sql<number>`COUNT(*)`,
        clientsCount: sql<number>`COUNT(DISTINCT ${bookings.clientId})`,
      })
      .from(bookings)
      .where(ne(bookings.status, "cancelled"));

    return res.json({
      salonsCount: Number(stats?.salonsCount ?? 0),
      citiesCount: Number(stats?.citiesCount ?? 0),
      reviewsCount: Number(stats?.reviewsCount ?? 0),
      averageRating: Number(stats?.averageRating ?? 0),
      bookingsCount: Number(bookingStats?.bookingsCount ?? 0),
      clientsCount: Number(bookingStats?.clientsCount ?? 0),
    });
  } catch (error) {
    logger.error("Get public marketplace stats error:", error);
    return res.status(500).json({ error: "Failed to get marketplace stats" });
  }
});

// Get single salon with details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [salon] = await db
      .select()
      .from(salons)
      .where(
        and(
          eq(salons.id, id),
          eq(salons.isActive, true),
          sql`NOT EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = ${salons.ownerId}
              AND u.is_blocked = true
          )`,
        ),
      );
    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    const salonMasters = await db
      .select()
      .from(masters)
      .where(
        and(
          eq(masters.salonId, id),
          eq(masters.isActive, true),
          sql`NOT EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = ${masters.userId}
              AND u.is_blocked = true
          )`,
        ),
      );

    const salonServices = await db
      .select()
      .from(services)
      .where(and(eq(services.salonId, id), eq(services.isActive, true)));

    const workingHours = await db
      .select()
      .from(salonWorkingHours)
      .where(eq(salonWorkingHours.salonId, id));

    const salonReviews = await db
      .select()
      .from(reviews)
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
    logger.error("Get salon error:", error);
    return res.status(500).json({ error: "Failed to get salon" });
  }
});

// Get salon services
router.get("/:id/services", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .select()
      .from(services)
      .where(and(eq(services.salonId, id), eq(services.isActive, true)));
    return res.json(result);
  } catch (error) {
    logger.error("Get services error:", error);
    return res.status(500).json({ error: "Failed to get services" });
  }
});

// Get salon masters
router.get("/:id/masters", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .select()
      .from(masters)
      .where(
        and(
          eq(masters.salonId, id),
          eq(masters.isActive, true),
          sql`NOT EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = ${masters.userId}
              AND u.is_blocked = true
          )`,
        ),
      );
    return res.json(result);
  } catch (error) {
    logger.error("Get masters error:", error);
    return res.status(500).json({ error: "Failed to get masters" });
  }
});

// Get salon working hours
router.get("/:id/hours", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .select()
      .from(salonWorkingHours)
      .where(eq(salonWorkingHours.salonId, id));
    return res.json(result);
  } catch (error) {
    logger.error("Get hours error:", error);
    return res.status(500).json({ error: "Failed to get hours" });
  }
});

// Get salon reviews
router.get("/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .select()
      .from(reviews)
      .where(eq(reviews.salonId, id))
      .orderBy(desc(reviews.createdAt));
    return res.json(result);
  } catch (error) {
    logger.error("Get reviews error:", error);
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

    const masterReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.masterId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    return res.json({ ...master, reviews: masterReviews });
  } catch (error) {
    logger.error("Get master error:", error);
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

    // Get settings for buffer time (from salon or solo master settings)
    let bufferMinutes = 10; // Default
    if (master.salonId) {
      const [settings] = await db
        .select()
        .from(salonSettings)
        .where(eq(salonSettings.salonId, master.salonId));
      bufferMinutes = settings?.bufferMinutes ?? 10;
    } else if (master.isSoloMaster) {
      // Solo master - use solo master settings
      const { soloMasterSettings } = await import("@shared/schema");
      const [soloSettings] = await db
        .select()
        .from(soloMasterSettings)
        .where(eq(soloMasterSettings.masterId, master.id));
      bufferMinutes = soloSettings?.bufferMinutes ?? 10;
    }

    // Get service duration if serviceId provided
    let serviceDuration = 60; // Default 1 hour
    if (serviceId && typeof serviceId === "string") {
      const [service] = await db.select().from(services).where(eq(services.id, serviceId));
      if (service) {
        serviceDuration = service.duration;
      }
    }

    // Parse the date
    const bookingDate = new Date(date as string);
    const dayOfWeek = bookingDate.getDay(); // 0=Sunday, 1=Monday, etc.
    const dateString = bookingDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Check for salon exceptions first (holidays, special hours, closures) - only for salon-based masters
    let exception: any = null;
    if (master.salonId) {
      const [salonException] = await db
        .select()
        .from(salonExceptions)
        .where(
          and(
            eq(salonExceptions.salonId, master.salonId),
            eq(salonExceptions.exceptionDate, dateString),
          ),
        );
      exception = salonException;
    }

    // If exception exists and salon is closed, return empty slots
    if (exception && exception.isClosed) {
      return res.json({
        masterId: id,
        date: bookingDate,
        serviceDuration,
        bufferMinutes,
        slots: [],
        totalSlots: 0,
        availableSlots: 0,
        closed: true,
        reason: exception.reason || "Salon closed on this date",
        exception: true,
      });
    }

    // Get master-specific working hours for this day
    const [masterHours] = await db
      .select()
      .from(masterWorkingHours)
      .where(and(eq(masterWorkingHours.masterId, id), eq(masterWorkingHours.dayOfWeek, dayOfWeek)));

    // If no master-specific hours, fall back to salon working hours (for salon-based masters only)
    let workingHours: any = masterHours;
    if (!workingHours && master.salonId) {
      const [salonHours] = await db
        .select()
        .from(salonWorkingHours)
        .where(
          and(
            eq(salonWorkingHours.salonId, master.salonId),
            eq(salonWorkingHours.dayOfWeek, dayOfWeek),
          ),
        );
      workingHours = salonHours;
    }

    // If exception has custom hours, override working hours
    let openTime: string;
    let closeTime: string;
    if (exception && !exception.isClosed && exception.openTime && exception.closeTime) {
      openTime = exception.openTime;
      closeTime = exception.closeTime;
    } else if (workingHours && !workingHours.isClosed) {
      openTime = workingHours.openTime;
      closeTime = workingHours.closeTime;
    } else {
      // No working hours defined or salon is closed on this day
      return res.json({
        masterId: id,
        date: bookingDate,
        serviceDuration,
        bufferMinutes,
        slots: [],
        totalSlots: 0,
        availableSlots: 0,
        closed: true,
        reason: workingHours?.isClosed ? "Closed on this day" : "No working hours configured",
      });
    }

    // Get salon breaks for this day (only for salon-based masters)
    const salonBreaksForDay = master.salonId
      ? await db
          .select()
          .from(salonBreaks)
          .where(and(eq(salonBreaks.salonId, master.salonId), eq(salonBreaks.dayOfWeek, dayOfWeek)))
      : [];

    // Get all bookings for this master on this date (excluding cancelled)
    const existingBookings = await db
      .select({
        id: bookings.id,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.masterId, id),
          eq(bookings.bookingDate, bookingDate),
          ne(bookings.status, "cancelled"),
        ),
      );

    // Helper function to convert time string to minutes
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Helper function to convert minutes back to time string
    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    // Generate all possible time slots using actual working hours
    const slots = [];
    const slotInterval = 30; // 30 minute intervals

    // Parse working hours
    const openMinutes = parseTime(openTime);
    const closeMinutes = parseTime(closeTime);

    // Helper function to check if time slot conflicts with breaks
    const isInBreakTime = (slotStartMinutes: number, slotEndMinutes: number): boolean => {
      for (const breakPeriod of salonBreaksForDay) {
        const breakStart = parseTime(breakPeriod.startTime);
        const breakEnd = parseTime(breakPeriod.endTime);

        // Check for overlap: (start1 < end2) AND (start2 < end1)
        const hasOverlap = slotStartMinutes < breakEnd && breakStart < slotEndMinutes;
        if (hasOverlap) {
          return true;
        }
      }
      return false;
    };

    // Generate slots from open to close time
    for (
      let slotStartMinutes = openMinutes;
      slotStartMinutes < closeMinutes;
      slotStartMinutes += slotInterval
    ) {
      const slotEndMinutes = slotStartMinutes + serviceDuration;

      // Don't create slots that would end after closing time
      if (slotEndMinutes > closeMinutes) continue;

      const slotStart = formatTime(slotStartMinutes);
      const slotEnd = formatTime(slotEndMinutes);

      // Check if this slot conflicts with break times
      if (isInBreakTime(slotStartMinutes, slotEndMinutes)) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: false,
          conflictReason: "break",
        });
        continue;
      }

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
        const hasOverlap =
          slotBufferedStart < bookingBufferedEnd && bookingBufferedStart < slotBufferedEnd;

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

    return res.json({
      masterId: id,
      date: bookingDate,
      dayOfWeek,
      workingHours: {
        openTime: openTime,
        closeTime: closeTime,
        source: exception && !exception.isClosed ? "exception" : masterHours ? "master" : "salon",
      },
      exception: exception
        ? {
            date: exception.exceptionDate,
            isClosed: exception.isClosed,
            reason: exception.reason,
            hasCustomHours: !exception.isClosed && !!exception.openTime && !!exception.closeTime,
          }
        : null,
      breaks: salonBreaksForDay.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
        label: b.label,
      })),
      serviceDuration,
      bufferMinutes,
      slots,
      totalSlots: slots.length,
      availableSlots: slots.filter((s) => s.isAvailable).length,
    });
  } catch (error) {
    logger.error("Get master availability error:", error);
    return res.status(500).json({ error: "Failed to get availability" });
  }
});

// Get all services across all salons
router.get("/list/all-services", async (req, res) => {
  try {
    const allServices = await db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(desc(services.createdAt));
    return res.json(allServices);
  } catch (error) {
    logger.error("Get all services error:", error);
    return res.status(500).json({ error: "Failed to get services" });
  }
});

// Get all unique cities
router.get("/list/all-cities", async (req, res) => {
  try {
    const salonsList = await db
      .select()
      .from(salons)
      .where(eq(salons.isActive, true));

    // Extract unique cities from salon data
    const cities = Array.from(
      new Set(
        salonsList
          .map((salon: any) => {
            const cityData = salon.city;
            if (typeof cityData === "object" && cityData !== null) {
              return Object.values(cityData as Record<string, any>).find((v) => typeof v === "string") || "Unknown";
            }
            return String(cityData) || "Unknown";
          })
          .filter((city) => city && city !== "Unknown")
      )
    ).sort();

    return res.json(cities);
  } catch (error) {
    logger.error("Get cities error:", error);
    return res.status(500).json({ error: "Failed to get cities" });
  }
});

export default router;
