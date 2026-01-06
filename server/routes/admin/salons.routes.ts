import { Router } from "express";
import { db } from "../../db";
import { salons } from "@shared/schema";
import { eq, desc, like, or } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";

const router = Router();

// GET /api/admin/salons - List salons
router.get("/", requirePermission("salons.read"), async (req, res) => {
  try {
    const { search, verified, limit = "50", offset = "0" } = req.query;

    let query = db.select().from(salons);

    if (verified !== undefined) {
      query = query.where(eq(salons.isVerified, verified === "true")) as any;
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

// PATCH /api/admin/salons/:id/verify - Verify salon
router.patch("/:id/verify", requirePermission("salons.verify"), async (req, res) => {
  try {
    const { id } = req.params;

    const [oldSalon] = await db.select().from(salons).where(eq(salons.id, id)).limit(1);

    if (!oldSalon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    const [updated] = await db
      .update(salons)
      .set({ isVerified: true })
      .where(eq(salons.id, id))
      .returning();

    await logAuditAction({
      actorUserId: req.user!.id,
      actorRole: req.admin!.roleName,
      action: "salon.verify",
      entityType: "salon",
      entityId: id,
      oldData: { isVerified: oldSalon.isVerified },
      newData: { isVerified: true },
      req,
    });

    res.json({ salon: updated });
  } catch (error: any) {
    console.error("Verify salon error:", error);
    res.status(500).json({ error: "Failed to verify salon" });
  }
});

// PATCH /api/admin/salons/:id/unverify - Unverify salon
router.patch("/:id/unverify", requirePermission("salons.verify"), async (req, res) => {
  try {
    const { id } = req.params;

    const [oldSalon] = await db.select().from(salons).where(eq(salons.id, id)).limit(1);

    if (!oldSalon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    const [updated] = await db
      .update(salons)
      .set({ isVerified: false })
      .where(eq(salons.id, id))
      .returning();

    await logAuditAction({
      actorUserId: req.user!.id,
      actorRole: req.admin!.roleName,
      action: "salon.unverify",
      entityType: "salon",
      entityId: id,
      oldData: { isVerified: oldSalon.isVerified },
      newData: { isVerified: false },
      req,
    });

    res.json({ salon: updated });
  } catch (error: any) {
    console.error("Unverify salon error:", error);
    res.status(500).json({ error: "Failed to unverify salon" });
  }
});

export default router;
