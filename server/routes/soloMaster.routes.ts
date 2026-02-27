import express from "express";
import { z } from "zod";
import { db } from "../db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import {
  masters,
  soloMasterSettings,
  soloMasterServices,
  masterWorkingHours,
  bookings,
} from "@shared/schema";
import { isAuthenticated } from "../auth";
import { logger } from "../lib/logger";
import type { AuthedRequest } from "../types/authed-request";
import { cancelBookingReminders } from "../lib/reminders";
import { logAudit } from "../lib/audit";
import { fireCancellationEmail } from "../lib/booking-emails";

const router = express.Router();

// Helper to get solo master from authenticated user
async function getSoloMaster(userId: string) {
  const [master] = await db
    .select()
    .from(masters)
    .where(and(eq(masters.userId, userId), eq(masters.isSoloMaster, true)));
  return master;
}

// Get solo master dashboard data
router.get("/me", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    return res.json(master);
  } catch (error) {
    logger.error("Get solo master error:", error);
    return res.status(500).json({ error: "Failed to get profile" });
  }
});

// Update solo master profile
router.put("/profile", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const updateSchema = z.object({
      name: z.string().min(1).max(200).optional(),
      phone: z.string().max(20).optional(),
      bio: z.string().max(1000).optional(),
      photo: z.string().max(500).optional(),
      address: z.string().max(500).optional(),
      city: z.string().max(100).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      serviceMode: z.enum(["at_master", "mobile", "both"]).optional(),
      workRadius: z.number().min(1).max(100).optional(),
      mobileExtraCharge: z.number().min(0).optional(),
      slug: z.string().min(3).max(100).optional(),
      instagram: z.string().max(100).optional(),
      telegram: z.string().max(100).optional(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
    }

    // Build update object dynamically
    const updates: Record<string, any> = {};
    const data = parsed.data;

    if (data.name !== undefined) updates.name = data.name;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.photo !== undefined) updates.photo = data.photo;
    if (data.address !== undefined) updates.address = data.address;
    if (data.city !== undefined) updates.city = data.city;
    if (data.latitude !== undefined) updates.latitude = data.latitude.toString();
    if (data.longitude !== undefined) updates.longitude = data.longitude.toString();
    if (data.serviceMode !== undefined) updates.serviceMode = data.serviceMode;
    if (data.workRadius !== undefined) updates.workRadius = data.workRadius;
    if (data.mobileExtraCharge !== undefined) updates.mobileExtraCharge = data.mobileExtraCharge;
    if (data.instagram !== undefined) updates.instagram = data.instagram;
    if (data.telegram !== undefined) updates.telegram = data.telegram;

    // Handle bio as JSONB
    if (data.bio !== undefined) {
      const currentBio = master.bio || { en: "", ru: "", uz: "" };
      // Get the user's language from header or default to 'en'
      const lang = (req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "en") as
        | "en"
        | "ru"
        | "uz";
      const validLang = ["en", "ru", "uz"].includes(lang) ? lang : "en";
      updates.bio = { ...currentBio, [validLang]: data.bio };
    }

    // Handle slug update with uniqueness check
    if (data.slug !== undefined && data.slug !== master.slug) {
      const [existing] = await db
        .select()
        .from(masters)
        .where(and(eq(masters.slug, data.slug), sql`${masters.id} != ${master.id}`));

      if (existing) {
        return res.status(400).json({ error: "Slug already taken" });
      }
      updates.slug = data.slug;
    }

    if (Object.keys(updates).length === 0) {
      return res.json(master);
    }

    const [updated] = await db
      .update(masters)
      .set(updates)
      .where(eq(masters.id, master.id))
      .returning();

    logAudit({
      actorId: userId,
      action: "solo_master.profile.update",
      entityType: "solo_master",
      entityId: master.id,
      details: { changes: Object.keys(updates) },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      result: "success",
    }).catch(() => {});

    return res.json(updated);
  } catch (error) {
    logger.error("Update solo master profile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

// Check slug availability
router.get("/check-slug", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);
    const { slug } = req.query;

    if (!slug || typeof slug !== "string" || slug.length < 3) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    const [existing] = await db
      .select()
      .from(masters)
      .where(and(eq(masters.slug, slug), master ? sql`${masters.id} != ${master.id}` : sql`1=1`));

    return res.json({ available: !existing });
  } catch (error) {
    logger.error("Check slug error:", error);
    return res.status(500).json({ error: "Failed to check slug" });
  }
});

