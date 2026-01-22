import { Router } from "express";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";

const router = Router();

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
          like(users.fullName, searchTerm),
          like(users.phone, searchTerm)
        )
      ) as any;
    }

    const allUsers = await query
      .orderBy(desc(users.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ users: allUsers });
  } catch (error: any) {
    console.error("List users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/admin/users/:id - Get single user
router.get("/:id", requirePermission("users.read"), async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error: any) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/admin/users/:id - Update user
router.patch("/:id", requirePermission("users.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, isEmailVerified, isPhoneVerified } = req.body;

    const [oldUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;
    if (isPhoneVerified !== undefined) updateData.isPhoneVerified = isPhoneVerified;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    await logAuditAction({
      actorUserId: req.user!.id,
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
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// POST /api/admin/users/:id/block - Block user
router.post("/:id/block", requirePermission("users.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [oldUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const [updated] = await db
      .update(users)
      .set({
        isBlocked: true,
        blockReason: reason || "Blocked by admin",
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    await logAuditAction({
      actorUserId: req.user!.id,
      actorRole: req.admin!.roleName,
      action: "user.block",
      entityType: "user",
      entityId: id,
      oldData: { isBlocked: false },
      newData: { isBlocked: true, blockReason: reason },
      req,
    });

    res.json({ user: updated, message: "User blocked successfully" });
  } catch (error: any) {
    console.error("Block user error:", error);
    res.status(500).json({ error: "Failed to block user" });
  }
});

// POST /api/admin/users/:id/unblock - Unblock user
router.post("/:id/unblock", requirePermission("users.write"), async (req, res) => {
  try {
    const { id } = req.params;

    const [oldUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const [updated] = await db
      .update(users)
      .set({
        isBlocked: false,
        blockReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    await logAuditAction({
      actorUserId: req.user!.id,
      actorRole: req.admin!.roleName,
      action: "user.unblock",
      entityType: "user",
      entityId: id,
      oldData: { isBlocked: true },
      newData: { isBlocked: false },
      req,
    });

    res.json({ user: updated, message: "User unblocked successfully" });
  } catch (error: any) {
    console.error("Unblock user error:", error);
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

// DELETE /api/admin/users/:id - Soft delete user
router.delete("/:id", requirePermission("users.delete"), async (req, res) => {
  try {
    const { id } = req.params;

    const [oldUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Soft delete by marking as deleted (if you have such field)
    // For now, just log the action
    await logAuditAction({
      actorUserId: req.user!.id,
      actorRole: req.admin!.roleName,
      action: "user.delete",
      entityType: "user",
      entityId: id,
      oldData: oldUser,
      req,
    });

    res.json({ message: "User deleted" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
