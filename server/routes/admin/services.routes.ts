import { Router } from "express";
import { db } from "../../db";
import { bookings, masters, salons, services, soloMasterServices, users } from "@shared/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { requirePermission } from "../../middleware/admin";
import { logger } from "../../lib/logger";

const router = Router();

function pickName(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    return String(item.ru || item.en || item.uz || "");
  }
  return String(value);
}

router.get("/", requirePermission("salons.read"), async (req, res) => {
  try {
    const source = typeof req.query.source === "string" ? req.query.source : "all";
    const limit = Math.min(Math.max(Number(req.query.limit || 500), 1), 1000);

    const [salonRows, soloRows] = await Promise.all([
      source === "solo"
        ? []
        : db
            .select({
              id: services.id,
              name: services.name,
              description: services.description,
              category: services.category,
              priceMin: services.priceMin,
              priceMax: services.priceMax,
              duration: services.duration,
              isActive: services.isActive,
              bookingCount: services.bookingCount,
              createdAt: services.createdAt,
              ownerId: salons.ownerId,
              ownerEmail: users.email,
              providerId: salons.id,
              providerName: salons.name,
              providerStatus: salons.status,
              providerCity: salons.city,
            })
            .from(services)
            .leftJoin(salons, eq(services.salonId, salons.id))
            .leftJoin(users, eq(salons.ownerId, users.id))
            .orderBy(desc(services.createdAt))
            .limit(limit),
      source === "salon"
        ? []
        : db
            .select({
              id: soloMasterServices.id,
              name: soloMasterServices.name,
              description: soloMasterServices.description,
              category: soloMasterServices.category,
              priceMin: soloMasterServices.priceMin,
              priceMax: soloMasterServices.priceMax,
              duration: soloMasterServices.duration,
              serviceMode: soloMasterServices.serviceMode,
              mobileExtraCharge: soloMasterServices.mobileExtraCharge,
              isActive: soloMasterServices.isActive,
              createdAt: soloMasterServices.createdAt,
              ownerId: masters.userId,
              ownerEmail: users.email,
              providerId: masters.id,
              providerName: masters.name,
              providerStatus: masters.status,
              providerCity: masters.city,
            })
            .from(soloMasterServices)
            .leftJoin(masters, eq(soloMasterServices.masterId, masters.id))
            .leftJoin(users, eq(masters.userId, users.id))
            .orderBy(desc(soloMasterServices.createdAt))
            .limit(limit),
    ]);

    const salonServiceIds = salonRows.map((item) => item.id);
    const soloServiceIds = soloRows.map((item) => item.id);

    const [salonBookingStats, soloBookingStats] = await Promise.all([
      salonServiceIds.length
        ? db
            .select({
              serviceId: bookings.serviceId,
              count: sql<number>`count(*)`,
            })
            .from(bookings)
            .where(inArray(bookings.serviceId, salonServiceIds))
            .groupBy(bookings.serviceId)
        : [],
      soloServiceIds.length
        ? db
            .select({
              serviceId: bookings.soloMasterServiceId,
              count: sql<number>`count(*)`,
            })
            .from(bookings)
            .where(inArray(bookings.soloMasterServiceId, soloServiceIds))
            .groupBy(bookings.soloMasterServiceId)
        : [],
    ]);

    const bookingCounts = new Map<string, number>();
    for (const row of [...salonBookingStats, ...soloBookingStats]) {
      if (row.serviceId) bookingCounts.set(row.serviceId, Number(row.count || 0));
    }

    const normalizedSalonServices = salonRows.map((item) => ({
      ...item,
      source: "salon" as const,
      serviceMode: "salon",
      mobileExtraCharge: null,
      providerType: "Салон",
      providerNameText: pickName(item.providerName),
      nameText: pickName(item.name),
      bookingsCount: bookingCounts.get(item.id) ?? Number(item.bookingCount || 0),
    }));

    const normalizedSoloServices = soloRows.map((item) => ({
      ...item,
      source: "solo" as const,
      providerType: "Фриланс-мастер",
      providerNameText: pickName(item.providerName),
      nameText: pickName(item.name),
      bookingCount: bookingCounts.get(item.id) ?? 0,
      bookingsCount: bookingCounts.get(item.id) ?? 0,
    }));

    const items = [...normalizedSalonServices, ...normalizedSoloServices].sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return right - left;
    });

    const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort();
    const stats = {
      total: items.length,
      salonServices: normalizedSalonServices.length,
      soloMasterServices: normalizedSoloServices.length,
      active: items.filter((item) => item.isActive).length,
      inactive: items.filter((item) => !item.isActive).length,
      categories: categories.length,
    };

    res.json({ services: items, stats, categories });
  } catch (error) {
    logger.error("List admin services error", error as Error, { source: "admin-services-routes" });
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

export default router;