// Get solo master settings
router.get("/settings", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const [settings] = await db
      .select()
      .from(soloMasterSettings)
      .where(eq(soloMasterSettings.masterId, master.id));

    return res.json(settings || {});
  } catch (error) {
    logger.error("Get solo master settings error:", error);
    return res.status(500).json({ error: "Failed to get settings" });
  }
});

// Update solo master settings
router.put("/settings", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const settingsSchema = z.object({
      bufferMinutes: z.number().min(0).max(120).optional(),
      travelBufferMinutes: z.number().min(0).max(120).optional(),
      autoConfirmBookings: z.boolean().optional(),
      maxAdvanceBookingDays: z.number().min(1).max(365).optional(),
      minAdvanceBookingHours: z.number().min(0).max(168).optional(),
    });

    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid settings", details: parsed.error.errors });
    }

    const [existing] = await db
      .select()
      .from(soloMasterSettings)
      .where(eq(soloMasterSettings.masterId, master.id));

    let settingsResult;
    if (existing) {
      const [updated] = await db
        .update(soloMasterSettings)
        .set(parsed.data)
        .where(eq(soloMasterSettings.masterId, master.id))
        .returning();
      settingsResult = updated;
    } else {
      const [created] = await db
        .insert(soloMasterSettings)
        .values([{ masterId: master.id, ...parsed.data }])
        .returning();
      settingsResult = created;
    }
    logAudit({
      actorId: userId,
      action: "solo_master.settings.update",
      entityType: "solo_master",
      entityId: master.id,
      details: { changes: parsed.data },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      result: "success",
    }).catch(() => {});
    return res.json(settingsResult);
  } catch (error) {
    logger.error("Update solo master settings error:", error);
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

// Get working schedule
router.get("/schedule", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const hours = await db
      .select()
      .from(masterWorkingHours)
      .where(eq(masterWorkingHours.masterId, master.id))
      .orderBy(masterWorkingHours.dayOfWeek);

    return res.json(hours);
  } catch (error) {
    logger.error("Get schedule error:", error);
    return res.status(500).json({ error: "Failed to get schedule" });
  }
});

// Update working schedule
router.put("/schedule", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const scheduleSchema = z.object({
      hours: z.array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          isOpen: z.boolean(),
          openTime: z.string().regex(/^\d{2}:\d{2}$/),
          closeTime: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      ),
    });

    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid schedule", details: parsed.error.errors });
    }

    // Delete existing hours and insert new ones
    await db.delete(masterWorkingHours).where(eq(masterWorkingHours.masterId, master.id));

    const hoursToInsert = parsed.data.hours.map((h) => ({
      masterId: master.id,
      dayOfWeek: h.dayOfWeek,
      isClosed: !h.isOpen,
      openTime: h.openTime,
      closeTime: h.closeTime,
    }));

    if (hoursToInsert.length > 0) {
      await db.insert(masterWorkingHours).values(hoursToInsert);
    }

    const updatedHours = await db
      .select()
      .from(masterWorkingHours)
      .where(eq(masterWorkingHours.masterId, master.id))
      .orderBy(masterWorkingHours.dayOfWeek);

    logAudit({
      actorId: userId,
      action: "solo_master.schedule.update",
      entityType: "solo_master",
      entityId: master.id,
      details: { days: parsed.data.hours.length },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      result: "success",
    }).catch(() => {});

    return res.json(updatedHours);
  } catch (error) {
    logger.error("Update schedule error:", error);
    return res.status(500).json({ error: "Failed to update schedule" });
  }
});

