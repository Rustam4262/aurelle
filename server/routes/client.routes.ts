import { cancelClientBooking } from "../lib/booking-cancellation";
import { createReviewHandler } from "./reviews.routes";
import { verifyCsrf } from "../middleware/csrf";
import { createLimiter } from "../middleware/rateLimiter";
﻿import { Router } from "express";
import { isAuthenticated } from "../auth";
import { db } from "../db";
import { logger } from "../lib/logger";
import {
  userProfiles,
  bookings,
  favorites,
  masterFavorites,
  reviews,
  salons,
  services,
  masters,
  salonSettings,
  supportTickets,
  supportMessages,
  bookingDrafts,
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { updateSalonRating, updateMasterRating } from "../helpers/ratings";
import { sendBookingConfirmation, sendBookingCancellation, isEmailConfigured } from "../email";
import { invalidateDashboardCache } from "../lib/cache";
import { trackEvent } from "../lib/analytics";
import { validateBookingSlot } from "../lib/booking-availability";
import { getBookingConflictError } from "../lib/booking-db-errors";
import { scheduleBookingReminders, cancelBookingReminders } from "../lib/reminders";

const router = Router();

// Helper function to get client profile
async function getClientFromUser(
  userId: string,
): Promise<
  | { error: string; status: number }
  | { profile: typeof userProfiles.$inferSelect | null; userId: string }
> {
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

  // Any authenticated user can access client dashboard
  return { profile: profile || null, userId };
}

// Get client profile
router.get("/profile", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json(result.profile);
  } catch (error) {
    logger.error("Get client profile error:", error);
    return res.status(500).json({ error: "Failed to get profile" });
  }
});

