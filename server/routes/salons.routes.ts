import { Router } from "express";
import { db } from "../db";
import { salons, masters, services, salonWorkingHours, reviews } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// Get all active salons (for map display)
router.get("/", async (req, res) => {
  try {
    const { city, minLat, maxLat, minLng, maxLng } = req.query;

    let query = db.select().from(salons).where(eq(salons.isActive, true));

    const result = await query.orderBy(desc(salons.averageRating));
    return res.json(result);
  } catch (error) {
    console.error("Get salons error:", error);
    return res.status(500).json({ error: "Failed to get salons" });
  }
});

// Get single salon with details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [salon] = await db.select().from(salons).where(eq(salons.id, id));
    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    const salonMasters = await db.select().from(masters)
      .where(and(eq(masters.salonId, id), eq(masters.isActive, true)));

    const salonServices = await db.select().from(services)
      .where(and(eq(services.salonId, id), eq(services.isActive, true)));

    const workingHours = await db.select().from(salonWorkingHours)
      .where(eq(salonWorkingHours.salonId, id));

    const salonReviews = await db.select().from(reviews)
      .where(eq(reviews.salonId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    return res.json({
      ...salon,
      masters: salonMasters,
      services: salonServices,
      workingHours,
      reviews: salonReviews,
    });
  } catch (error) {
    console.error("Get salon error:", error);
    return res.status(500).json({ error: "Failed to get salon" });
  }
});

// Get salon services
router.get("/:id/services", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(services)
      .where(and(eq(services.salonId, id), eq(services.isActive, true)));
    return res.json(result);
  } catch (error) {
    console.error("Get services error:", error);
    return res.status(500).json({ error: "Failed to get services" });
  }
});

// Get salon masters
router.get("/:id/masters", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(masters)
      .where(and(eq(masters.salonId, id), eq(masters.isActive, true)));
    return res.json(result);
  } catch (error) {
    console.error("Get masters error:", error);
    return res.status(500).json({ error: "Failed to get masters" });
  }
});

// Get salon working hours
router.get("/:id/hours", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(salonWorkingHours)
      .where(eq(salonWorkingHours.salonId, id));
    return res.json(result);
  } catch (error) {
    console.error("Get hours error:", error);
    return res.status(500).json({ error: "Failed to get hours" });
  }
});

// Get salon reviews
router.get("/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(reviews)
      .where(eq(reviews.salonId, id))
      .orderBy(desc(reviews.createdAt));
    return res.json(result);
  } catch (error) {
    console.error("Get reviews error:", error);
    return res.status(500).json({ error: "Failed to get reviews" });
  }
});

// Get master details (public endpoint)
router.get("/masters/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [master] = await db.select().from(masters).where(eq(masters.id, id));
    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }

    const masterReviews = await db.select().from(reviews)
      .where(eq(reviews.masterId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    return res.json({ ...master, reviews: masterReviews });
  } catch (error) {
    console.error("Get master error:", error);
    return res.status(500).json({ error: "Failed to get master" });
  }
});

export default router;
