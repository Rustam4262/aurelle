import { Router } from "express";
import { db } from "../../db";
import { auditLogs } from "@shared/admin-schema";
import { users } from "@shared/schema";
import { eq, and, desc, like, gte, lte } from "drizzle-orm";
import { requirePermission } from "../../middleware/admin";

const router = Router();

// GET /api/admin/audit - List audit logs with filters
router.get("/", requirePermission("audit.read"), async (req, res) => {
  try {
    const {
      actorUserId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit = "100",
      offset = "0",
    } = req.query;

    let query = db
      .select({
        log: auditLogs,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id));

    // Apply filters
    const conditions = [];
    if (actorUserId) conditions.push(eq(auditLogs.actorUserId, actorUserId as string));
    if (action) conditions.push(like(auditLogs.action, `%${action}%`));
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType as string));
    if (entityId) conditions.push(eq(auditLogs.entityId, entityId as string));
    if (startDate) conditions.push(gte(auditLogs.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(auditLogs.createdAt, new Date(endDate as string)));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const logs = await query
      .orderBy(desc(auditLogs.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ logs });
  } catch (error: any) {
    console.error("List audit logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// GET /api/admin/audit/:id - Get single audit log
router.get("/:id", requirePermission("audit.read"), async (req, res) => {
  try {
    const [log] = await db
      .select({
        log: auditLogs,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(eq(auditLogs.id, req.params.id))
      .limit(1);

    if (!log) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    res.json(log);
  } catch (error: any) {
    console.error("Get audit log error:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

// GET /api/admin/audit/entity/:entityType/:entityId - Get logs for specific entity
router.get("/entity/:entityType/:entityId", requirePermission("audit.read"), async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = "50" } = req.query;

    const logs = await db
      .select({
        log: auditLogs,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(parseInt(limit as string));

    res.json({ logs });
  } catch (error: any) {
    console.error("Get entity logs error:", error);
    res.status(500).json({ error: "Failed to fetch entity logs" });
  }
});

export default router;
