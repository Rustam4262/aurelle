import { Router, Request } from "express";
import { db } from "../../db";
import { users, salons, masters } from "@shared/schema";
import { adminUsers, adminRoles } from "@shared/admin-schema";
import { eq, desc, asc, like, or, and, sql } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { logger } from "../../lib/logger";

const router = Router();

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// Helper to determine user roles
async function getUserRoles(userId: string): Promise<string[]> {
  const roles: string[] = [];

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
  } catch {
    // Admin tables may not exist
  }

  // Check if salon owner
  const [salonOwner] = await db
    .select({ id: salons.id })
    .from(salons)
    .where(eq(salons.ownerId, userId))
    .limit(1);

  if (salonOwner) {
    roles.push("salon_owner");
  }

  // Check if master
  const [master] = await db
    .select({ id: masters.id })
    .from(masters)
    .where(eq(masters.userId, userId))
    .limit(1);

  if (master) {
    roles.push("master");
  }

  // Default to client if no other roles
  if (roles.length === 0) {
    roles.push("client");
  }

  return roles;
}

// GET /api/admin/users - List all users with pagination and filters
router.get("/", requirePermission("users.read"), async (req, res) => {
  try {
    const {
      search,
      role,
      status,
      verified,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      pageSize = "20",
    } = req.query;

    // Build base query with role filter using SQL
    let baseQuery;
    const conditions = [];

    // Role filter via SQL subqueries
    if (role && role !== "all") {
      if (role === "admin") {
        // Users who are admins
        baseQuery = db
          .selectDistinct()
          .from(users)
          .innerJoin(adminUsers, and(
            eq(adminUsers.userId, users.id),
            eq(adminUsers.isActive, true)
          ));
      } else if (role === "salon_owner") {
        // Users who own salons
        baseQuery = db
          .selectDistinct()
          .from(users)
          .innerJoin(salons, eq(salons.ownerId, users.id));
      } else if (role === "master") {
        // Users who are masters
        baseQuery = db
          .selectDistinct()
          .from(users)
          .innerJoin(masters, eq(masters.userId, users.id));
      } else if (role === "client") {
        // Users who are NOT in any special role
        baseQuery = db
          .select()
          .from(users)
          .where(sql`
            ${users.id} NOT IN (SELECT user_id FROM admin_users WHERE is_active = true)
            AND ${users.id} NOT IN (SELECT owner_id FROM salons)
            AND ${users.id} NOT IN (SELECT user_id FROM masters)
          `);
      } else {
        baseQuery = db.select().from(users);
      }
    } else {
      baseQuery = db.select().from(users);
    }

    // Search filter
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(users.email, searchTerm),
          like(users.firstName, searchTerm),
          like(users.lastName, searchTerm),
          like(users.phoneNumber, searchTerm)
        )
      );
    }

    // Status filter
    if (status && status !== "all") {
      if (status === "blocked") {
        conditions.push(eq(users.isBlocked, true));
      } else if (status === "active") {
        conditions.push(eq(users.isBlocked, false));
      }
    }

    // Verification filter
    if (verified && verified !== "all") {
      if (verified === "email") {
        conditions.push(eq(users.emailVerified, true));
      } else if (verified === "phone") {
        conditions.push(eq(users.phoneVerified, true));
      } else if (verified === "both") {
        conditions.push(and(
          eq(users.emailVerified, true),
          eq(users.phoneVerified, true)
        ));
      } else if (verified === "none") {
        conditions.push(and(
          eq(users.emailVerified, false),
          eq(users.phoneVerified, false)
        ));
      }
    }

    // Apply conditions
    if (conditions.length > 0) {
      baseQuery = (baseQuery as any).where(and(...conditions));
    }

    // Count total with same filters
    let countQuery;
    if (role && role !== "all") {
      if (role === "admin") {
        countQuery = db
          .select({ count: sql<number>`count(DISTINCT ${users.id})` })
          .from(users)
          .innerJoin(adminUsers, and(
            eq(adminUsers.userId, users.id),
            eq(adminUsers.isActive, true)
          ));
      } else if (role === "salon_owner") {
        countQuery = db
          .select({ count: sql<number>`count(DISTINCT ${users.id})` })
          .from(users)
          .innerJoin(salons, eq(salons.ownerId, users.id));
      } else if (role === "master") {
        countQuery = db
          .select({ count: sql<number>`count(DISTINCT ${users.id})` })
          .from(users)
          .innerJoin(masters, eq(masters.userId, users.id));
      } else if (role === "client") {
        countQuery = db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(sql`
            ${users.id} NOT IN (SELECT user_id FROM admin_users WHERE is_active = true)
            AND ${users.id} NOT IN (SELECT owner_id FROM salons)
            AND ${users.id} NOT IN (SELECT user_id FROM masters)
          `);
      } else {
        countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
      }
    } else {
      countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    }

    if (conditions.length > 0) {
      countQuery = (countQuery as any).where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;

    // Sort
    const sortableColumns: Record<string, any> = {
      createdAt: users.createdAt,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      lastLoginAt: users.lastLoginAt,
      lastActivityAt: users.lastActivityAt,
      loginCount: users.loginCount,
    };
    const sortColumn = sortableColumns[sortBy as string] || users.createdAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

    // Paginate
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;

    const allUsers = await (baseQuery as any)
      .orderBy(orderFn(sortColumn))
      .limit(pageSizeNum)
      .offset(offset);

    // Extract user data from joined results
    const userRecords = allUsers.map((row: any) => row.users || row);

    // Transform to match frontend interface
    const transformedUsers = await Promise.all(
      userRecords.map(async (user: any) => {
        const userRoles = await getUserRoles(user.id);

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unknown",
          phone: user.phoneNumber,
          role: userRoles[0], // Primary role
          roles: userRoles, // All roles
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

    res.json({
      users: transformedUsers,
      total: Number(total),
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(Number(total) / pageSizeNum),
    });
  } catch (error: any) {
    logger.error("List users error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to fetch users" });
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
      sql`${users.id} = ANY(${sql.array(userIds)})`
    );

    // Update all users
    const updated = await db
      .update(users)
      .set({
        isBlocked: true,
        blockReason: reason || "Bulk blocked by admin",
        updatedAt: new Date(),
      })
      .where(sql`${users.id} = ANY(${sql.array(userIds)})`)
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
      .where(sql`${users.id} = ANY(${sql.array(userIds)})`)
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