// Update client profile
router.put("/profile", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const profileSchema = z.object({
      fullName: z.string().min(1).max(200).optional(),
      phone: z.string().max(20).optional(),
      avatarUrl: z.string().max(500).optional().nullable(),
      city: z.string().max(100).optional(),
      gender: z.string().max(20).optional(),
      birthday: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .or(z.literal("")),
      notifyEmail: z.boolean().optional(),
      notifyReminder24h: z.boolean().optional(),
      notifyReminder2h: z.boolean().optional(),
      notifyBookingUpdates: z.boolean().optional(),
      notifyPromotions: z.boolean().optional(),
    });

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid profile data", details: parsed.error.issues });
    }

    const normalizedData = {
      ...parsed.data,
      birthday: parsed.data.birthday || null,
      updatedAt: new Date(),
    };

    let updated: typeof userProfiles.$inferSelect | undefined;

    if (result.profile) {
      [updated] = await db
        .update(userProfiles)
        .set(normalizedData)
        .where(eq(userProfiles.userId, userId))
        .returning();
    } else {
      [updated] = await db
        .insert(userProfiles)
        .values({
          userId,
          role: "client",
          ...normalizedData,
        })
        .returning();
    }

    return res.json(updated);
  } catch (error) {
    logger.error("Update client profile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

// Create a new booking
router.post("/bookings", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    if (!result.profile) {
      return res
        .status(400)
        .json({ error: "Profile not found. Please complete your profile first." });
    }

    const bookingSchema = z.object({
      salonId: z.string(),
      serviceId: z.string(),
      masterId: z.string().optional().nullable(),
      bookingDate: z.string(), // ISO date string
      startTime: z.string(), // HH:mm format
      notes: z.string().optional(),
    });

    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid booking data", details: parsed.error.issues });
    }

    const { salonId, serviceId, masterId, bookingDate, startTime, notes } = parsed.data;

    // Verify salon exists
    const [salon] = await db.select().from(salons).where(eq(salons.id, salonId));
    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    // Verify service exists and belongs to salon (kept as a distinct 404 for a
    // clear "this service doesn't exist" case before the deeper slot checks).
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.salonId, salonId)));
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Get salon settings for double-booking policy.
    const [settings] = await db
      .select()
      .from(salonSettings)
      .where(eq(salonSettings.salonId, salonId));
    const allowDoubleBooking = settings?.allowDoubleBooking ?? false;

    // Duration, working-hours, break and (unless explicitly allowed) conflict
    // checks all live in one shared module used by every booking write path —
    // the client's startTime is trusted, but duration/endTime/price never are.
    const validation = await validateBookingSlot({
      salonId,
      masterId: masterId || null,
      serviceId,
      dateISO: bookingDate,
      startTime,
      skipConflictCheck: allowDoubleBooking,
    });

    if (!validation.ok) {
      return res.status(409).json({
        code: validation.code,
        error: "Time slot not available",
        message: "This time slot is not available. Please choose a different time.",
      });
    }

    const { endTime, priceMin } = validation;

    // Create booking
    let newBooking: typeof bookings.$inferSelect;
    try {
      [newBooking] = await db
        .insert(bookings)
        .values({
          clientId: userId,
          salonId,
          serviceId,
          masterId: masterId || null,
          bookingDate: new Date(bookingDate),
          startTime,
          endTime,
          status: "pending",
          priceSnapshot: priceMin,
          notes: notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    } catch (insertErr) {
      const conflict = getBookingConflictError(insertErr);
      if (conflict) {
        return res.status(409).json(conflict);
      }
      throw insertErr;
    }

    // Send confirmation email if email is configured
    const userEmail = req.user?.claims?.email;
    if (isEmailConfigured() && userEmail) {
      try {
        // Get master info if assigned
        let masterName: string | null = null;
        if (masterId) {
          const [masterInfo] = await db.select().from(masters).where(eq(masters.id, masterId));
          masterName = masterInfo?.name || null;
        }

        // Determine language (default to 'en')
        const language = "en";

        // Format date for email
        const formattedDate = new Date(bookingDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Get salon name (assuming it's a JSON object with language keys)
        const salonName =
          typeof salon.name === "object" && salon.name !== null
            ? (salon.name as any)[language] || (salon.name as any)["en"] || "Salon"
            : String(salon.name || "Salon");

        // Get service name
        const serviceName =
          typeof service.name === "object" && service.name !== null
            ? (service.name as any)[language] || (service.name as any)["en"] || "Service"
            : String(service.name || "Service");

        await sendBookingConfirmation(
          userEmail,
          {
            clientName: result.profile?.fullName || "Client",
            salonName,
            serviceName,
            masterName,
            date: formattedDate,
            time: startTime,
            price: service.priceMin,
            bookingId: newBooking.id,
          },
          language,
        );

        logger.info(`[EMAIL] Confirmation email sent to ${userEmail}`);
      } catch (emailError) {
        // Don't fail the booking if email fails
        logger.error("[EMAIL] Failed to send confirmation email:", emailError);
      }
    }

    invalidateDashboardCache().catch(() => {});
    trackEvent({
      eventName: "booking_started",
      userId,
      req,
      properties: { salonId, serviceId, masterId: masterId ?? null, bookingId: newBooking.id },
    });
    // Schedule reminders — this is the main web booking-dialog path, which
    // previously never called this at all.
    scheduleBookingReminders(
      newBooking.id,
      new Date(newBooking.bookingDate).toISOString(),
      newBooking.startTime,
      newBooking.notificationVersion,
    ).catch((err) =>
      logger.error("Failed to schedule reminders", {
        source: "client.routes",
        meta: { bookingId: newBooking.id, error: String(err) },
      }),
    );
    // Clear any resume-booking draft for this user (booking succeeded)
    void db
      .delete(bookingDrafts)
      .where(eq(bookingDrafts.userId, userId))
      .catch(() => {});
    return res.status(201).json(newBooking);
  } catch (error) {
    logger.error("Create booking error:", error);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

// Get client bookings with salon/service/master info
router.get("/bookings", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    if (!result.profile) {
      return res.json([]);
    }

    const clientIds = result.profile ? [userId, result.profile.id] : [userId];
    const clientBookings = await db
      .select()
      .from(bookings)
      .where(inArray(bookings.clientId, clientIds))
      .orderBy(desc(bookings.bookingDate));

    if (clientBookings.length === 0) {
      return res.json([]);
    }

    // Batch loading - filter out null values for nullable foreign keys
    const salonIds = Array.from(
      new Set(clientBookings.map((b) => b.salonId).filter((id): id is string => id !== null)),
    );
    const serviceIds = Array.from(
      new Set(clientBookings.map((b) => b.serviceId).filter((id): id is string => id !== null)),
    );
    const masterIds = Array.from(
      new Set(clientBookings.map((b) => b.masterId).filter((id): id is string => id !== null)),
    );

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

    const salonsMap = new Map(salonsData.map((s) => [s.id, s]));
    const servicesMap = new Map(servicesData.map((s) => [s.id, s]));
    const mastersMap = new Map(mastersData.map((m) => [m.id, m]));

    const enrichedBookings = clientBookings.map((booking) => ({
      ...booking,
      salon: booking.salonId ? salonsMap.get(booking.salonId) : null,
      service: booking.serviceId ? servicesMap.get(booking.serviceId) : null,
      master: booking.masterId ? mastersMap.get(booking.masterId) : null,
    }));

    return res.json(enrichedBookings);
  } catch (error) {
    logger.error("Get client bookings error:", error);
    return res.status(500).json({ error: "Failed to get bookings" });
  }
});

/**
 * DELETE /api/client/bookings/draft
 * Clear the user's booking draft (e.g. user cancelled the booking flow).
 */
router.delete("/bookings/draft", isAuthenticated, async (req: any, res) => {
  const userId: string = req.user.claims.sub;
  try {
    await db.delete(bookingDrafts).where(eq(bookingDrafts.userId, userId));
    return res.json({ ok: true });

  } catch (err) {
    logger.error("Delete booking draft error", err as Error);
    return res.status(500).json({ error: "Failed to delete draft" });
  }
});

// Cancel client booking
router.delete("/bookings/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    if (!result.profile) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const cancellation = await cancelClientBooking(id, [userId, result.profile.id]);
    if (!cancellation.ok) return res.status(cancellation.status).json({ error: cancellation.error });
    const booking = cancellation.booking;
    const updated = booking;

    cancelBookingReminders(updated.id).catch((err) =>
      logger.error("Failed to cancel reminders", {
        source: "client.routes",
        meta: { bookingId: updated.id, error: String(err) },
      }),
    );

    // Send cancellation email if email is configured
    const cancelUserEmail = req.user?.claims?.email;
    if (isEmailConfigured() && cancelUserEmail && booking.salonId && booking.serviceId) {
      try {
        // Get booking details for email (only for salon bookings, not solo master bookings)
        const [salon] = await db.select().from(salons).where(eq(salons.id, booking.salonId));
        const [service] = await db
          .select()
          .from(services)
          .where(eq(services.id, booking.serviceId));

        if (salon && service) {
          const language = "en";

          // Format date
          const formattedDate = new Date(booking.bookingDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          // Get localized names
          const salonName =
            typeof salon.name === "object" && salon.name !== null
              ? (salon.name as any)[language] || (salon.name as any)["en"] || "Salon"
              : String(salon.name || "Salon");

          const serviceName =
            typeof service.name === "object" && service.name !== null
              ? (service.name as any)[language] || (service.name as any)["en"] || "Service"
              : String(service.name || "Service");

          await sendBookingCancellation(
            cancelUserEmail,
            {
              clientName: result.profile?.fullName || "Client",
              salonName,
              serviceName,
              date: formattedDate,
              time: booking.startTime,
            },
            language,
          );

          logger.info(`[EMAIL] Cancellation email sent to ${cancelUserEmail}`);
        }
      } catch (emailError) {
        // Don't fail the cancellation if email fails
        logger.error("[EMAIL] Failed to send cancellation email:", emailError);
      }
    }

    invalidateDashboardCache().catch(() => {});
    return res.json(updated);
  } catch (error) {
    logger.error("Cancel client booking error:", error);
    return res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Get client favorites
router.get("/favorites", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const clientFavorites = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    // Get salon info for each favorite
    const enrichedFavorites = await Promise.all(
      clientFavorites.map(async (fav) => {
        const [salon] = await db.select().from(salons).where(eq(salons.id, fav.salonId));
        return { ...fav, salon };
      }),
    );

    return res.json(enrichedFavorites);
  } catch (error) {
    logger.error("Get client favorites error:", error);
    return res.status(500).json({ error: "Failed to get favorites" });
  }
});

// Remove favorite
router.delete("/favorites/:salonId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { salonId } = req.params;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));

    return res.json({ success: true });
  } catch (error) {
    logger.error("Remove favorite error:", error);
    return res.status(500).json({ error: "Failed to remove favorite" });
  }
});

