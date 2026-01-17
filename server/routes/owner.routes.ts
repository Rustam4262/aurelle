import { Router } from "express";
import { db } from "../db";
import bcrypt from "bcrypt";
import {
  salons,
  masters,
  services,
  bookings,
  salonWorkingHours,
  userProfiles,
  users,
  masterServices,
  insertSalonSchema,
  insertMasterSchema,
  insertServiceSchema,
} from "@shared/schema";
import { requirePermission, OWNER_PERMISSIONS } from "../lib/rbac";
import { logAudit } from "../lib/audit";
import { eq, and, desc, inArray, gte, lte, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { isAuthenticated } from "../auth";
import { createNewBookingNotification } from "../notifications";

const router = Router();

// Create salon
router.post("/salons", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const parsed = insertSalonSchema.safeParse({ ...req.body, ownerId });

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid salon data", details: parsed.error.errors });
    }

    const [salon] = await db.insert(salons).values([parsed.data as any]).returning();
    return res.status(201).json(salon);
  } catch (error) {
    console.error("Create salon error:", error);
    return res.status(500).json({ error: "Failed to create salon" });
  }
});

// Get owner's salons
router.get("/salons", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));
    return res.json(ownerSalons);
  } catch (error) {
    console.error("Get owner salons error:", error);
    return res.status(500).json({ error: "Failed to get salons" });
  }
});

// Get single salon for owner
router.get("/salons/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.claims.sub;
    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, id), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }
    return res.json(salon);
  } catch (error) {
    console.error("Get owner salon error:", error);
    return res.status(500).json({ error: "Failed to get salon" });
  }
});

// Get salon services for owner
router.get("/salons/:salonId/services", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId } = req.params;
    const ownerId = req.user.claims.sub;

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const salonServices = await db.select().from(services)
      .where(eq(services.salonId, salonId));
    return res.json(salonServices);
  } catch (error) {
    console.error("Get owner services error:", error);
    return res.status(500).json({ error: "Failed to get services" });
  }
});

// Get salon masters for owner
router.get("/salons/:salonId/masters", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId } = req.params;
    const ownerId = req.user.claims.sub;

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const salonMasters = await db.select().from(masters)
      .where(eq(masters.salonId, salonId));
    return res.json(salonMasters);
  } catch (error) {
    console.error("Get owner masters error:", error);
    return res.status(500).json({ error: "Failed to get masters" });
  }
});

// Get salon working hours for owner
router.get("/salons/:salonId/hours", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId } = req.params;
    const ownerId = req.user.claims.sub;

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const hours = await db.select().from(salonWorkingHours)
      .where(eq(salonWorkingHours.salonId, salonId));
    return res.json(hours);
  } catch (error) {
    console.error("Get owner hours error:", error);
    return res.status(500).json({ error: "Failed to get hours" });
  }
});

// Delete service
router.delete("/salons/:salonId/services/:serviceId", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId, serviceId } = req.params;
    const ownerId = req.user.claims.sub;

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await db.delete(services).where(and(eq(services.id, serviceId), eq(services.salonId, salonId)));
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete service error:", error);
    return res.status(500).json({ error: "Failed to delete service" });
  }
});

// Delete master
router.delete("/salons/:salonId/masters/:masterId", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId, masterId } = req.params;
    const ownerId = req.user.claims.sub;

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await db.delete(masters).where(and(eq(masters.id, masterId), eq(masters.salonId, salonId)));
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete master error:", error);
    return res.status(500).json({ error: "Failed to delete master" });
  }
});

// Update salon
router.patch("/salons/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.claims.sub;

    // Валидация данных салона
    const updateSalonSchema = z.object({
      name: z.object({
        en: z.string().min(1),
        ru: z.string().min(1),
        uz: z.string().min(1),
      }).optional(),
      description: z.object({
        en: z.string(),
        ru: z.string(),
        uz: z.string(),
      }).optional(),
      address: z.string().max(500).optional(),
      city: z.string().max(100).optional(),
      latitude: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
      longitude: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
      phone: z.string().max(20).optional(),
      email: z.string().email().max(255).optional(),
      photos: z.array(z.string().min(1)).optional(), // Accept relative paths like /uploads/...
      isActive: z.boolean().optional(),
    });

    const parsed = updateSalonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid salon data", details: parsed.error.errors });
    }

    const [salon] = await db.update(salons)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(salons.id, id), eq(salons.ownerId, ownerId)))
      .returning();

    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }
    return res.json(salon);
  } catch (error) {
    console.error("Update salon error:", error);
    return res.status(500).json({ error: "Failed to update salon" });
  }
});

