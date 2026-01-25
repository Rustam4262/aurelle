import { Router, Request } from "express";
import { db } from "../../db";
import { salons } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";

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
    console.error("List salons error:", error);
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
    console.error("Activate salon error:", error);
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
    console.error("Pause salon error:", error);
    res.status(500).json({ error: "Failed to pause salon" });
  }
});

export default router;
