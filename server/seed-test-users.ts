import "dotenv/config";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seedTestUsers() {
  try {
    console.log("🌱 Seeding test users...");

    const testUsers = [
      {
        email: "client1@test.com",
        firstName: "Анна",
        lastName: "Иванова",
        phoneNumber: "+998901234567",
        emailVerified: true,
        phoneVerified: true,
        password: await bcrypt.hash("password123", 10),
      },
      {
        email: "client2@test.com",
        firstName: "Дмитрий",
        lastName: "Петров",
        phoneNumber: "+998902345678",
        emailVerified: true,
        phoneVerified: false,
        password: await bcrypt.hash("password123", 10),
      },
      {
        email: "owner1@test.com",
        firstName: "Ольга",
        lastName: "Смирнова",
        phoneNumber: "+998903456789",
        emailVerified: true,
        phoneVerified: true,
        password: await bcrypt.hash("password123", 10),
      },
      {
        email: "owner2@test.com",
        firstName: "Сергей",
        lastName: "Козлов",
        phoneNumber: "+998904567890",
        emailVerified: false,
        phoneVerified: true,
        password: await bcrypt.hash("password123", 10),
      },
      {
        email: "master1@test.com",
        firstName: "Елена",
        lastName: "Волкова",
        phoneNumber: "+998905678901",
        emailVerified: true,
        phoneVerified: true,
        password: await bcrypt.hash("password123", 10),
      },
      {
        email: "master2@test.com",
        firstName: "Алексей",
        lastName: "Морозов",
        phoneNumber: "+998906789012",
        emailVerified: true,
        phoneVerified: false,
        password: await bcrypt.hash("password123", 10),
      },
      {
        email: "blocked@test.com",
        firstName: "Заблокированный",
        lastName: "Пользователь",
        phoneNumber: "+998907890123",
        emailVerified: true,
        phoneVerified: true,
        isBlocked: true,
        blockReason: "Нарушение правил платформы",
        password: await bcrypt.hash("password123", 10),
      },
    ];

    for (const userData of testUsers) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length === 0) {
        await db.insert(users).values(userData);
        console.log(`✅ Created user: ${userData.email}`);
      } else {
        console.log(`⏭️  User already exists: ${userData.email}`);
      }
    }

    console.log("\n🎉 Seeding completed!");
    console.log("📊 Total test users created/checked: " + testUsers.length);
    console.log("\n💡 Test credentials:");
    console.log("   Email: any of the above");
    console.log("   Password: password123");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedTestUsers();
