import { Router, Request } from "express";
import { db } from "../../db";
import { users, salons, masters } from "@shared/schema";
import { adminUsers, adminRoles } from "@shared/admin-schema";
import { eq, desc, asc, like, or, and, sql, inArray } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { logger } from "../../lib/logger";
import { sendUserBlockedEmail, sendUserUnblockedEmail } from "../../lib/email";

const router = Router();

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// Helper to determine user roles
async function getUserRoles(userId: string): Promise<string[]> {
  const roles: string[] = [];

  try {
    // Check if admin
    try {
      const [adminUser] = await db
        .select()
        .from(adminUsers)
        .where(and(eq(adminUsers.userId, userId), eq(adminUsers.isActive, true)))
        .limit(1);

      if (adminUser) {
        roles.push("admin");
      }
    } catch (error) {
      // Admin tables may not exist, skip silently
      logger.debug("Admin check skipped", { userId, error: String(error) });
    }

    // Check if salon owner
    try {
      const [salonOwner] = await db
        .select({ id: salons.id })
        .from(salons)
        .where(eq(salons.ownerId, userId))
        .limit(1);

      if (salonOwner) {
        roles.push("salon_owner");
      }
    } catch (error) {
      logger.debug("Salon owner check failed", { userId, error: String(error) });
    }

    // Check if master
    try {
      const [master] = await db
        .select({ id: masters.id })
        .from(masters)
        .where(eq(masters.userId, userId))
        .limit(1);

      if (master) {
        roles.push("master");
      }
    } catch (error) {
      logger.debug("Master check failed", { userId, error: String(error) });
    }

    // Default to client if no other roles
    if (roles.length === 0) {
      roles.push("client");
    }
  } catch (error) {
    // Fallback to client if all checks fail
    logger.error("getUserRoles failed completely", error as Error, { userId });
    roles.push("client");
  }

  return roles;
}

