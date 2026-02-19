import { Router } from "express";
import { db } from "../../db";
import { users, salons, masters, bookings, userActivitySessions } from "@shared/schema";
import { complaints, sanctions } from "@shared/admin-schema";
import { eq, sql, gte, and, isNull } from "drizzle-orm";
import { requirePermission } from "../../middleware/admin";
import { logger } from "../../lib/logger";

const router = Router();

// GET /api/admin/dashboard - Main dashboard stats
router.get("/", requirePermission("analytics.read"), async (req, res) => {
  try {
    // Total counts
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);

    const [totalSalons] = await db.select({ count: sql<number>`count(*)` }).from(salons);

    const [totalMasters] = await db.select({ count: sql<number>`count(*)` }).from(masters);

    const [totalBookings] = await db.select({ count: sql<number>`count(*)` }).from(bookings);

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

    // Verified salons (isVerified = true)
    const [verifiedSalons] = await db
      .select({ count: sql<number>`count(*)` })
      .from(salons)
      .where(eq(salons.isVerified, true));

    res.json({
      stats: {
        users: {
          total: Number(totalUsers.count),
          newLastWeek: Number(newUsers.count),
        },
        salons: {
          total: Number(totalSalons.count),
          verified: Number(verifiedSalons.count),
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
    logger.error("Dashboard stats error", error as Error, { source: "dashboard-routes" });
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
    logger.error("Dashboard activity error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// GET /api/admin/dashboard/online - Currently online users count
router.get("/online", requirePermission("analytics.read"), async (req, res) => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const [onlineCount] = await db
      .select({ count: sql<number>`count(DISTINCT ${userActivitySessions.userId})` })
      .from(userActivitySessions)
      .where(
        and(
          isNull(userActivitySessions.logoutAt),
          gte(userActivitySessions.lastActivityAt, tenMinutesAgo)
        )
      );

    res.json({ onlineUsers: Number(onlineCount.count) });
  } catch (error: any) {
    logger.error("Get online users count error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch online users" });
  }
});

// GET /api/admin/dashboard/user-growth - User growth chart data
router.get("/user-growth", requirePermission("analytics.read"), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    // Get daily user registration counts
    const growth = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(gte(users.createdAt, sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`))
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt}) ASC`);

    res.json({ growth });
  } catch (error: any) {
    logger.error("User growth chart error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch user growth data" });
  }
});

// GET /api/admin/dashboard/booking-trends - Booking trends chart data
router.get("/booking-trends", requirePermission("analytics.read"), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    // Daily booking counts by status
    const trends = await db
      .select({
        date: sql<string>`DATE(${bookings.createdAt})`,
        status: bookings.status,
        count: sql<number>`count(*)`,
      })
      .from(bookings)
      .where(gte(bookings.createdAt, sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`))
      .groupBy(sql`DATE(${bookings.createdAt}), ${bookings.status}`)
      .orderBy(sql`DATE(${bookings.createdAt}) ASC`);

    // Total revenue (if you have payment/price info)
    const [revenueResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${bookings.totalPrice}), 0)`,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.createdAt, sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`),
          eq(bookings.status, "completed")
        )
      );

    res.json({
      trends,
      totalRevenue: Number(revenueResult.total),
    });
  } catch (error: any) {
    logger.error("Booking trends chart error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch booking trends" });
  }
});

// GET /api/admin/dashboard/platform-health - Platform health metrics
router.get("/platform-health", requirePermission("analytics.read"), async (req, res) => {
  try {
    // Blocked users percentage
    const [blockedStats] = await db
      .select({
        total: sql<number>`count(*)`,
        blocked: sql<number>`count(*) FILTER (WHERE ${users.isBlocked} = true)`,
      })
      .from(users);

    // Active sessions (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userActivitySessions)
      .where(gte(userActivitySessions.loginAt, oneDayAgo));

    // Average session duration (in minutes)
    const [avgSessionDuration] = await db
      .select({
        avgMinutes: sql<number>`COALESCE(AVG(${userActivitySessions.durationSeconds}) / 60, 0)`,
      })
      .from(userActivitySessions)
      .where(isNull(userActivitySessions.logoutAt).not());

    // Pending complaints
    const [pendingComplaints] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complaints)
      .where(eq(complaints.status, "open"));

    // Verification rates
    const [verificationStats] = await db
      .select({
        total: sql<number>`count(*)`,
        emailVerified: sql<number>`count(*) FILTER (WHERE ${users.emailVerified} = true)`,
        phoneVerified: sql<number>`count(*) FILTER (WHERE ${users.phoneVerified} = true)`,
      })
      .from(users);

    res.json({
      health: {
        blockedUserPercentage: (Number(blockedStats.blocked) / Number(blockedStats.total)) * 100,
        activeSessionsLast24h: Number(activeSessions.count),
        avgSessionDurationMinutes: Math.round(Number(avgSessionDuration.avgMinutes)),
        pendingComplaints: Number(pendingComplaints.count),
        emailVerificationRate: (Number(verificationStats.emailVerified) / Number(verificationStats.total)) * 100,
        phoneVerificationRate: (Number(verificationStats.phoneVerified) / Number(verificationStats.total)) * 100,
      },
    });
  } catch (error: any) {
    logger.error("Platform health error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch platform health" });
  }
});

export default router;
