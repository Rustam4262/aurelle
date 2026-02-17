import { db } from "../db";
import { ownerPermissions, salonManagers } from "../../shared/schema";
import { eq, and, or } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

/**
 * User roles
 */
export const ROLES = {
  OWNER: "owner",
  SALON_MANAGER: "salon_manager",
  MASTER: "master",
  CLIENT: "client",
} as const;

/**
 * Available owner permissions
 */
export const OWNER_PERMISSIONS = {
  READ_DASHBOARD: "owner.read_dashboard",
  READ_BOOKINGS: "owner.read_bookings",
  MANAGE_BOOKINGS: "owner.manage_bookings",
  READ_SERVICES: "owner.read_services",
  MANAGE_SERVICES: "owner.manage_services",
  READ_MASTERS: "owner.read_masters",
  MANAGE_MASTERS: "owner.manage_masters",
  READ_SALONS: "owner.read_salons",
  MANAGE_SALONS: "owner.manage_salons",
  READ_CALENDAR: "owner.read_calendar",
  MANAGE_CALENDAR: "owner.manage_calendar",
  READ_ANALYTICS: "owner.read_analytics",
} as const;

/**
 * Available salon manager permissions
 */
export const SALON_MANAGER_PERMISSIONS = {
  READ_SALON_INFO: "manager.read_salon",
  READ_DASHBOARD: "manager.read_dashboard",
  READ_BOOKINGS: "manager.read_bookings",
  MANAGE_BOOKINGS: "manager.manage_bookings",
  READ_SERVICES: "manager.read_services",
  MANAGE_SERVICES: "manager.manage_services",
  READ_MASTERS: "manager.read_masters",
  MANAGE_MASTERS: "manager.manage_masters",
  READ_CALENDAR: "manager.read_calendar",
  MANAGE_CALENDAR: "manager.manage_calendar",
  VIEW_ANALYTICS: "manager.view_analytics",
  // Cannot: delete salon, change owner, manage finances, invite other managers
} as const;

/**
 * Default permissions for new salon managers
 */
export const DEFAULT_MANAGER_PERMISSIONS = [
  SALON_MANAGER_PERMISSIONS.READ_SALON_INFO,
  SALON_MANAGER_PERMISSIONS.READ_DASHBOARD,
  SALON_MANAGER_PERMISSIONS.READ_BOOKINGS,
  SALON_MANAGER_PERMISSIONS.MANAGE_BOOKINGS,
  SALON_MANAGER_PERMISSIONS.READ_SERVICES,
  SALON_MANAGER_PERMISSIONS.READ_MASTERS,
  SALON_MANAGER_PERMISSIONS.READ_CALENDAR,
  SALON_MANAGER_PERMISSIONS.VIEW_ANALYTICS,
] as const;

/**
 * Check if owner has a specific permission
 */
export async function hasPermission(ownerId: string, permission: string): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(ownerPermissions)
      .where(
        and(eq(ownerPermissions.ownerId, ownerId), eq(ownerPermissions.permission, permission)),
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    logger.error("Error checking permission", error as Error, { source: "rbac" });
    return false;
  }
}

/**
 * Grant permission to owner
 */
export async function grantPermission(
  ownerId: string,
  permission: string,
  grantedBy?: string,
): Promise<void> {
  try {
    await db
      .insert(ownerPermissions)
      .values({
        ownerId,
        permission,
        grantedBy,
      })
      .onConflictDoNothing();
  } catch (error) {
    logger.error("Error granting permission", error as Error, { source: "rbac" });
    throw error;
  }
}

/**
 * Grant default permissions to a new owner
 */
export async function grantDefaultOwnerPermissions(ownerId: string): Promise<void> {
  const defaultPermissions = [
    OWNER_PERMISSIONS.READ_DASHBOARD,
    OWNER_PERMISSIONS.READ_BOOKINGS,
    OWNER_PERMISSIONS.MANAGE_BOOKINGS,
    OWNER_PERMISSIONS.READ_SERVICES,
    OWNER_PERMISSIONS.MANAGE_SERVICES,
    OWNER_PERMISSIONS.READ_MASTERS,
    OWNER_PERMISSIONS.MANAGE_MASTERS,
    OWNER_PERMISSIONS.READ_SALONS,
    OWNER_PERMISSIONS.MANAGE_SALONS,
    OWNER_PERMISSIONS.READ_CALENDAR,
    OWNER_PERMISSIONS.MANAGE_CALENDAR,
    OWNER_PERMISSIONS.READ_ANALYTICS,
  ];

  for (const permission of defaultPermissions) {
    await grantPermission(ownerId, permission, "system");
  }
}

