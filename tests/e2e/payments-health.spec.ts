import { test, expect } from "@playwright/test";

/**
 * Payment Health API — RBAC / scope enforcement tests.
 *
 * These tests use Playwright's `request` fixture (no browser) to validate
 * the server-side access control and response contract for:
 *   GET /api/payments/health
 *   GET /api/payments/health/timeseries
 *   GET /api/payments/health/recent
 *
 * Tests that require an authenticated session are marked test.skip unless
 * a session cookie is available via the AUTH_COOKIE env variable.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:5000";

// ─── Auth-free: unauthenticated access ────────────────────────────────────────

test("GET /api/payments/health requires authentication", async ({ request }) => {
  const r = await request.get(`${BASE}/api/payments/health`);
  expect(r.status()).toBe(401);
});

test("GET /api/payments/health/timeseries requires authentication", async ({ request }) => {
  const r = await request.get(`${BASE}/api/payments/health/timeseries`);
  expect(r.status()).toBe(401);
});

test("GET /api/payments/health/recent requires authentication", async ({ request }) => {
  const r = await request.get(`${BASE}/api/payments/health/recent`);
  expect(r.status()).toBe(401);
});

// ─── Response contract (requires valid session) ───────────────────────────────

/**
 * These tests require a valid session cookie.
 * Set AUTH_COOKIE=connect.sid=<value> when running against a live environment:
 *
 *   AUTH_COOKIE="connect.sid=s%3A..." npx playwright test tests/e2e/payments-health.spec.ts
 */

const authCookie = process.env.AUTH_COOKIE;

test("health response has expected shape", async ({ request }) => {
  // TODO: inject real session when CI auth fixtures are available
  test.skip(!authCookie, "AUTH_COOKIE env var required");

  const r = await request.get(`${BASE}/api/payments/health`, {
    headers: { Cookie: authCookie! },
  });
  expect(r.ok()).toBeTruthy();

  const body = await r.json();
  expect(body).toHaveProperty("counts");
  expect(body).toHaveProperty("counts.succeeded");
  expect(body).toHaveProperty("counts.failed");
  expect(body).toHaveProperty("counts.pending");
  expect(body).toHaveProperty("gross");
  expect(body).toHaveProperty("successRate");
  expect(body).toHaveProperty("webhookErrors");
  expect(body).toHaveProperty("byProvider");
  expect(body).toHaveProperty("topErrors");
  expect(body).toHaveProperty("enabled");
  expect(typeof body.successRate).toBe("number");
  expect(body.successRate).toBeGreaterThanOrEqual(0);
  expect(body.successRate).toBeLessThanOrEqual(1);
});

test("window=7d returns windowHours=168", async ({ request }) => {
  test.skip(!authCookie, "AUTH_COOKIE env var required");

  const r = await request.get(`${BASE}/api/payments/health?window=7d`, {
    headers: { Cookie: authCookie! },
  });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body.windowHours).toBe(168);
});

test("window=30d returns windowHours=720", async ({ request }) => {
  test.skip(!authCookie, "AUTH_COOKIE env var required");

  const r = await request.get(`${BASE}/api/payments/health?window=30d`, {
    headers: { Cookie: authCookie! },
  });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body.windowHours).toBe(720);
});

test("timeseries response has expected shape", async ({ request }) => {
  test.skip(!authCookie, "AUTH_COOKIE env var required");

  const r = await request.get(`${BASE}/api/payments/health/timeseries?window=24h`, {
    headers: { Cookie: authCookie! },
  });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body).toHaveProperty("timeseries");
  expect(body).toHaveProperty("bucket");
  expect(body).toHaveProperty("windowHours");
  expect(Array.isArray(body.timeseries)).toBeTruthy();
  expect(["hour", "day"]).toContain(body.bucket);
});

test("timeseries 24h uses hour bucket by default", async ({ request }) => {
  test.skip(!authCookie, "AUTH_COOKIE env var required");

  const r = await request.get(`${BASE}/api/payments/health/timeseries?window=24h`, {
    headers: { Cookie: authCookie! },
  });
  const body = await r.json();
  expect(body.bucket).toBe("hour");
});

test("timeseries 7d uses day bucket by default", async ({ request }) => {
  test.skip(!authCookie, "AUTH_COOKIE env var required");

  const r = await request.get(`${BASE}/api/payments/health/timeseries?window=7d`, {
    headers: { Cookie: authCookie! },
  });
  const body = await r.json();
  expect(body.bucket).toBe("day");
});

test("recent response has expected shape", async ({ request }) => {
  test.skip(!authCookie, "AUTH_COOKIE env var required");

  const r = await request.get(`${BASE}/api/payments/health/recent?limit=5`, {
    headers: { Cookie: authCookie! },
  });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body).toHaveProperty("payments");
  expect(Array.isArray(body.payments)).toBeTruthy();
  expect(body.payments.length).toBeLessThanOrEqual(5);
});

// ─── Scope boundary — documented RBAC contracts ───────────────────────────────
// These document the expected RBAC behavior. Full verification requires seeded
// test users per role. Mark as skip for now and implement when auth fixtures exist.

test.skip("admin scope: byProvider is present and salonIds is null", async () => {
  // Contract: admin receives platform-wide data with no salonId filter
  // byProvider contains entries for all payment providers
  // salonIds === null (no scope restriction)
});

test.skip("owner scope: only owner salon payments returned", async () => {
  // Contract: owner only sees payments where salonId ∈ owner's salon IDs
  // ?salonId= filter is validated — other salon IDs are rejected (returns empty, not 403)
});

test.skip("master scope: only master payments returned", async () => {
  // Contract: master only sees payments where masterId === their master record ID
});

test.skip("client scope: only client payments returned", async () => {
  // Contract: client only sees payments where clientId === their user ID
});
