import { Router } from "express";
import { isAuthenticated } from "../auth";
import { db } from "../db";
import { notifications } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// Get user notifications
router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const userNotifications = await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    return res.json(userNotifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ error: "Failed to get notifications" });
  }
});

// Mark notification as read
router.patch("/:id/read", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.patch("/read-all", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    return res.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

export default router;
