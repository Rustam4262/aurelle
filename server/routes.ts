import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { setupYandexAuth, isYandexConfigured } from "./yandexAuth";
import { setupLocalAuth } from "./localAuth";
import { db } from "./db";
import { 
  contactSchema, 
  newsletterSchema,
  salons,
  masters,
  services,
  bookings,
  reviews,
  salonWorkingHours,
  favorites,
  userProfiles,
  insertSalonSchema,
  insertMasterSchema,
  insertServiceSchema,
  insertBookingSchema,
  insertReviewSchema,
  insertUserProfileSchema,
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup Yandex OAuth (if configured)
  await setupYandexAuth(app);

  // Setup local auth (login/password)
  setupLocalAuth(app);

  // Auth providers status endpoint
  app.get("/api/auth/providers", (req, res) => {
    res.json({
      replit: true,
      yandex: isYandexConfigured(),
    });
  });

  // ============ PUBLIC ROUTES ============
  
  // Get all active salons (for map display)
  app.get("/api/salons", async (req, res) => {
    try {
      const { city, minLat, maxLat, minLng, maxLng } = req.query;
      
      let query = db.select().from(salons).where(eq(salons.isActive, true));
      
      const result = await query.orderBy(desc(salons.averageRating));
      return res.json(result);
    } catch (error) {
      console.error("Get salons error:", error);
      return res.status(500).json({ error: "Failed to get salons" });
    }
  });

  // Get single salon with details
  app.get("/api/salons/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const [salon] = await db.select().from(salons).where(eq(salons.id, id));
      if (!salon) {
        return res.status(404).json({ error: "Salon not found" });
      }

      const salonMasters = await db.select().from(masters)
        .where(and(eq(masters.salonId, id), eq(masters.isActive, true)));
      
      const salonServices = await db.select().from(services)
        .where(and(eq(services.salonId, id), eq(services.isActive, true)));
      
      const workingHours = await db.select().from(salonWorkingHours)
        .where(eq(salonWorkingHours.salonId, id));
      
      const salonReviews = await db.select().from(reviews)
        .where(eq(reviews.salonId, id))
        .orderBy(desc(reviews.createdAt))
        .limit(10);

      return res.json({
        ...salon,
        masters: salonMasters,
        services: salonServices,
        workingHours,
        reviews: salonReviews,
      });
    } catch (error) {
      console.error("Get salon error:", error);
      return res.status(500).json({ error: "Failed to get salon" });
    }
  });

  // Get salon services
  app.get("/api/salons/:id/services", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.select().from(services)
        .where(and(eq(services.salonId, id), eq(services.isActive, true)));
      return res.json(result);
    } catch (error) {
      console.error("Get services error:", error);
      return res.status(500).json({ error: "Failed to get services" });
    }
  });

  // Get salon masters
  app.get("/api/salons/:id/masters", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.select().from(masters)
        .where(and(eq(masters.salonId, id), eq(masters.isActive, true)));
      return res.json(result);
    } catch (error) {
      console.error("Get masters error:", error);
      return res.status(500).json({ error: "Failed to get masters" });
    }
  });

  // Get salon working hours
  app.get("/api/salons/:id/hours", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.select().from(salonWorkingHours)
        .where(eq(salonWorkingHours.salonId, id));
      return res.json(result);
    } catch (error) {
      console.error("Get hours error:", error);
      return res.status(500).json({ error: "Failed to get hours" });
    }
  });

  // Get salon reviews
  app.get("/api/salons/:id/reviews", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.select().from(reviews)
        .where(eq(reviews.salonId, id))
        .orderBy(desc(reviews.createdAt));
      return res.json(result);
    } catch (error) {
      console.error("Get reviews error:", error);
      return res.status(500).json({ error: "Failed to get reviews" });
    }
  });

  // Get master details
  app.get("/api/masters/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [master] = await db.select().from(masters).where(eq(masters.id, id));
      if (!master) {
        return res.status(404).json({ error: "Master not found" });
      }
      
      const masterReviews = await db.select().from(reviews)
        .where(eq(reviews.masterId, id))
        .orderBy(desc(reviews.createdAt))
        .limit(10);

      return res.json({ ...master, reviews: masterReviews });
    } catch (error) {
      console.error("Get master error:", error);
      return res.status(500).json({ error: "Failed to get master" });
    }
  });

  // ============ AUTHENTICATED ROUTES ============

  // Get user profile
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [profile] = await db.select().from(userProfiles)
        .where(eq(userProfiles.userId, userId));
      
      if (!profile) {
        return res.json({ 
          exists: false,
          userId,
          username: req.user.claims.name || req.user.claims.username,
        });
      }
      return res.json({ exists: true, ...profile });
    } catch (error) {
      console.error("Get profile error:", error);
      return res.status(500).json({ error: "Failed to get profile" });
    }
  });

  // Create or update user profile
  app.post("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const profilePayloadSchema = z.object({
        role: z.enum(["client", "owner"]),
        fullName: z.string().min(1, "Full name is required").max(200).trim(),
        phone: z.string().min(1, "Phone number is required").max(20).trim(),
        city: z.string().min(1, "City is required").max(100).trim(),
      });
      
      const parsed = profilePayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid profile data", details: parsed.error.errors });
      }
      
      const { role, fullName, phone, city } = parsed.data;

      const [existing] = await db.select().from(userProfiles)
        .where(eq(userProfiles.userId, userId));

      if (existing) {
        const [updated] = await db.update(userProfiles)
          .set({ 
            role,
            fullName,
            phone,
            city,
            isProfileComplete: true,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, userId))
          .returning();
        return res.json(updated);
      } else {
        const [created] = await db.insert(userProfiles)
          .values([{
            userId,
            role,
            fullName,
            phone,
            city,
            isProfileComplete: true,
          }])
          .returning();
        return res.status(201).json(created);
      }
    } catch (error) {
      console.error("Create/update profile error:", error);
      return res.status(500).json({ error: "Failed to save profile" });
    }
  });

  // Create booking
  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.user.claims.sub;
      const parsed = insertBookingSchema.safeParse({ ...req.body, clientId });
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid booking data", details: parsed.error.errors });
      }

      const [booking] = await db.insert(bookings).values([parsed.data as any]).returning();
      return res.status(201).json(booking);
    } catch (error) {
      console.error("Create booking error:", error);
      return res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Get user's bookings
  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.user.claims.sub;
      const userBookings = await db.select().from(bookings)
        .where(eq(bookings.clientId, clientId))
        .orderBy(desc(bookings.bookingDate));
      return res.json(userBookings);
    } catch (error) {
      console.error("Get bookings error:", error);
      return res.status(500).json({ error: "Failed to get bookings" });
    }
  });

  // Get user's favorites
  app.get("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userFavorites = await db.select({
        id: salons.id,
        name: salons.name,
        city: salons.city,
        photos: salons.photos,
        averageRating: salons.averageRating,
        reviewCount: salons.reviewCount,
      }).from(favorites)
        .innerJoin(salons, eq(favorites.salonId, salons.id))
        .where(eq(favorites.userId, userId));
      return res.json(userFavorites);
    } catch (error) {
      console.error("Get favorites error:", error);
      return res.status(500).json({ error: "Failed to get favorites" });
    }
  });

  // Add to favorites
  app.post("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { salonId } = req.body;
      
      if (!salonId) {
        return res.status(400).json({ error: "Salon ID required" });
      }

      const [favorite] = await db.insert(favorites)
        .values([{ userId, salonId }])
        .returning();
      return res.status(201).json(favorite);
    } catch (error) {
      console.error("Add favorite error:", error);
      return res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  // Remove from favorites
  app.delete("/api/favorites/:salonId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { salonId } = req.params;
      
      await db.delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));
      return res.json({ success: true });
    } catch (error) {
      console.error("Remove favorite error:", error);
      return res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // Cancel booking
  app.patch("/api/bookings/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const clientId = req.user.claims.sub;
      
      const [booking] = await db.update(bookings)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(bookings.id, id), eq(bookings.clientId, clientId)))
        .returning();

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      return res.json(booking);
    } catch (error) {
      console.error("Cancel booking error:", error);
      return res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  // Create review
  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.user.claims.sub;
      const parsed = insertReviewSchema.safeParse({ ...req.body, clientId });
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid review data", details: parsed.error.errors });
      }

      const [review] = await db.insert(reviews).values([parsed.data as any]).returning();
      
      // Update salon/master average rating
      if (parsed.data.salonId) {
        await updateSalonRating(parsed.data.salonId);
      }
      if (parsed.data.masterId) {
        await updateMasterRating(parsed.data.masterId);
      }
      
      return res.status(201).json(review);
    } catch (error) {
      console.error("Create review error:", error);
      return res.status(500).json({ error: "Failed to create review" });
    }
  });

  // Toggle favorite
  app.post("/api/favorites/:salonId", isAuthenticated, async (req: any, res) => {
    try {
      const { salonId } = req.params;
      const userId = req.user.claims.sub;

      const existing = await db.select().from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));

      if (existing.length > 0) {
        await db.delete(favorites)
          .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));
        return res.json({ favorited: false });
      } else {
        await db.insert(favorites).values({ userId, salonId });
        return res.json({ favorited: true });
      }
    } catch (error) {
      console.error("Toggle favorite error:", error);
      return res.status(500).json({ error: "Failed to toggle favorite" });
    }
  });

  // Get user's favorites
  app.get("/api/my-favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userFavorites = await db.select().from(favorites)
        .where(eq(favorites.userId, userId));
      return res.json(userFavorites);
    } catch (error) {
      console.error("Get favorites error:", error);
      return res.status(500).json({ error: "Failed to get favorites" });
    }
  });

  // ============ SALON OWNER ROUTES ============

  // Create salon
  app.post("/api/owner/salons", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/owner/salons", isAuthenticated, async (req: any, res) => {
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

  // Update salon
  app.patch("/api/owner/salons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const ownerId = req.user.claims.sub;
      
      const [salon] = await db.update(salons)
        .set({ ...req.body, updatedAt: new Date() })
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

  // Add master to salon
  app.post("/api/owner/salons/:salonId/masters", isAuthenticated, async (req: any, res) => {
    try {
      const { salonId } = req.params;
      const ownerId = req.user.claims.sub;

      // Verify ownership
      const [salon] = await db.select().from(salons)
        .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)));
      
      if (!salon) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const parsed = insertMasterSchema.safeParse({ ...req.body, salonId });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid master data", details: parsed.error.errors });
      }

      const [master] = await db.insert(masters).values([parsed.data as any]).returning();
      return res.status(201).json(master);
    } catch (error) {
      console.error("Add master error:", error);
      return res.status(500).json({ error: "Failed to add master" });
    }
  });

  // Add service to salon
  app.post("/api/owner/salons/:salonId/services", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/owner/salons/:salonId/hours", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/owner/salons/:salonId/bookings", isAuthenticated, async (req: any, res) => {
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

  // Confirm/cancel booking (owner)
  app.patch("/api/owner/bookings/:id/status", isAuthenticated, async (req: any, res) => {
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

  // ============ LEGACY CONTACT/NEWSLETTER ROUTES ============

  app.post("/api/contact", async (req, res) => {
    try {
      const parsed = contactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid form data", details: parsed.error.errors });
      }
      // For now, just return success (can store in DB later)
      return res.status(201).json({ success: true, message: "Thank you for your message!" });
    } catch (error) {
      console.error("Contact form error:", error);
      return res.status(500).json({ error: "Failed to submit form" });
    }
  });

  app.post("/api/newsletter", async (req, res) => {
    try {
      const parsed = newsletterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid email", details: parsed.error.errors });
      }
      return res.status(201).json({ success: true, message: "Thank you for subscribing!" });
    } catch (error) {
      console.error("Newsletter error:", error);
      return res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  return httpServer;
}

// Helper functions
async function updateSalonRating(salonId: string) {
  const result = await db.select({
    avgRating: sql<number>`AVG(${reviews.rating})::numeric(2,1)`,
    count: sql<number>`COUNT(*)`,
  }).from(reviews).where(eq(reviews.salonId, salonId));
  
  if (result[0]) {
    await db.update(salons)
      .set({ 
        averageRating: result[0].avgRating?.toString() || "0",
        reviewCount: result[0].count || 0,
      })
      .where(eq(salons.id, salonId));
  }
}

async function updateMasterRating(masterId: string) {
  const result = await db.select({
    avgRating: sql<number>`AVG(${reviews.rating})::numeric(2,1)`,
    count: sql<number>`COUNT(*)`,
  }).from(reviews).where(eq(reviews.masterId, masterId));
  
  if (result[0]) {
    await db.update(masters)
      .set({ 
        averageRating: result[0].avgRating?.toString() || "0",
        reviewCount: result[0].count || 0,
      })
      .where(eq(masters.id, masterId));
  }
}
