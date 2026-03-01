/**
 * CLI: send a test email to verify SMTP config.
 *
 * Usage:
 *   TO_EMAIL=you@example.com tsx scripts/test-email.ts
 *
 * Optional env overrides (loaded from .env automatically via tsx):
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM
 */

import "dotenv/config";
import { getEmailConfigStatus } from "../server/config/email";
import { initializeEmail, verifyTransport, sendEmail } from "../server/email";

async function main() {
  const to = process.env.TO_EMAIL;
  if (!to) {
    console.error("Error: TO_EMAIL env var is required.");
    console.error("Usage: TO_EMAIL=you@example.com tsx scripts/test-email.ts");
    process.exit(1);
  }

  console.log("\n=== AURELLE Email Test ===\n");

  // 1. Config status
  const cfg = getEmailConfigStatus();
  console.log("Config:", JSON.stringify(cfg, null, 2));

  if (!cfg.enabled) {
    console.error("\nEmail is disabled or misconfigured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD.");
    process.exit(1);
  }

  // 2. Initialize transport
  initializeEmail();

  // 3. Verify SMTP connection
  console.log("\nVerifying SMTP connection...");
  const ok = await verifyTransport();
  if (!ok) {
    console.error("SMTP verification FAILED. Check credentials and host/port.");
    process.exit(1);
  }
  console.log("SMTP verification OK.");

  // 4. Send test email
  console.log(`\nSending test email to: ${to}`);
  const sent = await sendEmail(
    to,
    "AURELLE — Test Email",
    `<h2>AURELLE Email Test</h2>
     <p>If you received this, SMTP is configured correctly.</p>
     <p>Sent: ${new Date().toISOString()}</p>
     <p>Host: ${cfg.host}:${cfg.port}</p>`,
  );

  if (sent) {
    console.log("Test email sent successfully!");
  } else {
    console.error("Failed to send test email.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
