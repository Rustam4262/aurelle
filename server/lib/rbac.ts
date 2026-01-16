import { db } from "../db";
import { ownerPermissions } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";

/**
 * Available owner permissions
 */
export const OWNER_PERMISSIONS = {
  READ_DASHBOARD: 'owner.read_dashboard',
  READ_BOOKINGS: 'owner.read_bookings',
  MANAGE_BOOKINGS: 'owner.manage_bookings',
  READ_SERVICES: 'owner.read_services',
  MANAGE_SERVICES: 'owner.manage_services',
  READ_MASTERS: 'owner.read_masters',
  MANAGE_MASTERS: 'owner.manage_masters',
  READ_SALONS: 'owner.read_salons',
  MANAGE_SALONS: 'owner.manage_salons',
  READ_CALENDAR: 'owner.read_calendar',
  MANAGE_CALENDAR: 'owner.manage_calendar',
  READ_ANALYTICS: 'owner.read_analytics',
} as const;

/**
 * Check if owner has a specific permission
 */
export async function hasPermission(
  ownerId: string,
  permission: string
): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(ownerPermissions)
      .where(
        and(
          eq(ownerPermissions.ownerId, ownerId),
          eq(ownerPermissions.permission, permission)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('[RBAC] Error checking permission:', error);
    return false;
  }
}

/**
 * Grant permission to owner
 */
export async function grantPermission(
  ownerId: string,
  permission: string,
  grantedBy?: string
): Promise<void> {
  try {
    await db.insert(ownerPermissions).values({
      ownerId,
      permission,
      grantedBy,
    }).onConflictDoNothing();
  } catch (error) {
    console.error('[RBAC] Error granting permission:', error);
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
    await grantPermission(ownerId, permission, 'system');
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
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const hasAccess = await hasPermission(ownerId, permission);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Missing permission: ${permission}`,
      });
    }

    next();
  };
}

/**
 * Check if owner has access to a specific salon
 */
export async function canAccessSalon(
  ownerId: string,
  salonId: string
): Promise<boolean> {
  try {
    const { salons } = await import("../../shared/schema");

    const result = await db
      .select()
      .from(salons)
      .where(
        and(
          eq(salons.id, salonId),
          eq(salons.ownerId, ownerId)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('[RBAC] Error checking salon access:', error);
    return false;
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
export function verifySalonOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  return async () => {
    const ownerId = (req.session as any).ownerId;
    const salonId = req.params.id || req.body.salon_id;

    if (!salonId) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'salon_id is required',
      });
    }

    const hasAccess = await canAccessSalon(ownerId, salonId);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have access to this salon',
      });
    }

    next();
  };
}
