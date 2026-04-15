import { sql } from "drizzle-orm";

export const SOFT_DELETE_PREFIX = "__SOFT_DELETED__:";

export interface SoftDeleteMetadata {
  deletedAt: string;
  deletedBy: string;
  reason: string | null;
  previousIsBlocked: boolean;
  previousBlockReason: string | null;
  salons: Array<{
    id: string;
    status: string | null;
    isActive: boolean | null;
  }>;
  masters: Array<{
    id: string;
    status: string | null;
    isActive: boolean | null;
  }>;
}

export function buildSoftDeleteReason(metadata: SoftDeleteMetadata): string {
  return `${SOFT_DELETE_PREFIX}${JSON.stringify(metadata)}`;
}

export function parseSoftDeleteReason(reason: string | null | undefined): SoftDeleteMetadata | null {
  if (!reason || !reason.startsWith(SOFT_DELETE_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(reason.slice(SOFT_DELETE_PREFIX.length)) as SoftDeleteMetadata;
  } catch {
    return null;
  }
}

export function isSoftDeletedReason(reason: string | null | undefined): boolean {
  return parseSoftDeleteReason(reason) !== null;
}

export function isSoftDeletedUser(user: { blockReason?: string | null; isBlocked?: boolean | null }): boolean {
  return !!user.isBlocked && isSoftDeletedReason(user.blockReason);
}

export function notSoftDeleted(column: any) {
  return sql`(${column} IS NULL OR ${column} NOT LIKE ${`${SOFT_DELETE_PREFIX}%`})`;
}
