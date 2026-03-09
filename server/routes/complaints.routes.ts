import { Router } from "express";
import { db } from "../db";
import { complaints, insertComplaintSchema } from "@shared/admin-schema";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/complaints
 * Submit a complaint against a salon, master, or user.
 * Requires authentication — anonymous complaints are not accepted.
 */
router.post("/", createLimiter, isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub as string;

    const parsed = insertComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid complaint data", details: parsed.error.flatten() });
    }

    const { targetType, targetId, category, description, attachments } = parsed.data;

    // Prevent self-report
    if (targetType === "user" && targetId === userId) {
      return res.status(400).json({ error: "Cannot report yourself" });
    }

    const [complaint] = await db
      .insert(complaints)
      .values({
        complainantUserId: userId,
        targetType,
        targetId,
        category,
        description,
        attachments: attachments ?? [],
        status: "open",
      })
      .returning({ id: complaints.id });

    logger.info("Complaint submitted", { source: "complaints-routes", meta: { id: complaint.id, category, targetType } });

    res.status(201).json({ id: complaint.id, message: "Complaint submitted successfully" });
  } catch (error: any) {
    logger.error("Submit complaint error", error as Error, { source: "complaints-routes" });
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

export default router;
