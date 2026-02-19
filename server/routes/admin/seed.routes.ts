import { Router } from "express";
import { db } from "../../db";
import { users, salons, masters } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { logger } from "../../lib/logger";
import bcrypt from "bcrypt";

const router = Router();

function getUserId(req: any): string {
  return req.session?.passport?.user?.claims?.sub || "";
}

// POST /api/admin/seed/test-users - Create test users (development only)
router.post("/test-users", requirePermission("users.write"), async (req, res) => {
  try {
    const userId = getUserId(req);

    // Safety check - only allow in development or with explicit confirmation
    if (process.env.NODE_ENV === "production" && !req.body.confirmProduction) {
      return res.status(403).json({
        error: "Cannot seed test data in production without confirmation",
        hint: "Send { confirmProduction: true } to override",
      });
    }

    const testUsers = [
      {
        email: "client1@test.com",
        firstName: "Анна",
        lastName: "Иванова",
        phoneNumber: "+998901234567",
        emailVerified: true,
        phoneVerified: true,
        password: await bcrypt.hash("TestPass123!", 10),
      },
      {
        email: "client2@test.com",
        firstName: "Дмитрий",
        lastName: "Петров",
        phoneNumber: "+998902345678",
        emailVerified: true,
        phoneVerified: false,
        password: await bcrypt.hash("TestPass123!", 10),
      },
      {
        email: "owner1@test.com",
        firstName: "Ольга",
        lastName: "Смирнова",
        phoneNumber: "+998903456789",
        emailVerified: true,
        phoneVerified: true,
        password: await bcrypt.hash("TestPass123!", 10),
      },
      {
        email: "owner2@test.com",
        firstName: "Сергей",
        lastName: "Козлов",
        phoneNumber: "+998904567890",
        emailVerified: false,
        phoneVerified: true,
        password: await bcrypt.hash("TestPass123!", 10),
      },
      {
        email: "master1@test.com",
        firstName: "Елена",
        lastName: "Волкова",
        phoneNumber: "+998905678901",
        emailVerified: true,
        phoneVerified: true,
        password: await bcrypt.hash("TestPass123!", 10),
      },
      {
        email: "master2@test.com",
        firstName: "Алексей",
        lastName: "Морозов",
        phoneNumber: "+998906789012",
        emailVerified: true,
        phoneVerified: false,
        password: await bcrypt.hash("TestPass123!", 10),
      },
      {
        email: "blocked@test.com",
        firstName: "Заблокированный",
        lastName: "Пользователь",
        phoneNumber: "+998907890123",
        emailVerified: true,
        phoneVerified: true,
        isBlocked: true,
        blockReason: "Нарушение правил платформы - тестовый пользователь",
        password: await bcrypt.hash("TestPass123!", 10),
      },
    ];

    const created = [];
    const skipped = [];

    for (const userData of testUsers) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length === 0) {
        const [newUser] = await db.insert(users).values(userData).returning();
        created.push(newUser.email);
      } else {
        skipped.push(userData.email);
      }
    }

    // Log the action
    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "seed.test_users",
      entityType: "user",
      entityId: null,
      meta: { created: created.length, skipped: skipped.length },
      req,
    });

    res.json({
      success: true,
      message: "Test users seeded successfully",
      created: created.length,
      skipped: skipped.length,
      createdUsers: created,
      skippedUsers: skipped,
      credentials: {
        password: "TestPass123!",
        note: "Use any of the created emails with this password to login",
      },
    });
  } catch (error: any) {
    logger.error("Seed test users error", error as Error, { source: "seed-routes" });
    res.status(500).json({ error: "Failed to seed test users" });
  }
});

export default router;
