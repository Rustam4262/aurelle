import { Router } from "express";
import { db } from "../../db";
import { users, salons, masters, bookings } from "@shared/schema";
import { complaints, sanctions } from "@shared/admin-schema";
import { eq, sql, gte } from "drizzle-orm";
import { requirePermission } from "../../middleware/admin";

const router = Router();

// GET /api/admin/dashboard - Main dashboard stats
router.get("/", requirePermission("analytics.read"), async (req, res) => {
  try {
    // Total counts
    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [totalSalons] = await db
      .select({ count: sql<number>`count(*)` })
      .from(salons);

    const [totalMasters] = await db
      .select({ count: sql<number>`count(*)` })
      .from(masters);

    const [totalBookings] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings);

    // Active complaints
    const [openComplaints] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complaints)
      .where(eq(complaints.status, "open"));

    // Active sanctions
    const [activeSanctions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sanctions)
      .where(eq(sanctions.status, "active"));

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [newUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo));

    // Active salons (status = 'active')
    const [activeSalons] = await db
      .select({ count: sql<number>`count(*)` })
      .from(salons)
      .where(eq(salons.status, "active"));

    res.json({
      stats: {
        users: {
          total: Number(totalUsers.count),
          newLastWeek: Number(newUsers.count),
        },
        salons: {
          total: Number(totalSalons.count),
          active: Number(activeSalons.count),
        },
        masters: {
          total: Number(totalMasters.count),
        },
        bookings: {
          total: Number(totalBookings.count),
        },
        moderation: {
          openComplaints: Number(openComplaints.count),
          activeSanctions: Number(activeSanctions.count),
        },
      },
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// GET /api/admin/dashboard/activity - Recent activity
router.get("/activity", requirePermission("analytics.read"), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    // Recent bookings
    const recentBookings = await db
      .select({
        id: bookings.id,
        date: bookings.bookingDate,
        time: bookings.startTime,
        status: bookings.status,
        salonId: bookings.salonId,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .orderBy(sql`${bookings.createdAt} DESC`)
      .limit(limit);

    // Recent complaints
    const recentComplaints = await db
      .select({
        id: complaints.id,
        category: complaints.category,
        status: complaints.status,
        targetType: complaints.targetType,
        createdAt: complaints.createdAt,
      })
      .from(complaints)
      .orderBy(sql`${complaints.createdAt} DESC`)
      .limit(limit);

    res.json({
      recentBookings,
      recentComplaints,
    });
  } catch (error: any) {
    console.error("Dashboard activity error:", error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export default router;
