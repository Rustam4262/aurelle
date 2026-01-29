/**
 * Feature Flags System
 *
 * Controls gradual rollout of new features to prevent disruption to active users.
 * All flags default to FALSE (disabled) until explicitly enabled.
 */

import { Request, Response, NextFunction } from "express";

export const FEATURE_FLAGS = {
  // Phase 7: Analytics Enhancements
  ENHANCED_ANALYTICS: process.env.FEAT_ENHANCED_ANALYTICS === "true",

  // Phase 8: Bookings Management
  BOOKING_RESCHEDULE: process.env.FEAT_BOOKING_RESCHEDULE === "true",
  MANUAL_BOOKING_CREATE: process.env.FEAT_MANUAL_BOOKING === "true",

  // Phase 9: Services & Masters
  BULK_SERVICE_UPDATE: process.env.FEAT_BULK_SERVICE_UPDATE === "true",
  MASTER_SCHEDULE_OVERRIDE: process.env.FEAT_MASTER_SCHEDULE === "true",

  // Phase 10: Calendar & Working Hours
  ENHANCED_CALENDAR: process.env.FEAT_ENHANCED_CALENDAR === "true",
  WORKING_HOURS_BREAKS: process.env.FEAT_WORKING_HOURS_BREAKS === "true",

  // Phase 11: RBAC - Salon Manager
  SALON_MANAGER_ROLE: process.env.FEAT_SALON_MANAGER === "true",

  // Additional features
  EXPORT_EXCEL: process.env.FEAT_EXPORT_EXCEL === "true",
  EXPORT_PDF: process.env.FEAT_EXPORT_PDF === "true",
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Middleware to require a feature flag to be enabled
 * Returns 404 if feature is disabled
 */
export const requireFeatureFlag = (flag: FeatureFlag) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!FEATURE_FLAGS[flag]) {
      return res.status(404).json({
        error: "Feature not available",
        feature: flag,
        enabled: false,
      });
    }
    next();
  };
};

/**
 * Check if a feature flag is enabled
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag] === true;
};

/**
 * Get all feature flags and their states
 */
export const getAllFeatureFlags = (): Record<string, boolean> => {
  return { ...FEATURE_FLAGS };
};
