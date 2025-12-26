import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { favorites, salons } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Get user's favorites
router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const userFavorites = await db.select({
      id: salons.id,
      name: salons.name,
      city: salons.city,
      photos: salons.photos,
      averageRating: salons.averageRating,
      reviewCount: salons.reviewCount,
    }).from(favorites)
      .innerJoin(salons, eq(favorites.salonId, salons.id))
      .where(eq(favorites.userId, userId));
    return res.json(userFavorites);
  } catch (error) {
    console.error("Get favorites error:", error);
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
      return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
    }

    const { salonId } = parsed.data;

    const [favorite] = await db.insert(favorites)
      .values([{ userId, salonId }])
      .returning();
    return res.status(201).json(favorite);
  } catch (error) {
    console.error("Add favorite error:", error);
    return res.status(500).json({ error: "Failed to add favorite" });
  }
});

// Remove from favorites
router.delete("/:salonId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { salonId } = req.params;

    await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));
    return res.json({ success: true });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return res.status(500).json({ error: "Failed to remove favorite" });
  }
});

// Toggle favorite (alternate endpoint)
router.post("/:salonId", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId } = req.params;
    const userId = req.user.claims.sub;

    const existing = await db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));

    if (existing.length > 0) {
      await db.delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));
      return res.json({ favorited: false });
    } else {
      await db.insert(favorites).values({ userId, salonId });
      return res.json({ favorited: true });
    }
  } catch (error) {
    console.error("Toggle favorite error:", error);
    return res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

// Get user's favorites (alternate endpoint)
router.get("/my-favorites", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const userFavorites = await db.select().from(favorites)
      .where(eq(favorites.userId, userId));
    return res.json(userFavorites);
  } catch (error) {
    console.error("Get favorites error:", error);
    return res.status(500).json({ error: "Failed to get favorites" });
  }
});

export default router;
