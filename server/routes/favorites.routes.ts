import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { favorites, salons } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

// Get user's favorites
router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const userFavorites = await db
      .select({
        id: salons.id,
        name: salons.name,
        city: salons.city,
        photos: salons.photos,
        averageRating: salons.averageRating,
        reviewCount: salons.reviewCount,
      })
      .from(favorites)
      .innerJoin(salons, eq(favorites.salonId, salons.id))
      .where(eq(favorites.userId, userId));
    return res.json(userFavorites);
  } catch (error) {
    logger.error("Get favorites error:", error);
    return res.status(500).json({ error: "Failed to get favorites" });
  }
});

// Add to favorites
router.post("/", createLimiter, isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const favSchema = z.object({
      salonId: z.string().min(1, "Salon ID is required"),
    });

    const parsed = favSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    }

    const { salonId } = parsed.data;

    const result = await db.transaction(async (tx) => {
      // Serialize add/toggle for this salon and keep it present until commit.
      const [salon] = await tx.select({ id: salons.id }).from(salons).where(eq(salons.id, salonId)).for("update");
      if (!salon) return null;
      const [existing] = await tx.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));
      if (existing) return { favorite: existing, created: false };
      const [favorite] = await tx.insert(favorites).values({ userId, salonId }).returning();
      return { favorite, created: true };
    });
    if (!result) return res.status(404).json({ error: "Salon not found" });
    return res.status(result.created ? 201 : 200).json(result.favorite);
  } catch (error) {
    logger.error("Add favorite error:", error);
    return res.status(500).json({ error: "Failed to add favorite" });
  }
});

// Remove from favorites
router.delete("/:salonId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { salonId } = req.params;

    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));
    return res.json({ success: true });
  } catch (error) {
    logger.error("Remove favorite error:", error);
    return res.status(500).json({ error: "Failed to remove favorite" });
  }
});

// Toggle favorite (alternate endpoint)
router.post("/:salonId", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId } = req.params;
    const userId = req.user.claims.sub;

    const result = await db.transaction(async (tx) => {
      const [salon] = await tx.select({ id: salons.id }).from(salons).where(eq(salons.id, salonId)).for("update");
      if (!salon) return null;
      const [existing] = await tx.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));
      if (existing) {
        await tx.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));
        return { favorited: false };
      }
      await tx.insert(favorites).values({ userId, salonId });
      return { favorited: true };
    });
    if (!result) return res.status(404).json({ error: "Salon not found" });
    return res.json(result);
  } catch (error) {
    logger.error("Toggle favorite error:", error);
    return res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

// Get user's favorites (alternate endpoint)
router.get("/my-favorites", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const userFavorites = await db.select().from(favorites).where(eq(favorites.userId, userId));
    return res.json(userFavorites);
  } catch (error) {
    logger.error("Get favorites error:", error);
    return res.status(500).json({ error: "Failed to get favorites" });
  }
});

export default router;
