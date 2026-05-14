import { Router, Request } from "express";
import { db } from "../../db";
import { users, salons, masters, userProfiles, bookings } from "@shared/schema";
import { adminUsers } from "@shared/admin-schema";
import { eq, and, or, sql, inArray, ilike, desc, asc, count } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { logger } from "../../lib/logger";
import { sendUserBlockedEmail, sendUserUnblockedEmail } from "../../lib/email";
import {
  buildSoftDeleteReason,
  isSoftDeletedUser,
  notSoftDeleted,
  parseSoftDeleteReason,
} from "../../lib/user-deletion";

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
    logger.debug("Batch salon owner check skipped", { meta: { error: String(e) } });
  }

  // Query 3: find all masters in this batch
  try {
    const masterList = await db
      .select({ userId: masters.userId })
      .from(masters)
      .where(inArray(masters.userId, userIds));
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

// GET /api/admin/users — List users with server-side filtering, sorting, pagination.
// All filtering happens in PostgreSQL — no full table scan into JS memory.
router.get("/", requirePermission("users.read"), async (req, res) => {
  try {
    const {
      search    = "",
      role      = "",
      status    = "",
      verified  = "",
      sortBy    = "createdAt",
      sortOrder = "desc",
      page      = "1",
      pageSize  = "20",
    } = req.query as Record<string, string>;

    const pageNum     = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, parseInt(pageSize) || 20));
    const offsetVal   = (pageNum - 1) * pageSizeNum;

    // ── Build WHERE conditions ──────────────────────────────────────────────
    const conditions = [];

    // Full-text style search: ILIKE on email / first_name / last_name / phone
    if (search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(users.email, q),
          ilike(users.firstName, q),
          ilike(users.lastName, q),
          ilike(users.phoneNumber, q),
        ),
      );
    }

    // Status (blocked / active)
    if (status === "blocked") {
      conditions.push(eq(users.isBlocked, true));
      conditions.push(notSoftDeleted(users.blockReason));
    } else if (status === "active") {
      conditions.push(eq(users.isBlocked, false));
      conditions.push(notSoftDeleted(users.blockReason));
    } else if (status === "deleted") {
      conditions.push(eq(users.isBlocked, true));
      conditions.push(sql`${users.blockReason} LIKE ${"__SOFT_DELETED__:%"}`);
    }

    // Verification
    if (verified === "email") {
      conditions.push(eq(users.emailVerified, true));
    } else if (verified === "phone") {
      conditions.push(eq(users.phoneVerified, true));
    } else if (verified === "both") {
      conditions.push(and(eq(users.emailVerified, true), eq(users.phoneVerified, true)));
    } else if (verified === "none") {
      conditions.push(and(eq(users.emailVerified, false), eq(users.phoneVerified, false)));
    }

    // Role — derived from 3 separate tables, handled via SQL subqueries
    if (role && role !== "all") {
      if (role === "admin") {
        conditions.push(
          sql`${users.id} IN (SELECT user_id FROM admin_users WHERE is_active = true)`,
        );
      } else if (role === "salon_owner") {
        conditions.push(
          sql`${users.id} IN (SELECT owner_id FROM salons WHERE owner_id IS NOT NULL)`,
        );
      } else if (role === "master") {
        conditions.push(
          sql`${users.id} IN (SELECT user_id FROM masters WHERE user_id IS NOT NULL)`,
        );
      } else if (role === "client") {
        conditions.push(
          sql`${users.id} NOT IN (SELECT user_id FROM admin_users WHERE is_active = true)`,
        );
        conditions.push(
          sql`${users.id} NOT IN (SELECT owner_id FROM salons WHERE owner_id IS NOT NULL)`,
        );
        conditions.push(
          sql`${users.id} NOT IN (SELECT user_id FROM masters WHERE user_id IS NOT NULL)`,
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // ── Sort column map ─────────────────────────────────────────────────────
    const SORT_COLS: Record<string, typeof users.createdAt | typeof users.lastLoginAt | typeof users.email | typeof users.firstName> = {
      createdAt:   users.createdAt,
      lastLoginAt: users.lastLoginAt,
      email:       users.email,
      firstName:   users.firstName,
    };
    const sortCol = SORT_COLS[sortBy] ?? users.createdAt;
    const order   = sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

    // ── COUNT + paginated SELECT in parallel ────────────────────────────────
    const [countResult, pageUsers] = await Promise.all([
      db.select({ count: count() }).from(users).where(whereClause),
      db.select().from(users).where(whereClause).orderBy(order).limit(pageSizeNum).offset(offsetVal),
    ]);

    const total = Number(countResult[0].count);

    // ── Batch role resolution for just this page (3 queries) ───────────────
    const pageRolesMap = await getBatchedUserRoles(pageUsers.map((u) => u.id));

    const transformedUsers = pageUsers.map((user) => {
      const userRoles = pageRolesMap.get(user.id) ?? ["client"];
      const softDeleteMeta = parseSoftDeleteReason(user.blockReason);
      const isDeleted = !!softDeleteMeta;
      return {
        id:              user.id,
        email:           user.email,
        firstName:       user.firstName,
        lastName:        user.lastName,
        fullName:        `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unknown",
        phone:           user.phoneNumber,
        role:            userRoles[0] || "client",
        roles:           userRoles,
        status:          isDeleted ? "deleted" : user.isBlocked ? "blocked" : "active",
        isBlocked:       user.isBlocked || false,
        isDeleted,
        blockReason:     isDeleted ? (softDeleteMeta?.reason || "Удалён администратором") : user.blockReason,
        deletedAt:       softDeleteMeta?.deletedAt ?? null,
        lastLoginAt:     user.lastLoginAt,
        lastActivityAt:  user.lastActivityAt,
        loginCount:      user.loginCount || 0,
        isEmailVerified: user.emailVerified || false,
        isPhoneVerified: user.phoneVerified || false,
        createdAt:       user.createdAt,
        updatedAt:       user.updatedAt,
      };
    });

    res.json({
      users: transformedUsers,
      total,
      page:       pageNum,
      pageSize:   pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    });
  } catch (error: any) {
    logger.error("List users error", error as Error, { source: "users-routes" });
    res.status(500).json({
      error: "Failed to fetch users",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/admin/users/:id - Get single user
router.get("/:id", requirePermission("users.read"), async (req, res) => {
  try {
    const { id } = req.params;
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Enrich with profile and recent bookings
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, id)).limit(1);
    const recentBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.clientId, profile?.id ?? ""))
      .orderBy(desc(bookings.bookingDate))
      .limit(10);

    const softDeleteMeta = parseSoftDeleteReason(user.blockReason);

    res.json({
      user: {
        ...user,
        status: softDeleteMeta ? "deleted" : user.isBlocked ? "blocked" : "active",
        isDeleted: !!softDeleteMeta,
        deletedAt: softDeleteMeta?.deletedAt ?? null,
        blockReason: softDeleteMeta ? (softDeleteMeta.reason || "Удалён администратором") : user.blockReason,
      },
      profile: profile ?? null,
      recentBookings,
    });
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

    if (isSoftDeletedUser(oldUser)) {
      return res.status(400).json({ error: "Deleted users cannot be blocked again" });
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

    if (isSoftDeletedUser(oldUser)) {
      return res.status(400).json({ error: "Use restore for deleted users" });
    }

    const [updated, hiddenSalons, hiddenMasters] = await db.transaction(async (tx) => {
      const [blockedUser] = await tx
        .update(users)
        .set({
          isBlocked: true,
          blockReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      const salonsHidden = await tx
        .update(salons)
        .set({
          isActive: false,
          status: "paused",
          updatedAt: new Date(),
        })
        .where(eq(salons.ownerId, id))
        .returning({ id: salons.id });

      const mastersHidden = await tx
        .update(masters)
        .set({
          isActive: false,
          status: "paused",
        })
        .where(eq(masters.userId, id))
        .returning({ id: masters.id });

      return [blockedUser, salonsHidden, mastersHidden] as const;
    });

    // Log action
    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "user.block",
      entityType: "user",
      entityId: id,
      oldData: { isBlocked: oldUser.isBlocked, blockReason: oldUser.blockReason },
      newData: {
        isBlocked: true,
        blockReason: reason,
        hiddenSalons: hiddenSalons.length,
        hiddenMasters: hiddenMasters.length,
      },
      req,
    });

    // Send email notification (non-blocking)
    if (updated.email) {
      const userName = `${updated.firstName || ""} ${updated.lastName || ""}`.trim() || "User";
      const adminName = req.admin?.roleName || "Administrator";
      sendUserBlockedEmail(updated.email, userName, reason || "Violation of platform rules", adminName).catch((err) => {
        logger.error("Failed to send block email", err, { source: "users-routes", meta: { userId: updated.id } });
      });
    }

    res.json({
      user: updated,
      message: "User blocked successfully",
      hiddenSalons: hiddenSalons.length,
      hiddenMasters: hiddenMasters.length,
    });
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
        blockReason: sql`NULL`,
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
        logger.error("Failed to send unblock email", err, { source: "users-routes", meta: { userId: updated.id } });
      });
    }

    res.json({ user: updated, message: "User unblocked successfully" });
  } catch (error: any) {
    logger.error("Unblock user error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

// POST /api/admin/users/:id/restore - Restore soft deleted user
router.post("/:id/restore", requirePermission("users.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const metadata = parseSoftDeleteReason(existingUser.blockReason);
    if (!metadata) {
      return res.status(400).json({ error: "User is not deleted" });
    }

    const [restoredUser] = await db.transaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({
          isBlocked: metadata.previousIsBlocked,
          blockReason: metadata.previousBlockReason,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      for (const salon of metadata.salons) {
        await tx
          .update(salons)
          .set({
            isActive: salon.isActive ?? true,
            status: salon.status ?? "active",
            updatedAt: new Date(),
          })
          .where(eq(salons.id, salon.id));
      }

      for (const master of metadata.masters) {
        await tx
          .update(masters)
          .set({
            isActive: master.isActive ?? true,
            status: master.status ?? "active",
          })
          .where(eq(masters.id, master.id));
      }

      return [user] as const;
    });

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "user.restore",
      entityType: "user",
      entityId: id,
      oldData: { isBlocked: existingUser.isBlocked, blockReason: existingUser.blockReason },
      newData: {
        isBlocked: restoredUser.isBlocked,
        blockReason: restoredUser.blockReason,
        restoredSalons: metadata.salons.length,
        restoredMasters: metadata.masters.length,
      },
      req,
    });

    res.json({
      user: restoredUser,
      message: "User restored successfully",
      restoredSalons: metadata.salons.length,
      restoredMasters: metadata.masters.length,
    });
  } catch (error: any) {
    logger.error("Restore user error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to restore user" });
  }
});

// DELETE /api/admin/users/:id - Soft delete user
router.delete("/:id", requirePermission("users.delete"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (id === userId) {
      return res.status(400).json({ error: "You cannot delete your own admin account" });
    }

    const [oldUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (isSoftDeletedUser(oldUser)) {
      return res.status(400).json({ error: "User is already deleted" });
    }

    const [ownedSalons, ownedMasters] = await Promise.all([
      db.select({ id: salons.id, status: salons.status, isActive: salons.isActive }).from(salons).where(eq(salons.ownerId, id)),
      db.select({ id: masters.id, status: masters.status, isActive: masters.isActive }).from(masters).where(eq(masters.userId, id)),
    ]);

    const [deletedUser] = await db.transaction(async (tx) => {
      if (ownedSalons.length > 0) {
        await tx
          .update(salons)
          .set({
            isActive: false,
            status: "paused",
            updatedAt: new Date(),
          })
          .where(eq(salons.ownerId, id));
      }

      if (ownedMasters.length > 0) {
        await tx
          .update(masters)
          .set({
            isActive: false,
            status: "paused",
          })
          .where(eq(masters.userId, id));
      }

      const [user] = await tx
        .update(users)
        .set({
          isBlocked: true,
          blockReason: buildSoftDeleteReason({
            deletedAt: new Date().toISOString(),
            deletedBy: userId,
            reason: "Удалён администратором",
            previousIsBlocked: !!oldUser.isBlocked,
            previousBlockReason: oldUser.blockReason ?? null,
            salons: ownedSalons,
            masters: ownedMasters,
          }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return [user] as const;
    });

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "user.soft_delete",
      entityType: "user",
      entityId: id,
      oldData: oldUser,
      newData: {
        deleted: true,
        hiddenSalons: ownedSalons.length,
        hiddenMasters: ownedMasters.length,
      },
      req,
    });

    res.json({
      user: deletedUser,
      message: "User removed from platform",
      hiddenSalons: ownedSalons.length,
      hiddenMasters: ownedMasters.length,
    });
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

    // Update all users
    const updated = await db
      .update(users)
      .set({
        isBlocked: true,
        blockReason: reason || "Bulk blocked by admin",
        updatedAt: new Date(),
      })
      .where(and(inArray(users.id, userIds), notSoftDeleted(users.blockReason)))
      .returning();

    // Log bulk action
    await logAuditAction({
      actorUserId: adminUserId,
      actorRole: req.admin!.roleName,
      action: "user.bulk_block",
      entityType: "user",
      entityId: undefined,
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

    const deletedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, userIds), sql`${users.blockReason} LIKE ${"__SOFT_DELETED__:%"}`));

    // Update all non-deleted users
    const updated = await db
      .update(users)
      .set({
        isBlocked: false,
        blockReason: sql`NULL`,
        updatedAt: new Date(),
      })
      .where(and(inArray(users.id, userIds), notSoftDeleted(users.blockReason)))
      .returning();

    // Log bulk action
    await logAuditAction({
      actorUserId: adminUserId,
      actorRole: req.admin!.roleName,
      action: "user.bulk_unblock",
      entityType: "user",
      entityId: undefined,
      meta: {
        userIds,
        count: updated.length,
        skippedDeleted: deletedUsers.length,
      },
      req,
    });

    res.json({
      message: `Successfully unblocked ${updated.length} users`,
      count: updated.length,
      skippedDeleted: deletedUsers.length,
      users: updated,
    });
  } catch (error: any) {
    logger.error("Bulk unblock users error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to unblock users" });
  }
});

// GET /api/admin/users/stats - Get user statistics
router.get("/stats/overview", requirePermission("users.read"), async (_req, res) => {
  try {
    // Total users
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(notSoftDeleted(users.blockReason));

    // Active users (not blocked)
    const [activeResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.isBlocked, false), notSoftDeleted(users.blockReason)));

    // Blocked users
    const [blockedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.isBlocked, true), notSoftDeleted(users.blockReason)));

    const [deletedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.blockReason} LIKE ${"__SOFT_DELETED__:%"}`);

    // Users by email verification
    const [emailVerifiedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.emailVerified, true), notSoftDeleted(users.blockReason)));

    // Users by phone verification
    const [phoneVerifiedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.phoneVerified, true), notSoftDeleted(users.blockReason)));

    // New users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [newTodayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(sql`${users.createdAt} >= ${today}`, notSoftDeleted(users.blockReason)));

    // Active users (logged in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeWeekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(sql`${users.lastActivityAt} >= ${sevenDaysAgo}`, notSoftDeleted(users.blockReason)));

    const [roleCountsResult] = await db
      .select({
        client: sql<number>`count(*) FILTER (
          WHERE ${users.id} NOT IN (SELECT user_id FROM admin_users WHERE is_active = true)
            AND ${users.id} NOT IN (SELECT owner_id FROM salons WHERE owner_id IS NOT NULL)
            AND ${users.id} NOT IN (SELECT user_id FROM masters WHERE user_id IS NOT NULL)
        )`,
        owner: sql<number>`count(*) FILTER (
          WHERE ${users.id} IN (SELECT owner_id FROM salons WHERE owner_id IS NOT NULL)
        )`,
        master: sql<number>`count(*) FILTER (
          WHERE ${users.id} IN (SELECT user_id FROM masters WHERE user_id IS NOT NULL)
        )`,
        admin: sql<number>`count(*) FILTER (
          WHERE ${users.id} IN (SELECT user_id FROM admin_users WHERE is_active = true)
        )`,
      })
      .from(users)
      .where(notSoftDeleted(users.blockReason));

    res.json({
      total: Number(totalResult.count),
      active: Number(activeResult.count),
      blocked: Number(blockedResult.count),
      deleted: Number(deletedResult.count),
      emailVerified: Number(emailVerifiedResult.count),
      phoneVerified: Number(phoneVerifiedResult.count),
      newToday: Number(newTodayResult.count),
      activeLastWeek: Number(activeWeekResult.count),
      byRole: {
        client: Number(roleCountsResult.client || 0),
        owner: Number(roleCountsResult.owner || 0),
        master: Number(roleCountsResult.master || 0),
        admin: Number(roleCountsResult.admin || 0),
      },
    });
  } catch (error: any) {
    logger.error("Get users stats error", error as Error, { source: "users-routes" });
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

export default router;
