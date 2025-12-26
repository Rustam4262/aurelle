import { Router } from "express";
import { isAuthenticated } from "../auth";
import { db } from "../db";
import {
  userProfiles,
  bookings,
  favorites,
  reviews,
  salons,
  services,
  masters,
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { updateSalonRating, updateMasterRating } from "../helpers/ratings";

const router = Router();

// Helper function to get client profile
async function getClientFromUser(userId: string): Promise<{ error: string; status: number } | { profile: typeof userProfiles.$inferSelect | null; userId: string }> {
  const [profile] = await db.select().from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  // Any authenticated user can access client dashboard
  return { profile: profile || null, userId };
}

// Get client profile
router.get("/profile", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json(result.profile);
  } catch (error) {
    console.error("Get client profile error:", error);
    return res.status(500).json({ error: "Failed to get profile" });
  }
});

// Update client profile
router.put("/profile", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const profileSchema = z.object({
      fullName: z.string().min(1).max(200).optional(),
      phone: z.string().max(20).optional(),
      avatarUrl: z.string().max(500).optional().nullable(),
      city: z.string().max(100).optional(),
    });

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid profile data", details: parsed.error.errors });
    }

    const [updated] = await db.update(userProfiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();

    return res.json(updated);
  } catch (error) {
    console.error("Update client profile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get client bookings with salon/service/master info
router.get("/bookings", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    if (!result.profile) {
      return res.json([]);
    }

    const clientBookings = await db.select().from(bookings)
      .where(eq(bookings.clientId, result.profile.id))
      .orderBy(desc(bookings.bookingDate));

    if (clientBookings.length === 0) {
      return res.json([]);
    }

    // Batch loading
    const salonIds = Array.from(new Set(clientBookings.map(b => b.salonId)));
    const serviceIds = Array.from(new Set(clientBookings.map(b => b.serviceId)));
    const masterIds = Array.from(new Set(clientBookings.map(b => b.masterId).filter((id): id is string => id !== null)));

    const [salonsData, servicesData, mastersData] = await Promise.all([
      salonIds.length > 0
        ? db.select().from(salons).where(inArray(salons.id, salonIds))
        : Promise.resolve([]),
      serviceIds.length > 0
        ? db.select().from(services).where(inArray(services.id, serviceIds))
        : Promise.resolve([]),
      masterIds.length > 0
        ? db.select().from(masters).where(inArray(masters.id, masterIds))
        : Promise.resolve([]),
    ]);

    const salonsMap = new Map(salonsData.map(s => [s.id, s]));
    const servicesMap = new Map(servicesData.map(s => [s.id, s]));
    const mastersMap = new Map(mastersData.map(m => [m.id, m]));

    const enrichedBookings = clientBookings.map(booking => ({
      ...booking,
      salon: salonsMap.get(booking.salonId),
      service: servicesMap.get(booking.serviceId),
      master: mastersMap.get(booking.masterId),
    }));

    return res.json(enrichedBookings);
  } catch (error) {
    console.error("Get client bookings error:", error);
    return res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Cancel client booking
router.delete("/bookings/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const result = await getClientFromUser(userId);

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    if (!result.profile) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const [booking] = await db.select().from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.clientId, result.profile.id)));

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const bookingDate = new Date(booking.bookingDate);
    if (bookingDate < new Date()) {
      return res.status(400).json({ error: "Cannot cancel past bookings" });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return res.status(400).json({ error: "Booking is already cancelled or completed" });
    }

    const [updated] = await db.update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    return res.json(updated);
  } catch (error) {
    console.error("Cancel client booking error:", error);
    return res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Get client favorites
router.get("/favorites", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const clientFavorites = await db.select().from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    // Get salon info for each favorite
    const enrichedFavorites = await Promise.all(clientFavorites.map(async (fav) => {
      const [salon] = await db.select().from(salons).where(eq(salons.id, fav.salonId));
      return { ...fav, salon };
    }));

    return res.json(enrichedFavorites);
  } catch (error) {
    console.error("Get client favorites error:", error);
    return res.status(500).json({ error: "Failed to get favorites" });
  }
});

// Remove favorite
router.delete("/favorites/:salonId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { salonId } = req.params;
    const result = await getClientFromUser(userId);

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));

    return res.json({ success: true });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return res.status(500).json({ error: "Failed to remove favorite" });
  }
});

// Get client reviews
router.get("/reviews", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const clientReviews = await db.select().from(reviews)
      .where(eq(reviews.clientId, userId))
      .orderBy(desc(reviews.createdAt));

    // Get salon and master info for each review
    const enrichedReviews = await Promise.all(clientReviews.map(async (review) => {
      const [salon] = review.salonId ? await db.select().from(salons).where(eq(salons.id, review.salonId)) : [null];
      const [master] = review.masterId ? await db.select().from(masters).where(eq(masters.id, review.masterId)) : [null];
      return { ...review, salon, master };
    }));

    return res.json(enrichedReviews);
  } catch (error) {
    console.error("Get client reviews error:", error);
    return res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Edit review (within 24 hours)
router.put("/reviews/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const result = await getClientFromUser(userId);

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const [review] = await db.select().from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.clientId, userId)));

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Check if review is within 24 hours
    const reviewDate = new Date(review.createdAt!);
    const now = new Date();
    const hoursSinceReview = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReview > 24) {
      return res.status(400).json({ error: "Reviews can only be edited within 24 hours" });
    }

    const reviewSchema = z.object({
      rating: z.number().min(1).max(5).optional(),
      comment: z.string().max(1000).optional(),
    });

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid review data", details: parsed.error.errors });
    }

    const [updated] = await db.update(reviews)
      .set(parsed.data)
      .where(eq(reviews.id, id))
      .returning();

    // Update ratings
    if (updated.salonId) {
      await updateSalonRating(updated.salonId);
    }
    if (updated.masterId) {
      await updateMasterRating(updated.masterId);
    }

    return res.json(updated);
  } catch (error) {
    console.error("Edit review error:", error);
    return res.status(500).json({ error: "Failed to edit review" });
  }
});

// Delete review (within 24 hours)
router.delete("/reviews/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const result = await getClientFromUser(userId);

    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const [review] = await db.select().from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.clientId, userId)));

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Check if review is within 24 hours
    const reviewDate = new Date(review.createdAt!);
    const now = new Date();
    const hoursSinceReview = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReview > 24) {
      return res.status(400).json({ error: "Reviews can only be deleted within 24 hours" });
    }

    const salonId = review.salonId;
    const masterId = review.masterId;

    await db.delete(reviews).where(eq(reviews.id, id));

    // Update ratings
    if (salonId) {
      await updateSalonRating(salonId);
    }
    if (masterId) {
      await updateMasterRating(masterId);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
