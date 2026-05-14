import { Router } from "express";
import { db } from "../../db";
import { users, salons, masters, bookings, userActivitySessions, payments } from "@shared/schema";
import { complaints, sanctions } from "@shared/admin-schema";
import { eq, sql, gte, and, isNull, not, lt, lte } from "drizzle-orm";
import { requirePermission } from "../../middleware/admin";
import { logger } from "../../lib/logger";
import { withCache } from "../../lib/cache";
import { notSoftDeleted } from "../../lib/user-deletion";

const router = Router();

const daysMap: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

// GET /api/admin/dashboard - Main dashboard stats
// Supports ?range=24h|7d|30d|90d (default: 30d)
// Cached 60s — key: dash:stats:{range}
router.get("/", requirePermission("analytics.read"), async (req, res) => {
  try {
    const range = (req.query.range as string) || "30d";
    const days = daysMap[range] ?? 30;

    const result = await withCache(`dash:stats:${range}`, 60, async () => {
      const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const prevStart = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000);

      const [
        totalUsersRow,
        totalSalonsRow,
        totalMastersRow,
        totalBookingsRow,
        openComplaintsRow,
        activeSanctionsRow,
        newUsersRow,
        verifiedSalonsRow,
        curUsersRow,
        prevUsersRow,
        curBookingsRow,
        prevBookingsRow,
        curSalonsRow,
        curMastersRow,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users).where(notSoftDeleted(users.blockReason)),
        db.select({ count: sql<number>`count(*)` }).from(salons),
        db.select({ count: sql<number>`count(*)` }).from(masters),
        db.select({ count: sql<number>`count(*)` }).from(bookings),
        db.select({ count: sql<number>`count(*)` }).from(complaints).where(eq(complaints.status, "open")),
        db.select({ count: sql<number>`count(*)` }).from(sanctions).where(eq(sanctions.status, "active")),
        db.select({ count: sql<number>`count(*)` }).from(users).where(
          and(
            gte(users.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
            notSoftDeleted(users.blockReason),
          )
        ),
        db.select({ count: sql<number>`count(*)` }).from(salons).where(eq(salons.isVerified, true)),
        db.select({ count: sql<number>`count(*)` }).from(users).where(and(gte(users.createdAt, periodStart), notSoftDeleted(users.blockReason))),
        db.select({ count: sql<number>`count(*)` }).from(users).where(
          and(gte(users.createdAt, prevStart), lt(users.createdAt, periodStart), notSoftDeleted(users.blockReason))
        ),
        db.select({ count: sql<number>`count(*)` }).from(bookings).where(gte(bookings.createdAt, periodStart)),
        db.select({ count: sql<number>`count(*)` }).from(bookings).where(
          and(gte(bookings.createdAt, prevStart), lt(bookings.createdAt, periodStart))
        ),
        db.select({ count: sql<number>`count(*)` }).from(salons).where(gte(salons.createdAt, periodStart)),
        db.select({ count: sql<number>`count(*)` }).from(masters).where(gte(masters.createdAt, periodStart)),
      ]);

      return {
        range,
        stats: {
          users: {
            total: Number(totalUsersRow[0].count),
            newLastWeek: Number(newUsersRow[0].count),
            newInPeriod: Number(curUsersRow[0].count),
            prevPeriod: Number(prevUsersRow[0].count),
          },
          salons: {
            total: Number(totalSalonsRow[0].count),
            verified: Number(verifiedSalonsRow[0].count),
            newInPeriod: Number(curSalonsRow[0].count),
          },
          masters: {
            total: Number(totalMastersRow[0].count),
            newInPeriod: Number(curMastersRow[0].count),
          },
          bookings: {
            total: Number(totalBookingsRow[0].count),
            newInPeriod: Number(curBookingsRow[0].count),
            prevPeriod: Number(prevBookingsRow[0].count),
          },
          moderation: {
            openComplaints: Number(openComplaintsRow[0].count),
            activeSanctions: Number(activeSanctionsRow[0].count),
          },
        },
      };
    });

    res.json(result);
  } catch (error: any) {
    logger.error("Dashboard stats error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// GET /api/admin/dashboard/action-center - Items requiring admin attention
// Cached 60s — key: dash:action-center
router.get("/action-center", requirePermission("analytics.read"), async (_req, res) => {
  try {
    const result = await withCache("dash:action-center", 60, async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const oneDayAgo = new Date(Date.now() - 86400000);

      const [unverifiedSalons, pendingComplaints, paymentErrors, expiringToday] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(salons).where(eq(salons.isVerified, false)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(complaints)
          .where(sql`${complaints.status} IN ('open', 'in_review')`),
        db
          .select({ count: sql<number>`count(*)` })
          .from(payments)
          .where(and(eq(payments.status, "failed"), gte(payments.createdAt, oneDayAgo))),
        db
          .select({ count: sql<number>`count(*)` })
          .from(sanctions)
          .where(
            and(
              eq(sanctions.status, "active"),
              gte(sanctions.endsAt, todayStart),
              lte(sanctions.endsAt, todayEnd),
            ),
          ),
      ]);

      return {
        unverifiedSalons: Number(unverifiedSalons[0].count),
        pendingComplaints: Number(pendingComplaints[0].count),
        paymentErrors24h: Number(paymentErrors[0].count),
        expiringToday: Number(expiringToday[0].count),
      };
    });

    res.json(result);
  } catch (error: any) {
    logger.error("Action center error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch action center data" });
  }
});

