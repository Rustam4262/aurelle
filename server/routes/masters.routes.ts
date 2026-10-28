import { verifyCsrf } from "../middleware/csrf";
import { Router } from "express";
import { isAuthenticated } from "../auth";
import { db } from "../db";
import {
  userProfiles,
  masters,
  salons,
  bookings,
  reviews,
  masterWorkingHours,
  masterPortfolio,
  services,
  users,
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";
import { cancelBookingReminders } from "../lib/reminders";
import { changeBookingStatus } from "../lib/booking-status";

const router = Router();

// A master's response is separate from the salon owner's response.
router.patch("/reviews/:id/respond", isAuthenticated, verifyCsrf, async (req: any, res) => {
  try {
    const result = await getMasterFromUser(req.user.claims.sub);
    if ("error" in result) return res.status(result.status).json({ error: result.error });
    const input = z
      .object({ response: z.string().trim().min(1).max(3000) })
      .strict()
      .safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Invalid response" });
    const [updated] = await db
      .update(reviews)
      .set({ masterResponse: input.data.response })
      .where(
        and(
          eq(reviews.id, req.params.id),
          eq(reviews.masterId, result.master.id),
          sql`${reviews.isHidden} IS NOT TRUE`,
        ),
      )
      .returning();
    if (!updated) return res.status(404).json({ error: "Review not found" });
    return res.json(updated);
  } catch (error) {
    logger.error("Master review response error", error);
    return res.status(500).json({ error: "Failed to save response" });
  }
});

// Helper function to verify master role and get master record
async function getMasterFromUser(
  userId: string,
): Promise<
  | { error: string; status: number }
  | { master: typeof masters.$inferSelect; profile: typeof userProfiles.$inferSelect }
> {
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

  if (!profile || profile.role !== "master") {
    return { error: "Access denied - master role required", status: 403 };
  }

  const [master] = await db.select().from(masters).where(eq(masters.userId, userId));

  if (!master) {
    return { error: "Master account not found", status: 404 };
  }

  return { master, profile };
}

// Get master dashboard data
router.get("/me", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    // Verify user has master role
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

    if (!profile || profile.role !== "master") {
      return res.status(403).json({ error: "Access denied - master role required" });
    }

    // Find master linked to this user
    const [master] = await db.select().from(masters).where(eq(masters.userId, userId));

    if (!master) {
      return res.status(404).json({ error: "Master account not found" });
    }

    // Get the salon (only if master belongs to a salon, not for solo masters)
    const salon = master.salonId
      ? (await db.select().from(salons).where(eq(salons.id, master.salonId)))[0]
      : null;

    // Get bookings for this master
    const masterBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.masterId, master.id))
      .orderBy(desc(bookings.bookingDate));

    // Get reviews for this master
    const masterReviews = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.masterId, master.id), sql`${reviews.isHidden} IS NOT TRUE`))
      .orderBy(desc(reviews.createdAt));

    return res.json({
      master: {
        ...master,
        averageRating: masterReviews.length
          ? (
              masterReviews.reduce((sum, review) => sum + review.rating, 0) / masterReviews.length
            ).toFixed(1)
          : "0.0",
        reviewCount: masterReviews.length,
      },
      salon,
      bookings: masterBookings,
      reviews: masterReviews,
    });
  } catch (error) {
    logger.error("Get master dashboard error:", error);
    return res.status(500).json({ error: "Failed to get master data" });
  }
});

// Get master's working hours
const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    photo: z
      .string()
      .max(500)
      .refine((value) => !value || /^\/uploads\//.test(value) || /^https:\/\//.test(value))
      .nullable(),
    phone: z.string().trim().max(20),
    experience: z.number().int().min(0).max(80),
    bio: z
      .object({ ru: z.string().max(3000), uz: z.string().max(3000), en: z.string().max(3000) })
      .strict(),
  })
  .strict();

