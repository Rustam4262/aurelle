import { Router } from "express";
import { db } from "../db";
import { salonManagers } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { isAuthenticated } from "../auth";
import { logger } from "../lib/logger";
import { z } from "zod";

const router = Router();

const acceptSchema = z.object({
  token: z.string().min(1),
});

/**
 * POST /api/invitations/accept
 * Accepts a manager invitation by token. User must be authenticated.
 */
router.post("/accept", isAuthenticated, async (req: any, res) => {
  try {
    const parsed = acceptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Token is required" });
    }

    const { token } = parsed.data;
    const userId = req.user.claims.sub;

    // Find the invitation by token
    const [invitation] = await db
      .select()
      .from(salonManagers)
      .where(eq(salonManagers.invitationToken, token));

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found or already used" });
    }

    // Check the invitation belongs to the authenticated user
    if (invitation.userId !== userId) {
      return res.status(403).json({ error: "This invitation is for a different user" });
    }

    // Check expiry
    if (!invitation.invitationExpiresAt || invitation.invitationExpiresAt < new Date()) {
      return res.status(410).json({ error: "Invitation has expired" });
    }

    // Check not already active/revoked
    if (invitation.status !== "pending") {
      return res.status(409).json({ error: `Invitation already ${invitation.status}` });
    }

    // Accept: set status=active, clear token
    const [updated] = await db
      .update(salonManagers)
      .set({
        status: "active",
        acceptedAt: new Date(),
        invitationToken: null,
        invitationExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(salonManagers.id, invitation.id))
      .returning();

    logger.info("Manager invitation accepted", {
      source: "invitations",
      meta: { managerId: invitation.id, salonId: invitation.salonId, userId },
    });

    return res.json({
      success: true,
      salonId: updated.salonId,
      permissions: updated.permissions,
    });
  } catch (error) {
    logger.error("Accept invitation error", error instanceof Error ? error : new Error(String(error)), {
      source: "invitations",
    });
    return res.status(500).json({ error: "Failed to accept invitation" });
  }
});

/**
 * GET /api/invitations/check?token=...
 * Returns basic info about a pending invitation (no auth required — for the landing page).
 */
router.get("/check", async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const [invitation] = await db
      .select({
        id: salonManagers.id,
        salonId: salonManagers.salonId,
        status: salonManagers.status,
        invitationExpiresAt: salonManagers.invitationExpiresAt,
      })
      .from(salonManagers)
      .where(eq(salonManagers.invitationToken, token));

    if (!invitation) {
      return res.status(404).json({ valid: false, reason: "not_found" });
    }

    if (invitation.status !== "pending") {
      return res.status(200).json({ valid: false, reason: invitation.status });
    }

    if (!invitation.invitationExpiresAt || invitation.invitationExpiresAt < new Date()) {
      return res.status(200).json({ valid: false, reason: "expired" });
    }

    return res.json({
      valid: true,
      salonId: invitation.salonId,
      expiresAt: invitation.invitationExpiresAt,
    });
  } catch (error) {
    logger.error("Check invitation error", error instanceof Error ? error : new Error(String(error)), {
      source: "invitations",
    });
    return res.status(500).json({ error: "Failed to check invitation" });
  }
});

export default router;
