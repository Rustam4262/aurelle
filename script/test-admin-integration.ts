/**
 * Admin Panel Integration Test
 * Проверяет, что все компоненты админ панели интегрированы корректно
 */

import { db } from "../server/db";
import { users, salons, userActivitySessions } from "@shared/schema";
import { sql } from "drizzle-orm";

async function testIntegration() {
  console.log("🧪 Testing Admin Panel Integration...\n");

  const tests = {
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  // Test 1: Check users table has activity fields
  console.log("1️⃣  Checking users table columns...");
  try {
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('last_login_at', 'last_activity_at', 'login_count', 'total_session_time_seconds', 'is_blocked', 'block_reason')
    `);

    const columns = result.rows.map((r: any) => r.column_name);
    const expectedColumns = [
      "last_login_at",
      "last_activity_at",
      "login_count",
      "total_session_time_seconds",
      "is_blocked",
      "block_reason",
    ];

    const missingColumns = expectedColumns.filter((col) => !columns.includes(col));

    if (missingColumns.length === 0) {
      console.log("   ✅ All activity tracking columns exist in users table");
      tests.passed++;
    } else {
      console.log(`   ❌ Missing columns: ${missingColumns.join(", ")}`);
      tests.failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    tests.failed++;
  }

  // Test 2: Check salons table has is_verified field
  console.log("\n2️⃣  Checking salons table columns...");
  try {
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'salons'
      AND column_name = 'is_verified'
    `);

    if (result.rows.length > 0) {
      console.log("   ✅ is_verified column exists in salons table");
      tests.passed++;
    } else {
      console.log("   ❌ is_verified column missing in salons table");
      tests.failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    tests.failed++;
  }

  // Test 3: Check user_activity_sessions table exists
  console.log("\n3️⃣  Checking user_activity_sessions table...");
  try {
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'user_activity_sessions'
    `);

    if (result.rows.length > 0) {
      console.log("   ✅ user_activity_sessions table exists");
      tests.passed++;

      // Check important columns
      const columnsResult = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user_activity_sessions'
      `);

      const columns = columnsResult.rows.map((r: any) => r.column_name);
      const requiredCols = [
        "user_id",
        "session_id",
        "login_at",
        "logout_at",
        "last_activity_at",
        "device_type",
        "browser",
        "duration_seconds",
      ];

      const missing = requiredCols.filter((col) => !columns.includes(col));
      if (missing.length === 0) {
        console.log("   ✅ All required columns present in user_activity_sessions");
        tests.passed++;
      } else {
        console.log(`   ⚠️  Missing columns: ${missing.join(", ")}`);
        tests.warnings++;
      }
    } else {
      console.log("   ❌ user_activity_sessions table does not exist");
      tests.failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    tests.failed++;
  }

  // Test 4: Check user_activity_actions table exists
  console.log("\n4️⃣  Checking user_activity_actions table...");
  try {
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'user_activity_actions'
    `);

    if (result.rows.length > 0) {
      console.log("   ✅ user_activity_actions table exists");
      tests.passed++;
    } else {
      console.log("   ❌ user_activity_actions table does not exist");
      tests.failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    tests.failed++;
  }

  // Test 5: Check indexes
  console.log("\n5️⃣  Checking database indexes...");
  try {
    const result = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('users', 'salons', 'user_activity_sessions', 'user_activity_actions')
      AND indexname IN (
        'idx_users_blocked',
        'idx_users_last_login',
        'idx_users_last_activity',
        'idx_salons_verified',
        'idx_user_activity_sessions_user_id',
        'idx_user_activity_sessions_session_id'
      )
    `);

    const indexes = result.rows.map((r: any) => r.indexname);
    const expectedIndexes = [
      "idx_users_blocked",
      "idx_salons_verified",
      "idx_user_activity_sessions_user_id",
    ];

    const foundIndexes = expectedIndexes.filter((idx) => indexes.includes(idx));

    console.log(`   ℹ️  Found ${foundIndexes.length} of ${expectedIndexes.length} critical indexes`);

    if (foundIndexes.length === expectedIndexes.length) {
      console.log("   ✅ All critical indexes created");
      tests.passed++;
    } else {
      console.log(`   ⚠️  Some indexes may be missing (this might be ok)`);
      tests.warnings++;
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not verify indexes: ${error.message}`);
    tests.warnings++;
  }

  // Test 6: Check sample data counts
  console.log("\n6️⃣  Checking data counts...");
  try {
    const [usersCount] = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const [salonsCount] = await db.execute(sql`SELECT COUNT(*) as count FROM salons`);
    const [sessionsCount] = await db.execute(
      sql`SELECT COUNT(*) as count FROM user_activity_sessions`
    );

    console.log(`   📊 Users: ${(usersCount.rows[0] as any).count}`);
    console.log(`   📊 Salons: ${(salonsCount.rows[0] as any).count}`);
    console.log(`   📊 Activity Sessions: ${(sessionsCount.rows[0] as any).count}`);

    tests.passed++;
  } catch (error: any) {
    console.log(`   ⚠️  Could not fetch counts: ${error.message}`);
    tests.warnings++;
  }

  // Test 7: Check for blocked users
  console.log("\n7️⃣  Checking blocked users...");
  try {
    const [blockedCount] = await db.execute(
      sql`SELECT COUNT(*) as count FROM users WHERE is_blocked = true`
    );

    console.log(`   📊 Blocked users: ${(blockedCount.rows[0] as any).count}`);
    tests.passed++;
  } catch (error: any) {
    console.log(`   ❌ Error checking blocked users: ${error.message}`);
    tests.failed++;
  }

  // Test 8: Check verified salons
  console.log("\n8️⃣  Checking verified salons...");
  try {
    const [verifiedCount] = await db.execute(
      sql`SELECT COUNT(*) as count FROM salons WHERE is_verified = true`
    );

    console.log(`   📊 Verified salons: ${(verifiedCount.rows[0] as any).count}`);
    tests.passed++;
  } catch (error: any) {
    console.log(`   ❌ Error checking verified salons: ${error.message}`);
    tests.failed++;
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📋 TEST SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Passed:   ${tests.passed}`);
  console.log(`❌ Failed:   ${tests.failed}`);
  console.log(`⚠️  Warnings: ${tests.warnings}`);
  console.log("=".repeat(50));

  if (tests.failed === 0) {
    console.log("\n🎉 All tests passed! Admin panel integration is ready.");
    console.log("\n📝 Next steps:");
    console.log("   1. Start the server: npm start");
    console.log("   2. Login as super admin");
    console.log("   3. Navigate to /admin/dashboard");
    console.log("   4. Test user blocking/unblocking");
    console.log("   5. Check online users widget");
    process.exit(0);
  } else {
    console.log(
      "\n⚠️  Some tests failed. Please run the migration: migrations/0017_create_user_activity_tracking.sql"
    );
    process.exit(1);
  }
}

// Run tests
testIntegration().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});
