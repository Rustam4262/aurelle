import { Router, type Response } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { reviews, bookings, userProfiles, salons, masters } from "@shared/schema";
import { updateSalonRating, updateMasterRating } from "../helpers/ratings";
import { and, desc, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { reviewInput, reviewEligibility } from "../lib/review-input";

const router = Router();

// Latest public reviews for the homepage. Only factual user-created reviews.
router.get("/public/latest", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);

    const latestReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        clientName: userProfiles.fullName,
        salonName: salons.name,
        masterName: masters.name,
      })
      .from(reviews)
      .leftJoin(userProfiles, eq(reviews.clientId, userProfiles.id))
      .leftJoin(salons, eq(reviews.salonId, salons.id))
      .leftJoin(masters, eq(reviews.masterId, masters.id))
      .where(
        and(
          sql`${reviews.comment} IS NOT NULL`,
          sql`btrim(${reviews.comment}) <> ''`,
          sql`(${reviews.isHidden} IS NOT TRUE)`,
        ),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(limit);

    return res.json(latestReviews);
  } catch (error) {
    logger.error("Get latest public reviews error:", error);
    return res.status(500).json({ error: "Failed to get latest reviews" });
  }
});

// Create review
export async function createReviewHandler(req: any, res: Response) {
  try {
    const userId = req.user.claims.sub;

    // Get user profile to get clientId
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (!userProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const parsed = reviewInput.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid review data", details: parsed.error.errors });
    }

    const outcome = await db.transaction(async (tx): Promise<
      { review: typeof reviews.$inferSelect } | { status: number; error: string }
    > => {
      // Serialize concurrent submissions and status changes for this booking.
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, parsed.data.bookingId))
        .for("update");

      if (!booking) {
        return { status: 404, error: "Booking not found" } as const;
      }

      const denied = reviewEligibility(booking, userId, userProfile.id, parsed.data);
      if (denied) return denied;

      // Check if review already exists for this booking
      const [existingReview] = await tx
        .select()
        .from(reviews)
        .where(eq(reviews.bookingId, parsed.data.bookingId));

      if (existingReview) {
        return { status: 409, error: "You have already reviewed this booking" } as const;
      }
      const [review] = await tx
        .insert(reviews)
        .values({
          bookingId: booking.id,
          clientId: userProfile.id,
          salonId: booking.salonId,
          masterId: booking.masterId,
          rating: parsed.data.rating,
          comment: parsed.data.comment,
        })
        .returning();
      return { review } as const;
    });
    if ("error" in outcome) return res.status(outcome.status).json({ error: outcome.error });
    const { review } = outcome;

    // Update salon/master average rating
    if (review.salonId) {
      await updateSalonRating(review.salonId);
    }
    if (review.masterId) {
      await updateMasterRating(review.masterId);
    }

    logger.info("[REVIEW] Created", { meta: { reviewId: review.id } });
    return res.status(201).json(review);
  } catch (error) {
    const code =
      (error as { code?: string; cause?: { code?: string } })?.code ??
      (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "23505")
      return res.status(409).json({ error: "You have already reviewed this booking" });
    logger.error("Create review error:", error);
    return res.status(500).json({ error: "Failed to create review" });
  }
}

router.post("/", createLimiter, isAuthenticated, createReviewHandler);

// Get reviews for a salon
router.get("/salon/:salonId", async (req, res) => {
  try {
    const { salonId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const salonReviews = await db
      .select({
        id: reviews.id,
        clientId: reviews.clientId,
        salonId: reviews.salonId,
        masterId: reviews.masterId,
        bookingId: reviews.bookingId,
        rating: reviews.rating,
        comment: reviews.comment,
        ownerResponse: reviews.ownerResponse,
        masterResponse: reviews.masterResponse,
        createdAt: reviews.createdAt,
        clientName: userProfiles.fullName,
        masterName: masters.name,
      })
      .from(reviews)
      .leftJoin(userProfiles, eq(reviews.clientId, userProfiles.id))
      .leftJoin(masters, eq(reviews.masterId, masters.id))
      .where(and(eq(reviews.salonId, salonId), sql`(${reviews.isHidden} IS NOT TRUE)`))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json(salonReviews);
  } catch (error) {
    logger.error("Get salon reviews error:", error);
    return res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Get reviews for a master
router.get("/master/:masterId", async (req, res) => {
  try {
    const { masterId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const masterReviews = await db
      .select({
        id: reviews.id,
        clientId: reviews.clientId,
        salonId: reviews.salonId,
        masterId: reviews.masterId,
        bookingId: reviews.bookingId,
        rating: reviews.rating,
        comment: reviews.comment,
        ownerResponse: reviews.ownerResponse,
        masterResponse: reviews.masterResponse,
        createdAt: reviews.createdAt,
        clientName: userProfiles.fullName,
      })
      .from(reviews)
      .leftJoin(userProfiles, eq(reviews.clientId, userProfiles.id))
      .where(and(eq(reviews.masterId, masterId), sql`(${reviews.isHidden} IS NOT TRUE)`))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json(masterReviews);
  } catch (error) {
    logger.error("Get master reviews error:", error);
    return res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Get client's own reviews
router.get("/my-reviews", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (!userProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const clientReviews = await db
      .select({
        id: reviews.id,
        clientId: reviews.clientId,
        salonId: reviews.salonId,
        masterId: reviews.masterId,
        bookingId: reviews.bookingId,
        rating: reviews.rating,
        comment: reviews.comment,
        ownerResponse: reviews.ownerResponse,
        masterResponse: reviews.masterResponse,
        createdAt: reviews.createdAt,
        salonName: salons.name,
        masterName: masters.name,
      })
      .from(reviews)
      .leftJoin(salons, eq(reviews.salonId, salons.id))
      .leftJoin(masters, eq(reviews.masterId, masters.id))
      .where(sql`(${reviews.clientId} = ${userProfile.id} OR ${reviews.clientId} = ${userId})`)
      .orderBy(desc(reviews.createdAt));

    return res.json(clientReviews);
  } catch (error) {
    logger.error("Get my reviews error:", error);
    return res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Owner response to a review (salon owner only)
router.patch("/:reviewId/respond", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { reviewId } = req.params;
    const { ownerResponse } = req.body;

    if (typeof ownerResponse !== "string" || !ownerResponse.trim() || ownerResponse.length > 5000) {
      return res.status(400).json({ error: "Owner response must contain 1 to 5000 characters" });
    }

    // Get review
    const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Either the owning salon's owner, or the solo master the review is about,
    // may respond — a review always has a salonId, a masterId, or both.
    let authorized = false;

    if (review.salonId) {
      const [salon] = await db.select().from(salons).where(eq(salons.id, review.salonId));
      authorized = Boolean(salon && salon.ownerId === userId);
    }

    if (!authorized && review.masterId) {
      const [master] = await db.select().from(masters).where(eq(masters.id, review.masterId));
      authorized = Boolean(master && master.isSoloMaster && master.userId === userId);
    }

    if (!authorized) {
      return res
        .status(403)
        .json({ error: "You can only respond to reviews about your own business" });
    }

    // Update review with owner response
    const [updatedReview] = await db
      .update(reviews)
      .set({ ownerResponse })
      .where(eq(reviews.id, reviewId))
      .returning();

    logger.info("[REVIEW] Owner responded", { meta: { reviewId } });
    return res.json(updatedReview);
  } catch (error) {
    logger.error("Respond to review error:", error);
    return res.status(500).json({ error: "Failed to respond to review" });
  }
});

export default router;
