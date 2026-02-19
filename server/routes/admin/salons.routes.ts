import { Router, Request } from "express";
import { db } from "../../db";
import { salons } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { logger } from "../../lib/logger";

const router = Router();

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// GET /api/admin/salons - List salons
router.get("/", requirePermission("salons.read"), async (req, res) => {
  try {
    const { status, limit = "50", offset = "0" } = req.query;

    let query = db.select().from(salons);

    if (status !== undefined) {
      query = query.where(eq(salons.status, status as string)) as any;
    }

    const allSalons = await query
      .orderBy(desc(salons.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ salons: allSalons });
  } catch (error: any) {
    logger.error("List salons error", error as Error, { source: "salons-routes" });
    res.status(500).json({ error: "Failed to fetch salons" });
  }
});

// PATCH /api/admin/salons/:id/activate - Activate salon (set status to active)
router.patch("/:id/activate", requirePermission("salons.verify"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const [oldSalon] = await db.select().from(salons).where(eq(salons.id, id)).limit(1);

    if (!oldSalon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    const [updated] = await db
      .update(salons)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(salons.id, id))
      .returning();

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "salon.activate",
      entityType: "salon",
      entityId: id,
      oldData: { status: oldSalon.status },
      newData: { status: "active" },
      req,
    });

    res.json({ salon: updated });
  } catch (error: any) {
    logger.error("Activate salon error", error as Error, { source: "salons-routes" });
    res.status(500).json({ error: "Failed to activate salon" });
  }
});

// PATCH /api/admin/salons/:id/pause - Pause salon (set status to paused)
router.patch("/:id/pause", requirePermission("salons.verify"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const [oldSalon] = await db.select().from(salons).where(eq(salons.id, id)).limit(1);

    if (!oldSalon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    const [updated] = await db
      .update(salons)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(salons.id, id))
      .returning();

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "salon.pause",
      entityType: "salon",
      entityId: id,
      oldData: { status: oldSalon.status },
      newData: { status: "paused" },
      req,
    });

    res.json({ salon: updated });
  } catch (error: any) {
    logger.error("Pause salon error", error as Error, { source: "salons-routes" });
    res.status(500).json({ error: "Failed to pause salon" });
  }
});

// POST /api/admin/salons/:id/verify - Verify salon (admin approval)
router.post("/:id/verify", requirePermission("salons.verify"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const [oldSalon] = await db.select().from(salons).where(eq(salons.id, id)).limit(1);

    if (!oldSalon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    if (oldSalon.isVerified) {
      return res.status(400).json({ error: "Salon is already verified" });
    }

    const [updated] = await db
      .update(salons)
      .set({
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(salons.id, id))
      .returning();

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "salon.verify",
      entityType: "salon",
      entityId: id,
      oldData: { isVerified: oldSalon.isVerified },
      newData: { isVerified: true },
      req,
    });

    res.json({
      salon: updated,
      message: "Salon verified successfully",
    });
  } catch (error: any) {
    logger.error("Verify salon error", error as Error, { source: "salons-routes" });
    res.status(500).json({ error: "Failed to verify salon" });
  }
});

// POST /api/admin/salons/:id/unverify - Remove verification from salon
router.post("/:id/unverify", requirePermission("salons.verify"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = getUserId(req);

    const [oldSalon] = await db.select().from(salons).where(eq(salons.id, id)).limit(1);

    if (!oldSalon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    if (!oldSalon.isVerified) {
      return res.status(400).json({ error: "Salon is not verified" });
    }

    const [updated] = await db
      .update(salons)
      .set({
        isVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(salons.id, id))
      .returning();

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "salon.unverify",
      entityType: "salon",
      entityId: id,
      oldData: { isVerified: oldSalon.isVerified },
      newData: { isVerified: false },
      meta: { reason },
      req,
    });

    res.json({
      salon: updated,
      message: "Salon verification removed successfully",
    });
  } catch (error: any) {
    logger.error("Unverify salon error", error as Error, { source: "salons-routes" });
    res.status(500).json({ error: "Failed to remove salon verification" });
  }
});

// GET /api/admin/salons/stats - Salon statistics
router.get("/stats/overview", requirePermission("salons.read"), async (req, res) => {
  try {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        verified: sql<number>`count(*) FILTER (WHERE ${salons.isVerified} = true)`,
        active: sql<number>`count(*) FILTER (WHERE ${salons.status} = 'active')`,
        paused: sql<number>`count(*) FILTER (WHERE ${salons.status} = 'paused')`,
        pending: sql<number>`count(*) FILTER (WHERE ${salons.status} = 'pending')`,
      })
      .from(salons);

    res.json({
      total: Number(stats.total),
      verified: Number(stats.verified),
      active: Number(stats.active),
      paused: Number(stats.paused),
      pending: Number(stats.pending),
      verificationRate: stats.total ? (Number(stats.verified) / Number(stats.total)) * 100 : 0,
    });
  } catch (error: any) {
    logger.error("Get salons stats error", error as Error, { source: "salons-routes" });
    res.status(500).json({ error: "Failed to fetch salon statistics" });
  }
});

export default router;
