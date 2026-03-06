import { Router } from "express";
import { requireAdmin, requirePermission } from "../middleware/admin";
import dashboardRoutes from "./admin/dashboard.routes";
import usersManagementRoutes from "./admin/users.routes";
import salonsManagementRoutes from "./admin/salons.routes";
import sanctionsRoutes from "./admin/sanctions.routes";
import complaintsRoutes from "./admin/complaints.routes";
import chatRoutes from "./admin/chat.routes";
import auditRoutes from "./admin/audit.routes";
import activityRoutes from "./admin/activity.routes";
import seedRoutes from "./admin/seed.routes";
import billingRoutes from "./admin/billing.routes";
import analyticsRoutes from "./admin/analytics.routes";

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

// Dashboard & Stats
router.use("/dashboard", dashboardRoutes);

// User Management
router.use("/users", usersManagementRoutes);

// Salon/Master Management
router.use("/salons", salonsManagementRoutes);

// Sanctions & Blocking
router.use("/sanctions", sanctionsRoutes);

// Complaints & Moderation
router.use("/complaints", complaintsRoutes);

// Support Chat
router.use("/chat", chatRoutes);

// Audit Logs
router.use("/audit", auditRoutes);

// User Activity & Analytics
router.use("/activity", activityRoutes);

// Seed Test Data (development/testing)
router.use("/seed", seedRoutes);

// Billing & Fee Management
router.use("/billing", billingRoutes);

// Analytics (funnel, retention)
router.use("/analytics", analyticsRoutes);

export default router;
