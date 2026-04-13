import express from "express";
import { db } from "../db";
import { eq, and, desc, sql, gte, ne, ilike, or, inArray } from "drizzle-orm";
import {
  masters,
  soloMasterServices,
  masterWorkingHours,
  reviews,
  userProfiles,
  masterPortfolio,
  bookings,
  soloMasterSettings,
  users,
} from "@shared/schema";
import { logger } from "../lib/logger";

const router = express.Router();

// List all active solo masters (public)
router.get("/", async (req, res) => {
  try {
    const { q, city, limit = "20", offset = "0" } = req.query;
    const limitNum = Math.min(parseInt(String(limit), 10) || 20, 100);
    const offsetNum = parseInt(String(offset), 10) || 0;

    const conditions = [
      eq(masters.isSoloMaster, true),
      eq(masters.isActive, true),
      eq(masters.status, "active"),
      sql`NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = ${masters.userId}
          AND u.is_blocked = true
      )`,
    ];

    if (city && typeof city === "string" && city.trim()) {
      conditions.push(ilike(masters.city, `%${city.trim()}%`));
    }

    if (q && typeof q === "string" && q.trim()) {
      conditions.push(ilike(masters.name, `%${q.trim()}%`));
    }

    const rows = await db
      .select({
        id: masters.id,
        name: masters.name,
        slug: masters.slug,
        photo: masters.photo,
        city: masters.city,
        address: masters.address,
        serviceMode: masters.serviceMode,
        specialties: masters.specialties,
        averageRating: masters.averageRating,
        reviewCount: masters.reviewCount,
        experience: masters.experience,
        instagram: masters.instagram,
        telegram: masters.telegram,
      })
      .from(masters)
      .where(and(...conditions))
      .orderBy(desc(masters.averageRating))
      .limit(limitNum)
      .offset(offsetNum);

    return res.json(rows);
  } catch (error) {
    logger.error("List public masters error:", error);
    return res.status(500).json({ error: "Failed to list masters" });
  }
});

// Get public master profile by slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const [master] = await db
      .select()
      .from(masters)
      .where(
        and(
          eq(masters.slug, slug),
          eq(masters.isSoloMaster, true),
          eq(masters.isActive, true),
          sql`NOT EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = ${masters.userId}
              AND u.is_blocked = true
          )`,
        ),
      );

    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    // Only show active masters publicly
    if (master.status !== "active") {
      return res.status(404).json({ error: "Master not found" });
    }

    // Calculate average rating from reviews
    const reviewStats = await db
      .select({
        avgRating: sql<string>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(eq(reviews.masterId, master.id));

    // Get working hours
    const hours = await db
      .select()
      .from(masterWorkingHours)
      .where(eq(masterWorkingHours.masterId, master.id))
      .orderBy(masterWorkingHours.dayOfWeek);

    // Get portfolio images
    const portfolio = await db
      .select()
      .from(masterPortfolio)
      .where(eq(masterPortfolio.masterId, master.id))
      .orderBy(desc(masterPortfolio.createdAt))
      .limit(20);

    return res.json({
      id: master.id,
      name: master.name,
      slug: master.slug,
      bio: master.bio,
      photo: master.photo,
      city: master.city,
      address: master.address,
      serviceMode: master.serviceMode,
      phone: master.phone,
      instagram: master.instagram,
      telegram: master.telegram,
      averageRating: parseFloat(reviewStats[0]?.avgRating || "0").toFixed(1),
      reviewCount: Number(reviewStats[0]?.reviewCount || 0),
      workingHours: hours,
      portfolio: portfolio.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        description: p.description,
      })),
    });
  } catch (error) {
    logger.error("Get public master error:", error);
    return res.status(500).json({ error: "Failed to get master" });
  }
});

// Get master services
router.get("/:slug/services", async (req, res) => {
  try {
    const { slug } = req.params;

    const [master] = await db
      .select()
      .from(masters)
      .where(
        and(
          eq(masters.slug, slug),
          eq(masters.isSoloMaster, true),
          eq(masters.isActive, true),
          eq(masters.status, "active"),
          sql`NOT EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = ${masters.userId}
              AND u.is_blocked = true
          )`,
        ),
      );

    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    const services = await db
      .select()
      .from(soloMasterServices)
      .where(and(eq(soloMasterServices.masterId, master.id), eq(soloMasterServices.isActive, true)))
      .orderBy(soloMasterServices.displayOrder);

    return res.json(services);
  } catch (error) {
    logger.error("Get master services error:", error);
    return res.status(500).json({ error: "Failed to get services" });
  }
});

