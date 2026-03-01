/**
 * Unified email configuration module.
 *
 * Single source of truth for all email settings.
 * All other modules must import from here — never read process.env directly.
 *
 * Design rules:
 *  - enabled = EMAIL_ENABLED !== "false" AND all required fields present
 *  - If EMAIL_ENABLED="true" but fields missing → enabled=false, reason logged
 *  - Password/secrets never returned by getPublicStatus()
 */

export interface EmailConfig {
  enabled: boolean;
  provider: "smtp";
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  user: string;
  /** Internal only — never expose in HTTP responses */
  password: string;
  from: string;
  appUrl: string;
}

export interface EmailConfigStatus {
  enabled: boolean;
  ok: boolean;
  /** Human-readable reason when disabled */
  reason: string | null;
  provider: "smtp";
  /** Masked: only hostname, no credentials */
  host: string | null;
  port: number | null;
  from: string | null;
}

interface ParseResult {
  config: EmailConfig | null;
  reason: string | null;
}

function parseConfig(): ParseResult {
  // EMAIL_ENABLED defaults to true so existing deployments don't break.
  // Set EMAIL_ENABLED=false to explicitly disable.
  const rawEnabled = process.env.EMAIL_ENABLED;
  if (rawEnabled === "false") {
    return { config: null, reason: "EMAIL_ENABLED=false" };
  }

  const missing: string[] = [];
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASSWORD;

  if (!host) missing.push("EMAIL_HOST");
  if (!user) missing.push("EMAIL_USER");
  if (!password) missing.push("EMAIL_PASSWORD");

  if (missing.length > 0) {
    return {
      config: null,
      reason: `Missing required env vars: ${missing.join(", ")}`,
    };
  }

  const portRaw = process.env.EMAIL_PORT || "587";
  const port = parseInt(portRaw, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return { config: null, reason: `Invalid EMAIL_PORT: "${portRaw}"` };
  }

  const secureRaw = process.env.EMAIL_SECURE;
  const secure = secureRaw === "true" || port === 465;
  const requireTLS = process.env.EMAIL_REQUIRE_TLS !== "false";
  const from = process.env.EMAIL_FROM || `AURELLE <noreply@aurelle.uz>`;
  const appUrl = process.env.APP_URL || "https://aurelle.uz";

  return {
    config: {
      enabled: true,
      provider: "smtp",
      host: host!,
      port,
      secure,
      requireTLS,
      user: user!,
      password: password!,
      from,
      appUrl,
    },
    reason: null,
  };
}

/** Cached at module load — env vars don't change at runtime. */
const _result = parseConfig();

/**
 * Returns the validated email config, or null if disabled/misconfigured.
 * Internal use only (includes password).
 */
export function getEmailConfig(): EmailConfig | null {
  return _result.config;
}

/**
 * Returns public-safe status for health checks and logging.
 * Never includes password or full credentials.
 */
export function getEmailConfigStatus(): EmailConfigStatus {
  const cfg = _result.config;
  if (!cfg) {
    return {
      enabled: false,
      ok: false,
      reason: _result.reason,
      provider: "smtp",
      host: null,
      port: null,
      from: null,
    };
  }
  return {
    enabled: true,
    ok: true,
    reason: null,
    provider: "smtp",
    host: cfg.host,
    port: cfg.port,
    from: cfg.from,
  };
}
