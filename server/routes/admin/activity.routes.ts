import { Router } from "express";
import { db } from "../../db";
import { userActivitySessions, userActivityActions, users } from "@shared/schema";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { requirePermission } from "../../middleware/admin";
import { logger } from "../../lib/logger";

const router = Router();
const ACTIVE_SESSION_TTL_MS = 30 * 60 * 1000;

// GET /api/admin/activity/sessions - List user sessions
router.get("/sessions", requirePermission("analytics.read"), async (req, res) => {
  try {
    const { userId, limit = "50", offset = "0", activeOnly } = req.query;
    const activeSince = new Date(Date.now() - ACTIVE_SESSION_TTL_MS);

    let query = db
      .select({
        session: userActivitySessions,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(userActivitySessions)
      .leftJoin(users, eq(userActivitySessions.userId, users.id));

    const conditions = [];

    if (userId) {
      conditions.push(eq(userActivitySessions.userId, userId as string));
    }

    if (activeOnly === "true") {
      conditions.push(isNull(userActivitySessions.logoutAt));
      conditions.push(gte(userActivitySessions.lastActivityAt, activeSince));
    }

    if (process.env.NODE_ENV === "production") {
      conditions.push(
        sql`(${userActivitySessions.ipAddress} IS NULL OR ${userActivitySessions.ipAddress} NOT IN ('127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'))`,
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const sessions = await query
      .orderBy(desc(userActivitySessions.loginAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const normalized = sessions.map((row) => ({
      ...row,
      session: {
        ...row.session,
        logoutAt:
          row.session.logoutAt ??
          (new Date(row.session.lastActivityAt).getTime() < activeSince.getTime()
            ? row.session.lastActivityAt
            : null),
      },
    }));

    res.json({ sessions: normalized });
  } catch (error: any) {
    logger.error("List sessions error", error as Error, { source: "activity-routes" });
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// GET /api/admin/activity/online - Currently online users
router.get("/online", requirePermission("analytics.read"), async (req, res) => {
  try {
    // Active sessions in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const onlineUsers = await db
      .select({
        userId: userActivitySessions.userId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        lastActivityAt: userActivitySessions.lastActivityAt,
        loginAt: userActivitySessions.loginAt,
        deviceType: userActivitySessions.deviceType,
        browser: userActivitySessions.browser,
        os: userActivitySessions.os,
      })
      .from(userActivitySessions)
      .leftJoin(users, eq(userActivitySessions.userId, users.id))
      .where(
        and(
          isNull(userActivitySessions.logoutAt),
          gte(userActivitySessions.lastActivityAt, tenMinutesAgo),
          process.env.NODE_ENV === "production"
            ? sql`(${userActivitySessions.ipAddress} IS NULL OR ${userActivitySessions.ipAddress} NOT IN ('127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'))`
            : sql`true`
        )
      )
      .orderBy(desc(userActivitySessions.lastActivityAt));

    res.json({ onlineUsers, count: onlineUsers.length });
  } catch (error: any) {
    logger.error("Get online users error", error as Error, { source: "activity-routes" });
    res.status(500).json({ error: "Failed to fetch online users" });
  }
});

// GET /api/admin/activity/stats - Activity statistics for a user
router.get("/stats", requirePermission("analytics.read"), async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // User stats
    const [user] = await db
      .select({
        loginCount: users.loginCount,
        totalSessionTime: users.totalSessionTimeSeconds,
        lastLoginAt: users.lastLoginAt,
        lastActivityAt: users.lastActivityAt,
      })
      .from(users)
      .where(eq(users.id, userId as string));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Session stats
    const [sessionStats] = await db
      .select({
        totalSessions: sql<number>`count(*)`,
        avgDuration: sql<number>`avg(${userActivitySessions.durationSeconds})`,
        totalActions: sql<number>`sum(${userActivitySessions.actionsCount})`,
      })
      .from(userActivitySessions)
      .where(eq(userActivitySessions.userId, userId as string));

    res.json({
      user,
      sessions: {
        total: Number(sessionStats?.totalSessions || 0),
        avgDurationSeconds: Number(sessionStats?.avgDuration || 0),
        totalActions: Number(sessionStats?.totalActions || 0),
      },
    });
  } catch (error: any) {
    logger.error("Get activity stats error", error as Error, { source: "activity-routes" });
    res.status(500).json({ error: "Failed to fetch activity stats" });
  }
});

// GET /api/admin/activity/actions - List user actions
router.get("/actions", requirePermission("analytics.read"), async (req, res) => {
  try {
    const { userId, sessionId, actionType, limit = "100", offset = "0" } = req.query;

    let query = db
      .select({
        action: userActivityActions,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(userActivityActions)
      .leftJoin(users, eq(userActivityActions.userId, users.id));

    const conditions = [];

    if (userId) {
      conditions.push(eq(userActivityActions.userId, userId as string));
    }

    if (sessionId) {
      conditions.push(eq(userActivityActions.sessionId, sessionId as string));
    }

    if (actionType) {
      conditions.push(eq(userActivityActions.actionType, actionType as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const actions = await query
      .orderBy(desc(userActivityActions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ actions });
  } catch (error: any) {
    logger.error("List actions error", error as Error, { source: "activity-routes" });
    res.status(500).json({ error: "Failed to fetch actions" });
  }
});

export default router;
