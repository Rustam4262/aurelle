import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { salons, salonWorkingHours } from "@shared/schema";

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const salonHoursInput = z.object({
  hours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: time,
    closeTime: time,
    isClosed: z.boolean().default(false),
  }).refine(h => h.isClosed || h.openTime < h.closeTime, {
    message: "Closing time must be after opening time", path: ["closeTime"],
  })).min(1).max(7).refine(hours => new Set(hours.map(h => h.dayOfWeek)).size === hours.length, {
    message: "Each weekday may appear only once",
  }),
});

export async function replaceSalonHours(salonId: string, ownerId: string, input: z.infer<typeof salonHoursInput>) {
  return db.transaction(async tx => {
    // Serialize replacements, including an initially empty schedule. Locking only
    // existing hour rows would allow two replacements to interleave.
    const [salon] = await tx.select({ id: salons.id }).from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, ownerId))).for("update");
    if (!salon) return null;
    await tx.delete(salonWorkingHours).where(eq(salonWorkingHours.salonId, salonId));
    return tx.insert(salonWorkingHours)
      .values(input.hours.map(h => ({ ...h, salonId }))).returning();
  });
}
