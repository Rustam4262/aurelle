import { db } from "../db";
import { reviews, salons, masters } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

// Hidden reviews (removed by admin moderation) never count toward the
// public rating average or review count.
const notHidden = sql`(${reviews.isHidden} IS NOT TRUE)`;

export async function updateSalonRating(salonId: string) {
  const result = await db
    .select({
      avgRating: sql<number>`AVG(${reviews.rating})::numeric(2,1)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(and(eq(reviews.salonId, salonId), notHidden));

  if (result[0]) {
    await db
      .update(salons)
      .set({
        averageRating: result[0].avgRating?.toString() || "0",
        reviewCount: result[0].count || 0,
      })
      .where(eq(salons.id, salonId));
  }
}

export async function updateMasterRating(masterId: string) {
  const result = await db
    .select({
      avgRating: sql<number>`AVG(${reviews.rating})::numeric(2,1)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(and(eq(reviews.masterId, masterId), notHidden));

  if (result[0]) {
    await db
      .update(masters)
      .set({
        averageRating: result[0].avgRating?.toString() || "0",
        reviewCount: result[0].count || 0,
      })
      .where(eq(masters.id, masterId));
  }
}
