import { Router } from "express";
import { getAllFeatureFlags } from "../featureFlags";

const router = Router();

/**
 * GET /api/feature-flags
 * Returns current state of all feature flags
 * Public endpoint (no auth required) - flags control UI visibility
 */
router.get("/", async (req, res) => {
  try {
    const flags = getAllFeatureFlags();
    return res.json(flags);
  } catch (error) {
    console.error("Get feature flags error:", error);
    return res.status(500).json({ error: "Failed to get feature flags" });
  }
});

export default router;
