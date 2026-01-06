import { Router } from "express";
import { db } from "../../db";
import { complaints, sanctions } from "@shared/admin-schema";
import { users } from "@shared/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";

const router = Router();

// GET /api/admin/complaints - List complaints with filters
router.get("/", requirePermission("complaints.read"), async (req, res) => {
  try {
    const { status, category, targetType, assignedToMe, limit = "50", offset = "0" } = req.query;

    let query = db
      .select({
        complaint: complaints,
        complainantName: users.fullName,
        complainantEmail: users.email,
      })
      .from(complaints)
      .leftJoin(users, eq(complaints.complainantUserId, users.id));

    // Apply filters
    const conditions = [];
    if (status) conditions.push(eq(complaints.status, status as string));
    if (category) conditions.push(eq(complaints.category, category as string));
    if (targetType) conditions.push(eq(complaints.targetType, targetType as string));
    if (assignedToMe === "true") {
      conditions.push(eq(complaints.assignedAdminId, req.user!.id));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allComplaints = await query
      .orderBy(desc(complaints.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ complaints: allComplaints });
  } catch (error: any) {
    console.error("List complaints error:", error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

// GET /api/admin/complaints/:id - Get single complaint details
router.get("/:id", requirePermission("complaints.read"), async (req, res) => {
  try {
    const { id } = req.params;

    const [complaint] = await db
      .select({
        complaint: complaints,
        complainantName: users.fullName,
        complainantEmail: users.email,
      })
      .from(complaints)
      .leftJoin(users, eq(complaints.complainantUserId, users.id))
      .where(eq(complaints.id, id))
      .limit(1);

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json(complaint);
  } catch (error: any) {
    console.error("Get complaint error:", error);
    res.status(500).json({ error: "Failed to fetch complaint" });
  }
});

// PATCH /api/admin/complaints/:id/assign - Assign complaint to admin
router.patch("/:id/assign", requirePermission("complaints.resolve"), async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    const assignTo = adminId || req.user!.id; // Assign to self if no adminId provided

    const [updated] = await db
      .update(complaints)
      .set({
        assignedAdminId: assignTo,
        status: "in_review",
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    await logAuditAction({
      actorUserId: req.user!.id,
      actorRole: req.admin!.roleName,
      action: "complaint.assign",
      entityType: "complaint",
      entityId: id,
      newData: { assignedAdminId: assignTo },
      req,
    });

    res.json({ complaint: updated });
  } catch (error: any) {
    console.error("Assign complaint error:", error);
    res.status(500).json({ error: "Failed to assign complaint" });
  }
});

// PATCH /api/admin/complaints/:id/resolve - Resolve complaint
router.patch("/:id/resolve", requirePermission("complaints.resolve"), async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, resolutionComment, createSanction, sanctionData } = req.body;

    if (!decision || !["warning", "sanction_applied", "no_action"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }

    const [oldComplaint] = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, id))
      .limit(1);

    if (!oldComplaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    let sanctionId = null;

    // Create sanction if requested
    if (createSanction && decision === "sanction_applied" && sanctionData) {
      const [newSanction] = await db
        .insert(sanctions)
        .values({
          targetType: oldComplaint.targetType,
          targetId: oldComplaint.targetId,
          sanctionType: sanctionData.sanctionType,
          reasonText: sanctionData.reasonText || oldComplaint.description,
          reasonCodeId: sanctionData.reasonCodeId,
          commentToUser: sanctionData.commentToUser,
          internalNote: sanctionData.internalNote,
          endsAt: sanctionData.endsAt ? new Date(sanctionData.endsAt) : undefined,
          features: sanctionData.features,
          createdBy: req.user!.id,
        })
        .returning();

      sanctionId = newSanction.id;

      await logAuditAction({
        actorUserId: req.user!.id,
        actorRole: req.admin!.roleName,
        action: "sanction.create",
        entityType: oldComplaint.targetType,
        entityId: oldComplaint.targetId,
        newData: newSanction,
        meta: { complaintId: id },
        req,
      });
    }

    // Update complaint status
    const [updated] = await db
      .update(complaints)
      .set({
        status: "resolved",
        decision,
        resolutionComment,
        sanctionId,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, id))
      .returning();

    await logAuditAction({
      actorUserId: req.user!.id,
      actorRole: req.admin!.roleName,
      action: "complaint.resolve",
      entityType: "complaint",
      entityId: id,
      oldData: oldComplaint,
      newData: updated,
      meta: { decision, sanctionId },
      req,
    });

    res.json({ complaint: updated, sanctionId });
  } catch (error: any) {
    console.error("Resolve complaint error:", error);
    res.status(500).json({ error: "Failed to resolve complaint" });
  }
});

// PATCH /api/admin/complaints/:id/reject - Reject complaint
router.patch("/:id/reject", requirePermission("complaints.resolve"), async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionComment } = req.body;

    const [oldComplaint] = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, id))
      .limit(1);

    if (!oldComplaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const [updated] = await db
      .update(complaints)
      .set({
        status: "rejected",
        decision: "no_action",
        resolutionComment,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, id))
      .returning();

    await logAuditAction({
      actorUserId: req.user!.id,
      actorRole: req.admin!.roleName,
      action: "complaint.reject",
      entityType: "complaint",
      entityId: id,
      oldData: oldComplaint,
      newData: updated,
      req,
    });

    res.json({ complaint: updated });
  } catch (error: any) {
    console.error("Reject complaint error:", error);
    res.status(500).json({ error: "Failed to reject complaint" });
  }
});

export default router;
