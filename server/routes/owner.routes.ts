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
  insertSalonSchema,
  insertMasterSchema,
  insertServiceSchema,
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { isAuthenticated } from "../auth";

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
      photos: z.array(z.string().url()).optional(),
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

    return res.json(salonBookings);
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

export default router;
