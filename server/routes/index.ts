import { Router } from "express";
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import salonsRoutes from "./salons.routes";
import mastersRoutes from "./masters.routes";
import bookingsRoutes from "./bookings.routes";
import favoritesRoutes from "./favorites.routes";
import reviewsRoutes from "./reviews.routes";
import pushRoutes from "./push.routes";
import notificationsRoutes from "./notifications.routes";
import calendarRoutes from "./calendar.routes";
import waitlistRoutes from "./waitlist.routes";
import portfolioRoutes from "./portfolio.routes";
import ownerRoutes from "./owner.routes";
import clientRoutes from "./client.routes";
import contactRoutes from "./contact.routes";
import adminRoutes from "./admin.routes";
import soloMasterRoutes from "./soloMaster.routes";
import publicMasterRoutes from "./publicMaster.routes";
import featureFlagsRoutes from "./featureFlags.routes";

const router = Router();

// NOTE: healthRoutes is mounted directly in server/routes.ts (before the rate limiter).
// Do NOT add it here — it would be a duplicate and would be rate-limited.

// Feature flags (public, no authentication required)
router.use("/feature-flags", featureFlagsRoutes);

// Public routes (no /api prefix needed, added in main routes.ts)
router.use("/", authRoutes);
router.use("/", contactRoutes);

// User routes
router.use("/", usersRoutes);

// Public salon/master browsing
router.use("/salons", salonsRoutes);
router.use("/masters", publicMasterRoutes);

// Authenticated user routes
router.use("/bookings", bookingsRoutes);
router.use("/favorites", favoritesRoutes);
router.use("/reviews", reviewsRoutes);
router.use("/push", pushRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/calendar", calendarRoutes);
router.use("/waitlist", waitlistRoutes);
router.use("/portfolio", portfolioRoutes);

// Role-specific dashboards
router.use("/master", mastersRoutes);
router.use("/owner", ownerRoutes);
router.use("/client", clientRoutes);
router.use("/solo-master", soloMasterRoutes);

// Admin panel (requires admin authentication)
router.use("/admin", adminRoutes);

export default router;
