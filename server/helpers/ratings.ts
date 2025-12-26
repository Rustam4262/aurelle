import { db } from "../db";
import { reviews, salons, masters } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function updateSalonRating(salonId: string) {
  const result = await db.select({
    avgRating: sql<number>`AVG(${reviews.rating})::numeric(2,1)`,
    count: sql<number>`COUNT(*)`,
  }).from(reviews).where(eq(reviews.salonId, salonId));

  if (result[0]) {
    await db.update(salons)
      .set({
        averageRating: result[0].avgRating?.toString() || "0",
        reviewCount: result[0].count || 0,
      })
      .where(eq(salons.id, salonId));
  }
}

export async function updateMasterRating(masterId: string) {
  const result = await db.select({
    avgRating: sql<number>`AVG(${reviews.rating})::numeric(2,1)`,
    count: sql<number>`COUNT(*)`,
  }).from(reviews).where(eq(reviews.masterId, masterId));

  if (result[0]) {
    await db.update(masters)
      .set({
        averageRating: result[0].avgRating?.toString() || "0",
        reviewCount: result[0].count || 0,
      })
      .where(eq(masters.id, masterId));
  }
}
