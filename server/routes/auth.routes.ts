import { Router } from "express";
import { isYandexConfigured } from "../yandexAuth";
import { isGoogleConfigured } from "../googleAuth";
import { isGitHubConfigured } from "../githubAuth";
import { isPhoneAuthConfigured } from "../phoneAuth";
import { db } from "../db";
import { adminUsers, adminRoles } from "@shared/admin-schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Get current authenticated user
router.get("/auth/user", async (req: any, res) => {
  // Check if user is authenticated via session
  if (req.session && req.session.passport?.user) {
    const user = req.session.passport.user;
    const userId = user.claims.sub;

    // Check if user is admin
    let adminRole = null;
    try {
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
            eq(adminRoles.isActive, true)
          )
        )
        .limit(1);

      if (adminUser && adminUser.length > 0) {
        adminRole = adminUser[0].roleName;
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
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
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
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
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
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

// Auth providers status endpoint
router.get("/auth/providers", (_req, res) => {
  res.json({
    local: true,
    yandex: isYandexConfigured(),
    google: isGoogleConfigured(),
    github: isGitHubConfigured(),
    phone: isPhoneAuthConfigured(),
  });
});

export default router;