// Get master reviews
router.get("/:slug/reviews", async (req, res) => {
  try {
    const { slug } = req.params;

    const [master] = await db
      .select()
      .from(masters)
      .where(
        and(
          eq(masters.slug, slug),
          eq(masters.isSoloMaster, true),
          eq(masters.isActive, true),
          eq(masters.status, "active"),
          sql`NOT EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = ${masters.userId}
              AND u.is_blocked = true
          )`,
        ),
      );

    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    const masterReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        clientId: reviews.clientId,
      })
      .from(reviews)
      .where(eq(reviews.masterId, master.id))
      .orderBy(desc(reviews.createdAt))
      .limit(50);

    // Get client names
    const clientIds = masterReviews.map((r) => r.clientId);
    const clients =
      clientIds.length > 0
        ? await db
            .select({ userId: userProfiles.userId, fullName: userProfiles.fullName })
            .from(userProfiles)
            .where(inArray(userProfiles.userId, clientIds))
        : [];

    const clientMap = new Map(clients.map((c) => [c.userId, c.fullName]));

    return res.json(
      masterReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        clientName: clientMap.get(r.clientId) || "Client",
      })),
    );
  } catch (error) {
    logger.error("Get master reviews error:", error);
    return res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Get master availability for booking
router.get("/:slug/availability", async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, serviceId } = req.query;

    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Date is required" });
    }

    const [master] = await db
      .select()
      .from(masters)
      .where(
        and(
          eq(masters.slug, slug),
          eq(masters.isSoloMaster, true),
          eq(masters.isActive, true),
          eq(masters.status, "active"),
          sql`NOT EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = ${masters.userId}
              AND u.is_blocked = true
          )`,
        ),
      );

    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();

    // Get working hours for this day
    const [hours] = await db
      .select()
      .from(masterWorkingHours)
      .where(
        and(
          eq(masterWorkingHours.masterId, master.id),
          eq(masterWorkingHours.dayOfWeek, dayOfWeek),
        ),
      );

    if (!hours || hours.isClosed) {
      return res.json({ available: false, slots: [], message: "Closed on this day" });
    }

    // Get service duration
    let serviceDuration = 60; // default 1 hour
    if (serviceId && typeof serviceId === "string") {
      const [service] = await db
        .select()
        .from(soloMasterServices)
        .where(eq(soloMasterServices.id, serviceId));
      if (service) {
        serviceDuration = service.duration;
      }
    }

    // Get master settings for buffer time
    const [settings] = await db
      .select()
      .from(soloMasterSettings)
      .where(eq(soloMasterSettings.masterId, master.id));

    const bufferMinutes = settings?.bufferMinutes || 10;

    // Get existing bookings for this date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.masterId, master.id),
          gte(bookings.bookingDate, startOfDay),
          sql`${bookings.bookingDate} <= ${endOfDay}`,
          ne(bookings.status, "cancelled"),
        ),
      );

    // Generate time slots
    const slots: { time: string; available: boolean }[] = [];
    const [openHour, openMinute] = hours.openTime.split(":").map(Number);
    const [closeHour, closeMinute] = hours.closeTime.split(":").map(Number);

    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    // Generate slots every 30 minutes
    for (let time = openMinutes; time + serviceDuration <= closeMinutes; time += 30) {
      const slotHour = Math.floor(time / 60);
      const slotMinute = time % 60;
      const slotTime = `${slotHour.toString().padStart(2, "0")}:${slotMinute.toString().padStart(2, "0")}`;

      // Check if this slot conflicts with existing bookings
      const slotStart = time;
      const slotEnd = time + serviceDuration + bufferMinutes;

      const hasConflict = existingBookings.some((booking) => {
        const [bookingHour, bookingMinute] = booking.startTime.split(":").map(Number);
        const [endHour, endMinute] = booking.endTime.split(":").map(Number);
        const bookingStart = bookingHour * 60 + bookingMinute;
        const bookingEndTime = endHour * 60 + endMinute;
        const bookingEnd = bookingEndTime + bufferMinutes;

        // Check for overlap
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });

      slots.push({
        time: slotTime,
        available: !hasConflict,
      });
    }

    return res.json({
      available: true,
      slots,
    });
  } catch (error) {
    logger.error("Get master availability error:", error);
    return res.status(500).json({ error: "Failed to get availability" });
  }
});

// Check distance for mobile service
router.post("/:slug/check-distance", async (req, res) => {
  try {
    const { slug } = req.params;
    const { latitude, longitude } = req.body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const [master] = await db
      .select()
      .from(masters)
      .where(
        and(eq(masters.slug, slug), eq(masters.isSoloMaster, true), eq(masters.status, "active")),
      );

    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    if (!master.latitude || !master.longitude) {
      return res.status(400).json({ error: "Master location not set" });
    }

    const masterLat = parseFloat(master.latitude);
    const masterLon = parseFloat(master.longitude);

    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = ((latitude - masterLat) * Math.PI) / 180;
    const dLon = ((longitude - masterLon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((masterLat * Math.PI) / 180) *
        Math.cos((latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const workRadius = master.workRadius || 10;
    const withinRange = distance <= workRadius;

    // Estimate travel time (assume 30 km/h average city speed)
    const estimatedTravelTime = Math.ceil((distance / 30) * 60); // minutes

    return res.json({
      distance: Math.round(distance * 10) / 10, // km with 1 decimal
      withinRange,
      workRadius,
      estimatedTravelTime,
      mobileExtraCharge: master.mobileExtraCharge || 0,
    });
  } catch (error) {
    logger.error("Check distance error:", error);
    return res.status(500).json({ error: "Failed to check distance" });
  }
});

export default router;
