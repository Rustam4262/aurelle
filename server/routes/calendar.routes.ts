import { Router } from "express";
import { isAuthenticated } from "../auth";
import { db } from "../db";
import { bookings, salons, masters, services } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

// Get calendar view with availability data for a specific salon/master
router.get("/availability", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId, masterId, startDate, endDate } = req.query;

    if (!salonId && !masterId) {
      return res.status(400).json({ error: "Either salonId or masterId is required" });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    // Build query conditions
    const conditions = [gte(bookings.bookingDate, new Date(startDate as string)), lte(bookings.bookingDate, new Date(endDate as string))];

    if (salonId) {
      conditions.push(eq(bookings.salonId, salonId));
    }
    if (masterId) {
      conditions.push(eq(bookings.masterId, masterId));
    }

    // Get all bookings in date range
    const rangeBookings = await db
      .select({
        id: bookings.id,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
        masterId: bookings.masterId,
        masterName: masters.name,
        serviceName: services.name,
      })
      .from(bookings)
      .leftJoin(masters, eq(bookings.masterId, masters.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(and(...conditions));

    // Group bookings by date
    const bookingsByDate: Record<string, any[]> = {};
    for (const booking of rangeBookings) {
      const dateStr = booking.bookingDate instanceof Date
        ? booking.bookingDate.toISOString().split('T')[0]
        : String(booking.bookingDate);
      if (!bookingsByDate[dateStr]) {
        bookingsByDate[dateStr] = [];
      }
      bookingsByDate[dateStr].push(booking);
    }

    // Calculate statistics for each date
    const calendarData = Object.entries(bookingsByDate).map(([date, dayBookings]) => {
      const totalBookings = dayBookings.length;
      const confirmedBookings = dayBookings.filter((b) => b.status === "confirmed").length;
      const pendingBookings = dayBookings.filter((b) => b.status === "pending").length;
      const cancelledBookings = dayBookings.filter((b) => b.status === "cancelled").length;
      const completedBookings = dayBookings.filter((b) => b.status === "completed").length;

      return {
        date,
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        completedBookings,
        bookings: dayBookings,
      };
    });

    // Fill in dates with no bookings
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allDates: Record<string, any> = {};

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const existingData = calendarData.find((item) => item.date === dateStr);

      allDates[dateStr] = existingData || {
        date: dateStr,
        totalBookings: 0,
        confirmedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        completedBookings: 0,
        bookings: [],
      };
    }

    const sortedDates = Object.values(allDates).sort((a, b) => a.date.localeCompare(b.date));

    return res.json(sortedDates);
  } catch (error) {
    console.error("Get calendar availability error:", error);
    return res.status(500).json({ error: "Failed to get calendar availability" });
  }
});

// Get daily schedule breakdown (time slots with bookings)
router.get("/day-schedule", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId, masterId, date } = req.query;

    if (!salonId && !masterId) {
      return res.status(400).json({ error: "Either salonId or masterId is required" });
    }

    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const conditions = [eq(bookings.bookingDate, new Date(date as string))];

    if (salonId) {
      conditions.push(eq(bookings.salonId, salonId));
    }
    if (masterId) {
      conditions.push(eq(bookings.masterId, masterId));
    }

    const dayBookings = await db
      .select({
        id: bookings.id,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
        clientId: bookings.clientId,
        masterId: bookings.masterId,
        masterName: masters.name,
        serviceId: bookings.serviceId,
        serviceName: services.name,
        serviceDuration: services.duration,
      })
      .from(bookings)
      .leftJoin(masters, eq(bookings.masterId, masters.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(and(...conditions))
      .orderBy(bookings.startTime);

    return res.json(dayBookings);
  } catch (error) {
    console.error("Get day schedule error:", error);
    return res.status(500).json({ error: "Failed to get day schedule" });
  }
});

// Get monthly statistics
router.get("/monthly-stats", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { salonId, year, month } = req.query;

    if (!salonId) {
      return res.status(400).json({ error: "salonId is required" });
    }

    if (!year || !month) {
      return res.status(400).json({ error: "year and month are required" });
    }

    // Verify ownership
    const [salon] = await db.select().from(salons).where(eq(salons.id, salonId));
    if (!salon || salon.ownerId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Calculate date range for the month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    // Get all bookings for the month
    const monthBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.salonId, salonId as string),
          gte(bookings.bookingDate, new Date(startDate)),
          lte(bookings.bookingDate, new Date(endDate)),
        ),
      );

    const totalBookings = monthBookings.length;
    const confirmedBookings = monthBookings.filter((b) => b.status === "confirmed").length;
    const completedBookings = monthBookings.filter((b) => b.status === "completed").length;
    const cancelledBookings = monthBookings.filter((b) => b.status === "cancelled").length;
    const pendingBookings = monthBookings.filter((b) => b.status === "pending").length;

    // Calculate revenue (only from completed bookings)
    const completedWithPrices = monthBookings.filter((b) => b.status === "completed");
    const totalRevenue = completedWithPrices.reduce(
      (sum, b) => sum + (b.priceSnapshot || 0),
      0,
    );

    // Get busiest days
    const bookingsByDate: Record<string, number> = {};
    monthBookings.forEach((booking) => {
      const dateStr = booking.bookingDate instanceof Date
        ? booking.bookingDate.toISOString().split('T')[0]
        : String(booking.bookingDate);
      bookingsByDate[dateStr] = (bookingsByDate[dateStr] || 0) + 1;
    });

    const busiestDays = Object.entries(bookingsByDate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([date, count]) => ({ date, count }));

    return res.json({
      month: `${year}-${month}`,
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      totalRevenue,
      busiestDays,
      completionRate:
        totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : 0,
      cancellationRate:
        totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : 0,
    });
  } catch (error) {
    console.error("Get monthly stats error:", error);
    return res.status(500).json({ error: "Failed to get monthly statistics" });
  }
});

export default router;
