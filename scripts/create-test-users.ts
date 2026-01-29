/**
 * Script to create test users for all roles in the AURELLE platform
 * Run with: npx tsx scripts/create-test-users.ts
 */

import { db } from "../server/db";
import { users, salons, specialists, services } from "../server/db/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

const TEST_PASSWORD = "password123"; // Simple password for testing

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: "client" | "specialist" | "salon_owner" | "admin";
  phone?: string;
}

const testUsers: TestUser[] = [
  // Admin user
  {
    email: "admin@aurelle.uz",
    password: TEST_PASSWORD,
    name: "Admin User",
    role: "admin",
    phone: "+998901234567",
  },
  // Salon owners
  {
    email: "salon1@aurelle.uz",
    password: TEST_PASSWORD,
    name: "Beauty Lounge Owner",
    role: "salon_owner",
    phone: "+998901234568",
  },
  {
    email: "salon2@aurelle.uz",
    password: TEST_PASSWORD,
    name: "Elegant Salon Owner",
    role: "salon_owner",
    phone: "+998901234569",
  },
  // Specialists
  {
    email: "specialist1@aurelle.uz",
    password: TEST_PASSWORD,
    name: "Maria Ivanova",
    role: "specialist",
    phone: "+998901234570",
  },
  {
    email: "specialist2@aurelle.uz",
    password: TEST_PASSWORD,
    name: "Anna Petrova",
    role: "specialist",
    phone: "+998901234571",
  },
  {
    email: "specialist3@aurelle.uz",
    password: TEST_PASSWORD,
    name: "Elena Sidorova",
    role: "specialist",
    phone: "+998901234572",
  },
  // Regular clients
  {
    email: "client1@aurelle.uz",
    password: TEST_PASSWORD,
    name: "John Doe",
    role: "client",
    phone: "+998901234573",
  },
  {
    email: "client2@aurelle.uz",
    password: TEST_PASSWORD,
    name: "Jane Smith",
    role: "client",
    phone: "+998901234574",
  },
  {
    email: "client3@aurelle.uz",
    password: TEST_PASSWORD,
    name: "Alice Johnson",
    role: "client",
    phone: "+998901234575",
  },
];

async function createTestUsers() {
  console.log("🚀 Creating test users for AURELLE platform...\n");

  try {
    // Hash the password once (same for all test users)
    const hashedPassword = await hashPassword(TEST_PASSWORD);

    for (const testUser of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, testUser.email),
        });

        if (existingUser) {
          console.log(`⚠️  User already exists: ${testUser.email} (${testUser.role})`);
          continue;
        }

        // Create user
        const [newUser] = await db
          .insert(users)
          .values({
            email: testUser.email,
            password: hashedPassword,
            name: testUser.name,
            role: testUser.role,
            phone: testUser.phone,
            emailVerified: true, // Auto-verify for testing
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        console.log(`✅ Created user: ${testUser.email} (${testUser.role})`);

        // Create salon for salon owners
        if (testUser.role === "salon_owner") {
          const salonName =
            testUser.email === "salon1@aurelle.uz"
              ? "Beauty Lounge Tashkent"
              : "Elegant Salon Tashkent";

          const [newSalon] = await db
            .insert(salons)
            .values({
              name: salonName,
              ownerId: newUser.id,
              city: "Tashkent",
              address: "Test Address, Tashkent",
              description: `This is a test salon created for development purposes.`,
              phone: testUser.phone,
              workingHours: {
                monday: { open: "09:00", close: "20:00" },
                tuesday: { open: "09:00", close: "20:00" },
                wednesday: { open: "09:00", close: "20:00" },
                thursday: { open: "09:00", close: "20:00" },
                friday: { open: "09:00", close: "20:00" },
                saturday: { open: "10:00", close: "18:00" },
                sunday: { open: "10:00", close: "18:00" },
              },
              rating: 4.5,
              reviewsCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          console.log(`   ✅ Created salon: ${salonName}`);

          // Create sample services for the salon
          const sampleServices = [
            {
              name: "Women Haircut",
              price: 150000,
              duration: 60,
              category: "Hair",
            },
            {
              name: "Men Haircut",
              price: 80000,
              duration: 30,
              category: "Hair",
            },
            {
              name: "Hair Coloring",
              price: 300000,
              duration: 120,
              category: "Hair",
            },
            {
              name: "Manicure",
              price: 100000,
              duration: 45,
              category: "Nails",
            },
            {
              name: "Pedicure",
              price: 120000,
              duration: 60,
              category: "Nails",
            },
            {
              name: "Facial Treatment",
              price: 200000,
              duration: 90,
              category: "Skincare",
            },
          ];

          for (const service of sampleServices) {
            await db.insert(services).values({
              salonId: newSalon.id,
              name: service.name,
              price: service.price,
              duration: service.duration,
              category: service.category,
              description: `Professional ${service.name.toLowerCase()} service`,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          console.log(`   ✅ Created ${sampleServices.length} services`);
        }

        // Create specialist profile for specialists
        if (testUser.role === "specialist") {
          // Assign to first salon
          const firstSalon = await db.query.salons.findFirst();

          if (firstSalon) {
            await db.insert(specialists).values({
              userId: newUser.id,
              salonId: firstSalon.id,
              specialization: "Hair Stylist",
              bio: `Experienced ${testUser.name} with 5+ years in the beauty industry.`,
              rating: 4.7,
              reviewsCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            console.log(`   ✅ Created specialist profile (assigned to ${firstSalon.name})`);
          }
        }
      } catch (error) {
        console.error(`❌ Error creating user ${testUser.email}:`, error);
      }
    }

    console.log("\n✅ Test users creation completed!\n");
    console.log("=".repeat(60));
    console.log("📋 TEST USER CREDENTIALS");
    console.log("=".repeat(60));
    console.log("\n🔐 Default password for ALL users: password123\n");
    console.log("ADMIN ACCOUNT:");
    console.log("  Email: admin@aurelle.uz");
    console.log("  Role:  Admin\n");
    console.log("SALON OWNER ACCOUNTS:");
    console.log("  Email: salon1@aurelle.uz");
    console.log("  Email: salon2@aurelle.uz");
    console.log("  Role:  Salon Owner\n");
    console.log("SPECIALIST ACCOUNTS:");
    console.log("  Email: specialist1@aurelle.uz");
    console.log("  Email: specialist2@aurelle.uz");
    console.log("  Email: specialist3@aurelle.uz");
    console.log("  Role:  Specialist\n");
    console.log("CLIENT ACCOUNTS:");
    console.log("  Email: client1@aurelle.uz");
    console.log("  Email: client2@aurelle.uz");
    console.log("  Email: client3@aurelle.uz");
    console.log("  Role:  Client\n");
    console.log("=".repeat(60));
    console.log("\n🌐 Access the platform at: http://localhost:5000\n");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
createTestUsers()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
