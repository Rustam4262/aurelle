import { Router } from "express";
import { isYandexConfigured } from "../yandexAuth";
import { isGoogleConfigured } from "../googleAuth";
import { isGitHubConfigured } from "../githubAuth";
import { isPhoneAuthConfigured } from "../phoneAuth";
import { isAuthenticated } from "../auth";
import { createWsToken } from "../lib/websocket";
import { db } from "../db";
import { adminUsers, adminRoles } from "@shared/admin-schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { trackUserLogout } from "../middleware/activity";

const router = Router();

// Helper to check if admin tables exist
let adminTablesExist: boolean | null = null;
async function checkAdminTablesExist(): Promise<boolean> {
  if (adminTablesExist !== null) return adminTablesExist;
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'admin_users'
      );
    `);
    adminTablesExist = result.rows[0]?.exists === true;
    return adminTablesExist;
  } catch {
    adminTablesExist = false;
    return false;
  }
}

// Get current authenticated user
router.get("/auth/user", async (req: any, res) => {
  // Check if user is authenticated via session
  if (req.session && req.session.passport?.user) {
    const user = req.session.passport.user;
    const userId = user.claims.sub;

    // Check if user is admin (only if admin tables exist)
    let adminRole = null;
    try {
      if (await checkAdminTablesExist()) {
        const adminUser = await db
          .select({
            roleName: adminRoles.name,
            roleDisplayName: adminRoles.displayName,
          })
          .from(adminUsers)
          .innerJoin(adminRoles, eq(adminUsers.roleId, adminRoles.id))
          .where(
            and(
              eq(adminUsers.userId, userId),
              eq(adminUsers.isActive, true),
              eq(adminRoles.isActive, true),
            ),
          )
          .limit(1);

        if (adminUser && adminUser.length > 0) {
          adminRole = adminUser[0].roleName;
        }
      }
    } catch (error) {
      // Silently ignore - admin tables may not exist yet
    }

    return res.json({
      id: userId,
      email: user.claims.email,
      firstName: user.claims.first_name,
      lastName: user.claims.last_name,
      profileImageUrl: user.claims.profile_image_url,
      isAdmin: !!adminRole,
      adminRole: adminRole,
    });
  }

  // User not authenticated
  return res.status(401).json({ message: "Not authenticated" });
});

// Logout endpoint (POST)
router.post("/logout", (req: any, res) => {
  if (req.session) {
    const sessionId = req.sessionID;

    // Track logout before destroying session
    trackUserLogout(sessionId);

    req.session.destroy((err: any) => {
      if (err) {
        logger.error("Logout error", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      // Clear cookie with all possible options to ensure it's removed
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      return res.json({ success: true, message: "Logged out successfully" });
    });
  } else {
    return res.json({ success: true, message: "Already logged out" });
  }
});

// Logout endpoint (GET) - for redirect-based logout
router.get("/logout", (req: any, res) => {
  if (req.session) {
    const sessionId = req.sessionID;

    // Track logout before destroying session
    trackUserLogout(sessionId);

    req.session.destroy((err: any) => {
      if (err) {
        logger.error("Logout error", err);
        return res.redirect("/auth?error=logout_failed");
      }
      // Clear cookie with all possible options
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      return res.redirect("/auth");
    });
  } else {
    return res.redirect("/auth");
  }
});

/**
 * GET /api/auth/ws-token
 * Returns a one-time 30-second token for WebSocket authentication.
 */
router.get("/auth/ws-token", isAuthenticated, async (req: any, res) => {
  const userId = req.user.claims.sub as string;
  const token = await createWsToken(userId);
  return res.json({ token });
});

// Auth providers status endpoint
router.get("/auth/providers", (_req, res) => {
  const status = {
    local: true,
    yandex: isYandexConfigured(),
    google: isGoogleConfigured(),
    github: isGitHubConfigured(),
    phone: isPhoneAuthConfigured(),
  };
  logger.debug(`[OAuth] Providers status: ${JSON.stringify({ google: status.google, yandex: status.yandex, github: status.github })}`, {
    source: "auth-routes",
  });
  res.json(status);
});

export default router;
