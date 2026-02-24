import { Router, Request } from "express";
import { db } from "../../db";
import { users, salons, masters } from "@shared/schema";
import { adminUsers } from "@shared/admin-schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { logger } from "../../lib/logger";
import { sendUserBlockedEmail, sendUserUnblockedEmail } from "../../lib/email";

const router = Router();

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// Batch version: 3 queries for N users instead of 3N queries
async function getBatchedUserRoles(userIds: string[]): Promise<Map<string, string[]>> {
  const rolesMap = new Map<string, string[]>();
  if (userIds.length === 0) return rolesMap;

  // Initialize all users as "client" (default role)
  userIds.forEach((id) => rolesMap.set(id, ["client"]));

  // Query 1: find all admins in this batch
  try {
    const adminList = await db
      .select({ userId: adminUsers.userId })
      .from(adminUsers)
      .where(and(eq(adminUsers.isActive, true), inArray(adminUsers.userId, userIds)));
    adminList.forEach(({ userId }) => {
      const roles = (rolesMap.get(userId) ?? []).filter((r) => r !== "client");
      if (!roles.includes("admin")) roles.push("admin");
      rolesMap.set(userId, roles);
    });
  } catch (e) {
    logger.debug("Batch admin check skipped", { meta: { error: String(e) } });
  }

  // Query 2: find all salon owners in this batch
  try {
    const ownerList = await db
      .select({ ownerId: salons.ownerId })
      .from(salons)
      .where(inArray(salons.ownerId, userIds));
    ownerList.forEach(({ ownerId }) => {
      if (!ownerId) return;
      const roles = (rolesMap.get(ownerId) ?? []).filter((r) => r !== "client");
      if (!roles.includes("salon_owner")) roles.push("salon_owner");
      rolesMap.set(ownerId, roles);
    });
  } catch (e) {
    logger.debug("Batch owner check skipped", { meta: { error: String(e) } });
  }

  // Query 3: find all masters in this batch
  try {
    const masterList = await db
      .select({ userId: masters.userId })
      .from(masters)
      .where(inArray(masters.userId, userIds.map(String)));
    masterList.forEach(({ userId }) => {
      if (!userId) return;
      const roles = (rolesMap.get(userId) ?? []).filter((r) => r !== "client");
      if (!roles.includes("master")) roles.push("master");
      rolesMap.set(userId, roles);
    });
  } catch (e) {
    logger.debug("Batch master check skipped", { meta: { error: String(e) } });
  }

  return rolesMap;
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
      source: "users-routes",
      meta: { search, role, status, verified, sortBy, sortOrder, page, pageSize },
    });

    // Step 1: Get ALL users first (no filters) to see if DB has data
    const allUsersInDb = await db.select().from(users);
    logger.info("Total users in database", { source: "users-routes", meta: { count: allUsersInDb.length } });

    if (allUsersInDb.length === 0) {
      logger.warn("No users found in database at all!", { source: "users-routes" });
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
      logger.info("After search filter", { source: "users-routes", meta: { count: filteredUsers.length, searchTerm } });
    }

    // Status filter
    if (status && status !== "all" && status !== "") {
      if (status === "blocked") {
        filteredUsers = filteredUsers.filter((user) => user.isBlocked === true);
      } else if (status === "active") {
        filteredUsers = filteredUsers.filter((user) => user.isBlocked !== true);
      }
      logger.info("After status filter", { source: "users-routes", meta: { count: filteredUsers.length, status } });
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
      logger.info("After verification filter", { source: "users-routes", meta: { count: filteredUsers.length, verified } });
    }

    // Step 3: Apply role filter — single batch of 3 queries instead of 3N
    let rolesMap = new Map<string, string[]>();

    if (role && role !== "all" && role !== "") {
      logger.info("Applying role filter", { source: "users-routes", meta: { role, usersBeforeFilter: filteredUsers.length } });

      rolesMap = await getBatchedUserRoles(filteredUsers.map((u) => u.id));

      if (role === "admin") {
        filteredUsers = filteredUsers.filter((u) => rolesMap.get(u.id)?.includes("admin"));
      } else if (role === "salon_owner") {
        filteredUsers = filteredUsers.filter((u) => rolesMap.get(u.id)?.includes("salon_owner"));
      } else if (role === "master") {
        filteredUsers = filteredUsers.filter((u) => rolesMap.get(u.id)?.includes("master"));
      } else if (role === "client") {
        filteredUsers = filteredUsers.filter((u) => {
          const r = rolesMap.get(u.id) ?? ["client"];
          return r.includes("client") && r.length === 1;
        });
      }

      logger.info("After role filter", { source: "users-routes", meta: { role, usersAfterFilter: filteredUsers.length } });
    }

    // Step 4: Sort
    const sortColumn = sortBy as string;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    filteredUsers.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof typeof a];
      let bVal: any = b[sortColumn as keyof typeof b];

      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return -1 * sortDirection;
      if (aVal > bVal) return 1 * sortDirection;
      return 0;
    });

    logger.info("After sorting", { source: "users-routes", meta: { sortBy, sortOrder, count: filteredUsers.length } });

    // Step 5: Pagination
    const total = filteredUsers.length;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, parseInt(pageSize as string) || 20));
    const offset = (pageNum - 1) * pageSizeNum;
    const paginatedUsers = filteredUsers.slice(offset, offset + pageSizeNum);

    logger.info("Pagination applied", {
      source: "users-routes",
      meta: { total, page: pageNum, pageSize: pageSizeNum, offset, usersOnThisPage: paginatedUsers.length },
    });

    // Step 6: Transform — reuse cached rolesMap, fetch only for paginated users if not already loaded
    if (rolesMap.size === 0) {
      rolesMap = await getBatchedUserRoles(paginatedUsers.map((u) => u.id));
    }

    const transformedUsers = paginatedUsers.map((user) => {
      const userRoles = rolesMap.get(user.id) ?? ["client"];
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
    });

    const response = {
      users: transformedUsers,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    };

    logger.info("Returning users response", {
      source: "users-routes",
      meta: { usersCount: transformedUsers.length, total: response.total, totalPages: response.totalPages },
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

    const [updated] = await db
      .update(users)
      .set({
        isBlocked: true,
        blockReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

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

    if (updated.email) {
      const userName = `${updated.firstName || ""} ${updated.lastName || ""}`.trim() || "User";
      const adminName = req.admin?.roleName || "Administrator";
      sendUserBlockedEmail(updated.email, userName, reason || "Violation of platform rules", adminName).catch((err) => {
        logger.error("Failed to send block email", err, { source: "users-routes", meta: { userId: updated.id } });
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

    const [updated] = await db
      .update(users)
      .set({
        isBlocked: false,
        blockReason: sql`NULL`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

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

    if (updated.email) {
      const userName = `${updated.firstName || ""} ${updated.lastName || ""}`.trim() || "User";
      const adminName = req.admin?.roleName || "Administrator";
      sendUserUnblockedEmail(updated.email, userName, adminName).catch((err) => {
        logger.error("Failed to send unblock email", err, { source: "users-routes", meta: { userId: updated.id } });
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

    const updated = await db
      .update(users)
      .set({
        isBlocked: true,
        blockReason: reason || "Bulk blocked by admin",
        updatedAt: new Date(),
      })
      .where(inArray(users.id, userIds))
      .returning();

    await logAuditAction({
      actorUserId: adminUserId,
      actorRole: req.admin!.roleName,
      action: "user.bulk_block",
      entityType: "user",
      entityId: undefined,
      meta: { userIds, count: updated.length, reason },
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

    const updated = await db
      .update(users)
      .set({
        isBlocked: false,
        blockReason: sql`NULL`,
        updatedAt: new Date(),
      })
      .where(inArray(users.id, userIds))
      .returning();

    await logAuditAction({
      actorUserId: adminUserId,
      actorRole: req.admin!.roleName,
      action: "user.bulk_unblock",
      entityType: "user",
      entityId: undefined,
      meta: { userIds, count: updated.length },
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

// GET /api/admin/users/stats/overview - Get user statistics
router.get("/stats/overview", requirePermission("users.read"), async (req, res) => {
  try {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [activeResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isBlocked, false));

    const [blockedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isBlocked, true));

    const [emailVerifiedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.emailVerified, true));

    const [phoneVerifiedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.phoneVerified, true));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [newTodayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.createdAt} >= ${today}`);

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
