import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { portfolioItems, insertPortfolioItemSchema, masters } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Get master's portfolio
router.get("/master/:masterId", async (req, res) => {
  try {
    const { masterId } = req.params;

    const items = await db
      .select()
      .from(portfolioItems)
      .where(eq(portfolioItems.masterId, masterId))
      .orderBy(portfolioItems.displayOrder, portfolioItems.createdAt);

    return res.json(items);
  } catch (error) {
    console.error("Get portfolio error:", error);
    return res.status(500).json({ error: "Failed to get portfolio" });
  }
});

// Add portfolio item (master/owner only)
router.post("/", createLimiter, isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const parsed = insertPortfolioItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid portfolio data", details: parsed.error.errors });
    }

    // Verify master ownership
    const [master] = await db.select().from(masters).where(eq(masters.id, parsed.data.masterId));
    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    // Check if user is the master or salon owner
    if (master.userId !== userId) {
      const { salons } = await import("@shared/schema");
      const [salon] = await db.select().from(salons).where(eq(salons.id, master.salonId));
      if (!salon || salon.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const [item] = await db
      .insert(portfolioItems)
      .values([parsed.data as any])
      .returning();

    console.log("[PORTFOLIO] Item added:", item);
    return res.status(201).json(item);
  } catch (error) {
    console.error("Add portfolio item error:", error);
    return res.status(500).json({ error: "Failed to add portfolio item" });
  }
});

// Delete portfolio item
router.delete("/:itemId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { itemId } = req.params;

    const [item] = await db.select().from(portfolioItems).where(eq(portfolioItems.id, itemId));
    if (!item) {
      return res.status(404).json({ error: "Portfolio item not found" });
    }

    // Verify ownership
    const [master] = await db.select().from(masters).where(eq(masters.id, item.masterId));
    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    if (master.userId !== userId) {
      const { salons } = await import("@shared/schema");
      const [salon] = await db.select().from(salons).where(eq(salons.id, master.salonId));
      if (!salon || salon.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    await db.delete(portfolioItems).where(eq(portfolioItems.id, itemId));

    console.log("[PORTFOLIO] Item deleted:", itemId);
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete portfolio item error:", error);
    return res.status(500).json({ error: "Failed to delete portfolio item" });
  }
});

export default router;
