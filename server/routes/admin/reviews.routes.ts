import { Router, Request } from "express";
import { db } from "../../db";
import { reviews, salons, masters, userProfiles } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { updateSalonRating, updateMasterRating } from "../../helpers/ratings";
import { logger } from "../../lib/logger";

const router = Router();

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// GET /api/admin/reviews - List reviews with filters
router.get("/", requirePermission("reviews.read"), async (req, res) => {
  try {
    const { hidden, salonId, masterId, limit = "50", offset = "0" } = req.query;

    let query = db
      .select({
        review: reviews,
        clientName: userProfiles.fullName,
        salonName: salons.name,
        masterName: masters.name,
      })
      .from(reviews)
      .leftJoin(userProfiles, eq(reviews.clientId, userProfiles.id))
      .leftJoin(salons, eq(reviews.salonId, salons.id))
      .leftJoin(masters, eq(reviews.masterId, masters.id));

    const conditions = [];
    if (hidden === "true") conditions.push(sql`(${reviews.isHidden} IS TRUE)`);
    if (hidden === "false") conditions.push(sql`(${reviews.isHidden} IS NOT TRUE)`);
    if (salonId) conditions.push(eq(reviews.salonId, salonId as string));
    if (masterId) conditions.push(eq(reviews.masterId, masterId as string));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allReviews = await query
      .orderBy(desc(reviews.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ reviews: allReviews });
  } catch (error: any) {
    logger.error("List reviews error", error as Error, { source: "admin-reviews-routes" });
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// PATCH /api/admin/reviews/:id/hide - Hide a review from public view
router.patch("/:id/hide", requirePermission("reviews.moderate"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = getUserId(req);

    if (!reason) {
      return res.status(400).json({ error: "Hide reason is required" });
    }

    const [oldReview] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);

    if (!oldReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    const [updatedReview] = await db
      .update(reviews)
      .set({
        isHidden: true,
        hiddenReason: reason,
        hiddenBy: userId,
        hiddenAt: new Date(),
      })
      .where(eq(reviews.id, id))
      .returning();

    // Hidden reviews must not count toward the public rating average
    if (oldReview.salonId) await updateSalonRating(oldReview.salonId);
    if (oldReview.masterId) await updateMasterRating(oldReview.masterId);

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "review.hide",
      entityType: "review",
      entityId: id,
      oldData: oldReview,
      newData: updatedReview,
      meta: { reason },
      req,
    });

    res.json({ review: updatedReview });
  } catch (error: any) {
    logger.error("Hide review error", error as Error, { source: "admin-reviews-routes" });
    res.status(500).json({ error: "Failed to hide review" });
  }
});

// PATCH /api/admin/reviews/:id/unhide - Restore a hidden review to public view
router.patch("/:id/unhide", requirePermission("reviews.moderate"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const [oldReview] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);

    if (!oldReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    const [updatedReview] = await db
      .update(reviews)
      .set({
        isHidden: false,
        hiddenReason: null,
        hiddenBy: null,
        hiddenAt: null,
      })
      .where(eq(reviews.id, id))
      .returning();

    if (oldReview.salonId) await updateSalonRating(oldReview.salonId);
    if (oldReview.masterId) await updateMasterRating(oldReview.masterId);

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "review.unhide",
      entityType: "review",
      entityId: id,
      oldData: oldReview,
      newData: updatedReview,
      req,
    });

    res.json({ review: updatedReview });
  } catch (error: any) {
    logger.error("Unhide review error", error as Error, { source: "admin-reviews-routes" });
    res.status(500).json({ error: "Failed to unhide review" });
  }
});

export default router;
