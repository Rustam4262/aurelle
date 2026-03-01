/**
 * CLI: send a test SMS to verify Twilio config.
 *
 * Usage:
 *   TO_PHONE=+998XXXXXXXXX tsx scripts/test-sms.ts
 *
 * Env vars loaded from .env automatically via dotenv/config.
 */

import "dotenv/config";
import { getSmsConfigStatus } from "../server/config/sms";
import { sendBookingCreatedSms } from "../server/sms";

async function main() {
  const to = process.env.TO_PHONE;
  if (!to) {
    console.error("Error: TO_PHONE env var is required.");
    console.error("Usage: TO_PHONE=+998XXXXXXXXX tsx scripts/test-sms.ts");
    process.exit(1);
  }

  console.log("\n=== AURELLE SMS Test ===\n");

  const cfg = getSmsConfigStatus();
  console.log("Config:", JSON.stringify(cfg, null, 2));

  if (!cfg.enabled) {
    console.error("\nSMS is disabled or misconfigured.");
    console.error("Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM in .env");
    process.exit(2);
  }

  console.log(`\nSending test SMS to: ${to.slice(0, 4)}***${to.slice(-4)}`);

  const sent = await sendBookingCreatedSms(
    to,
    "Test",
    "Test Service",
    new Date().toLocaleDateString("ru-RU"),
    new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    "ru",
  );

  if (sent) {
    console.log("Test SMS sent successfully!");
  } else {
    console.error("Failed to send test SMS. Check PM2 logs for details.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
