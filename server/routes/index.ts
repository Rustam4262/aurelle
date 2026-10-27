import { Router } from "express";
import { verifyCsrf } from "../middleware/csrf";
import { requireAdminIp } from "../middleware/adminIp";
import authRoutes from "./auth.routes";
import messengerRoutes from "./messenger.routes";
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
import invitationsRoutes from "./invitations.routes";
import complaintsRoutes from "./complaints.routes";
import paymentsRoutes from "./payments.routes";
import paymeWebhookRoutes from "./webhooks/payme.routes";
import clickWebhookRoutes from "./webhooks/click.routes";

const router = Router();

// NOTE: healthRoutes is mounted directly in server/routes.ts (before the rate limiter).
// Do NOT add it here — it would be a duplicate and would be rate-limited.

// Feature flags (public, no authentication required)
router.use("/feature-flags", featureFlagsRoutes);

// Public routes (no /api prefix needed, added in main routes.ts)
router.use("/", authRoutes);
router.use("/", contactRoutes);
router.use("/invitations", verifyCsrf, invitationsRoutes);

// User routes
router.use("/", usersRoutes);

// Public salon/master browsing
router.use("/salons", salonsRoutes);
router.use("/masters", publicMasterRoutes);

// Authenticated user routes
router.use("/bookings", verifyCsrf, bookingsRoutes);
router.use("/messenger", verifyCsrf, messengerRoutes);
router.use("/favorites", verifyCsrf, favoritesRoutes);
router.use("/reviews", verifyCsrf, reviewsRoutes);
router.use("/push", verifyCsrf, pushRoutes);
router.use("/notifications", verifyCsrf, notificationsRoutes);
router.use("/calendar", verifyCsrf, calendarRoutes);
router.use("/waitlist", verifyCsrf, waitlistRoutes);
router.use("/portfolio", verifyCsrf, portfolioRoutes);

// Role-specific dashboards
router.use("/master", verifyCsrf, mastersRoutes);
router.use("/owner", verifyCsrf, ownerRoutes);
router.use("/client", verifyCsrf, clientRoutes);
router.use("/solo-master", verifyCsrf, soloMasterRoutes);

// Admin panel — IP whitelist check first, then CSRF, then auth
router.use("/admin", requireAdminIp, verifyCsrf, adminRoutes);

// Client complaint submission
router.use("/complaints", verifyCsrf, complaintsRoutes);

// Payments
router.use("/payments", verifyCsrf, paymentsRoutes);
router.use("/webhooks/payme", paymeWebhookRoutes);
router.use("/webhooks/click", clickWebhookRoutes);

export default router;