// Add master to salon (with optional login credentials)
router.post("/salons/:salonId/masters", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId } = req.params;
    const ownerId = req.user.claims.sub;
    const { email, password, ...masterData } = req.body;

    // Verify ownership
    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Используем транзакцию для атомарности создания мастера + пользователя
    const result = await db.transaction(async (tx) => {
      let userId = null;

      // If email and password provided, create user account for master
      if (email && password) {
        // Check if user already exists
        const existingUser = await tx
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser.length > 0) {
          throw new Error("User with this email already exists");
        }

        // Create user account
        const passwordHash = await bcrypt.hash(password, 12);
        userId = `master:${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        await tx.insert(users).values({
          id: userId,
          email,
          passwordHash,
          firstName: masterData.name?.split(" ")[0] || null,
          lastName: masterData.name?.split(" ").slice(1).join(" ") || null,
        });

        // Create user profile with master role
        await tx.insert(userProfiles).values({
          userId,
          role: "master",
          fullName: masterData.name,
          isProfileComplete: true,
        });
      }

      const parsed = insertMasterSchema.safeParse({
        ...masterData,
        salonId,
        userId,
        email: email || null,
      });

      if (!parsed.success) {
        throw new Error("Invalid master data");
      }

      const [master] = await tx.insert(masters).values([parsed.data as any]).returning();
      return master;
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Add master error:", error);
    return res.status(500).json({ error: "Failed to add master" });
  }
});

// Add service to salon
router.post("/salons/:salonId/services", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId } = req.params;
    const ownerId = req.user.claims.sub;

    // Verify ownership
    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const parsed = insertServiceSchema.safeParse({ ...req.body, salonId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid service data", details: parsed.error.errors });
    }

    const [service] = await db.insert(services).values([parsed.data as any]).returning();
    return res.status(201).json(service);
  } catch (error) {
    console.error("Add service error:", error);
    return res.status(500).json({ error: "Failed to add service" });
  }
});

// Set working hours
router.post("/salons/:salonId/hours", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId } = req.params;
    const ownerId = req.user.claims.sub;

    // Verify ownership
    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Delete existing hours and insert new ones
    await db.delete(salonWorkingHours).where(eq(salonWorkingHours.salonId, salonId));

    const hoursData = req.body.hours.map((h: any) => ({ ...h, salonId }));
    const newHours = await db.insert(salonWorkingHours).values(hoursData).returning();

    return res.json(newHours);
  } catch (error) {
    console.error("Set hours error:", error);
    return res.status(500).json({ error: "Failed to set hours" });
  }
});

// Get salon bookings (for owner)
router.get("/salons/:salonId/bookings", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId } = req.params;
    const ownerId = req.user.claims.sub;

    // Verify ownership
    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const salonBookings = await db.select().from(bookings)
      .where(eq(bookings.salonId, salonId))
      .orderBy(desc(bookings.bookingDate));

    if (salonBookings.length === 0) {
      return res.json([]);
    }

    // Batch loading for services and clients
    const serviceIds = Array.from(new Set(salonBookings.map(b => b.serviceId)));
    const clientIds = Array.from(new Set(salonBookings.map(b => b.clientId)));

    const [servicesData, clientsData] = await Promise.all([
      serviceIds.length > 0
        ? db.select().from(services).where(inArray(services.id, serviceIds))
        : Promise.resolve([]),
      clientIds.length > 0
        ? db.select().from(userProfiles).where(inArray(userProfiles.id, clientIds))
        : Promise.resolve([]),
    ]);

    const servicesMap = new Map(servicesData.map(s => [s.id, s]));
    const clientsMap = new Map(clientsData.map(c => [c.id, c]));

    const enrichedBookings = salonBookings.map(booking => ({
      ...booking,
      service: servicesMap.get(booking.serviceId),
      client: clientsMap.get(booking.clientId),
    }));

    return res.json(enrichedBookings);
  } catch (error) {
    console.error("Get salon bookings error:", error);
    return res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Get all bookings across owner's salons (for calendar)
router.get("/bookings", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;

    // Get all owner's salons
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json([]);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Get all bookings for these salons
    const allBookings = await db.select().from(bookings)
      .where(inArray(bookings.salonId, salonIds))
      .orderBy(desc(bookings.bookingDate));

    if (allBookings.length === 0) {
      return res.json([]);
    }

    // Enrich with salon, service, and master data
    const serviceIds = Array.from(new Set(allBookings.map(b => b.serviceId)));
    const masterIds = Array.from(new Set(allBookings.filter(b => b.masterId).map(b => b.masterId!)));

    const [servicesData, mastersData] = await Promise.all([
      serviceIds.length > 0 ? db.select().from(services).where(inArray(services.id, serviceIds)) : [],
      masterIds.length > 0 ? db.select().from(masters).where(inArray(masters.id, masterIds)) : [],
    ]);

    const servicesMap = new Map(servicesData.map(s => [s.id, s]));
    const mastersMap = new Map(mastersData.map(m => [m.id, m]));
    const salonsMap = new Map(ownerSalons.map(s => [s.id, s]));

    const enrichedBookings = allBookings.map(booking => ({
      ...booking,
      salon: salonsMap.get(booking.salonId) || null,
      service: servicesMap.get(booking.serviceId) || null,
      master: booking.masterId ? mastersMap.get(booking.masterId) || null : null,
    }));

    return res.json(enrichedBookings);
  } catch (error) {
    console.error("Get owner bookings error:", error);
    return res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Confirm/cancel booking (owner)
router.patch("/bookings/:id/status", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ownerId = req.user.claims.sub;

    // Get booking and verify salon ownership
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, booking.salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [updated] = await db.update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    return res.json(updated);
  } catch (error) {
    console.error("Update booking status error:", error);
    return res.status(500).json({ error: "Failed to update booking" });
  }
});

// Assign master to booking
router.patch("/bookings/:id/assign-master", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { masterId } = req.body;
    const ownerId = req.user.claims.sub;

    // Get booking and verify salon ownership
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, booking.salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Verify master belongs to this salon
    if (masterId) {
      const [master] = await db.select().from(masters)
        .where(and(eq(masters.id, masterId), eq(masters.salonId, booking.salonId)));

      if (!master) {
        return res.status(400).json({ error: "Master not found or does not belong to this salon" });
      }
    }

    // Update booking with assigned master
    const [updated] = await db.update(bookings)
      .set({ masterId: masterId || null, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    return res.json(updated);
  } catch (error) {
    console.error("Assign master to booking error:", error);
    return res.status(500).json({ error: "Failed to assign master" });
  }
});

// ============ MASTER MANAGEMENT ENDPOINTS (Phase 1 - P0-2) ============

// Get master statistics across all owner's salons
router.get("/masters/stats", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;

    // Get owner's salons
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json([]);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Get all masters for owner's salons with booking statistics
    const allMasters = await db.select({
      id: masters.id,
      salonId: masters.salonId,
      userId: masters.userId,
      name: masters.name,
      email: masters.email,
      phone: masters.phone,
      specialization: masters.specialization,
      bio: masters.bio,
      portfolio: masters.portfolio,
      workingHours: masters.workingHours,
      isActive: masters.isActive,
      rating: masters.rating,
      reviewCount: masters.reviewCount,
      createdAt: masters.createdAt,
      salonName: salons.name,
    })
      .from(masters)
      .leftJoin(salons, eq(masters.salonId, salons.id))
      .where(inArray(masters.salonId, salonIds))
      .orderBy(desc(masters.rating));

    // Get booking counts for each master
    const masterIds = allMasters.map(m => m.id);
    const bookingCounts = await db.select({
      masterId: bookings.masterId,
      totalBookings: sql<number>`count(*)::int`,
      completedBookings: sql<number>`count(case when ${bookings.status} = 'completed' then 1 end)::int`,
      totalRevenue: sql<string>`sum(${bookings.price})::numeric`,
    })
      .from(bookings)
      .where(and(
        inArray(bookings.masterId, masterIds),
        gte(bookings.date, sql`CURRENT_DATE - INTERVAL '30 days'`)
      ))
      .groupBy(bookings.masterId);

    // Merge booking stats with masters
    const mastersWithStats = allMasters.map(master => {
      const stats = bookingCounts.find(bc => bc.masterId === master.id);
      return {
        ...master,
        totalBookings: stats?.totalBookings || 0,
        completedBookings: stats?.completedBookings || 0,
        totalRevenue: parseFloat(stats?.totalRevenue || "0"),
      };
    });

    return res.json(mastersWithStats);
  } catch (error) {
    console.error("Get master stats error:", error);
    return res.status(500).json({ error: "Failed to get master statistics" });
  }
});

// Update master profile
router.put("/salons/:salonId/masters/:masterId", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId, masterId } = req.params;
    const ownerId = req.user.claims.sub;

    // Verify salon ownership
    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Validate request body
    const updateSchema = z.object({
      name: z.object({
        en: z.string().min(1),
        ru: z.string().min(1),
        uz: z.string().min(1),
      }).optional(),
      bio: z.object({
        en: z.string(),
        ru: z.string(),
        uz: z.string(),
      }).optional(),
      specialization: z.string().optional(),
      phone: z.string().optional(),
      portfolio: z.array(z.string()).optional(),
      workingHours: z.record(z.object({
        start: z.string(),
        end: z.string(),
        isWorking: z.boolean(),
      })).optional(),
      isActive: z.boolean().optional(),
    });

    const validatedData = updateSchema.parse(req.body);

    // Update master
    const [updatedMaster] = await db.update(masters)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(eq(masters.id, masterId), eq(masters.salonId, salonId)))
      .returning();

    if (!updatedMaster) {
      return res.status(404).json({ error: "Master not found" });
    }

    return res.json(updatedMaster);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Update master error:", error);
    return res.status(500).json({ error: "Failed to update master" });
  }
});

// Upload portfolio images for master
router.post("/masters/:masterId/portfolio", isAuthenticated, async (req: any, res) => {
  try {
    const { masterId } = req.params;
    const ownerId = req.user.claims.sub;
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Verify master belongs to owner's salon
    const [master] = await db.select({
      masterId: masters.id,
      portfolio: masters.portfolio,
      salonOwnerId: salons.ownerId,
    })
      .from(masters)
      .leftJoin(salons, eq(masters.salonId, salons.id))
      .where(eq(masters.id, masterId));

    if (!master || master.salonOwnerId !== ownerId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Add image to portfolio
    const currentPortfolio = master.portfolio || [];
    const updatedPortfolio = [...currentPortfolio, imageUrl];

    const [updatedMaster] = await db.update(masters)
      .set({
        portfolio: updatedPortfolio,
        updatedAt: new Date(),
      })
      .where(eq(masters.id, masterId))
      .returning();

    return res.json(updatedMaster);
  } catch (error) {
    console.error("Upload portfolio error:", error);
    return res.status(500).json({ error: "Failed to upload portfolio image" });
  }
});

// Delete portfolio image
router.delete("/masters/:masterId/portfolio/:imageIndex", isAuthenticated, async (req: any, res) => {
  try {
    const { masterId, imageIndex } = req.params;
    const ownerId = req.user.claims.sub;
    const index = parseInt(imageIndex);

    if (isNaN(index)) {
      return res.status(400).json({ error: "Invalid image index" });
    }

    // Verify master belongs to owner's salon
    const [master] = await db.select({
      masterId: masters.id,
      portfolio: masters.portfolio,
      salonOwnerId: salons.ownerId,
    })
      .from(masters)
      .leftJoin(salons, eq(masters.salonId, salons.id))
      .where(eq(masters.id, masterId));

    if (!master || master.salonOwnerId !== ownerId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Remove image from portfolio
    const currentPortfolio = master.portfolio || [];
    if (index < 0 || index >= currentPortfolio.length) {
      return res.status(400).json({ error: "Invalid image index" });
    }

    const updatedPortfolio = currentPortfolio.filter((_, i) => i !== index);

    const [updatedMaster] = await db.update(masters)
      .set({
        portfolio: updatedPortfolio,
        updatedAt: new Date(),
      })
      .where(eq(masters.id, masterId))
      .returning();

    return res.json(updatedMaster);
  } catch (error) {
    console.error("Delete portfolio error:", error);
    return res.status(500).json({ error: "Failed to delete portfolio image" });
  }
});

// ============ SERVICE MANAGEMENT ENDPOINTS (Phase 1 - P0-3) ============

// Get service statistics across all owner's salons
router.get("/services/stats", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;

    // Get owner's salons
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json([]);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Get all services for owner's salons
    const allServices = await db.select().from(services)
      .where(inArray(services.salonId, salonIds))
      .orderBy(desc(services.bookingCount));

    return res.json(allServices);
  } catch (error) {
    console.error("Get service stats error:", error);
    return res.status(500).json({ error: "Failed to get service statistics" });
  }
});

// Update service
router.put("/salons/:salonId/services/:serviceId", isAuthenticated, async (req: any, res) => {
  try {
    const { salonId, serviceId } = req.params;
    const ownerId = req.user.claims.sub;

    // Verify salon ownership
    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));

    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Validate request body
    const updateSchema = z.object({
      name: z.object({
        en: z.string().min(1),
        ru: z.string().min(1),
        uz: z.string().min(1),
      }).optional(),
      description: z.object({
        en: z.string(),
        ru: z.string(),
        uz: z.string(),
      }).optional(),
      category: z.string().optional(),
      priceMin: z.number().int().positive().optional(),
      priceMax: z.number().int().positive().optional(),
      duration: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
    }

    // Update service
    const [updated] = await db.update(services)
      .set(parsed.data)
      .where(and(eq(services.id, serviceId), eq(services.salonId, salonId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Update service error:", error);
    return res.status(500).json({ error: "Failed to update service" });
  }
});

// Duplicate service to another salon
router.post("/services/:serviceId/duplicate", isAuthenticated, async (req: any, res) => {
  try {
    const { serviceId } = req.params;
    const { targetSalonId } = req.body;
    const ownerId = req.user.claims.sub;

    if (!targetSalonId) {
      return res.status(400).json({ error: "Target salon ID is required" });
    }

    // Get source service
    const [sourceService] = await db.select().from(services)
      .where(eq(services.id, serviceId));

    if (!sourceService) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Verify both salons belong to owner
    const [sourceSalon] = await db.select().from(salons)
      .where(and(eq(salons.id, sourceService.salonId), eq(salons.ownerId, ownerId)));

    const [targetSalon] = await db.select().from(salons)
      .where(and(eq(salons.id, targetSalonId), eq(salons.ownerId, ownerId)));

    if (!sourceSalon || !targetSalon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Create duplicate service
    const [duplicated] = await db.insert(services).values({
      salonId: targetSalonId,
      name: sourceService.name,
      description: sourceService.description,
      category: sourceService.category,
      priceMin: sourceService.priceMin,
      priceMax: sourceService.priceMax,
      duration: sourceService.duration,
      isActive: sourceService.isActive,
      displayOrder: 0,
    }).returning();

    return res.status(201).json(duplicated);
  } catch (error) {
    console.error("Duplicate service error:", error);
    return res.status(500).json({ error: "Failed to duplicate service" });
  }
});

// ============ PHASE 9: MASTER-SERVICE ASSIGNMENT ============

// Get assigned masters for a service
router.get("/services/:id/masters", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const { id: serviceId } = req.params;

    // Get service and verify ownership
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, service.salonId), eq(salons.ownerId, ownerId)));
    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get assigned master IDs
    const assignments = await db.select({ masterId: masterServices.masterId })
      .from(masterServices)
      .where(eq(masterServices.serviceId, serviceId));

    return res.json({ masterIds: assignments.map(a => a.masterId) });
  } catch (error) {
    console.error("Get service masters error:", error);
    return res.status(500).json({ error: "Failed to get service masters" });
  }
});

// Assign masters to a service
router.patch("/services/:id/masters", isAuthenticated, requirePermission(OWNER_PERMISSIONS.MANAGE_SERVICES), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const { id: serviceId } = req.params;

    const assignMastersSchema = z.object({
      masterIds: z.array(z.string()),
    });

    const parsed = assignMastersSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
    }

    const { masterIds } = parsed.data;

    // Get service and verify ownership
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, service.salonId), eq(salons.ownerId, ownerId)));
    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Verify all masters belong to the same salon
    if (masterIds.length > 0) {
      const mastersToAssign = await db.select().from(masters)
        .where(and(
          inArray(masters.id, masterIds),
          eq(masters.salonId, service.salonId)
        ));

      if (mastersToAssign.length !== masterIds.length) {
        return res.status(400).json({ error: "Some masters do not belong to this salon" });
      }
    }

    // Delete existing assignments
    await db.delete(masterServices).where(eq(masterServices.serviceId, serviceId));

    // Create new assignments
    if (masterIds.length > 0) {
      await db.insert(masterServices).values(
        masterIds.map(masterId => ({
          masterId,
          serviceId,
        }))
      );
    }

    // Audit log
    await logAudit(ownerId, "service.assign_masters", "services", serviceId, {
      masterIds,
      serviceId,
      salonId: service.salonId,
    });

    return res.json({ success: true, masterIds });
  } catch (error) {
    console.error("Assign masters to service error:", error);
    return res.status(500).json({ error: "Failed to assign masters" });
  }
});

// Toggle service visibility (quick enable/disable)
router.patch("/services/:id/toggle", isAuthenticated, requirePermission(OWNER_PERMISSIONS.MANAGE_SERVICES), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const { id: serviceId } = req.params;

    const toggleSchema = z.object({
      isActive: z.boolean(),
    });

    const parsed = toggleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
    }

    const { isActive } = parsed.data;

    // Get service and verify ownership
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const [salon] = await db.select().from(salons)
      .where(and(eq(salons.id, service.salonId), eq(salons.ownerId, ownerId)));
    if (!salon) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update service
    const [updated] = await db.update(services)
      .set({ isActive })
      .where(eq(services.id, serviceId))
      .returning();

    // Audit log
    await logAudit(ownerId, `service.${isActive ? "activate" : "deactivate"}`, "services", serviceId, {
      serviceId,
      salonId: service.salonId,
      isActive,
    });

    return res.json(updated);
  } catch (error) {
    console.error("Toggle service error:", error);
    return res.status(500).json({ error: "Failed to toggle service" });
  }
});

// Bulk toggle services (enable/disable multiple services)
router.post("/services/bulk-toggle", isAuthenticated, requirePermission(OWNER_PERMISSIONS.MANAGE_SERVICES), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;

    const bulkToggleSchema = z.object({
      serviceIds: z.array(z.string()).min(1),
      isActive: z.boolean(),
    });

    const parsed = bulkToggleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
    }

    const { serviceIds, isActive } = parsed.data;

    // Get all services and verify ownership
    const allServices = await db.select().from(services)
      .where(inArray(services.id, serviceIds));

    if (allServices.length === 0) {
      return res.status(404).json({ error: "No services found" });
    }

    // Get salon IDs and verify ownership
    const salonIds = [...new Set(allServices.map(s => s.salonId))];
    const ownerSalons = await db.select().from(salons)
      .where(and(
        inArray(salons.id, salonIds),
        eq(salons.ownerId, ownerId)
      ));

    if (ownerSalons.length !== salonIds.length) {
      return res.status(403).json({ error: "Not authorized for some services" });
    }

    // Bulk update
    const updated = await db.update(services)
      .set({ isActive })
      .where(inArray(services.id, serviceIds))
      .returning();

    // Audit log
    await logAudit(ownerId, `service.bulk_${isActive ? "activate" : "deactivate"}`, "services", null, {
      serviceIds,
      salonIds,
      isActive,
      count: updated.length,
    });

    return res.json({ success: true, updated });
  } catch (error) {
    console.error("Bulk toggle services error:", error);
    return res.status(500).json({ error: "Failed to bulk toggle services" });
  }
});

// Reorder services (bulk update displayOrder)
router.put("/services/reorder", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;

    const reorderSchema = z.object({
      services: z.array(z.object({
        id: z.string(),
        displayOrder: z.number().int(),
      })).min(1),
    });

    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
    }

    const { services: servicesToReorder } = parsed.data;

    // Get all services to verify ownership
    const serviceIds = servicesToReorder.map(s => s.id);
    const allServices = await db.select().from(services)
      .where(inArray(services.id, serviceIds));

    // Get salon IDs and verify ownership
    const salonIds = [...new Set(allServices.map(s => s.salonId))];
    const ownerSalons = await db.select().from(salons)
      .where(and(
        inArray(salons.id, salonIds),
        eq(salons.ownerId, ownerId)
      ));

    if (ownerSalons.length !== salonIds.length) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update display orders
    const updates = await Promise.all(
      servicesToReorder.map(item =>
        db.update(services)
          .set({ displayOrder: item.displayOrder })
          .where(eq(services.id, item.id))
          .returning()
      )
    );

    return res.json({ success: true, updated: updates.flat() });
  } catch (error) {
    console.error("Reorder services error:", error);
    return res.status(500).json({ error: "Failed to reorder services" });
  }
});

// ============ BOOKING MANAGEMENT ENDPOINTS (Phase 1 - P0-4) ============

// Get advanced bookings list with filters
router.get("/bookings/advanced", isAuthenticated, requirePermission(OWNER_PERMISSIONS.READ_BOOKINGS), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const {
      status,
      salonId,
      masterId,
      dateFrom,
      dateTo,
      search,
      limit = "50",
      offset = "0"
    } = req.query;

    // Get owner's salons
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json({ bookings: [], total: 0 });
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Build query conditions
    const conditions = [inArray(bookings.salonId, salonIds)];

    if (status) conditions.push(eq(bookings.status, status as any));
    if (salonId) conditions.push(eq(bookings.salonId, salonId as string));
    if (masterId) conditions.push(eq(bookings.masterId, masterId as string));
    if (dateFrom) conditions.push(gte(bookings.bookingDate, new Date(dateFrom as string)));
    if (dateTo) conditions.push(lte(bookings.bookingDate, new Date(dateTo as string)));

    // Get bookings with joined data
    let query = db.select({
      id: bookings.id,
      salonId: bookings.salonId,
      clientId: bookings.clientId,
      masterId: bookings.masterId,
      serviceId: bookings.serviceId,
      date: bookings.bookingDate,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      price: bookings.priceSnapshot,
      notes: bookings.notes,
      modifiedBy: bookings.modifiedBy,
      modificationHistory: bookings.modificationHistory,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      salonName: salons.name,
      masterName: masters.name,
      serviceName: services.name,
      clientName: sql<string>`users.full_name`,
      clientEmail: sql<string>`users.email`,
    })
      .from(bookings)
      .leftJoin(salons, eq(bookings.salonId, salons.id))
      .leftJoin(masters, eq(bookings.masterId, masters.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(sql`users`, sql`bookings.client_id = users.id`)
      .where(and(...conditions))
      .orderBy(desc(bookings.bookingDate), desc(bookings.startTime))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const allBookings = await query;

    // Apply search filter if provided (client name, salon name, master name)
    let filteredBookings = allBookings;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredBookings = allBookings.filter(b =>
        b.clientName?.toLowerCase().includes(searchLower) ||
        b.clientEmail?.toLowerCase().includes(searchLower) ||
        b.salonName?.en?.toLowerCase().includes(searchLower) ||
        b.masterName?.en?.toLowerCase().includes(searchLower)
      );
    }

    // Get total count
    const totalQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(and(...conditions));

    const total = totalQuery[0]?.count || 0;

    return res.json({ bookings: filteredBookings, total });
  } catch (error) {
    console.error("Get advanced bookings error:", error);
    return res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Bulk update booking status
router.post("/bookings/bulk-update", isAuthenticated, requirePermission(OWNER_PERMISSIONS.MANAGE_BOOKINGS), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;

    const bulkUpdateSchema = z.object({
      bookingIds: z.array(z.string()).min(1),
      status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
      notes: z.string().optional(),
    });

    const { bookingIds, status, notes } = bulkUpdateSchema.parse(req.body);

    // Verify all bookings belong to owner's salons
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));

    const salonIds = ownerSalons.map(s => s.id);

    const bookingsToUpdate = await db.select().from(bookings)
      .where(and(
        inArray(bookings.id, bookingIds),
        inArray(bookings.salonId, salonIds)
      ));

    if (bookingsToUpdate.length !== bookingIds.length) {
      return res.status(403).json({ error: "Not authorized to update some bookings" });
    }

    // Update bookings and add to history
    const updates = await Promise.all(
      bookingIds.map(async (bookingId) => {
        const booking = bookingsToUpdate.find(b => b.id === bookingId);
        if (!booking) return null;

        const historyEntry = {
          timestamp: new Date().toISOString(),
          action: `Status changed to ${status}`,
          changedBy: ownerId,
          changes: {
            status: { from: booking.status, to: status },
            ...(notes && { notes })
          },
        };

        const currentHistory = (booking.modificationHistory as any[]) || [];

        const [updated] = await db.update(bookings)
          .set({
            status,
            ...(notes && { notes }),
            modifiedBy: ownerId,
            modificationHistory: [...currentHistory, historyEntry],
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, bookingId))
          .returning();

        return updated;
      })
    );

    const successfulUpdates = updates.filter(Boolean);

    // Log audit trail
    await logAudit({
      actorId: ownerId,
      action: 'booking.bulk_update',
      entityType: 'booking',
      entityId: bookingIds.join(','),
      salonId: bookingsToUpdate[0]?.salonId,
      details: {
        bookingCount: bookingIds.length,
        status: { to: status },
        notes,
        updatedBookings: successfulUpdates.map(b => b.id),
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'success',
    });

    return res.json({ success: true, updated: successfulUpdates });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Bulk update bookings error:", error);
    return res.status(500).json({ error: "Failed to update bookings" });
  }
});

// Get booking modification history
router.get("/bookings/:bookingId/history", isAuthenticated, requirePermission(OWNER_PERMISSIONS.READ_BOOKINGS), async (req: any, res) => {
  try {
    const { bookingId } = req.params;
    const ownerId = req.user.claims.sub;

    // Verify booking belongs to owner's salon
    const [booking] = await db.select({
      bookingId: bookings.id,
      history: bookings.modificationHistory,
      salonOwnerId: salons.ownerId,
    })
      .from(bookings)
      .leftJoin(salons, eq(bookings.salonId, salons.id))
      .where(eq(bookings.id, bookingId));

    if (!booking || booking.salonOwnerId !== ownerId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    return res.json({ history: booking.history || [] });
  } catch (error) {
    console.error("Get booking history error:", error);
    return res.status(500).json({ error: "Failed to get booking history" });
  }
});

// Export bookings to CSV
router.get("/bookings/export", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const { dateFrom, dateTo } = req.query;

    // Get owner's salons
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.status(404).json({ error: "No salons found" });
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Build query conditions
    const conditions = [inArray(bookings.salonId, salonIds)];
    if (dateFrom) conditions.push(gte(bookings.date, new Date(dateFrom as string)));
    if (dateTo) conditions.push(lte(bookings.date, new Date(dateTo as string)));

    // Get bookings with joined data
    const allBookings = await db.select({
      id: bookings.id,
      date: bookings.date,
      time: bookings.time,
      status: bookings.status,
      price: bookings.price,
      duration: bookings.duration,
      notes: bookings.notes,
      salonName: salons.name,
      masterName: masters.name,
      serviceName: services.name,
      clientName: sql<string>`users.full_name`,
      clientEmail: sql<string>`users.email`,
    })
      .from(bookings)
      .leftJoin(salons, eq(bookings.salonId, salons.id))
      .leftJoin(masters, eq(bookings.masterId, masters.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(sql`users`, sql`bookings.client_id = users.id`)
      .where(and(...conditions))
      .orderBy(desc(bookings.date));

    // Generate CSV
    const headers = ['ID', 'Date', 'Time', 'Client', 'Salon', 'Master', 'Service', 'Duration', 'Status', 'Price'];
    const rows = allBookings.map(b => [
      b.id,
      b.date?.toISOString().split('T')[0] || '',
      b.time || '',
      b.clientName || '',
      b.salonName?.en || '',
      b.masterName?.en || '',
      b.serviceName?.en || '',
      `${b.duration} min`,
      b.status,
      b.price?.toString() || '0',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
    return res.send(csv);
  } catch (error) {
    console.error("Export bookings error:", error);
    return res.status(500).json({ error: "Failed to export bookings" });
  }
});

// ============ DASHBOARD ENDPOINTS (Phase 1) ============

// Get dashboard overview with KPIs
router.get("/dashboard/overview", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;

    // Get owner's salons
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json({
        today: { revenue: 0, bookings: 0, newClients: 0, completionRate: 0 },
        week: { revenue: 0, revenueChange: 0, bookings: 0, bookingsChange: 0 },
        month: { revenue: 0, bookings: 0, topServices: [], topMasters: [] },
      });
    }

    const salonIds = ownerSalons.map(s => s.id);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's stats
    const todayBookings = await db.select().from(bookings)
      .where(and(
        inArray(bookings.salonId, salonIds),
        eq(bookings.bookingDate, today)
      ));

    const todayRevenue = todayBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.priceSnapshot, 0);

    const todayCompletionRate = todayBookings.length > 0
      ? (todayBookings.filter(b => b.status === 'completed').length / todayBookings.length) * 100
      : 0;

    // Week stats
    const weekBookings = await db.select().from(bookings)
      .where(and(
        inArray(bookings.salonId, salonIds),
        desc(bookings.bookingDate)
      ));

    const thisWeekBookings = weekBookings.filter(b =>
      new Date(b.bookingDate) >= weekAgo
    );
    const lastWeekBookings = weekBookings.filter(b => {
      const date = new Date(b.bookingDate);
      return date >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && date < weekAgo;
    });

    const weekRevenue = thisWeekBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.priceSnapshot, 0);

    const lastWeekRevenue = lastWeekBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.priceSnapshot, 0);

    const revenueChange = lastWeekRevenue > 0
      ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
      : 0;

    const bookingsChange = lastWeekBookings.length > 0
      ? ((thisWeekBookings.length - lastWeekBookings.length) / lastWeekBookings.length) * 100
      : 0;

    // Month stats
    const monthBookings = weekBookings.filter(b =>
      new Date(b.bookingDate) >= monthStart
    );

    const monthRevenue = monthBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.priceSnapshot, 0);

    // Top services
    const serviceStats = new Map<string, { count: number; revenue: number }>();
    monthBookings.forEach(b => {
      const current = serviceStats.get(b.serviceId) || { count: 0, revenue: 0 };
      serviceStats.set(b.serviceId, {
        count: current.count + 1,
        revenue: current.revenue + (b.status === 'completed' ? b.priceSnapshot : 0)
      });
    });

    const topServiceIds = Array.from(serviceStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id]) => id);

    const topServicesData = topServiceIds.length > 0
      ? await db.select().from(services).where(inArray(services.id, topServiceIds))
      : [];

    const topServices = topServicesData.map(s => ({
      id: s.id,
      name: s.name,
      count: serviceStats.get(s.id)?.count || 0
    }));

    // Top masters
    const masterStats = new Map<string, { revenue: number; bookings: number }>();
    monthBookings
      .filter(b => b.masterId)
      .forEach(b => {
        const current = masterStats.get(b.masterId!) || { revenue: 0, bookings: 0 };
        masterStats.set(b.masterId!, {
          revenue: current.revenue + (b.status === 'completed' ? b.priceSnapshot : 0),
          bookings: current.bookings + 1
        });
      });

    const topMasterIds = Array.from(masterStats.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id]) => id);

    const topMastersData = topMasterIds.length > 0
      ? await db.select().from(masters).where(inArray(masters.id, topMasterIds))
      : [];

    const topMasters = topMastersData.map(m => ({
      id: m.id,
      name: m.name,
      revenue: masterStats.get(m.id)?.revenue || 0
    }));

    // Unique clients this month
    const uniqueClients = new Set(monthBookings.map(b => b.clientId));

    // Get last 30 days bookings for trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const last30DaysBookings = await db.select().from(bookings)
      .where(
        and(
          inArray(bookings.salonId, salonIds),
          gte(bookings.bookingDate, thirtyDaysAgo)
        )
      );

    // Group by date for trends
    const dailyStats = new Map<string, { revenue: number; bookings: number }>();

    // Initialize all 30 days with zero values
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateKey = date.toISOString().split('T')[0];
      dailyStats.set(dateKey, { revenue: 0, bookings: 0 });
    }

    // Fill in actual data
    last30DaysBookings.forEach(b => {
      const dateKey = new Date(b.bookingDate).toISOString().split('T')[0];
      const current = dailyStats.get(dateKey) || { revenue: 0, bookings: 0 };
      dailyStats.set(dateKey, {
        revenue: current.revenue + (b.status === 'completed' ? b.priceSnapshot : 0),
        bookings: current.bookings + 1
      });
    });

    // Convert to array sorted by date
    const trendData = Array.from(dailyStats.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, stats]) => ({
        date,
        revenue: stats.revenue,
        bookings: stats.bookings
      }));

    return res.json({
      today: {
        revenue: todayRevenue,
        bookings: todayBookings.length,
        newClients: 0, // TODO: implement new client tracking
        completionRate: Math.round(todayCompletionRate)
      },
      week: {
        revenue: weekRevenue,
        revenueChange: Math.round(revenueChange * 10) / 10,
        bookings: thisWeekBookings.length,
        bookingsChange: Math.round(bookingsChange * 10) / 10
      },
      month: {
        revenue: monthRevenue,
        bookings: monthBookings.length,
        topServices,
        topMasters
      },
      trends: trendData
    });
  } catch (error) {
    console.error("Dashboard overview error:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ownerId: req.user?.claims?.sub,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      error: "Failed to get dashboard data",
      message: error instanceof Error ? error.message : "Unknown error",
      // Don't expose stack trace in production, but log requestId for debugging
      requestId: req.id || Math.random().toString(36)
    });
  }
});

// Get recent activity
router.get("/dashboard/recent-activity", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;

    // Get owner's salons
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json([]);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Get recent bookings (last 20)
    const recentBookings = await db.select().from(bookings)
      .where(inArray(bookings.salonId, salonIds))
      .orderBy(desc(bookings.createdAt))
      .limit(20);

    const activity = recentBookings.map(b => ({
      type: b.status === 'pending' ? 'new_booking' :
            b.status === 'confirmed' ? 'booking_confirmed' :
            b.status === 'cancelled' ? 'booking_cancelled' : 'booking_completed',
      message: `Booking ${b.status}`,
      timestamp: b.createdAt,
      relatedId: b.id,
      metadata: {
        salonId: b.salonId,
        bookingDate: b.bookingDate,
        status: b.status
      }
    }));

    return res.json(activity);
  } catch (error) {
    console.error("Recent activity error:", error);
    return res.status(500).json({ error: "Failed to get recent activity" });
  }
});

// Get alerts (actions requiring attention)
router.get("/dashboard/alerts", isAuthenticated, async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;

    // Get owner's salons
    const ownerSalons = await db.select().from(salons)
      .where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json([]);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Pending bookings (require confirmation)
    const pendingBookings = await db.select().from(bookings)
      .where(and(
        inArray(bookings.salonId, salonIds),
        eq(bookings.status, 'pending')
      ));

    const alerts = [];

    if (pendingBookings.length > 0) {
      alerts.push({
        type: 'pending_bookings',
        severity: 'warning',
        count: pendingBookings.length,
        message: `${pendingBookings.length} booking${pendingBookings.length > 1 ? 's' : ''} awaiting confirmation`,
        action: 'GO_BOOKINGS'
      });
    }

    // Check for salons without services
    for (const salon of ownerSalons) {
      const salonServices = await db.select().from(services)
        .where(eq(services.salonId, salon.id));

      if (salonServices.length === 0) {
        alerts.push({
          type: 'no_services',
          severity: 'error',
          salonId: salon.id,
          salonName: salon.name,
          message: `Salon "${salon.name.ru || salon.name.en}" has no services`,
          action: 'GO_SERVICES'
        });
      }
    }

    // Check for salons without masters
    for (const salon of ownerSalons) {
      const salonMasters = await db.select().from(masters)
        .where(eq(masters.salonId, salon.id));

      if (salonMasters.length === 0) {
        alerts.push({
          type: 'no_masters',
          severity: 'error',
          salonId: salon.id,
          salonName: salon.name,
          message: `Salon "${salon.name.ru || salon.name.en}" has no masters`,
          action: 'GO_MASTERS'
        });
      }
    }

    // Check for unpublished salons
    for (const salon of ownerSalons) {
      if (!salon.isActive) {
        alerts.push({
          type: 'salon_not_published',
          severity: 'info',
          salonId: salon.id,
          salonName: salon.name,
          message: `Salon "${salon.name.ru || salon.name.en}" is not published`,
          action: 'PUBLISH_SALON'
        });
      }
    }

    return res.json(alerts);
  } catch (error) {
    console.error("Dashboard alerts error:", error);
    return res.status(500).json({ error: "Failed to get alerts" });
  }
});

// ============ PHASE 7: ANALYTICS ENHANCEMENTS ============

// Get analytics for custom date range
router.get("/analytics/custom-range", isAuthenticated, requirePermission("ANALYTICS", "view"), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const { from, to, salonId } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to dates are required" });
    }

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    // Get owner's salons
    let ownerSalons = await db.select().from(salons).where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json({
        totalBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        averageBookingValue: 0,
        completionRate: 0,
        cancellationRate: 0
      });
    }

    // Filter by specific salon if provided
    if (salonId && salonId !== 'all') {
      ownerSalons = ownerSalons.filter(s => s.id === salonId);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Get bookings in date range
    const rangeBookings = await db.select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.salonId, salonIds),
          gte(bookings.bookingDate, fromDate),
          lte(bookings.bookingDate, toDate)
        )
      );

    const totalBookings = rangeBookings.length;
    const confirmedBookings = rangeBookings.filter(b => b.status === "confirmed").length;
    const completedBookings = rangeBookings.filter(b => b.status === "completed").length;
    const cancelledBookings = rangeBookings.filter(b => b.status === "cancelled").length;

    const totalRevenue = rangeBookings
      .filter(b => b.status === "completed")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

    return res.json({
      dateRange: { from: fromDate, to: toDate },
      salonId: salonId || 'all',
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      averageBookingValue: Math.round(averageBookingValue * 100) / 100,
      completionRate: Math.round(completionRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10
    });
  } catch (error) {
    console.error("Custom range analytics error:", error);
    return res.status(500).json({ error: "Failed to get analytics" });
  }
});

// Get comparison analytics (current period vs previous period)
router.get("/analytics/comparison", isAuthenticated, requirePermission("ANALYTICS", "view"), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const { from, to, salonId } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to dates are required" });
    }

    const currentFrom = new Date(from as string);
    const currentTo = new Date(to as string);

    // Calculate previous period (same duration)
    const durationMs = currentTo.getTime() - currentFrom.getTime();
    const previousFrom = new Date(currentFrom.getTime() - durationMs);
    const previousTo = new Date(currentFrom.getTime());

    // Get owner's salons
    let ownerSalons = await db.select().from(salons).where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json({
        current: { totalBookings: 0, totalRevenue: 0, completionRate: 0 },
        previous: { totalBookings: 0, totalRevenue: 0, completionRate: 0 },
        changes: { bookings: 0, revenue: 0, completionRate: 0 }
      });
    }

    // Filter by specific salon if provided
    if (salonId && salonId !== 'all') {
      ownerSalons = ownerSalons.filter(s => s.id === salonId);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Get current period bookings
    const currentBookings = await db.select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.salonId, salonIds),
          gte(bookings.bookingDate, currentFrom),
          lte(bookings.bookingDate, currentTo)
        )
      );

    // Get previous period bookings
    const previousBookings = await db.select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.salonId, salonIds),
          gte(bookings.bookingDate, previousFrom),
          lt(bookings.bookingDate, previousTo)
        )
      );

    // Calculate current period metrics
    const currentTotal = currentBookings.length;
    const currentCompleted = currentBookings.filter(b => b.status === "completed").length;
    const currentRevenue = currentBookings
      .filter(b => b.status === "completed")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const currentCompletionRate = currentTotal > 0 ? (currentCompleted / currentTotal) * 100 : 0;

    // Calculate previous period metrics
    const previousTotal = previousBookings.length;
    const previousCompleted = previousBookings.filter(b => b.status === "completed").length;
    const previousRevenue = previousBookings
      .filter(b => b.status === "completed")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const previousCompletionRate = previousTotal > 0 ? (previousCompleted / previousTotal) * 100 : 0;

    // Calculate percentage changes
    const bookingsChange = previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : currentTotal > 0 ? 100 : 0;

    const revenueChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0;

    const completionRateChange = previousCompletionRate > 0
      ? currentCompletionRate - previousCompletionRate
      : currentCompletionRate;

    return res.json({
      dateRange: {
        current: { from: currentFrom, to: currentTo },
        previous: { from: previousFrom, to: previousTo }
      },
      current: {
        totalBookings: currentTotal,
        completedBookings: currentCompleted,
        totalRevenue: currentRevenue,
        completionRate: Math.round(currentCompletionRate * 10) / 10
      },
      previous: {
        totalBookings: previousTotal,
        completedBookings: previousCompleted,
        totalRevenue: previousRevenue,
        completionRate: Math.round(previousCompletionRate * 10) / 10
      },
      changes: {
        bookings: Math.round(bookingsChange * 10) / 10,
        revenue: Math.round(revenueChange * 10) / 10,
        completionRate: Math.round(completionRateChange * 10) / 10
      }
    });
  } catch (error) {
    console.error("Comparison analytics error:", error);
    return res.status(500).json({ error: "Failed to get comparison analytics" });
  }
});

// Get master performance analytics
router.get("/analytics/master-performance", isAuthenticated, requirePermission("ANALYTICS", "view"), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const { from, to, salonId } = req.query;

    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();

    // Get owner's salons
    let ownerSalons = await db.select().from(salons).where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json([]);
    }

    // Filter by specific salon if provided
    if (salonId && salonId !== 'all') {
      ownerSalons = ownerSalons.filter(s => s.id === salonId);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Get all masters for these salons
    const salonMasters = await db.select()
      .from(masters)
      .where(inArray(masters.salonId, salonIds));

    // Get bookings in date range
    const rangeBookings = await db.select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.salonId, salonIds),
          gte(bookings.bookingDate, fromDate),
          lte(bookings.bookingDate, toDate)
        )
      );

    // Calculate performance for each master
    const masterPerformance = salonMasters.map(master => {
      const masterBookings = rangeBookings.filter(b => b.masterId === master.id);
      const totalBookings = masterBookings.length;
      const completedBookings = masterBookings.filter(b => b.status === "completed").length;
      const cancelledBookings = masterBookings.filter(b => b.status === "cancelled").length;

      const totalRevenue = masterBookings
        .filter(b => b.status === "completed")
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
      const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

      return {
        masterId: master.id,
        masterName: master.name,
        salonId: master.salonId,
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        completionRate: Math.round(completionRate * 10) / 10,
        cancellationRate: Math.round(cancellationRate * 10) / 10
      };
    });

    // Sort by revenue (descending)
    masterPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return res.json(masterPerformance);
  } catch (error) {
    console.error("Master performance analytics error:", error);
    return res.status(500).json({ error: "Failed to get master performance" });
  }
});

// Get service performance analytics
router.get("/analytics/service-performance", isAuthenticated, requirePermission("ANALYTICS", "view"), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const { from, to, salonId } = req.query;

    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();

    // Get owner's salons
    let ownerSalons = await db.select().from(salons).where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json([]);
    }

    // Filter by specific salon if provided
    if (salonId && salonId !== 'all') {
      ownerSalons = ownerSalons.filter(s => s.id === salonId);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Get all services for these salons
    const salonServices = await db.select()
      .from(services)
      .where(inArray(services.salonId, salonIds));

    // Get bookings in date range
    const rangeBookings = await db.select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.salonId, salonIds),
          gte(bookings.bookingDate, fromDate),
          lte(bookings.bookingDate, toDate)
        )
      );

    // Calculate performance for each service
    const servicePerformance = salonServices.map(service => {
      const serviceBookings = rangeBookings.filter(b => b.serviceId === service.id);
      const totalBookings = serviceBookings.length;
      const completedBookings = serviceBookings.filter(b => b.status === "completed").length;

      const totalRevenue = serviceBookings
        .filter(b => b.status === "completed")
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

      return {
        serviceId: service.id,
        serviceName: service.name,
        salonId: service.salonId,
        price: service.price,
        totalBookings,
        completedBookings,
        totalRevenue,
        completionRate: Math.round(completionRate * 10) / 10
      };
    });

    // Sort by revenue (descending)
    servicePerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return res.json(servicePerformance);
  } catch (error) {
    console.error("Service performance analytics error:", error);
    return res.status(500).json({ error: "Failed to get service performance" });
  }
});

// Get peak hours analysis
router.get("/analytics/peak-hours", isAuthenticated, requirePermission("ANALYTICS", "view"), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const { from, to, salonId } = req.query;

    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();

    // Get owner's salons
    let ownerSalons = await db.select().from(salons).where(eq(salons.ownerId, ownerId));

    if (ownerSalons.length === 0) {
      return res.json([]);
    }

    // Filter by specific salon if provided
    if (salonId && salonId !== 'all') {
      ownerSalons = ownerSalons.filter(s => s.id === salonId);
    }

    const salonIds = ownerSalons.map(s => s.id);

    // Get bookings in date range
    const rangeBookings = await db.select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.salonId, salonIds),
          gte(bookings.bookingDate, fromDate),
          lte(bookings.bookingDate, toDate),
          ne(bookings.status, "cancelled")
        )
      );

    // Group by hour
    const hourlyBookings: { [hour: number]: number } = {};

    rangeBookings.forEach(booking => {
      const hour = parseInt(booking.startTime.split(':')[0]);
      hourlyBookings[hour] = (hourlyBookings[hour] || 0) + 1;
    });

    // Convert to array and sort
    const peakHours = Object.entries(hourlyBookings)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        timeRange: `${hour.toString().padStart(2, '0')}:00 - ${(parseInt(hour) + 1).toString().padStart(2, '0')}:00`,
        bookings: count
      }))
      .sort((a, b) => b.bookings - a.bookings);

    return res.json(peakHours);
  } catch (error) {
    console.error("Peak hours analytics error:", error);
    return res.status(500).json({ error: "Failed to get peak hours" });
  }
});

// Manual booking creation by owner (Phase 8)
router.post("/bookings/manual", isAuthenticated, requirePermission("BOOKINGS", "create"), async (req: any, res) => {
  try {
    const ownerId = req.user.claims.sub;
    const {
      salonId,
      serviceId,
      masterId,
      clientName,
      clientPhone,
      bookingDate,
      startTime,
      endTime,
      notes
    } = req.body;

    // Validation
    if (!salonId || !serviceId || !clientName || !clientPhone || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["salonId", "serviceId", "clientName", "clientPhone", "bookingDate", "startTime", "endTime"]
      });
    }

    // Verify owner owns this salon
    const [salon] = await db.select().from(salons)
      .where(and(
        eq(salons.id, salonId),
        eq(salons.ownerId, ownerId)
      ));

    if (!salon) {
      return res.status(403).json({ error: "Salon not found or access denied" });
    }

    // Get service details for price
    const [service] = await db.select().from(services)
      .where(and(
        eq(services.id, serviceId),
        eq(services.salonId, salonId)
      ));

    if (!service) {
      return res.status(404).json({ error: "Service not found in this salon" });
    }

    // Check for slot conflicts if master is specified
    if (masterId) {
      const conflictingBookings = await db.select().from(bookings)
        .where(
          and(
            eq(bookings.masterId, masterId),
            eq(bookings.bookingDate, new Date(bookingDate)),
            ne(bookings.status, "cancelled"),
            // Check time overlap
            sql`(${bookings.startTime} < ${endTime} AND ${bookings.endTime} > ${startTime})`
          )
        );

      if (conflictingBookings.length > 0) {
        return res.status(409).json({
          error: "Master is already booked during this time",
          conflicts: conflictingBookings
        });
      }
    }

    // Check or create client profile
    let [clientProfile] = await db.select().from(userProfiles)
      .where(eq(userProfiles.phoneNumber, clientPhone));

    // If client doesn't exist, create a guest profile
    if (!clientProfile) {
      const [newProfile] = await db.insert(userProfiles).values({
        fullName: clientName,
        phoneNumber: clientPhone,
        role: "client",
        // No userId - this is a guest booking
      }).returning();
      clientProfile = newProfile;
    }

    // Create booking
    const [booking] = await db.insert(bookings).values({
      clientId: clientProfile.id,
      salonId,
      serviceId,
      masterId: masterId || null,
      bookingDate: new Date(bookingDate),
      startTime,
      endTime,
      status: "confirmed", // Owner-created bookings are auto-confirmed
      priceSnapshot: service.basePrice,
      notes: notes || `Manual booking created by owner (${clientName}, ${clientPhone})`,
      modifiedBy: ownerId,
      modificationHistory: [{
        timestamp: new Date().toISOString(),
        action: "manual_create",
        changedBy: ownerId,
        changes: {
          clientName,
          clientPhone,
          createdBy: "owner"
        }
      }]
    }).returning();

    // Create notification for the master if assigned
    if (masterId) {
      const bookingDateStr = new Date(bookingDate).toISOString().split('T')[0];
      await createNewBookingNotification(
        db,
        masterId,
        bookingDateStr,
        startTime,
        booking.id
      );
    }

    // Log audit
    await logAudit(ownerId, "booking.manual_create", "bookings", booking.id, {
      salonId,
      clientName,
      clientPhone,
      serviceId,
      masterId,
      bookingDate,
      startTime
    });

    return res.status(201).json(booking);
  } catch (error) {
    console.error("Manual booking creation error:", error);
    return res.status(500).json({ error: "Failed to create manual booking" });
  }
});

export default router;