// GET /api/admin/dashboard/activity - Recent activity (NOT cached — needs real-time data)
router.get("/activity", requirePermission("analytics.read"), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const [recentBookings, recentComplaints] = await Promise.all([
      db
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
        .limit(limit),
      db
        .select({
          id: complaints.id,
          category: complaints.category,
          status: complaints.status,
          targetType: complaints.targetType,
          createdAt: complaints.createdAt,
        })
        .from(complaints)
        .orderBy(sql`${complaints.createdAt} DESC`)
        .limit(limit),
    ]);

    res.json({ recentBookings, recentComplaints });
  } catch (error: any) {
    logger.error("Dashboard activity error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// GET /api/admin/dashboard/online - Currently online users count
// Cached 30s — key: dash:online
router.get("/online", requirePermission("analytics.read"), async (_req, res) => {
  try {
    const result = await withCache("dash:online", 30, async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const [onlineCount] = await db
        .select({ count: sql<number>`count(DISTINCT ${userActivitySessions.userId})` })
        .from(userActivitySessions)
        .where(
          and(
            isNull(userActivitySessions.logoutAt),
            gte(userActivitySessions.lastActivityAt, tenMinutesAgo),
          ),
        );

      return { onlineUsers: Number(onlineCount.count) };
    });

    res.json(result);
  } catch (error: any) {
    logger.error("Get online users count error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch online users" });
  }
});

// GET /api/admin/dashboard/user-growth - Growth chart data
// Supports ?series=users|salons|bookings and ?days=N or ?range=24h|7d|30d|90d
// Cached 300s — key: dash:growth:{range}:{series}
router.get("/user-growth", requirePermission("analytics.read"), async (req, res) => {
  try {
    const range = (req.query.range as string) || "30d";
    const days = daysMap[range] ?? (parseInt(req.query.days as string) || 30);
    const series = (req.query.series as string) || "users";

    const result = await withCache(`dash:growth:${range}:${series}`, 300, async () => {
      const interval = `NOW() - INTERVAL '${days} days'`;
      let growth: Array<{ date: string; count: number }>;

      if (series === "salons") {
        growth = await db
          .select({
            date: sql<string>`DATE(${salons.createdAt})`,
            count: sql<number>`count(*)`,
          })
          .from(salons)
          .where(gte(salons.createdAt, sql`${sql.raw(interval)}`))
          .groupBy(sql`DATE(${salons.createdAt})`)
          .orderBy(sql`DATE(${salons.createdAt}) ASC`);
      } else if (series === "bookings") {
        growth = await db
          .select({
            date: sql<string>`DATE(${bookings.createdAt})`,
            count: sql<number>`count(*)`,
          })
          .from(bookings)
          .where(gte(bookings.createdAt, sql`${sql.raw(interval)}`))
          .groupBy(sql`DATE(${bookings.createdAt})`)
          .orderBy(sql`DATE(${bookings.createdAt}) ASC`);
      } else {
        growth = await db
          .select({
            date: sql<string>`DATE(${users.createdAt})`,
            count: sql<number>`count(*)`,
          })
          .from(users)
          .where(and(gte(users.createdAt, sql`${sql.raw(interval)}`), notSoftDeleted(users.blockReason)))
          .groupBy(sql`DATE(${users.createdAt})`)
          .orderBy(sql`DATE(${users.createdAt}) ASC`);
      }

      return { growth, series };
    });

    res.json(result);
  } catch (error: any) {
    logger.error("User growth chart error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch growth data" });
  }
});

