import { Router } from "express";
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import salonsRoutes from "./salons.routes";
import mastersRoutes from "./masters.routes";
import bookingsRoutes from "./bookings.routes";
import favoritesRoutes from "./favorites.routes";
import reviewsRoutes from "./reviews.routes";
import notificationsRoutes from "./notifications.routes";
import ownerRoutes from "./owner.routes";
import clientRoutes from "./client.routes";
import contactRoutes from "./contact.routes";

const router = Router();

// Public routes (no /api prefix needed, added in main routes.ts)
router.use("/", authRoutes);
router.use("/", contactRoutes);

// User routes
router.use("/", usersRoutes);

// Public salon/master browsing
router.use("/salons", salonsRoutes);

// Authenticated user routes
router.use("/bookings", bookingsRoutes);
router.use("/favorites", favoritesRoutes);
router.use("/reviews", reviewsRoutes);
router.use("/notifications", notificationsRoutes);

// Role-specific dashboards
router.use("/master", mastersRoutes);
router.use("/owner", ownerRoutes);
router.use("/client", clientRoutes);

export default router;
