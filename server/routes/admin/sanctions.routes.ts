import { Router, Request } from "express";
import { db } from "../../db";
import { sanctions, sanctionReasonCodes } from "@shared/admin-schema";
import { insertSanctionSchema, insertSanctionReasonCodeSchema } from "@shared/admin-schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";

const router = Router();

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// GET /api/admin/sanctions - List all sanctions
router.get("/", requirePermission("sanctions.read"), async (req, res) => {
  try {
    const { status, targetType, targetId, limit = "50", offset = "0" } = req.query;

    let query = db.select().from(sanctions);

    // Apply filters
    const conditions = [];
    if (status) conditions.push(eq(sanctions.status, status as string));
    if (targetType) conditions.push(eq(sanctions.targetType, targetType as string));
    if (targetId) conditions.push(eq(sanctions.targetId, targetId as string));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allSanctions = await query
      .orderBy(desc(sanctions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ sanctions: allSanctions });
  } catch (error: any) {
    console.error("List sanctions error:", error);
    res.status(500).json({ error: "Failed to fetch sanctions" });
  }
});

// POST /api/admin/sanctions - Create new sanction
router.post("/", requirePermission("sanctions.create"), async (req, res) => {
  try {
    const validatedData = insertSanctionSchema.parse(req.body);
    const userId = getUserId(req);

    const [newSanction] = await db
      .insert(sanctions)
      .values({
        ...validatedData,
        createdBy: userId,
        startsAt: validatedData.startsAt
          ? new Date(validatedData.startsAt)
          : new Date(),
        endsAt: validatedData.endsAt ? new Date(validatedData.endsAt) : undefined,
      })
      .returning();

    // Log audit action
    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "sanction.create",
      entityType: validatedData.targetType,
      entityId: validatedData.targetId,
      newData: newSanction,
      meta: {
        sanctionType: validatedData.sanctionType,
        reason: validatedData.reasonText,
      },
      req,
    });

    res.status(201).json({ sanction: newSanction });
  } catch (error: any) {
    console.error("Create sanction error:", error);
    res.status(400).json({ error: error.message || "Failed to create sanction" });
  }
});

// PATCH /api/admin/sanctions/:id/revoke - Revoke a sanction
router.patch("/:id/revoke", requirePermission("sanctions.revoke"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = getUserId(req);

    if (!reason) {
      return res.status(400).json({ error: "Revoke reason is required" });
    }

    const [oldSanction] = await db
      .select()
      .from(sanctions)
      .where(eq(sanctions.id, id))
      .limit(1);

    if (!oldSanction) {
      return res.status(404).json({ error: "Sanction not found" });
    }

    const [updatedSanction] = await db
      .update(sanctions)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        revokedBy: userId,
        revokeReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(sanctions.id, id))
      .returning();

    // Log audit action
    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "sanction.revoke",
      entityType: oldSanction.targetType,
      entityId: oldSanction.targetId,
      oldData: oldSanction,
      newData: updatedSanction,
      meta: { revokeReason: reason },
      req,
    });

    res.json({ sanction: updatedSanction });
  } catch (error: any) {
    console.error("Revoke sanction error:", error);
    res.status(500).json({ error: "Failed to revoke sanction" });
  }
});

// GET /api/admin/sanctions/check/:targetType/:targetId - Check if entity is sanctioned
router.get("/check/:targetType/:targetId", requirePermission("sanctions.read"), async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    const activeSanctions = await db
      .select()
      .from(sanctions)
      .where(
        and(
          eq(sanctions.targetType, targetType),
          eq(sanctions.targetId, targetId),
          eq(sanctions.status, "active")
        )
      );

    const isSanctioned = activeSanctions.length > 0;

    res.json({
      isSanctioned,
      sanctions: activeSanctions,
    });
  } catch (error: any) {
    console.error("Check sanction error:", error);
    res.status(500).json({ error: "Failed to check sanction status" });
  }
});

// GET /api/admin/sanctions/reasons - List reason codes
router.get("/reasons", requirePermission("sanctions.read"), async (req, res) => {
  try {
    const reasons = await db
      .select()
      .from(sanctionReasonCodes)
      .where(eq(sanctionReasonCodes.isActive, true))
      .orderBy(sanctionReasonCodes.title);

    res.json({ reasons });
  } catch (error: any) {
    console.error("List reason codes error:", error);
    res.status(500).json({ error: "Failed to fetch reason codes" });
  }
});

// POST /api/admin/sanctions/reasons - Create reason code
router.post("/reasons", requirePermission("sanctions.write"), async (req, res) => {
  try {
    const validatedData = insertSanctionReasonCodeSchema.parse(req.body);
    const userId = getUserId(req);

    const [newReason] = await db
      .insert(sanctionReasonCodes)
      .values(validatedData)
      .returning();

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "sanction_reason.create",
      entityType: "sanction_reason_code",
      entityId: newReason.id,
      newData: newReason,
      req,
    });

    res.status(201).json({ reason: newReason });
  } catch (error: any) {
    console.error("Create reason code error:", error);
    res.status(400).json({ error: error.message || "Failed to create reason code" });
  }
});

export default router;