// GET /api/admin/dashboard/funnel - Conversion funnel data
// Supports ?range=24h|7d|30d|90d
// Cached 300s — key: dash:funnel:{range}
router.get("/funnel", requirePermission("analytics.read"), async (req, res) => {
  try {
    const range = (req.query.range as string) || "30d";
    const days = daysMap[range] ?? 30;

    const result = await withCache(`dash:funnel:${range}`, 300, async () => {
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [signups, bookingsCreated, bookingsCompleted] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, start)),
        db.select({ count: sql<number>`count(*)` }).from(bookings).where(gte(bookings.createdAt, start)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(bookings)
          .where(
            and(
              gte(bookings.createdAt, start),
              sql`${bookings.status} IN ('confirmed', 'completed')`,
            ),
          ),
      ]);

      return {
        signups: Number(signups[0].count),
        bookingsCreated: Number(bookingsCreated[0].count),
        bookingsCompleted: Number(bookingsCompleted[0].count),
      };
    });

    res.json(result);
  } catch (error: any) {
    logger.error("Funnel data error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch funnel data" });
  }
});

// GET /api/admin/dashboard/booking-trends - Booking trends chart data
// Cached 300s — key: dash:trends:{days}
router.get("/booking-trends", requirePermission("analytics.read"), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const result = await withCache(`dash:trends:${days}`, 300, async () => {
      const [trends, revenueResult] = await Promise.all([
        db
          .select({
            date: sql<string>`DATE(${bookings.createdAt})`,
            status: bookings.status,
            count: sql<number>`count(*)`,
          })
          .from(bookings)
          .where(gte(bookings.createdAt, sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`))
          .groupBy(sql`DATE(${bookings.createdAt}), ${bookings.status}`)
          .orderBy(sql`DATE(${bookings.createdAt}) ASC`),
        db
          .select({
            total: sql<number>`COALESCE(SUM(${bookings.priceSnapshot}), 0)`,
          })
          .from(bookings)
          .where(
            and(
              gte(bookings.createdAt, sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`),
              eq(bookings.status, "completed"),
            ),
          ),
      ]);

      return { trends, totalRevenue: Number(revenueResult[0].total) };
    });

    res.json(result);
  } catch (error: any) {
    logger.error("Booking trends chart error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch booking trends" });
  }
});

// GET /api/admin/dashboard/platform-health - Platform health metrics
// Cached 60s — key: dash:platform-health
router.get("/platform-health", requirePermission("analytics.read"), async (_req, res) => {
  try {
    const result = await withCache("dash:platform-health", 60, async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [blockedStats, activeSessions, avgSessionDuration, pendingComplaints, verificationStats] =
        await Promise.all([
          db.select({
            total: sql<number>`count(*)`,
            blocked: sql<number>`count(*) FILTER (WHERE ${users.isBlocked} = true)`,
          }).from(users).where(notSoftDeleted(users.blockReason)),
          db.select({ count: sql<number>`count(*)` }).from(userActivitySessions).where(
            gte(userActivitySessions.loginAt, oneDayAgo)
          ),
          db.select({
            avgMinutes: sql<number>`COALESCE(AVG(${userActivitySessions.durationSeconds}) / 60, 0)`,
          }).from(userActivitySessions).where(not(isNull(userActivitySessions.logoutAt))),
          db.select({ count: sql<number>`count(*)` }).from(complaints).where(
            eq(complaints.status, "open")
          ),
          db.select({
            total: sql<number>`count(*)`,
            emailVerified: sql<number>`count(*) FILTER (WHERE ${users.emailVerified} = true)`,
            phoneVerified: sql<number>`count(*) FILTER (WHERE ${users.phoneVerified} = true)`,
          }).from(users).where(notSoftDeleted(users.blockReason)),
        ]);

      const total = Number(blockedStats[0].total) || 1;
      const totalV = Number(verificationStats[0].total) || 1;

      return {
        health: {
          blockedUserPercentage: (Number(blockedStats[0].blocked) / total) * 100,
          activeSessionsLast24h: Number(activeSessions[0].count),
          avgSessionDurationMinutes: Math.round(Number(avgSessionDuration[0].avgMinutes)),
          pendingComplaints: Number(pendingComplaints[0].count),
          emailVerificationRate: (Number(verificationStats[0].emailVerified) / totalV) * 100,
          phoneVerificationRate: (Number(verificationStats[0].phoneVerified) / totalV) * 100,
        },
      };
    });

    res.json(result);
  } catch (error: any) {
    logger.error("Platform health error", error as Error, { source: "dashboard-routes" });
    res.status(500).json({ error: "Failed to fetch platform health" });
  }
});

export default router;
