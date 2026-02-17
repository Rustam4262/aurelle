/**
 * Setup Demo Data for AURELLE
 * Creates test salon, services, and masters for development
 * 
 * Run with: tsx server/setup-demo.ts
 */

import "dotenv/config";
import { db } from "./db";
import {
  salons,
  services,
  masters,
  salonWorkingHours,
  masterWorkingHours,
  users,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

const DEMO_SALON_NAME = "Xulkar Salon";
const DEMO_CITY = "Tashkent";
const DEMO_PHONE = "+998 50 015 1475";

// Demo masters with their emails
const DEMO_MASTERS = [
  {
    name: "Shaxnoza Raximova",
    email: "shaxnoza@gmail.com",
    specialties: ["Hair Coloring", "Hair Styling", "Haircut"],
  },
  {
    name: "Xulkar Raziyeva",
    email: "xulkarraziyeva@gmail.com",
    specialties: ["Manicure", "Pedicure", "Facial Massage"],
  },
  {
    name: "Dilnoza Karimova",
    email: "demo_master_3@aurelle.uz",
    specialties: ["Hair Styling", "Hair Coloring"],
  },
];

async function getUserIdByEmail(email: string): Promise<string | null> {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return results.length > 0 ? results[0].id : null;
}

async function setupDemoData() {
  logger.info("🚀 Starting demo data setup...\n");

  try {
    // 1. Check if demo salon exists
    logger.info("📍 Checking for existing salon...");
    const existingSalons = await db
      .select()
      .from(salons)
      .where(eq(salons.isActive, true));

    let salonId: string;

    if (existingSalons.length > 0) {
      salonId = existingSalons[0].id;
      logger.info(`✅ Using existing salon: ${salonId}\n`);
    } else {
      logger.info("❌ No salon found, creating new one...");
      const [insertedSalon] = await db
        .insert(salons)
        .values({
          ownerId: "system",
          name: {
            en: DEMO_SALON_NAME,
            ru: "Салон Хулкар",
            uz: "Xulkar Salon",
          },
          description: {
            en: "Professional beauty salon with experienced masters",
            ru: "Профессиональный салон красоты с опытными мастерами",
            uz: "Tajribali mutaxassislar bilan professional go'zallik saloni",
          },
          address: "123 Main Street",
          city: DEMO_CITY,
          phone: DEMO_PHONE,
          latitude: "41.2995000",
          longitude: "69.2401000",
          isActive: true,
          averageRating: "4.8",
          reviewCount: 0,
        })
        .returning({ id: salons.id });

      salonId = insertedSalon.id;
      logger.info(`✅ Created new salon: ${salonId}\n`);
    }

    // 2. Add services
    logger.info("🛠️ Adding services...");
    const servicesData = [
      {
        name: { en: "Haircut", ru: "Стрижка", uz: "Soch kesish" },
        category: "haircut",
        priceMin: 50000,
        priceMax: 100000,
        duration: 60,
      },
      {
        name: { en: "Hair Coloring", ru: "Окрашивание волос", uz: "Soc bo'yamasi" },
        category: "coloring",
        priceMin: 150000,
        priceMax: 300000,
        duration: 120,
      },
      {
        name: { en: "Manicure", ru: "Маникюр", uz: "Manikur" },
        category: "manicure",
        priceMin: 40000,
        priceMax: 80000,
        duration: 45,
      },
      {
        name: { en: "Pedicure", ru: "Педикюр", uz: "Pedikur" },
        category: "pedicure",
        priceMin: 50000,
        priceMax: 100000,
        duration: 60,
      },
      {
        name: { en: "Facial Massage", ru: "Массаж лица", uz: "Yuz massaji" },
        category: "massage",
        priceMin: 80000,
        priceMax: 150000,
        duration: 45,
      },
      {
        name: { en: "Hair Styling", ru: "Укладка волос", uz: "Sochni uloqtirish" },
        category: "styling",
        priceMin: 60000,
        priceMax: 120000,
        duration: 60,
      },
    ];

    const serviceIds: string[] = [];
    for (const service of servicesData) {
      const [sRow] = await db
        .insert(services)
        .values({
          salonId,
          name: service.name,
          category: service.category,
          priceMin: service.priceMin,
          priceMax: service.priceMax,
          duration: service.duration,
          isActive: true,
        })
        .returning({ id: services.id });
      serviceIds.push(sRow.id);
      logger.info(`  ✅ Added: ${service.name.en}`);
    }
    logger.info("");

    // 3. Add masters
    logger.info("👥 Adding masters...");
    for (const masterData of DEMO_MASTERS) {
      const userId = await getUserIdByEmail(masterData.email);

      if (!userId) {
        logger.info(
          `  ⚠️ Skipped: ${masterData.name} (${masterData.email}) - user not found`,
        );
        continue;
      }

      // Check if master already exists for this user
      const existingMaster = await db
        .select()
        .from(masters)
        .where(eq(masters.userId, userId))
        .limit(1);

      if (existingMaster.length > 0) {
        logger.info(
          `  ℹ️ Master already exists: ${masterData.name} (${masterData.email})`,
        );
        continue;
      }

      const [mRow] = await db
        .insert(masters)
        .values({
          salonId,
          userId,
          email: masterData.email,
          name: masterData.name,
          specialties: {
            en: masterData.specialties,
            ru: masterData.specialties,
            uz: masterData.specialties,
          },
          experience: 5,
          isActive: true,
          phone: "+998" + Math.random().toString().slice(2, 12),
          averageRating: "4.5",
          reviewCount: 0,
        })
        .returning({ id: masters.id });

      const masterId = mRow.id || "";
      logger.info(
        `  ✅ Added: ${masterData.name} (${masterData.specialties.join(", ")})`,
      );

      // Set master working hours (9 AM - 7 PM, 6 days a week)
      const DAY_MAP: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      for (const day of days) {
        await db.insert(masterWorkingHours).values({
          masterId,
          dayOfWeek: DAY_MAP[day],
          openTime: "09:00",
          closeTime: "19:00",
        });
      }
    }
    logger.info("");

    // 4. Add salon working hours
    logger.info("⏰ Setting salon working hours...");
    const DAY_MAP: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (const day of days) {
      await db.insert(salonWorkingHours).values({
        salonId,
        dayOfWeek: DAY_MAP[day],
        openTime: "09:00",
        closeTime: "19:00",
      });
      logger.info(`  ✅ ${day}: 09:00 - 19:00`);
    }

    // Add Sunday (closed)
    await db.insert(salonWorkingHours).values({
      salonId,
      dayOfWeek: DAY_MAP.sunday,
      openTime: "00:00",
      closeTime: "00:00",
      isClosed: true,
    });
    logger.info(`  ✅ sunday: CLOSED`);
    logger.info("");

    logger.info("✨ Demo data setup completed successfully!");
    logger.info("\n📊 Summary:");
    logger.info(`  • Salon: ${DEMO_SALON_NAME}`);
    logger.info(`  • Services: ${servicesData.length}`);
    logger.info(`  • Masters: ${DEMO_MASTERS.length}`);
    logger.info("\n🔗 Test Accounts:");
    logger.info("  • Client: roziyev18r@gmail.com / 123456789");
    logger.info("  • Master 1: shaxnoza@gmail.com / 123456789");
    logger.info("  • Master 2: xulkarraziyeva@gmail.com / 123456789");
    logger.info("\n🚀 Ready to test!");
  } catch (error) {
    logger.error("❌ Error setting up demo data:", error);
    process.exit(1);
  }
}

setupDemoData();