/**
 * Express middleware to require a specific permission
 *
 * @example
 * router.get('/bookings', requirePermission(OWNER_PERMISSIONS.READ_BOOKINGS), async (req, res) => {
 *   // ...
 * });
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ownerId = (req.session as any).ownerId;

    if (!ownerId) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const hasAccess = await hasPermission(ownerId, permission);

    if (!hasAccess) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: `Missing permission: ${permission}`,
      });
    }

    next();
  };
}

/**
 * Check if salon manager has a specific permission for a salon
 */
export async function hasManagerPermission(
  userId: string,
  salonId: string,
  permission: string,
): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(salonManagers)
      .where(
        and(
          eq(salonManagers.userId, userId),
          eq(salonManagers.salonId, salonId),
          eq(salonManagers.status, "active"),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    const manager = result[0];
    const permissions = manager.permissions as string[];
    return permissions.includes(permission);
  } catch (error) {
    logger.error("Error checking manager permission", error as Error, { source: "rbac" });
    return false;
  }
}

/**
 * Check if user is a salon manager for a specific salon
 */
export async function isSalonManager(userId: string, salonId: string): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(salonManagers)
      .where(
        and(
          eq(salonManagers.userId, userId),
          eq(salonManagers.salonId, salonId),
          eq(salonManagers.status, "active"),
        ),
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    logger.error("Error checking manager status", error as Error, { source: "rbac" });
    return false;
  }
}

/**
 * Get all salons that a user manages
 */
export async function getManagedSalons(userId: string): Promise<string[]> {
  try {
    const result = await db
      .select({ salonId: salonManagers.salonId })
      .from(salonManagers)
      .where(and(eq(salonManagers.userId, userId), eq(salonManagers.status, "active")));

    return result.map((r) => r.salonId);
  } catch (error) {
    logger.error("Error getting managed salons", error as Error, { source: "rbac" });
    return [];
  }
}

/**
 * Check if owner has access to a specific salon
 */
export async function canAccessSalon(ownerId: string, salonId: string): Promise<boolean> {
  try {
    const { salons } = await import("../../shared/schema");

    const result = await db
      .select()
      .from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId)))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    logger.error("Error checking salon access", error as Error, { source: "rbac" });
    return false;
  }
}

/**
 * Check if user (owner OR manager) has access to a salon
 * This is the main function to use for most salon-related operations
 */
export async function canAccessSalonAsOwnerOrManager(
  userId: string,
  salonId: string,
): Promise<{ hasAccess: boolean; role: "owner" | "manager" | null }> {
  try {
    const { salons } = await import("../../shared/schema");

    // Check if owner
    const ownerResult = await db
      .select()
      .from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, userId)))
      .limit(1);

    if (ownerResult.length > 0) {
      return { hasAccess: true, role: "owner" };
    }

    // Check if manager
    const isManager = await isSalonManager(userId, salonId);
    if (isManager) {
      return { hasAccess: true, role: "manager" };
    }

    return { hasAccess: false, role: null };
  } catch (error) {
    logger.error("Error checking salon access", error as Error, { source: "rbac" });
    return { hasAccess: false, role: null };
  }
}

/**
 * Middleware to verify salon ownership
 *
 * @example
 * router.put('/salons/:id', verifySalonOwnership, async (req, res) => {
 *   // req.params.id is guaranteed to belong to req.session.ownerId
 * });
 */
export function verifySalonOwnership(req: Request, res: Response, next: NextFunction) {
  return async () => {
    const ownerId = (req.session as any).ownerId;
    const salonId = req.params.id || req.body.salon_id;

    if (!salonId) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "salon_id is required",
      });
    }

    const hasAccess = await canAccessSalon(ownerId, salonId);

    if (!hasAccess) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "You do not have access to this salon",
      });
    }

    next();
  };
}
