import { Router, Request } from "express";
import { db } from "../../db";
import { supportTickets, supportMessages, users } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { requirePermission } from "../../middleware/admin";
import { logger } from "../../lib/logger";

const router = Router();

function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// GET /api/admin/support/tickets
router.get("/tickets", requirePermission("complaints.read"), async (req, res) => {
  try {
    const { status, limit = "50", offset = "0" } = req.query;

    let query = db
      .select({
        ticket: supportTickets,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id));

    if (status) {
      query = query.where(eq(supportTickets.status, status as string)) as any;
    }

    const tickets = await query
      .orderBy(desc(supportTickets.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ tickets });
  } catch (error: any) {
    logger.error("Admin list support tickets error", error as Error, { source: "admin-support" });
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// GET /api/admin/support/tickets/:id
router.get("/tickets/:id", requirePermission("complaints.read"), async (req, res) => {
  try {
    const { id } = req.params;

    const [row] = await db
      .select({
        ticket: supportTickets,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(eq(supportTickets.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Ticket not found" });

    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, id))
      .orderBy(supportMessages.createdAt);

    res.json({ ...row, messages });
  } catch (error: any) {
    logger.error("Admin get support ticket error", error as Error, { source: "admin-support" });
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// POST /api/admin/support/tickets/:id/messages — admin replies
router.post("/tickets/:id/messages", requirePermission("complaints.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = getUserId(req);
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id))
      .limit(1);

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const [newMsg] = await db
      .insert(supportMessages)
      .values({
        ticketId: id,
        senderId: adminId,
        senderType: "admin",
        message: message.trim(),
      })
      .returning();

    // Move ticket to in_progress if it was open
    if (ticket.status === "open") {
      await db
        .update(supportTickets)
        .set({ status: "in_progress", assignedTo: adminId, updatedAt: new Date() })
        .where(eq(supportTickets.id, id));
    }

    res.status(201).json({ message: newMsg });
  } catch (error: any) {
    logger.error("Admin reply support ticket error", error as Error, { source: "admin-support" });
    res.status(500).json({ error: "Failed to send reply" });
  }
});

// PATCH /api/admin/support/tickets/:id/status — resolve/close
router.patch("/tickets/:id/status", requirePermission("complaints.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db
      .update(supportTickets)
      .set({
        status,
        resolvedAt: status === "resolved" || status === "closed" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Ticket not found" });

    res.json({ ticket: updated });
  } catch (error: any) {
    logger.error("Admin update ticket status error", error as Error, { source: "admin-support" });
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

export default router;
