import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { reviews, insertReviewSchema } from "@shared/schema";
import { updateSalonRating, updateMasterRating } from "../helpers/ratings";

const router = Router();

// Create review
router.post("/", createLimiter, isAuthenticated, async (req: any, res) => {
  try {
    const clientId = req.user.claims.sub;
    const parsed = insertReviewSchema.safeParse({ ...req.body, clientId });

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid review data", details: parsed.error.errors });
    }

    const [review] = await db.insert(reviews).values([parsed.data as any]).returning();

    // Update salon/master average rating
    if (parsed.data.salonId) {
      await updateSalonRating(parsed.data.salonId);
    }
    if (parsed.data.masterId) {
      await updateMasterRating(parsed.data.masterId);
    }

    return res.status(201).json(review);
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({ error: "Failed to create review" });
  }
});

export default router;