// ============ MASTER FAVORITES ============

// Get client master favorites
router.get("/master-favorites", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const clientMasterFavorites = await db
      .select()
      .from(masterFavorites)
      .where(eq(masterFavorites.userId, userId))
      .orderBy(desc(masterFavorites.createdAt));

    // Get master info for each favorite
    const enrichedFavorites = await Promise.all(
      clientMasterFavorites.map(async (fav) => {
        const [master] = await db.select().from(masters).where(eq(masters.id, fav.masterId));
        // Get salon info if master belongs to one
        let salon = null;
        if (master?.salonId) {
          const [salonData] = await db.select().from(salons).where(eq(salons.id, master.salonId));
          salon = salonData;
        }
        return { ...fav, master, salon };
      }),
    );

    return res.json(enrichedFavorites);
  } catch (error) {
    logger.error("Get client master favorites error:", error);
    return res.status(500).json({ error: "Failed to get master favorites" });
  }
});

// Add master to favorites
router.post("/master-favorites", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const schema = z.object({
      masterId: z.string().uuid(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    }

    const { masterId } = parsed.data;

    // Check if master exists
    const [master] = await db.select().from(masters).where(eq(masters.id, masterId));
    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    // Check if already favorited
    const [existing] = await db
      .select()
      .from(masterFavorites)
      .where(and(eq(masterFavorites.userId, userId), eq(masterFavorites.masterId, masterId)));

    if (existing) {
      return res.status(400).json({ error: "Master already in favorites" });
    }

    const [newFavorite] = await db.insert(masterFavorites).values({ userId, masterId }).returning();

    return res.status(201).json(newFavorite);
  } catch (error) {
    logger.error("Add master favorite error:", error);
    return res.status(500).json({ error: "Failed to add master to favorites" });
  }
});

