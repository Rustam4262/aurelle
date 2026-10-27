import { documentPolicy } from "@shared/seo-policy";
import { db } from "../db";
import { salons, masters } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

export async function resolveDocumentPolicy(input: string) {
  const policy = documentPolicy(input);
  const path = new URL(input, "https://aurelle.uz").pathname;
  const match = path.match(/^\/(salon|master)\/([^/]+)\/?$/);
  if (!match) return policy;
  let id: string;
  try {
    id = decodeURIComponent(match[2]);
  } catch {
    return { status: 404, noIndex: true };
  }
  try {
    const rows =
      match[1] === "salon"
        ? await db
            .select({ id: salons.id })
            .from(salons)
            .where(
              and(
                eq(salons.id, id),
                eq(salons.isActive, true),
                eq(salons.status, "active"),
                sql`NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ${salons.ownerId} AND u.is_blocked = true)`,
              ),
            )
            .limit(1)
        : await db
            .select({ id: masters.id })
            .from(masters)
            .where(
              and(
                eq(masters.slug, id),
                eq(masters.isSoloMaster, true),
                eq(masters.isActive, true),
                eq(masters.status, "active"),
                sql`NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ${masters.userId} AND u.is_blocked = true)`,
              ),
            )
            .limit(1);
    return rows.length ? policy : { status: 404, noIndex: true };
  } catch {
    // A database outage must not deindex an existing listing as a permanent 404.
    return { status: 503, noIndex: false };
  }
}
