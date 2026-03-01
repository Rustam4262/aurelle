import { Router, Request } from "express";
import { db } from "../../db";
import { chatThreads, chatMessages } from "@shared/admin-schema";
import { users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { insertChatMessageSchema } from "@shared/admin-schema";
import { logger } from "../../lib/logger";
import { broadcast, broadcastToUser } from "../../lib/websocket";

const router = Router();

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// GET /api/admin/chat/threads - List chat threads
router.get("/threads", requirePermission("chat.read"), async (req, res) => {
  try {
    const { status, assignedToMe, limit = "50", offset = "0" } = req.query;
    const userId = getUserId(req);

    let query = db
      .select({
        thread: chatThreads,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(chatThreads)
      .leftJoin(users, eq(chatThreads.userId, users.id));

    const conditions = [];
    if (status) conditions.push(eq(chatThreads.status, status as string));
    if (assignedToMe === "true" && userId) {
      conditions.push(eq(chatThreads.assignedAdminId, userId));
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
    logger.error("List threads error", error as Error, { source: "chat-routes" });
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
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderUserId, users.id))
      .where(and(eq(chatMessages.threadId, id), eq(chatMessages.isDeleted, false)))
      .orderBy(chatMessages.createdAt);

    res.json({ messages });
  } catch (error: any) {
    logger.error("Get messages error", error as Error, { source: "chat-routes" });
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/admin/chat/threads/:id/messages - Send message
router.post("/threads/:id/messages", requirePermission("chat.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const messageData = {
      threadId: id,
      senderType: "admin" as const,
      senderUserId: userId,
      text: req.body.text,
      attachments: req.body.attachments,
    };

    const validatedData = insertChatMessageSchema.parse(messageData);

    const [newMessage] = await db.insert(chatMessages).values(validatedData).returning();

    // Update thread's last message time + fetch thread's userId for WS
    const [thread] = await db
      .update(chatThreads)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(chatThreads.id, id))
      .returning({ userId: chatThreads.userId });

    // WebSocket: notify all admins + the thread's user
    const payload = { threadId: id, message: newMessage, senderId: userId };
    broadcast("admin", "chat_message", payload);
    if (thread?.userId) broadcastToUser(thread.userId, "chat_message", payload);

    res.status(201).json({ message: newMessage });
  } catch (error: any) {
    logger.error("Send message error", error as Error, { source: "chat-routes" });
    res.status(400).json({ error: error.message || "Failed to send message" });
  }
});

// PATCH /api/admin/chat/threads/:id/assign - Assign thread to admin
router.patch("/threads/:id/assign", requirePermission("chat.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const assignTo = req.body.adminId || userId;

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
    logger.error("Assign thread error", error as Error, { source: "chat-routes" });
    res.status(500).json({ error: "Failed to assign thread" });
  }
});

// PATCH /api/admin/chat/threads/:id/close - Close thread
router.patch("/threads/:id/close", requirePermission("chat.write"), async (req, res) => {
  try {
    const { id } = req.params;
    const { closeReason } = req.body;
    const userId = getUserId(req);

    const [updated] = await db
      .update(chatThreads)
      .set({
        status: "closed",
        closedAt: new Date(),
        closedBy: userId,
        closeReason,
        updatedAt: new Date(),
      })
      .where(eq(chatThreads.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Thread not found" });
    }

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "chat_thread.close",
      entityType: "chat_thread",
      entityId: id,
      meta: { closeReason },
      req,
    });

    res.json({ thread: updated });
  } catch (error: any) {
    logger.error("Close thread error", error as Error, { source: "chat-routes" });
    res.status(500).json({ error: "Failed to close thread" });
  }
});

export default router;