// Complete onboarding - activate profile
router.post("/complete-onboarding", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    // Update status to active
    const [updated] = await db
      .update(masters)
      .set({ status: "active" })
      .where(eq(masters.id, master.id))
      .returning();

    logAudit({
      actorId: userId,
      action: "solo_master.profile.activate",
      entityType: "solo_master",
      entityId: master.id,
      details: { status: "active" },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      result: "success",
    }).catch(() => {});

    return res.json(updated);
  } catch (error) {
    logger.error("Complete onboarding error:", error);
    return res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

// Get dashboard stats
router.get("/stats", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get today's bookings count
    const todayBookings = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(
        and(
          eq(bookings.masterId, master.id),
          gte(bookings.bookingDate, today),
          lte(bookings.bookingDate, new Date(today.getTime() + 24 * 60 * 60 * 1000)),
        ),
      );

    // Get week bookings count
    const weekBookings = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(and(eq(bookings.masterId, master.id), gte(bookings.bookingDate, weekAgo)));

    // Get month revenue
    const monthRevenue = await db
      .select({ total: sql<number>`COALESCE(SUM(price_snapshot), 0)` })
      .from(bookings)
      .where(
        and(
          eq(bookings.masterId, master.id),
          eq(bookings.status, "completed"),
          gte(bookings.bookingDate, monthStart),
        ),
      );

    // Get pending bookings count
    const pendingBookings = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(and(eq(bookings.masterId, master.id), eq(bookings.status, "pending")));

    return res.json({
      todayBookings: Number(todayBookings[0]?.count || 0),
      weekBookings: Number(weekBookings[0]?.count || 0),
      monthRevenue: Number(monthRevenue[0]?.total || 0),
      pendingBookings: Number(pendingBookings[0]?.count || 0),
    });
  } catch (error) {
    logger.error("Get stats error:", error);
    return res.status(500).json({ error: "Failed to get stats" });
  }
});

// ========== SERVICES CRUD ==========

// Get all services
router.get("/services", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const services = await db
      .select()
      .from(soloMasterServices)
      .where(eq(soloMasterServices.masterId, master.id))
      .orderBy(soloMasterServices.displayOrder);

    return res.json(services);
  } catch (error) {
    logger.error("Get services error:", error);
    return res.status(500).json({ error: "Failed to get services" });
  }
});

// Create service
router.post("/services", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const serviceSchema = z.object({
      name: z.object({
        en: z.string().min(1),
        ru: z.string().min(1),
        uz: z.string().min(1),
      }),
      description: z
        .object({
          en: z.string(),
          ru: z.string(),
          uz: z.string(),
        })
        .optional(),
      category: z.string().min(1),
      priceMin: z.number().min(0),
      priceMax: z.number().optional(),
      duration: z.number().min(5).max(480),
      serviceMode: z.enum(["at_master", "mobile", "both"]).optional(),
      mobileExtraCharge: z.number().min(0).optional(),
    });

    const parsed = serviceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid service data", details: parsed.error.errors });
    }

    const [created] = await db
      .insert(soloMasterServices)
      .values([
        {
          masterId: master.id,
          ...parsed.data,
        },
      ])
      .returning();

    logAudit({
      actorId: userId,
      action: "solo_master.service.create",
      entityType: "solo_master_service",
      entityId: created.id,
      details: { masterId: master.id, name: parsed.data.name, category: parsed.data.category },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      result: "success",
    }).catch(() => {});

    return res.status(201).json(created);
  } catch (error) {
    logger.error("Create service error:", error);
    return res.status(500).json({ error: "Failed to create service" });
  }
});

