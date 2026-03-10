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
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

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
      .where(eq(reviews.masterId, master.id))
      .orderBy(desc(reviews.createdAt));

    return res.json({
      master,
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
      return res.status(400).json({ error: "Invalid schedule data", details: parsed.error.errors });
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
        ? db.select().from(userProfiles).where(inArray(userProfiles.id, clientIds))
        : Promise.resolve([]),
    ]);

    // Create lookup maps
    const servicesMap = new Map(servicesData.map((s) => [s.id, s]));
    const salonsMap = new Map(salonsData.map((s) => [s.id, s]));
    const clientProfilesMap = new Map(clientProfilesData.map((p) => [p.id, p]));

    // Enrich bookings with related data
    const enrichedBookings = masterBookings.map((booking) => {
      const clientProfile = clientProfilesMap.get(booking.clientId);
      // For privacy, use first name or "Client" as fallback
      const clientName = clientProfile?.fullName ? clientProfile.fullName.split(" ")[0] : "Client";

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

// Update booking status (confirm/cancel/complete)
router.patch("/bookings/:bookingId/status", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { bookingId } = req.params;
    const result = await getMasterFromUser(userId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    const statusSchema = z.object({
      status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
      cancellationReason: z.string().optional(),
    });

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid status data", details: parsed.error.errors });
    }

    // Verify the booking belongs to this master
    const [existingBooking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.masterId, result.master.id)));

    if (!existingBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const updateData: any = {
      status: parsed.data.status,
      updatedAt: new Date(),
    };

    if (parsed.data.cancellationReason) {
      updateData.cancellationReason = parsed.data.cancellationReason;
    }

    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, bookingId))
      .returning();

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
        .json({ error: "Invalid portfolio data", details: parsed.error.errors });
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