// GET /api/admin/users - List all users with pagination and filters
router.get("/", requirePermission("users.read"), async (req, res) => {
  try {
    const {
      search = "",
      role = "",
      status = "",
      verified = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      pageSize = "20",
    } = req.query;

    logger.info("Admin users request params", {
      search,
      role,
      status,
      verified,
      sortBy,
      sortOrder,
      page,
      pageSize,
    });

    // Step 1: Get ALL users first (no filters) to see if DB has data
    const allUsersInDb = await db.select().from(users);
    logger.info("Total users in database", { count: allUsersInDb.length });

    if (allUsersInDb.length === 0) {
      logger.warn("No users found in database at all!");
      return res.json({
        users: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    }

    // Step 2: Apply basic filters (status, search, verified)
    let filteredUsers = [...allUsersInDb];

    // Search filter
    if (search && typeof search === "string" && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filteredUsers = filteredUsers.filter((user) => {
        const email = (user.email || "").toLowerCase();
        const firstName = (user.firstName || "").toLowerCase();
        const lastName = (user.lastName || "").toLowerCase();
        const phone = (user.phoneNumber || "").toLowerCase();
        return (
          email.includes(searchTerm) ||
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          phone.includes(searchTerm)
        );
      });
      logger.info("After search filter", { count: filteredUsers.length, searchTerm });
    }

    // Status filter
    if (status && status !== "all" && status !== "") {
      if (status === "blocked") {
        filteredUsers = filteredUsers.filter((user) => user.isBlocked === true);
      } else if (status === "active") {
        filteredUsers = filteredUsers.filter((user) => user.isBlocked !== true);
      }
      logger.info("After status filter", { count: filteredUsers.length, status });
    }

    // Verification filter
    if (verified && verified !== "all" && verified !== "") {
      if (verified === "email") {
        filteredUsers = filteredUsers.filter((user) => user.emailVerified === true);
      } else if (verified === "phone") {
        filteredUsers = filteredUsers.filter((user) => user.phoneVerified === true);
      } else if (verified === "both") {
        filteredUsers = filteredUsers.filter(
          (user) => user.emailVerified === true && user.phoneVerified === true
        );
      } else if (verified === "none") {
        filteredUsers = filteredUsers.filter(
          (user) => user.emailVerified !== true && user.phoneVerified !== true
        );
      }
      logger.info("After verification filter", { count: filteredUsers.length, verified });
    }

    // Step 3: Apply role filter (requires async operations)
    if (role && role !== "all" && role !== "") {
      logger.info("Applying role filter", { role, usersBeforeFilter: filteredUsers.length });

      const usersWithRoles = await Promise.all(
        filteredUsers.map(async (user) => {
          try {
            const userRoles = await getUserRoles(user.id);
            return { user, roles: userRoles };
          } catch (error) {
            logger.error("Failed to get roles for user", error as Error, { userId: user.id });
            return { user, roles: ["client"] }; // Fallback to client
          }
        })
      );

      if (role === "admin") {
        filteredUsers = usersWithRoles
          .filter(({ roles }) => roles.includes("admin"))
          .map(({ user }) => user);
      } else if (role === "salon_owner") {
        filteredUsers = usersWithRoles
          .filter(({ roles }) => roles.includes("salon_owner"))
          .map(({ user }) => user);
      } else if (role === "master") {
        filteredUsers = usersWithRoles
          .filter(({ roles }) => roles.includes("master"))
          .map(({ user }) => user);
      } else if (role === "client") {
        filteredUsers = usersWithRoles
          .filter(({ roles }) => roles.includes("client") && roles.length === 1)
          .map(({ user }) => user);
      }

      logger.info("After role filter", { role, usersAfterFilter: filteredUsers.length });
    }

    // Step 4: Sort
    const sortColumn = sortBy as string;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    filteredUsers.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof typeof a];
      let bVal: any = b[sortColumn as keyof typeof b];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      // Handle dates
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();

      // Handle strings
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return -1 * sortDirection;
      if (aVal > bVal) return 1 * sortDirection;
      return 0;
    });

    logger.info("After sorting", { sortBy, sortOrder, count: filteredUsers.length });

    // Step 5: Pagination
    const total = filteredUsers.length;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, parseInt(pageSize as string) || 20));
    const offset = (pageNum - 1) * pageSizeNum;
    const paginatedUsers = filteredUsers.slice(offset, offset + pageSizeNum);

    logger.info("Pagination applied", {
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      offset,
      usersOnThisPage: paginatedUsers.length,
    });

    // Step 6: Transform to frontend format
    const transformedUsers = await Promise.all(
      paginatedUsers.map(async (user) => {
        let userRoles: string[] = ["client"];
        try {
          userRoles = await getUserRoles(user.id);
        } catch (error) {
          logger.error("Failed to get roles during transform", error as Error, { userId: user.id });
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unknown",
          phone: user.phoneNumber,
          role: userRoles[0] || "client",
          roles: userRoles,
          status: user.isBlocked ? "blocked" : "active",
          isBlocked: user.isBlocked || false,
          blockReason: user.blockReason,
          lastLoginAt: user.lastLoginAt,
          lastActivityAt: user.lastActivityAt,
          loginCount: user.loginCount || 0,
          isEmailVerified: user.emailVerified || false,
          isPhoneVerified: user.phoneVerified || false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      })
    );

    const response = {
      users: transformedUsers,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    };

    logger.info("Returning users response", {
      usersCount: transformedUsers.length,
      total: response.total,
      totalPages: response.totalPages,
    });

    res.json(response);
  } catch (error: any) {
    logger.error("List users error", error as Error, { source: "users-routes" });
    console.error("Admin users detailed error:", error);
    res.status(500).json({
      error: "Failed to fetch users",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/admin/users/:id - Get single user
router.get("/:id", requirePermission("users.read"), async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error: any) {
    logger.error("Get user error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/admin/users/:id - Update user
router.patch("/:id", requirePermission("users.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phoneNumber } = req.body;
    const userId = getUserId(req);

    const [oldUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "user.update",
      entityType: "user",
      entityId: id,
      oldData: oldUser,
      newData: updated,
      req,
    });

    res.json({ user: updated });
  } catch (error: any) {
    logger.error("Update user error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to update user" });
  }
});

// POST /api/admin/users/:id/block - Block user
router.post("/:id/block", requirePermission("users.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = getUserId(req);

    const [oldUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Actually update database
    const [updated] = await db
      .update(users)
      .set({
        isBlocked: true,
        blockReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    // Log action
    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "user.block",
      entityType: "user",
      entityId: id,
      oldData: { isBlocked: oldUser.isBlocked, blockReason: oldUser.blockReason },
      newData: { isBlocked: true, blockReason: reason },
      req,
    });

    // Send email notification (non-blocking)
    if (updated.email) {
      const userName = `${updated.firstName || ""} ${updated.lastName || ""}`.trim() || "User";
      const adminName = req.admin?.roleName || "Administrator";
      sendUserBlockedEmail(updated.email, userName, reason || "Violation of platform rules", adminName).catch((err) => {
        logger.error("Failed to send block email", err, { userId: updated.id, source: "users-routes" });
      });
    }

    res.json({ user: updated, message: "User blocked successfully" });
  } catch (error: any) {
    logger.error("Block user error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to block user" });
  }
});

// POST /api/admin/users/:id/unblock - Unblock user
router.post("/:id/unblock", requirePermission("users.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const [oldUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Actually update database
    const [updated] = await db
      .update(users)
      .set({
        isBlocked: false,
        blockReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    // Log action
    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "user.unblock",
      entityType: "user",
      entityId: id,
      oldData: { isBlocked: oldUser.isBlocked },
      newData: { isBlocked: false },
      req,
    });

    // Send email notification (non-blocking)
    if (updated.email) {
      const userName = `${updated.firstName || ""} ${updated.lastName || ""}`.trim() || "User";
      const adminName = req.admin?.roleName || "Administrator";
      sendUserUnblockedEmail(updated.email, userName, adminName).catch((err) => {
        logger.error("Failed to send unblock email", err, { userId: updated.id, source: "users-routes" });
      });
    }

    res.json({ user: updated, message: "User unblocked successfully" });
  } catch (error: any) {
    logger.error("Unblock user error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

// DELETE /api/admin/users/:id - Soft delete user
router.delete("/:id", requirePermission("users.delete"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const [oldUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Soft delete by marking as deleted (if you have such field)
    // For now, just log the action
    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "user.delete",
      entityType: "user",
      entityId: id,
      oldData: oldUser,
      req,
    });

    res.json({ message: "User deleted" });
  } catch (error: any) {
    logger.error("Delete user error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// POST /api/admin/users/bulk/block - Block multiple users
router.post("/bulk/block", requirePermission("users.write"), async (req, res) => {
  try {
    const { userIds, reason } = req.body;
    const adminUserId = getUserId(req);

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds array is required" });
    }

    if (userIds.length > 100) {
      return res.status(400).json({ error: "Maximum 100 users can be blocked at once" });
    }

    // Get users before update
    const oldUsers = await db.select().from(users).where(
      inArray(users.id, userIds)
    );

    // Update all users
    const updated = await db
      .update(users)
      .set({
        isBlocked: true,
        blockReason: reason || "Bulk blocked by admin",
        updatedAt: new Date(),
      })
      .where(inArray(users.id, userIds))
      .returning();

    // Log bulk action
    await logAuditAction({
      actorUserId: adminUserId,
      actorRole: req.admin!.roleName,
      action: "user.bulk_block",
      entityType: "user",
      entityId: null,
      meta: {
        userIds,
        count: updated.length,
        reason,
      },
      req,
    });

    res.json({
      message: `Successfully blocked ${updated.length} users`,
      count: updated.length,
      users: updated,
    });
  } catch (error: any) {
    logger.error("Bulk block users error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to block users" });
  }
});

// POST /api/admin/users/bulk/unblock - Unblock multiple users
router.post("/bulk/unblock", requirePermission("users.write"), async (req, res) => {
  try {
    const { userIds } = req.body;
    const adminUserId = getUserId(req);

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds array is required" });
    }

    if (userIds.length > 100) {
      return res.status(400).json({ error: "Maximum 100 users can be unblocked at once" });
    }

    // Update all users
    const updated = await db
      .update(users)
      .set({
        isBlocked: false,
        blockReason: null,
        updatedAt: new Date(),
      })
      .where(inArray(users.id, userIds))
      .returning();

    // Log bulk action
    await logAuditAction({
      actorUserId: adminUserId,
      actorRole: req.admin!.roleName,
      action: "user.bulk_unblock",
      entityType: "user",
      entityId: null,
      meta: {
        userIds,
        count: updated.length,
      },
      req,
    });

    res.json({
      message: `Successfully unblocked ${updated.length} users`,
      count: updated.length,
      users: updated,
    });
  } catch (error: any) {
    logger.error("Bulk unblock users error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to unblock users" });
  }
});

// GET /api/admin/users/stats - Get user statistics
router.get("/stats/overview", requirePermission("users.read"), async (req, res) => {
  try {
    // Total users
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    // Active users (not blocked)
    const [activeResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isBlocked, false));

    // Blocked users
    const [blockedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isBlocked, true));

    // Users by email verification
    const [emailVerifiedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.emailVerified, true));

    // Users by phone verification
    const [phoneVerifiedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.phoneVerified, true));

    // New users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [newTodayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.createdAt} >= ${today}`);

    // Active users (logged in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeWeekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.lastActivityAt} >= ${sevenDaysAgo}`);

    res.json({
      total: Number(totalResult.count),
      active: Number(activeResult.count),
      blocked: Number(blockedResult.count),
      emailVerified: Number(emailVerifiedResult.count),
      phoneVerified: Number(phoneVerifiedResult.count),
      newToday: Number(newTodayResult.count),
      activeLastWeek: Number(activeWeekResult.count),
    });
  } catch (error: any) {
    logger.error("Get users stats error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

export default router;
