import { db } from "./db";
import { salons, masters, services, salonWorkingHours, masterServices } from "@shared/schema";
import bcrypt from "bcrypt";

// Seed данные для тестирования с stock изображениями
export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Создаем тестовые салоны
    const testSalons = [
      {
        ownerId: "seed-owner-1",
        name: {
          ru: "Люкс Салон Красоты",
          en: "Luxury Beauty Salon",
          uz: "Hashamatli Go'zallik Saloni",
        },
        description: {
          ru: "Премиальный салон красоты с опытными мастерами",
          en: "Premium beauty salon with experienced masters",
          uz: "Tajribali ustalar bilan premium go'zallik saloni",
        },
        address: "ул. Амира Темура, 15",
        city: "Ташкент",
        latitude: "41.311151",
        longitude: "69.279737",
        phone: "+998901234567",
        email: "info@luxsalon.uz",
        photos: [
          "/assets/stock_images/luxury_beauty_salon__29a49bfb.jpg",
          "/assets/stock_images/professional_hair_co_bb7062a0.jpg",
          "/assets/stock_images/professional_makeup__5e401efd.jpg",
        ],
        isActive: true,
        averageRating: "4.8",
        reviewCount: 24,
      },
      {
        ownerId: "seed-owner-2",
        name: {
          ru: "Релакс СПА",
          en: "Relax SPA",
          uz: "Relaks SPA",
        },
        description: {
          ru: "Спа-салон для полного расслабления и ухода",
          en: "SPA salon for complete relaxation and care",
          uz: "To'liq dam olish va g'amxo'rlik uchun SPA saloni",
        },
        address: "пр. Мустақиллик, 45",
        city: "Ташкент",
        latitude: "41.327953",
        longitude: "69.228949",
        phone: "+998902345678",
        email: "info@relaxspa.uz",
        photos: [
          "/assets/stock_images/relaxing_massage_spa_498ae86d.jpg",
          "/assets/stock_images/facial_spa_treatment_d93c5b9f.jpg",
        ],
        isActive: true,
        averageRating: "4.9",
        reviewCount: 18,
      },
      {
        ownerId: "seed-owner-3",
        name: {
          ru: "Стиль и Красота",
          en: "Style & Beauty",
          uz: "Uslub va Go'zallik",
        },
        description: {
          ru: "Современный салон для всей семьи",
          en: "Modern salon for the whole family",
          uz: "Butun oila uchun zamonaviy salon",
        },
        address: "ул. Бабура, 23",
        city: "Самарканд",
        latitude: "39.654250",
        longitude: "66.975630",
        phone: "+998903456789",
        email: "info@stylebeauty.uz",
        photos: [
          "/assets/stock_images/professional_hairsty_1e641329.jpg",
          "/assets/stock_images/professional_hairsty_b53f4485.jpg",
          "/assets/stock_images/professional_manicur_d36d8576.jpg",
        ],
        isActive: true,
        averageRating: "4.7",
        reviewCount: 31,
      },
    ];

    console.log("📝 Inserting salons...");
    const insertedSalons = await db.insert(salons).values(testSalons as any).returning();
    console.log(`✅ Created ${insertedSalons.length} salons`);

    // Создаем мастеров
    const testMasters = [
      {
        salonId: insertedSalons[0].id,
        name: "Анна Иванова",
        photo: "/assets/stock_images/happy_woman_client_b_55182bf5.jpg",
        specialties: {
          ru: ["Стрижки", "Окрашивание", "Укладки"],
          en: ["Haircuts", "Coloring", "Styling"],
          uz: ["Soch kesish", "Bo'yash", "Dazmol"],
        },
        bio: {
          ru: "Мастер с 10-летним опытом работы",
          en: "Master with 10 years of experience",
          uz: "10 yillik tajribaga ega usta",
        },
        experience: 10,
        averageRating: "4.9",
        reviewCount: 45,
        isActive: true,
      },
      {
        salonId: insertedSalons[0].id,
        name: "Мария Петрова",
        photo: "/assets/stock_images/happy_woman_client_b_a10a2f35.jpg",
        specialties: {
          ru: ["Маникюр", "Педикюр", "Nail-дизайн"],
          en: ["Manicure", "Pedicure", "Nail Design"],
          uz: ["Manikyur", "Pedikyur", "Tirnoq dizayni"],
        },
        bio: {
          ru: "Специалист по ногтевому сервису",
          en: "Nail service specialist",
          uz: "Tirnoq xizmati mutaxassisi",
        },
        experience: 7,
        averageRating: "4.8",
        reviewCount: 32,
        isActive: true,
      },
      {
        salonId: insertedSalons[1].id,
        name: "Елена Соколова",
        photo: "/assets/stock_images/happy_woman_client_b_d8ba12db.jpg",
        specialties: {
          ru: ["Массаж", "СПА-процедуры", "Релаксация"],
          en: ["Massage", "SPA procedures", "Relaxation"],
          uz: ["Massaj", "SPA protseduralar", "Dam olish"],
        },
        bio: {
          ru: "Сертифицированный массажист и SPA-терапевт",
          en: "Certified massage therapist and SPA specialist",
          uz: "Sertifikatlangan massaj terapevti va SPA mutaxassisi",
        },
        experience: 12,
        averageRating: "5.0",
        reviewCount: 28,
        isActive: true,
      },
    ];

    console.log("👤 Inserting masters...");
    const insertedMasters = await db.insert(masters).values(testMasters as any).returning();
    console.log(`✅ Created ${insertedMasters.length} masters`);

    // Создаем услуги
    const testServices = [
      // Услуги для салона 1
      {
        salonId: insertedSalons[0].id,
        name: {
          ru: "Женская стрижка",
          en: "Women's Haircut",
          uz: "Ayollar soch kesish",
        },
        description: {
          ru: "Модная стрижка любой сложности",
          en: "Trendy haircut of any complexity",
          uz: "Har qanday murakkablikdagi zamonaviy soch kesish",
        },
        category: "hair",
        priceMin: 150000,
        priceMax: 300000,
        duration: 60,
        isActive: true,
      },
      {
        salonId: insertedSalons[0].id,
        name: {
          ru: "Окрашивание волос",
          en: "Hair Coloring",
          uz: "Soch bo'yash",
        },
        description: {
          ru: "Профессиональное окрашивание премиум красками",
          en: "Professional coloring with premium dyes",
          uz: "Premium bo'yoqlar bilan professional bo'yash",
        },
        category: "hair",
        priceMin: 250000,
        priceMax: 600000,
        duration: 120,
        isActive: true,
      },
      {
        salonId: insertedSalons[0].id,
        name: {
          ru: "Маникюр классический",
          en: "Classic Manicure",
          uz: "Klassik manikyur",
        },
        description: {
          ru: "Классический маникюр с покрытием гель-лаком",
          en: "Classic manicure with gel polish",
          uz: "Gel lak bilan klassik manikyur",
        },
        category: "nails",
        priceMin: 100000,
        priceMax: null,
        duration: 90,
        isActive: true,
      },
      // Услуги для салона 2
      {
        salonId: insertedSalons[1].id,
        name: {
          ru: "Расслабляющий массаж",
          en: "Relaxing Massage",
          uz: "Dam oluvchi massaj",
        },
        description: {
          ru: "Полный курс расслабляющего массажа тела",
          en: "Full course of relaxing body massage",
          uz: "To'liq dam oluvchi tana massaji kursi",
        },
        category: "spa",
        priceMin: 200000,
        priceMax: 350000,
        duration: 60,
        isActive: true,
      },
      {
        salonId: insertedSalons[1].id,
        name: {
          ru: "Уход за лицом",
          en: "Facial Treatment",
          uz: "Yuz parvarishi",
        },
        description: {
          ru: "Профессиональный уход за кожей лица",
          en: "Professional facial skin care",
          uz: "Professional yuz terisi parvarishi",
        },
        category: "face",
        priceMin: 150000,
        priceMax: 250000,
        duration: 90,
        isActive: true,
      },
    ];

    console.log("💅 Inserting services...");
    const insertedServices = await db.insert(services).values(testServices as any).returning();
    console.log(`✅ Created ${insertedServices.length} services`);

    // Создаем расписание для салонов (пн-сб 9:00-20:00, вс выходной)
    const workingHoursData = [];
    for (const salon of insertedSalons) {
      for (let day = 1; day <= 6; day++) {
        workingHoursData.push({
          salonId: salon.id,
          dayOfWeek: day,
          openTime: "09:00",
          closeTime: "20:00",
          isClosed: false,
        });
      }
      // Воскресенье - выходной
      workingHoursData.push({
        salonId: salon.id,
        dayOfWeek: 0,
        openTime: "00:00",
        closeTime: "00:00",
        isClosed: true,
      });
    }

    console.log("🕐 Inserting working hours...");
    await db.insert(salonWorkingHours).values(workingHoursData);
    console.log(`✅ Created working hours for ${insertedSalons.length} salons`);

    // Связываем мастеров с услугами
    const masterServiceLinks = [
      // Анна делает стрижки и окрашивание
      { masterId: insertedMasters[0].id, serviceId: insertedServices[0].id },
      { masterId: insertedMasters[0].id, serviceId: insertedServices[1].id },
      // Мария делает маникюр
      { masterId: insertedMasters[1].id, serviceId: insertedServices[2].id },
      // Елена делает массаж и уход за лицом
      { masterId: insertedMasters[2].id, serviceId: insertedServices[3].id },
      { masterId: insertedMasters[2].id, serviceId: insertedServices[4].id },
    ];

    console.log("🔗 Linking masters to services...");
    await db.insert(masterServices).values(masterServiceLinks);
    console.log(`✅ Created ${masterServiceLinks.length} master-service links`);

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Salons: ${insertedSalons.length}`);
    console.log(`   - Masters: ${insertedMasters.length}`);
    console.log(`   - Services: ${insertedServices.length}`);
    console.log(`   - Master-Service links: ${masterServiceLinks.length}`);

    return {
      salons: insertedSalons,
      masters: insertedMasters,
      services: insertedServices,
    };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Запуск seeding если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log("✅ Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