router.put("/profile", isAuthenticated, async (req: any, res) => {
  try {
    const result = await getMasterFromUser(req.user.claims.sub);
    if ("error" in result) return res.status(result.status).json({ error: result.error });
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid profile data" });
    const updated = await db.transaction(async (tx) => {
      const [master] = await tx
        .update(masters)
        .set(parsed.data)
        .where(and(eq(masters.id, result.master.id), eq(masters.userId, req.user.claims.sub)))
        .returning();
      await tx
        .update(userProfiles)
        .set({ fullName: parsed.data.name, avatarUrl: parsed.data.photo, phone: parsed.data.phone })
        .where(eq(userProfiles.userId, req.user.claims.sub));
      return master;
    });
    return res.json(updated);
  } catch (error) {
    logger.error("Update master profile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get master's working hours
router.get("/schedule", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getMasterFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const hours = await db
      .select()
      .from(masterWorkingHours)
      .where(eq(masterWorkingHours.masterId, result.master.id));

    return res.json(hours);
  } catch (error) {
    logger.error("Get master schedule error:", error);
    return res.status(500).json({ error: "Failed to get schedule" });
  }
});

// Update master's working hours
router.put("/schedule", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getMasterFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const hoursSchema = z.array(
      z.object({
        dayOfWeek: z.number().min(0).max(6),
        openTime: z.string().regex(/^\d{2}:\d{2}$/),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/),
        isClosed: z.boolean().optional().default(false),
      }),
    );

    const parsed = hoursSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid schedule data", details: parsed.error.issues });
    }

    // Delete existing hours and insert new ones
    await db.delete(masterWorkingHours).where(eq(masterWorkingHours.masterId, result.master.id));

    if (parsed.data.length > 0) {
      const hoursData = parsed.data.map((h) => ({
        ...h,
        masterId: result.master.id,
      }));
      const newHours = await db.insert(masterWorkingHours).values(hoursData).returning();
      return res.json(newHours);
    }

    return res.json([]);
  } catch (error) {
    logger.error("Update master schedule error:", error);
    return res.status(500).json({ error: "Failed to update schedule" });
  }
});

