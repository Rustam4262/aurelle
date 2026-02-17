import { Router } from "express";
import { isAuthenticated } from "../auth";
import { db } from "../db";
import { userProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

// Get current user profile
router.get("/profile", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

    if (!profile) {
      return res.json({
        exists: false,
        userId,
        username: req.user.claims.name || req.user.claims.username,
      });
    }
    return res.json({ exists: true, ...profile });
  } catch (error) {
    logger.error("Get profile error:", error);
    return res.status(500).json({ error: "Failed to get profile" });
  }
});

// Create or update user profile
router.post("/profile", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const profilePayloadSchema = z.object({
      role: z.enum(["client", "owner", "solo_master"]),
      fullName: z.string().min(1, "Full name is required").max(200).trim(),
      phone: z.string().min(1, "Phone number is required").max(20).trim(),
      city: z.string().min(1, "City is required").max(100).trim(),
    });

    const parsed = profilePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid profile data", details: parsed.error.errors });
    }

    const { role, fullName, phone, city } = parsed.data;

    const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

    if (existing) {
      const [updated] = await db
        .update(userProfiles)
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
      const [created] = await db
        .insert(userProfiles)
        .values([
          {
            userId,
            role,
            fullName,
            phone,
            city,
            isProfileComplete: true,
          },
        ])
        .returning();

      // For solo_master role, create the master record and settings
      if (role === "solo_master") {
        const { masters, soloMasterSettings } = await import("@shared/schema");

        // Generate a unique slug from name
        const baseSlug = fullName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 50);
        const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

        // Create master record
        const [master] = await db
          .insert(masters)
          .values([
            {
              userId,
              name: fullName,
              phone,
              city,
              isSoloMaster: true,
              slug: uniqueSlug,
              status: "draft",
            },
          ])
          .returning();

        // Create solo master settings with defaults
        await db.insert(soloMasterSettings).values([
          {
            masterId: master.id,
          },
        ]);
      }

      return res.status(201).json(created);
    }
  } catch (error) {
    logger.error("Create/update profile error:", error);
    return res.status(500).json({ error: "Failed to save profile" });
  }
});

export default router;
