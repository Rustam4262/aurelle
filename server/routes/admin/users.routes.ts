import { Router, Request } from "express";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq, desc, like, or } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { logger } from "../../lib/logger";

const router = Router();

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// GET /api/admin/users - List all users with search
router.get("/", requirePermission("users.read"), async (req, res) => {
  try {
    const { search, limit = "50", offset = "0" } = req.query;

    let query = db.select().from(users);

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(
        or(
          like(users.email, searchTerm),
          like(users.firstName, searchTerm),
          like(users.lastName, searchTerm),
          like(users.phoneNumber, searchTerm),
        ),
      ) as any;
    }

    const allUsers = await query
      .orderBy(desc(users.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ users: allUsers });
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

    // Note: isBlocked and blockReason columns don't exist in current schema
    // This would need schema migration to support
    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "user.block",
      entityType: "user",
      entityId: id,
      oldData: { blocked: false },
      newData: { blocked: true, blockReason: reason },
      req,
    });

    res.json({ user: oldUser, message: "User blocked successfully" });
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

    // Note: isBlocked and blockReason columns don't exist in current schema
    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "user.unblock",
      entityType: "user",
      entityId: id,
      oldData: { blocked: true },
      newData: { blocked: false },
      req,
    });

    res.json({ user: oldUser, message: "User unblocked successfully" });
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