// Update service
router.put("/services/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);
    const { id } = req.params;

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    // Verify service belongs to this master
    const [service] = await db
      .select()
      .from(soloMasterServices)
      .where(and(eq(soloMasterServices.id, id), eq(soloMasterServices.masterId, master.id)));

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const updateSchema = z.object({
      name: z
        .object({
          en: z.string().min(1),
          ru: z.string().min(1),
          uz: z.string().min(1),
        })
        .optional(),
      description: z
        .object({
          en: z.string(),
          ru: z.string(),
          uz: z.string(),
        })
        .optional(),
      category: z.string().min(1).optional(),
      priceMin: z.number().min(0).optional(),
      priceMax: z.number().optional(),
      duration: z.number().min(5).max(480).optional(),
      serviceMode: z.enum(["at_master", "mobile", "both"]).optional(),
      mobileExtraCharge: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
      displayOrder: z.number().optional(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid service data", details: parsed.error.errors });
    }

    const [updated] = await db
      .update(soloMasterServices)
      .set(parsed.data)
      .where(eq(soloMasterServices.id, id))
      .returning();

    logAudit({
      actorId: userId,
      action: "solo_master.service.update",
      entityType: "solo_master_service",
      entityId: id,
      details: { masterId: master.id, changes: Object.keys(parsed.data) },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      result: "success",
    }).catch(() => {});

    return res.json(updated);
  } catch (error) {
    logger.error("Update service error:", error);
    return res.status(500).json({ error: "Failed to update service" });
  }
});

// Delete service
router.delete("/services/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);
    const { id } = req.params;

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    // Verify service belongs to this master
    const [service] = await db
      .select()
      .from(soloMasterServices)
      .where(and(eq(soloMasterServices.id, id), eq(soloMasterServices.masterId, master.id)));

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    await db.delete(soloMasterServices).where(eq(soloMasterServices.id, id));

    logAudit({
      actorId: userId,
      action: "solo_master.service.delete",
      entityType: "solo_master_service",
      entityId: id,
      details: { masterId: master.id, serviceName: service.name },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      result: "success",
    }).catch(() => {});

    return res.json({ success: true });
  } catch (error) {
    logger.error("Delete service error:", error);
    return res.status(500).json({ error: "Failed to delete service" });
  }
});

// Reorder services
router.put("/services/reorder", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const reorderSchema = z.object({
      serviceIds: z.array(z.string()),
    });

    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
    }

    // Update display order for each service
    await Promise.all(
      parsed.data.serviceIds.map((id, index) =>
        db
          .update(soloMasterServices)
          .set({ displayOrder: index })
          .where(and(eq(soloMasterServices.id, id), eq(soloMasterServices.masterId, master.id))),
      ),
    );

    return res.json({ success: true });
  } catch (error) {
    logger.error("Reorder services error:", error);
    return res.status(500).json({ error: "Failed to reorder services" });
  }
});

// ========== BOOKINGS ==========

// Get bookings
router.get("/bookings", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const { status, from, to } = req.query;

    const query = db.select().from(bookings).where(eq(bookings.masterId, master.id));

    // Note: Additional filtering would need to be done with a query builder
    // For now, we get all and filter in JS (simplified)
    const allBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.masterId, master.id))
      .orderBy(desc(bookings.bookingDate));

    let filtered = allBookings;

    if (status && typeof status === "string") {
      filtered = filtered.filter((b) => b.status === status);
    }

    if (from && typeof from === "string") {
      const fromDate = new Date(from);
      filtered = filtered.filter((b) => new Date(b.bookingDate) >= fromDate);
    }

    if (to && typeof to === "string") {
      const toDate = new Date(to);
      filtered = filtered.filter((b) => new Date(b.bookingDate) <= toDate);
    }

    return res.json(filtered);
  } catch (error) {
    logger.error("Get bookings error:", error);
    return res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Update booking status
router.patch("/bookings/:id/status", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const master = await getSoloMaster(userId);
    const { id } = req.params;
    const { status } = req.body;

    if (!master) {
      return res.status(404).json({ error: "Solo master profile not found" });
    }

    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Verify booking belongs to this master
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.masterId, master.id)));

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const [updated] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    if (status === "cancelled") {
      cancelBookingReminders(updated.id).catch((err) =>
        logger.error("Failed to cancel reminders", {
          source: "solo-master-routes",
          meta: { bookingId: updated.id, error: String(err) },
        }),
      );
      fireCancellationEmail(updated.id);
    }

    return res.json(updated);
  } catch (error) {
    logger.error("Update booking status error:", error);
    return res.status(500).json({ error: "Failed to update booking" });
  }
});

export default router;
