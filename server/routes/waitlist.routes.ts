import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { waitlist, insertWaitlistSchema, userProfiles, salons, services } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";
import { sendPushToUser } from "./push.routes";

const router = Router();

// Join waitlist
router.post("/", createLimiter, isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    // Get user profile
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (!userProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const parsed = insertWaitlistSchema.safeParse({ ...req.body, clientId: userProfile.id });

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid waitlist data", details: parsed.error.errors });
    }

    // Check if already in waitlist for this slot
    const existingEntry = await db
      .select()
      .from(waitlist)
      .where(
        and(
          eq(waitlist.clientId, userProfile.id),
          eq(waitlist.salonId, parsed.data.salonId),
          eq(waitlist.serviceId, parsed.data.serviceId),
          eq(waitlist.status, "waiting"),
          parsed.data.preferredDate
            ? eq(waitlist.preferredDate, parsed.data.preferredDate)
            : undefined,
        ),
      );

    if (existingEntry.length > 0) {
      return res.status(400).json({ error: "You are already in the waitlist for this slot" });
    }

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [entry] = await db
      .insert(waitlist)
      .values([{ ...(parsed.data as any), expiresAt }])
      .returning();

    console.log("[WAITLIST] New entry:", entry);
    return res.status(201).json(entry);
  } catch (error) {
    console.error("Join waitlist error:", error);
    return res.status(500).json({ error: "Failed to join waitlist" });
  }
});

// Get client's waitlist entries
router.get("/my-waitlist", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (!userProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const entries = await db
      .select({
        id: waitlist.id,
        salonId: waitlist.salonId,
        salonName: salons.name,
        serviceId: waitlist.serviceId,
        serviceName: services.name,
        preferredDate: waitlist.preferredDate,
        preferredTimeStart: waitlist.preferredTimeStart,
        preferredTimeEnd: waitlist.preferredTimeEnd,
        status: waitlist.status,
        notifiedAt: waitlist.notifiedAt,
        expiresAt: waitlist.expiresAt,
        createdAt: waitlist.createdAt,
      })
      .from(waitlist)
      .leftJoin(salons, eq(waitlist.salonId, salons.id))
      .leftJoin(services, eq(waitlist.serviceId, services.id))
      .where(eq(waitlist.clientId, userProfile.id))
      .orderBy(waitlist.createdAt);

    return res.json(entries);
  } catch (error) {
    console.error("Get my waitlist error:", error);
    return res.status(500).json({ error: "Failed to get waitlist" });
  }
});

// Get salon's waitlist (salon owner only)
router.get("/salon/:salonId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { salonId } = req.params;

    // Verify ownership
    const [salon] = await db.select().from(salons).where(eq(salons.id, salonId));
    if (!salon || salon.ownerId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const entries = await db
      .select({
        id: waitlist.id,
        clientId: waitlist.clientId,
        clientName: userProfiles.fullName,
        clientPhone: userProfiles.phone,
        serviceId: waitlist.serviceId,
        serviceName: services.name,
        masterId: waitlist.masterId,
        preferredDate: waitlist.preferredDate,
        preferredTimeStart: waitlist.preferredTimeStart,
        preferredTimeEnd: waitlist.preferredTimeEnd,
        status: waitlist.status,
        notifiedAt: waitlist.notifiedAt,
        expiresAt: waitlist.expiresAt,
        createdAt: waitlist.createdAt,
      })
      .from(waitlist)
      .leftJoin(userProfiles, eq(waitlist.clientId, userProfiles.id))
      .leftJoin(services, eq(waitlist.serviceId, services.id))
      .where(eq(waitlist.salonId, salonId))
      .orderBy(waitlist.createdAt);

    return res.json(entries);
  } catch (error) {
    console.error("Get salon waitlist error:", error);
    return res.status(500).json({ error: "Failed to get waitlist" });
  }
});

// Notify waitlist entry (when slot becomes available)
router.post("/:entryId/notify", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { entryId } = req.params;

    // Get waitlist entry
    const [entry] = await db.select().from(waitlist).where(eq(waitlist.id, entryId));

    if (!entry) {
      return res.status(404).json({ error: "Waitlist entry not found" });
    }

    // Verify salon ownership
    const [salon] = await db.select().from(salons).where(eq(salons.id, entry.salonId));
    if (!salon || salon.ownerId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (entry.status !== "waiting") {
      return res.status(400).json({ error: "Entry is not in waiting status" });
    }

    // Update status to notified
    const [updated] = await db
      .update(waitlist)
      .set({ status: "notified", notifiedAt: new Date() })
      .where(eq(waitlist.id, entryId))
      .returning();

    // Get user profile for client
    const [clientProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, entry.clientId));

    if (clientProfile && clientProfile.userId) {
      // Send push notification
      const [service] = await db.select().from(services).where(eq(services.id, entry.serviceId));

      await sendPushToUser(clientProfile.userId, {
        title: "Slot Available!",
        body: `A slot is now available for ${service?.name} at ${salon.name}`,
        icon: "/icon-192.png",
        data: {
          type: "waitlist_notification",
          waitlistId: entry.id,
          salonId: salon.id,
        },
      });
    }

    console.log("[WAITLIST] Notified:", updated);
    return res.json(updated);
  } catch (error) {
    console.error("Notify waitlist error:", error);
    return res.status(500).json({ error: "Failed to notify waitlist" });
  }
});

// Cancel waitlist entry
router.delete("/:entryId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { entryId } = req.params;

    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (!userProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Delete only if belongs to user
    const deleted = await db
      .delete(waitlist)
      .where(and(eq(waitlist.id, entryId), eq(waitlist.clientId, userProfile.id)))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Waitlist entry not found or access denied" });
    }

    console.log("[WAITLIST] Deleted:", deleted[0]);
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete waitlist error:", error);
    return res.status(500).json({ error: "Failed to delete waitlist entry" });
  }
});

export default router;
