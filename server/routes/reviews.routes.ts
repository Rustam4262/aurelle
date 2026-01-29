import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import {
  reviews,
  insertReviewSchema,
  bookings,
  userProfiles,
  salons,
  masters,
} from "@shared/schema";
import { updateSalonRating, updateMasterRating } from "../helpers/ratings";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Create review
router.post("/", createLimiter, isAuthenticated, async (req: any, res) => {
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

    const parsed = insertReviewSchema.safeParse({ ...req.body, clientId: userProfile.id });

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid review data", details: parsed.error.errors });
    }

    // If bookingId provided, verify the booking exists, is completed, and belongs to this client
    if (parsed.data.bookingId) {
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, parsed.data.bookingId));

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.clientId !== userProfile.id) {
        return res.status(403).json({ error: "You can only review your own bookings" });
      }

      if (booking.status !== "completed") {
        return res.status(400).json({ error: "You can only review completed bookings" });
      }

      // Check if review already exists for this booking
      const [existingReview] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.bookingId, parsed.data.bookingId));

      if (existingReview) {
        return res.status(400).json({ error: "You have already reviewed this booking" });
      }
    }

    const [review] = await db
      .insert(reviews)
      .values([parsed.data as any])
      .returning();

    // Update salon/master average rating
    if (parsed.data.salonId) {
      await updateSalonRating(parsed.data.salonId);
    }
    if (parsed.data.masterId) {
      await updateMasterRating(parsed.data.masterId);
    }

    console.log("[REVIEW] Created:", review);
    return res.status(201).json(review);
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({ error: "Failed to create review" });
  }
});

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
        createdAt: reviews.createdAt,
        clientName: userProfiles.fullName,
        masterName: masters.name,
      })
      .from(reviews)
      .leftJoin(userProfiles, eq(reviews.clientId, userProfiles.id))
      .leftJoin(masters, eq(reviews.masterId, masters.id))
      .where(eq(reviews.salonId, salonId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json(salonReviews);
  } catch (error) {
    console.error("Get salon reviews error:", error);
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
        createdAt: reviews.createdAt,
        clientName: userProfiles.fullName,
      })
      .from(reviews)
      .leftJoin(userProfiles, eq(reviews.clientId, userProfiles.id))
      .where(eq(reviews.masterId, masterId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json(masterReviews);
  } catch (error) {
    console.error("Get master reviews error:", error);
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
        createdAt: reviews.createdAt,
        salonName: salons.name,
        masterName: masters.name,
      })
      .from(reviews)
      .leftJoin(salons, eq(reviews.salonId, salons.id))
      .leftJoin(masters, eq(reviews.masterId, masters.id))
      .where(eq(reviews.clientId, userProfile.id))
      .orderBy(desc(reviews.createdAt));

    return res.json(clientReviews);
  } catch (error) {
    console.error("Get my reviews error:", error);
    return res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Owner response to a review (salon owner only)
router.patch("/:reviewId/respond", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { reviewId } = req.params;
    const { ownerResponse } = req.body;

    if (!ownerResponse) {
      return res.status(400).json({ error: "Owner response is required" });
    }

    // Get review
    const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (!review.salonId) {
      return res.status(400).json({ error: "Cannot respond to review without salon" });
    }

    // Verify user is owner of the salon
    const [salon] = await db.select().from(salons).where(eq(salons.id, review.salonId));

    if (!salon || salon.ownerId !== userId) {
      return res.status(403).json({ error: "You can only respond to reviews for your own salon" });
    }

    // Update review with owner response
    const [updatedReview] = await db
      .update(reviews)
      .set({ ownerResponse })
      .where(eq(reviews.id, reviewId))
      .returning();

    console.log("[REVIEW] Owner responded:", updatedReview);
    return res.json(updatedReview);
  } catch (error) {
    console.error("Respond to review error:", error);
    return res.status(500).json({ error: "Failed to respond to review" });
  }
});

export default router;