// Get master's bookings with filters
router.get("/bookings", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getMasterFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const { status, startDate, endDate } = req.query;

    const conditions = [eq(bookings.masterId, result.master.id)];

    if (status && typeof status === "string") {
      conditions.push(eq(bookings.status, status));
    }

    if (startDate && typeof startDate === "string") {
      conditions.push(gte(bookings.bookingDate, new Date(startDate)));
    }

    if (endDate && typeof endDate === "string") {
      conditions.push(lte(bookings.bookingDate, new Date(endDate)));
    }

    const masterBookings = await db
      .select()
      .from(bookings)
      .where(and(...conditions))
      .orderBy(desc(bookings.bookingDate));

    if (masterBookings.length === 0) {
      return res.json([]);
    }

    // Collect unique IDs for batch fetching (filter out nulls for nullable foreign keys)
    const serviceIds = Array.from(
      new Set(masterBookings.map((b) => b.serviceId).filter((id): id is string => id !== null)),
    );
    const salonIds = Array.from(
      new Set(masterBookings.map((b) => b.salonId).filter((id): id is string => id !== null)),
    );
    const clientIds = Array.from(new Set(masterBookings.map((b) => b.clientId)));

    // Batch fetch services, salons, and client profiles
    const [servicesData, salonsData, clientProfilesData] = await Promise.all([
      serviceIds.length > 0
        ? db.select().from(services).where(inArray(services.id, serviceIds))
        : Promise.resolve([]),
      salonIds.length > 0
        ? db.select().from(salons).where(inArray(salons.id, salonIds))
        : Promise.resolve([]),
      clientIds.length > 0
        ? db
            .select({
              id: userProfiles.userId,
              fullName: userProfiles.fullName,
              avatarUrl: userProfiles.avatarUrl,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
            })
            .from(userProfiles)
            .leftJoin(users, eq(users.id, userProfiles.userId))
            .where(inArray(userProfiles.userId, clientIds))
        : Promise.resolve([]),
    ]);

    // Create lookup maps
    const servicesMap = new Map(servicesData.map((s) => [s.id, s]));
    const salonsMap = new Map(salonsData.map((s) => [s.id, s]));
    const clientProfilesMap = new Map(clientProfilesData.map((p) => [p.id, p]));

    // Enrich bookings with related data
    const enrichedBookings = masterBookings.map((booking) => {
      const clientProfile = clientProfilesMap.get(booking.clientId);
      const clientName =
        clientProfile?.fullName?.trim() ||
        [clientProfile?.firstName, clientProfile?.lastName].filter(Boolean).join(" ") ||
        clientProfile?.email?.split("@")[0] ||
        null;

      return {
        ...booking,
        salon: booking.salonId ? salonsMap.get(booking.salonId) || null : null,
        service: booking.serviceId ? servicesMap.get(booking.serviceId) || null : null,
        clientName,
        clientAvatar: clientProfile?.avatarUrl ?? null,
      };
    });

    return res.json(enrichedBookings);
  } catch (error) {
    logger.error("Get master bookings error:", error);
    return res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Update booking status (confirm/cancel/complete) — goes through the same
// FSM as the owner/solo-master paths, so a master can no longer set a
// booking to an arbitrary status (e.g. back to "pending", or "completed"
// before the appointment's own scheduled time).
router.patch("/bookings/:bookingId/status", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { bookingId } = req.params;

    const statusSchema = z.object({
      status: z.enum(["confirmed", "cancelled", "completed", "in_progress", "no_show"]),
      cancellationReason: z.string().optional(),
    });

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid status data", details: parsed.error.issues });
    }

    const result = await changeBookingStatus(
      bookingId,
      parsed.data.status,
      { kind: "master", userId },
      { cancellationReason: parsed.data.cancellationReason },
    );
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    const updated = result.booking;

    if (result.changed && parsed.data.status === "cancelled") {
      cancelBookingReminders(updated.id).catch((err) =>
        logger.error("Failed to cancel reminders", {
          source: "masters.routes",
          meta: { bookingId: updated.id, error: String(err) },
        }),
      );
    }

    return res.json(updated);
  } catch (error) {
    logger.error("Update booking status error:", error);
    return res.status(500).json({ error: "Failed to update booking status" });
  }
});

// Get master's portfolio
router.get("/portfolio", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getMasterFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const portfolio = await db
      .select()
      .from(masterPortfolio)
      .where(eq(masterPortfolio.masterId, result.master.id))
      .orderBy(desc(masterPortfolio.createdAt));

    return res.json(portfolio);
  } catch (error) {
    logger.error("Get master portfolio error:", error);
    return res.status(500).json({ error: "Failed to get portfolio" });
  }
});

// Add portfolio image
router.post("/portfolio", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getMasterFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const portfolioSchema = z.object({
      imageUrl: z.string().min(1).max(500), // Accept relative paths like /uploads/...
      description: z
        .object({
          en: z.string().optional().default(""),
          ru: z.string().optional().default(""),
          uz: z.string().optional().default(""),
        })
        .optional(),
    });

    const parsed = portfolioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid portfolio data", details: parsed.error.issues });
    }

    const [portfolioItem] = await db
      .insert(masterPortfolio)
      .values([
        {
          masterId: result.master.id,
          imageUrl: parsed.data.imageUrl,
          description: parsed.data.description || { en: "", ru: "", uz: "" },
        },
      ])
      .returning();

    return res.status(201).json(portfolioItem);
  } catch (error) {
    logger.error("Add portfolio error:", error);
    return res.status(500).json({ error: "Failed to add portfolio image" });
  }
});