// Remove master from favorites
router.delete("/master-favorites/:masterId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { masterId } = req.params;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    await db
      .delete(masterFavorites)
      .where(and(eq(masterFavorites.userId, userId), eq(masterFavorites.masterId, masterId)));

    return res.json({ success: true });
  } catch (error) {
    logger.error("Remove master favorite error:", error);
    return res.status(500).json({ error: "Failed to remove master from favorites" });
  }
});

// Get client reviews
router.get("/reviews", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const clientReviews = await db
      .select()
      .from(reviews)
      .where(inArray(reviews.clientId, result.profile ? [userId, result.profile.id] : [userId]))
      .orderBy(desc(reviews.createdAt));

    // Get salon and master info for each review
    const enrichedReviews = await Promise.all(
      clientReviews.map(async (review) => {
        const [salon] = review.salonId
          ? await db.select().from(salons).where(eq(salons.id, review.salonId))
          : [null];
        const [master] = review.masterId
          ? await db.select().from(masters).where(eq(masters.id, review.masterId))
          : [null];
        return { ...review, salon, master };
      }),
    );

    return res.json(enrichedReviews);
  } catch (error) {
    logger.error("Get client reviews error:", error);
    return res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Create a new review
router.post("/reviews", verifyCsrf, createLimiter, isAuthenticated, createReviewHandler);

// Edit review (within 30 minutes)
router.put("/reviews/:id", verifyCsrf, isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), inArray(reviews.clientId, result.profile ? [userId, result.profile.id] : [userId])));

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Check if review is within 30 minutes
    const reviewDate = new Date(review.createdAt!);
    const now = new Date();
    const minutesSinceReview = (now.getTime() - reviewDate.getTime()) / (1000 * 60);

    if (minutesSinceReview > 30) {
      return res.status(400).json({ error: "Reviews can only be edited within 30 minutes" });
    }

    const reviewSchema = z.object({
      rating: z.number().int().min(1).max(5).optional(),
      comment: z.string().max(1000).optional(),
    });

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid review data", details: parsed.error.issues });
    }

    const [updated] = await db
      .update(reviews)
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
    logger.error("Edit review error:", error);
    return res.status(500).json({ error: "Failed to edit review" });
  }
});

// Delete review (within 30 minutes)
router.delete("/reviews/:id", verifyCsrf, isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const result = await getClientFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), inArray(reviews.clientId, result.profile ? [userId, result.profile.id] : [userId])));

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Check if review is within 30 minutes
    const reviewDate = new Date(review.createdAt!);
    const now = new Date();
    const minutesSinceReview = (now.getTime() - reviewDate.getTime()) / (1000 * 60);

    if (minutesSinceReview > 30) {
      return res.status(400).json({ error: "Reviews can only be deleted within 30 minutes" });
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
    logger.error("Delete review error:", error);
    return res.status(500).json({ error: "Failed to delete review" });
  }
});

// ============ SUPPORT TICKETS ============

// Get user's support tickets
router.get("/support/tickets", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));

    // Get message counts for each ticket
    const ticketsWithCounts = await Promise.all(
      tickets.map(async (ticket) => {
        const messages = await db
          .select()
          .from(supportMessages)
          .where(eq(supportMessages.ticketId, ticket.id));

        const unreadCount = messages.filter((m) => m.senderType === "admin" && !m.isRead).length;

        return { ...ticket, messageCount: messages.length, unreadCount };
      }),
    );

    return res.json(ticketsWithCounts);
  } catch (error) {
    logger.error("Get support tickets error:", error);
    return res.status(500).json({ error: "Failed to get tickets" });
  }
});

