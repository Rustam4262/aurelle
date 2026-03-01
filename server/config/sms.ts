/**
 * Unified SMS configuration module.
 *
 * Single source of truth for all Twilio/SMS settings.
 * All other modules must import from here — never read process.env directly.
 *
 * Design rules:
 *  - enabled = SMS_ENABLED !== "false" AND all required fields present
 *  - If SMS_ENABLED="true" but fields missing → enabled=false, reason logged
 *  - Auth token never returned by getSmsConfigStatus()
 */

export interface SmsConfig {
  enabled: boolean;
  provider: "twilio";
  accountSid: string;
  /** Internal only — never expose in HTTP responses */
  authToken: string;
  fromNumber: string;
}

export interface SmsConfigStatus {
  enabled: boolean;
  ok: boolean;
  /** Human-readable reason when disabled */
  reason: string | null;
  provider: "twilio";
  /** Masked sender number — no credentials */
  fromNumber: string | null;
}

interface ParseResult {
  config: SmsConfig | null;
  reason: string | null;
}

function parseConfig(): ParseResult {
  const rawEnabled = process.env.SMS_ENABLED;
  if (rawEnabled === "false") {
    return { config: null, reason: "SMS_ENABLED=false" };
  }

  const missing: string[] = [];
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM;

  if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!authToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!fromNumber) missing.push("TWILIO_FROM");

  if (missing.length > 0) {
    return {
      config: null,
      reason: `Missing required env vars: ${missing.join(", ")}`,
    };
  }

  return {
    config: {
      enabled: true,
      provider: "twilio",
      accountSid: accountSid!,
      authToken: authToken!,
      fromNumber: fromNumber!,
    },
    reason: null,
  };
}

/** Cached at module load — env vars don't change at runtime. */
const _result = parseConfig();

/**
 * Returns the validated SMS config, or null if disabled/misconfigured.
 * Internal use only (includes auth token).
 */
export function getSmsConfig(): SmsConfig | null {
  return _result.config;
}

/**
 * Returns public-safe status for health checks and logging.
 * Never includes auth token or full credentials.
 */
export function getSmsConfigStatus(): SmsConfigStatus {
  const cfg = _result.config;
  if (!cfg) {
    return {
      enabled: false,
      ok: false,
      reason: _result.reason,
      provider: "twilio",
      fromNumber: null,
    };
  }
  return {
    enabled: true,
    ok: true,
    reason: null,
    provider: "twilio",
    fromNumber: cfg.fromNumber,
  };
}
