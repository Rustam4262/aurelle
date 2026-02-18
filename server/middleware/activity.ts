import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { userActivitySessions, userActivityActions, users } from "@shared/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { UAParser } from "ua-parser-js";
import { logger } from "../lib/logger";

// Track user login (create new session)
export async function trackUserLogin(userId: string, req: Request) {
  try {
    const sessionId = req.sessionID;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const parser = new UAParser(userAgent);
    const deviceInfo = parser.getResult();

    const [session] = await db.insert(userActivitySessions).values({
      userId,
      sessionId,
      loginAt: new Date(),
      lastActivityAt: new Date(),
      ipAddress,
      userAgent,
      deviceType: deviceInfo.device.type || "desktop",
      browser: `${deviceInfo.browser.name || "unknown"} ${deviceInfo.browser.version || ""}`.trim(),
      os: `${deviceInfo.os.name || "unknown"} ${deviceInfo.os.version || ""}`.trim(),
    }).returning();

    // Update user stats
    await db.update(users)
      .set({
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
        loginCount: sql`${users.loginCount} + 1`,
      })
      .where(eq(users.id, userId));

    logger.info(`User login tracked: ${userId} (session: ${sessionId})`, { source: "activity-middleware" });
    return session;
  } catch (error: any) {
    logger.error("Failed to track user login", error as Error, { source: "activity-middleware" });
    // Don't throw - activity tracking shouldn't break login
    return null;
  }
}

// Track user logout
export async function trackUserLogout(sessionId: string) {
  try {
    const now = new Date();

    const [session] = await db
      .select()
      .from(userActivitySessions)
      .where(and(
        eq(userActivitySessions.sessionId, sessionId),
        isNull(userActivitySessions.logoutAt)
      ))
      .limit(1);

    if (session) {
      const duration = Math.floor((now.getTime() - new Date(session.loginAt).getTime()) / 1000);

      await db.update(userActivitySessions)
        .set({
          logoutAt: now,
          durationSeconds: duration,
          updatedAt: now,
        })
        .where(eq(userActivitySessions.id, session.id));

      // Update total session time for user
      await db.update(users)
        .set({
          totalSessionTimeSeconds: sql`${users.totalSessionTimeSeconds} + ${duration}`,
        })
        .where(eq(users.id, session.userId));

      logger.info(`User logout tracked: ${session.userId} (duration: ${duration}s)`, { source: "activity-middleware" });
    }
  } catch (error: any) {
    logger.error("Failed to track user logout", error as Error, { source: "activity-middleware" });
    // Don't throw - activity tracking shouldn't break logout
  }
}

// Middleware to track activity heartbeat
export function trackActivityHeartbeat() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if not authenticated
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return next();
    }

    const user = (req as any).user;
    if (!user || !user.id) {
      return next();
    }

    const userId = user.id;
    const sessionId = req.sessionID;

    // Update in background (don't await)
    (async () => {
      try {
        // Update last activity for active session
        await db.update(userActivitySessions)
          .set({
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(
            eq(userActivitySessions.userId, userId),
            eq(userActivitySessions.sessionId, sessionId),
            isNull(userActivitySessions.logoutAt)
          ));

        // Update user's last activity
        await db.update(users)
          .set({ lastActivityAt: new Date() })
          .where(eq(users.id, userId));
      } catch (error: any) {
        logger.error("Failed to update activity heartbeat", error as Error, { source: "activity-middleware" });
      }
    })();

    next();
  };
}

// Track specific user actions
export async function trackUserAction(
  userId: string,
  sessionId: string,
  actionType: string,
  entityType?: string,
  entityId?: string,
  metadata?: any,
  req?: Request
) {
  try {
    await db.insert(userActivityActions).values({
      userId,
      sessionId,
      actionType,
      entityType,
      entityId,
      metadata: metadata ? metadata : null,
      ipAddress: req?.ip || req?.socket.remoteAddress || "unknown",
      userAgent: req?.headers["user-agent"] || "unknown",
    });

    // Increment actions count for session
    await db.update(userActivitySessions)
      .set({
        actionsCount: sql`${userActivitySessions.actionsCount} + 1`,
      })
      .where(eq(userActivitySessions.sessionId, sessionId));
  } catch (error: any) {
    logger.error("Failed to track user action", error as Error, { source: "activity-middleware" });
    // Don't throw - activity tracking shouldn't break normal operations
  }
}
