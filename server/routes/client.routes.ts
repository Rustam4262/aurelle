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
  salonSettings,
} from "@shared/schema";
import { eq, and, desc, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { updateSalonRating, updateMasterRating } from "../helpers/ratings";
import { sendBookingConfirmation, sendBookingCancellation, isEmailConfigured } from "../email";

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

// Helper function to check for booking time conflicts
async function checkBookingConflict(params: {
  masterId: string | null;
  salonId: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  excludeBookingId?: string;
  bufferMinutes?: number;
}): Promise<{ hasConflict: boolean; conflictingBooking?: any }> {
  const {
    masterId,
    salonId,
    bookingDate,
    startTime,
    endTime,
    excludeBookingId,
    bufferMinutes = 10,
  } = params;

  // Convert time strings to minutes for easier comparison
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const requestedStart = parseTime(startTime);
  const requestedEnd = parseTime(endTime);

  // Add buffer to the requested times
  const bufferedStart = requestedStart - bufferMinutes;
  const bufferedEnd = requestedEnd + bufferMinutes;

  // Convert back to time strings for database query
  const formatTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const bufferedStartTime = formatTime(Math.max(0, bufferedStart));
  const bufferedEndTime = formatTime(Math.min(1440, bufferedEnd)); // 1440 = 24 hours in minutes

  // Build the query conditions
  const conditions = [
    eq(bookings.bookingDate, bookingDate),
    // Exclude cancelled bookings
    ne(bookings.status, "cancelled" as any),
  ];

  // If masterId is provided, check master's schedule
  // Otherwise, check salon's overall capacity (not implemented yet, would need capacity tracking)
  if (masterId) {
    conditions.push(eq(bookings.masterId, masterId));
  } else {
    // If no master specified, just check same salon
    conditions.push(eq(bookings.salonId, salonId));
  }

  // Exclude current booking if updating
  if (excludeBookingId) {
    conditions.push(ne(bookings.id, excludeBookingId));
  }

  // Get all bookings for this master/salon on the same day
  const existingBookings = await db
    .select()
    .from(bookings)
    .where(and(...conditions));

  // Check for time overlaps
  for (const booking of existingBookings) {
    const existingStart = parseTime(booking.startTime);
    const existingEnd = parseTime(booking.endTime);
    const existingBufferedStart = existingStart - bufferMinutes;
    const existingBufferedEnd = existingEnd + bufferMinutes;

    // Check if there's an overlap
    // Overlap occurs if: (start1 < end2) AND (start2 < end1)
    const hasOverlap = bufferedStart < existingBufferedEnd && existingBufferedStart < bufferedEnd;

    if (hasOverlap) {
      return {
        hasConflict: true,
        conflictingBooking: booking,
      };
    }
  }

  return { hasConflict: false };
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
    console.error("Get client profile error:", error);
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
    });

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid profile data", details: parsed.error.errors });
    }

    const [updated] = await db
      .update(userProfiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();

    return res.json(updated);
  } catch (error) {
    console.error("Update client profile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

// Create a new booking
router.post("/bookings", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    console.log("[DEBUG] Create booking request from user:", userId);

    const result = await getClientFromUser(userId);
    console.log("[DEBUG] Profile lookup result:", result);

    if ("error" in result) {
      console.log("[DEBUG] Error in getClientFromUser:", result.error);
      return res.status(result.status).json({ error: result.error });
    }

    if (!result.profile) {
      console.log("[DEBUG] No profile found for user:", userId);
      return res
        .status(400)
        .json({ error: "Profile not found. Please complete your profile first." });
    }

    console.log("[DEBUG] Profile found:", result.profile.id);

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
      return res.status(400).json({ error: "Invalid booking data", details: parsed.error.errors });
    }

    const { salonId, serviceId, masterId, bookingDate, startTime, notes } = parsed.data;

    // Verify salon exists
    const [salon] = await db.select().from(salons).where(eq(salons.id, salonId));
    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    // Verify service exists and belongs to salon
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.salonId, salonId)));
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Verify master if provided
    if (masterId) {
      const [master] = await db
        .select()
        .from(masters)
        .where(and(eq(masters.id, masterId), eq(masters.salonId, salonId)));
      if (!master) {
        return res.status(404).json({ error: "Master not found" });
      }
    }

    // Calculate end time based on service duration
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = startMinutes + service.duration;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

    // Get salon settings for buffer time
    const [settings] = await db
      .select()
      .from(salonSettings)
      .where(eq(salonSettings.salonId, salonId));
    const bufferMinutes = settings?.bufferMinutes ?? 10; // Default to 10 minutes if no settings
    const allowDoubleBooking = settings?.allowDoubleBooking ?? false;

    // Check for booking conflicts BEFORE creating (unless double booking is allowed)
    if (!allowDoubleBooking) {
      const conflictCheck = await checkBookingConflict({
        masterId: masterId || null,
        salonId,
        bookingDate: new Date(bookingDate),
        startTime,
        endTime,
        bufferMinutes,
      });

      if (conflictCheck.hasConflict) {
        const conflicting = conflictCheck.conflictingBooking;
        return res.status(409).json({
          error: "Time slot not available",
          message: masterId
            ? `This master already has a booking from ${conflicting.startTime} to ${conflicting.endTime}. Please choose a different time.`
            : `This time slot is not available. Please choose a different time.`,
          conflictingBooking: {
            startTime: conflicting.startTime,
            endTime: conflicting.endTime,
            date: conflicting.bookingDate,
          },
        });
      }
    }

    // Create booking
    console.log("[DEBUG] Creating booking with data:", {
      clientId: result.profile.id,
      salonId,
      serviceId,
      masterId: masterId || null,
      bookingDate,
      startTime,
      endTime,
    });

    const [newBooking] = await db
      .insert(bookings)
      .values({
        clientId: result.profile.id,
        salonId,
        serviceId,
        masterId: masterId || null,
        bookingDate: new Date(bookingDate),
        startTime,
        endTime,
        status: "pending",
        priceSnapshot: service.priceMin,
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log("[DEBUG] Booking created successfully:", newBooking);

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

        console.log(`[EMAIL] Confirmation email sent to ${userEmail}`);
      } catch (emailError) {
        // Don't fail the booking if email fails
        console.error("[EMAIL] Failed to send confirmation email:", emailError);
      }
    }

    return res.status(201).json(newBooking);
  } catch (error) {
    console.error("Create booking error:", error);
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

    const clientBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.clientId, result.profile.id))
      .orderBy(desc(bookings.bookingDate));

    if (clientBookings.length === 0) {
      return res.json([]);
    }

    // Batch loading
    const salonIds = Array.from(new Set(clientBookings.map((b) => b.salonId)));
    const serviceIds = Array.from(new Set(clientBookings.map((b) => b.serviceId)));
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
      salon: salonsMap.get(booking.salonId),
      service: servicesMap.get(booking.serviceId),
      master: booking.masterId ? mastersMap.get(booking.masterId) : null,
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

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    if (!result.profile) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const [booking] = await db
      .select()
      .from(bookings)
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

    const [updated] = await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    // Send cancellation email if email is configured
    const cancelUserEmail = req.user?.claims?.email;
    if (isEmailConfigured() && cancelUserEmail) {
      try {
        // Get booking details for email
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

          console.log(`[EMAIL] Cancellation email sent to ${cancelUserEmail}`);
        }
      } catch (emailError) {
        // Don't fail the cancellation if email fails
        console.error("[EMAIL] Failed to send cancellation email:", emailError);
      }
    }

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

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    await db
      .delete(favorites)
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

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const clientReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.clientId, userId))
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

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const [review] = await db
      .select()
      .from(reviews)
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

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const [review] = await db
      .select()
      .from(reviews)
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