// Remove portfolio image
router.delete("/portfolio/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const result = await getMasterFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    // Verify the portfolio item belongs to this master
    const [portfolioItem] = await db
      .select()
      .from(masterPortfolio)
      .where(and(eq(masterPortfolio.id, id), eq(masterPortfolio.masterId, result.master.id)));

    if (!portfolioItem) {
      return res.status(404).json({ error: "Portfolio item not found" });
    }

    await db.delete(masterPortfolio).where(eq(masterPortfolio.id, id));

    return res.json({ success: true });
  } catch (error) {
    logger.error("Remove portfolio error:", error);
    return res.status(500).json({ error: "Failed to remove portfolio image" });
  }
});

// Get master statistics/analytics
router.get("/stats", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const result = await getMasterFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const masterId = result.master.id;

    // Total earnings (sum of completed booking prices)
    const [earningsResult] = await db
      .select({
        totalEarnings: sql<number>`COALESCE(SUM(${bookings.priceSnapshot}), 0)`,
      })
      .from(bookings)
      .where(and(eq(bookings.masterId, masterId), eq(bookings.status, "completed")));

    // Earnings by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyEarnings = await db
      .select({
        month: sql<string>`TO_CHAR(${bookings.bookingDate}, 'YYYY-MM')`,
        earnings: sql<number>`COALESCE(SUM(${bookings.priceSnapshot}), 0)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.masterId, masterId),
          eq(bookings.status, "completed"),
          gte(bookings.bookingDate, sixMonthsAgo),
        ),
      )
      .groupBy(sql`TO_CHAR(${bookings.bookingDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${bookings.bookingDate}, 'YYYY-MM')`);

    // Popular services (count by service)
    const popularServices = await db
      .select({
        serviceId: bookings.serviceId,
        count: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(eq(bookings.masterId, masterId))
      .groupBy(bookings.serviceId)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    // Get service details for popular services (filter out nulls for nullable serviceId)
    const serviceIds = popularServices
      .map((s) => s.serviceId)
      .filter((id): id is string => id !== null);
    let serviceDetails: any[] = [];
    if (serviceIds.length > 0) {
      serviceDetails = await db.select().from(services).where(inArray(services.id, serviceIds));
    }

    const popularServicesWithDetails = popularServices.map((ps) => {
      const service = serviceDetails.find((s) => s.id === ps.serviceId);
      return {
        ...ps,
        service,
      };
    });

    // Booking counts by status
    const bookingsByStatus = await db
      .select({
        status: bookings.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(eq(bookings.masterId, masterId))
      .groupBy(bookings.status);

    // Client retention stats (unique clients and repeat clients)
    const [clientStats] = await db
      .select({
        totalClients: sql<number>`COUNT(DISTINCT ${bookings.clientId})`,
        totalBookings: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(eq(bookings.masterId, masterId));

    // Repeat clients (clients with more than 1 booking)
    const repeatClients = await db
      .select({
        clientId: bookings.clientId,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(eq(bookings.masterId, masterId))
      .groupBy(bookings.clientId)
      .having(sql`COUNT(*) > 1`);

    return res.json({
      totalEarnings: Number(earningsResult?.totalEarnings || 0),
      earningsByMonth: monthlyEarnings.map((m) => ({
        month: m.month,
        earnings: Number(m.earnings),
      })),
      popularServices: popularServicesWithDetails,
      bookingsByStatus: bookingsByStatus.map((b) => ({
        status: b.status,
        count: Number(b.count),
      })),
      clientRetention: {
        totalClients: Number(clientStats?.totalClients || 0),
        repeatClients: repeatClients.length,
        totalBookings: Number(clientStats?.totalBookings || 0),
        retentionRate: clientStats?.totalClients
          ? Math.round((repeatClients.length / Number(clientStats.totalClients)) * 100)
          : 0,
      },
    });
  } catch (error) {
    logger.error("Get master stats error:", error);
    return res.status(500).json({ error: "Failed to get statistics" });
  }
});

export default router;
