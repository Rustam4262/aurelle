import { Router } from "express";
import { db } from "../../db";
import { chatThreads, chatMessages, chatMessageReads } from "@shared/admin-schema";
import { users } from "@shared/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { insertChatMessageSchema } from "@shared/admin-schema";

const router = Router();

// GET /api/admin/chat/threads - List chat threads
router.get("/threads", requirePermission("chat.read"), async (req, res) => {
  try {
    const { status, assignedToMe, limit = "50", offset = "0" } = req.query;

    let query = db
      .select({
        thread: chatThreads,
        userName: users.fullName,
        userEmail: users.email,
      })
      .from(chatThreads)
      .leftJoin(users, eq(chatThreads.userId, users.id));

    const conditions = [];
    if (status) conditions.push(eq(chatThreads.status, status as string));
    if (assignedToMe === "true") {
      conditions.push(eq(chatThreads.assignedAdminId, req.user!.id));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const threads = await query
      .orderBy(desc(chatThreads.lastMessageAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ threads });
  } catch (error: any) {
    console.error("List threads error:", error);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

// GET /api/admin/chat/threads/:id/messages - Get messages in thread
router.get("/threads/:id/messages", requirePermission("chat.read"), async (req, res) => {
  try {
    const { id } = req.params;

    const messages = await db
      .select({
        message: chatMessages,
        senderName: users.fullName,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderUserId, users.id))
      .where(and(eq(chatMessages.threadId, id), eq(chatMessages.isDeleted, false)))
      .orderBy(chatMessages.createdAt);

    res.json({ messages });
  } catch (error: any) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/admin/chat/threads/:id/messages - Send message
router.post("/threads/:id/messages", requirePermission("chat.write"), async (req, res) => {
  try {
    const { id } = req.params;

    const messageData = {
      threadId: id,
      senderType: "admin" as const,
      senderUserId: req.user!.id,
      text: req.body.text,
      attachments: req.body.attachments,
    };

    const validatedData = insertChatMessageSchema.parse(messageData);

    const [newMessage] = await db
      .insert(chatMessages)
      .values(validatedData)
      .returning();

    // Update thread's last message time
    await db
      .update(chatThreads)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatThreads.id, id));

    res.status(201).json({ message: newMessage });
  } catch (error: any) {
    console.error("Send message error:", error);
    res.status(400).json({ error: error.message || "Failed to send message" });
  }
});

// PATCH /api/admin/chat/threads/:id/assign - Assign thread to admin
router.patch("/threads/:id/assign", requirePermission("chat.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const assignTo = req.body.adminId || req.user!.id;

    const [updated] = await db
      .update(chatThreads)
      .set({
        assignedAdminId: assignTo,
        updatedAt: new Date(),
      })
      .where(eq(chatThreads.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json({ thread: updated });
  } catch (error: any) {
    console.error("Assign thread error:", error);
    res.status(500).json({ error: "Failed to assign thread" });
  }
});

// PATCH /api/admin/chat/threads/:id/close - Close thread
router.patch("/threads/:id/close", requirePermission("chat.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const { closeReason } = req.body;

    const [updated] = await db
      .update(chatThreads)
      .set({
        status: "closed",
        closedAt: new Date(),
        closedBy: req.user!.id,
        closeReason,
        updatedAt: new Date(),
      })
      .where(eq(chatThreads.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Thread not found" });
    }

    await logAuditAction({
      actorUserId: req.user!.id,
      actorRole: req.admin!.roleName,
      action: "chat_thread.close",
      entityType: "chat_thread",
      entityId: id,
      meta: { closeReason },
      req,
    });

    res.json({ thread: updated });
  } catch (error: any) {
    console.error("Close thread error:", error);
    res.status(500).json({ error: "Failed to close thread" });
  }
});

export default router;
