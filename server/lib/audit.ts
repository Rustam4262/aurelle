import { db } from "../db";
import { auditLogs, type InsertAuditLog } from "../../shared/schema";

export interface AuditLogParams {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  salonId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  result: 'success' | 'failure';
  error?: string;
}

/**
 * Log an audit event
 *
 * @example
 * await logAudit({
 *   actorId: req.session.ownerId,
 *   action: 'booking.cancel',
 *   entityType: 'booking',
 *   entityId: bookingId,
 *   salonId: booking.salonId,
 *   details: { cancel_reason: reason },
 *   ip: req.ip,
 *   userAgent: req.headers['user-agent'],
 *   result: 'success',
 * });
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const auditLog: InsertAuditLog = {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      salonId: params.salonId,
      details: params.details,
      ipAddress: params.ip,
      userAgent: params.userAgent,
      result: params.result,
      errorMessage: params.error,
    };

    await db.insert(auditLogs).values(auditLog);
  } catch (error) {
    // Don't throw - audit logging should not break main flow
    console.error('[AuditLog] Failed to log audit event:', error, params);
  }
}

/**
 * Get audit logs for a specific actor
 */
export async function getAuditLogs(params: {
  actorId?: string;
  salonId?: string;
  entityType?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  let query = db.select().from(auditLogs);

  if (params.actorId) {
    query = query.where(eq(auditLogs.actorId, params.actorId)) as any;
  }

  if (params.salonId) {
    query = query.where(eq(auditLogs.salonId, params.salonId)) as any;
  }

  if (params.entityType) {
    query = query.where(eq(auditLogs.entityType, params.entityType)) as any;
  }

  if (params.action) {
    query = query.where(eq(auditLogs.action, params.action)) as any;
  }

  if (params.from) {
    query = query.where(gte(auditLogs.createdAt, params.from)) as any;
  }

  if (params.to) {
    query = query.where(lte(auditLogs.createdAt, params.to)) as any;
  }

  query = query
    .orderBy(desc(auditLogs.createdAt))
    .limit(params.limit || 100)
    .offset(params.offset || 0) as any;

  return await query;
}

// Import SQL operators
import { eq, gte, lte, desc } from "drizzle-orm";
