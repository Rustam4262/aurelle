#!/usr/bin/env tsx
/**
 * scripts/db-verify.ts
 *
 * Verifies that all required tables exist in the production database.
 * Exits with code 1 if any required table is missing.
 *
 * Usage:
 *   npx tsx scripts/db-verify.ts
 *   npm run db:verify
 */

import "dotenv/config";
import { Pool } from "pg";

// ── Tables that MUST exist in the DB ─────────────────────────────────────────
// Add new tables here as migrations are applied.
const REQUIRED_TABLES = [
  // Auth / Users
  "users",
  "user_profiles",
  "sessions",
  "email_verification_tokens",
  "password_reset_tokens",
  "waitlist",

  // Salons & Masters
  "salons",
  "masters",
  "services",
  "service_categories",
  "portfolio_items",

  // Bookings
  "bookings",
  "booking_drafts",

  // Notifications
  "push_subscriptions",
  "scheduled_notifications",

  // Payments
  "payments",
  "webhook_events",
  "platform_fee_config",

  // Analytics
  "product_events",

  // Admin RBAC
  "admin_users",
  "admin_roles",
  "admin_role_permissions",
  "admin_user_roles",

  // Moderation
  "sanctions",
  "complaints",
  "audit_logs",
  "chat_messages",
  "user_activity",
] as const;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set — cannot connect to database.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

  try {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );

    const existing = new Set(rows.map((r) => r.table_name));

    let missing = 0;
    let ok = 0;

    for (const table of REQUIRED_TABLES) {
      if (existing.has(table)) {
        ok++;
      } else {
        console.error(`  ❌  Missing table: ${table}`);
        missing++;
      }
    }

    // Informational: tables in DB not in our checklist
    const extra = [...existing].filter(
      (t) => !(REQUIRED_TABLES as readonly string[]).includes(t),
    );
    if (extra.length > 0) {
      console.log(`\n  ℹ️   Extra tables in DB (not in checklist): ${extra.join(", ")}`);
    }

    // Materialized views
    const { rows: views } = await pool.query<{ matviewname: string }>(
      `SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'`,
    );
    if (views.length > 0) {
      console.log(`\n  📊  Materialized views: ${views.map((v) => v.matviewname).join(", ")}`);
    }

    if (missing > 0) {
      console.error(
        `\n❌  FAIL — ${missing} required table(s) missing. Apply pending migrations before deploying.\n` +
          "     See docs/DB_MIGRATIONS.md for the safe migration procedure.",
      );
      process.exit(1);
    }

    console.log(
      `\n✅  DB schema OK — ${ok}/${REQUIRED_TABLES.length} required tables verified.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