// Create a new support ticket
router.post("/support/tickets", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const ticketSchema = z.object({
      subject: z.string().min(1).max(255),
      category: z.enum(["bug", "payment", "question", "suggestion"]),
      message: z.string().min(1).max(5000),
    });

    const parsed = ticketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid ticket data", details: parsed.error.issues });
    }

    const { subject, category, message } = parsed.data;

    // Create the ticket
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        userId,
        subject,
        category,
      })
      .returning();

    // Create the first message
    await db.insert(supportMessages).values({
      ticketId: ticket.id,
      senderId: userId,
      senderType: "user",
      message,
    });

    return res.status(201).json(ticket);
  } catch (error) {
    logger.error("Create support ticket error:", error);
    return res.status(500).json({ error: "Failed to create ticket" });
  }
});

// Get a specific ticket with messages
router.get("/support/tickets/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)));

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, id))
      .orderBy(supportMessages.createdAt);

    // Mark admin messages as read
    await db
      .update(supportMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(supportMessages.ticketId, id),
          eq(supportMessages.senderType, "admin"),
          eq(supportMessages.isRead, false),
        ),
      );

    return res.json({ ...ticket, messages });
  } catch (error) {
    logger.error("Get support ticket error:", error);
    return res.status(500).json({ error: "Failed to get ticket" });
  }
});

// Send a message on a ticket
router.post("/support/tickets/:id/messages", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    // Verify ticket belongs to user
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)));

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.status === "closed") {
      return res.status(400).json({ error: "Cannot message on closed ticket" });
    }

    const messageSchema = z.object({
      message: z.string().min(1).max(5000),
    });

    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid message", details: parsed.error.issues });
    }

    const [newMessage] = await db
      .insert(supportMessages)
      .values({
        ticketId: id,
        senderId: userId,
        senderType: "user",
        message: parsed.data.message,
      })
      .returning();

    // Update ticket timestamp
    await db.update(supportTickets).set({ updatedAt: new Date() }).where(eq(supportTickets.id, id));

    return res.status(201).json(newMessage);
  } catch (error) {
    logger.error("Send support message error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// Close a ticket
router.patch("/support/tickets/:id/close", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)));

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const [updated] = await db
      .update(supportTickets)
      .set({ status: "closed", resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();

    return res.json(updated);
  } catch (error) {
    logger.error("Close support ticket error:", error);
    return res.status(500).json({ error: "Failed to close ticket" });
  }
});

// в”Ђв”Ђв”Ђ Booking Drafts (Resume Booking) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

const draftSchema = z.object({
  salonId: z.string().optional(),
  serviceId: z.string().optional(),
  masterId: z.string().optional(),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  scheduledTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/bookings/draft
 * Returns the current user's active booking draft (if not expired).
 */
router.get("/bookings/draft", isAuthenticated, async (req: any, res) => {
  const userId: string = req.user.claims.sub;
  try {
    const [draft] = await db
      .select()
      .from(bookingDrafts)
      .where(and(eq(bookingDrafts.userId, userId)))
      .limit(1);

    if (!draft || new Date(draft.expiresAt) < new Date()) {
      return res.json({ draft: null });
    }
    return res.json({ draft });
  } catch (err) {
    logger.error("Get booking draft error", err as Error);
    return res.status(500).json({ error: "Failed to get draft" });
  }
});

/**
 * POST /api/bookings/draft
 * Save or update a booking draft. Expires in 24 hours.
 * One draft per user вЂ” overwrites any existing draft.
 */
router.post("/bookings/draft", isAuthenticated, async (req: any, res) => {
  const userId: string = req.user.claims.sub;
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid draft data", details: parsed.error.issues });
  }

  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const { salonId, serviceId, masterId, scheduledDate, scheduledTime, properties } = parsed.data;

    // Delete existing draft first (one-per-user upsert)
    await db.delete(bookingDrafts).where(eq(bookingDrafts.userId, userId));

    const [draft] = await db
      .insert(bookingDrafts)
      .values({
        userId,
        salonId: salonId ?? null,
        serviceId: serviceId ?? null,
        masterId: masterId ?? null,
        scheduledDate: scheduledDate ?? null,
        scheduledTime: scheduledTime ?? null,
        properties: properties ?? {},
        expiresAt,
      })
      .returning();

    return res.json({ draft });
  } catch (err) {
    logger.error("Save booking draft error", err as Error);
    return res.status(500).json({ error: "Failed to save draft" });
  }
});



export default router;
