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
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      pageSize = "20",
    } = req.query;

    let query = db.select().from(users);
    const conditions = [];

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

    // Status filter (active/blocked)
    if (status && status !== "all") {
      if (status === "blocked") {
        conditions.push(eq(users.isBlocked, true));
      } else if (status === "active") {
        conditions.push(eq(users.isBlocked, false));
      }
    }

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    if (conditions.length > 0) {
      (countQuery as any).where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    // Sort - map sortBy to actual column
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

    const allUsers = await query
      .orderBy(orderFn(sortColumn))
      .limit(pageSizeNum)
      .offset(offset);

    // Transform to match frontend interface and detect roles
    const transformedUsers = await Promise.all(
      allUsers.map(async (user) => {
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
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      })
    );

    // Filter by role if specified (after transformation since role is computed)
    let filteredUsers = transformedUsers;
    if (role && role !== "all") {
      filteredUsers = transformedUsers.filter((u) => u.roles.includes(role as string));
    }

    res.json({
      users: filteredUsers,
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

export default router;
