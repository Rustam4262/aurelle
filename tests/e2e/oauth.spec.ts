import { test, expect } from "@playwright/test";

/**
 * OAuth API tests — AURELLE
 *
 * Tests the Google and Yandex OAuth start/callback endpoints using the
 * Playwright `request` fixture (no browser required).
 *
 * Run against local server:
 *   npx playwright test tests/e2e/oauth.spec.ts
 *
 * Run against production:
 *   BASE_URL=https://aurelle.uz npx playwright test tests/e2e/oauth.spec.ts
 */

const BASE = process.env.BASE_URL ?? "http://localhost:5000";

// ─── Start route redirects ─────────────────────────────────────────────────

test("GET /api/auth/google redirects (302)", async ({ request }) => {
  const r = await request.get(`${BASE}/api/auth/google`, { maxRedirects: 0 });
  // 302 to Google OAuth page if configured; may be 404 if credentials missing
  expect([301, 302, 404]).toContain(r.status());
  if (r.status() === 302) {
    const loc = r.headers()["location"] ?? "";
    // Should redirect to Google or back to /auth (if strategy fails)
    expect(loc.length).toBeGreaterThan(0);
  }
});

test("GET /api/auth/yandex redirects (302)", async ({ request }) => {
  const r = await request.get(`${BASE}/api/auth/yandex`, { maxRedirects: 0 });
  expect([301, 302, 404]).toContain(r.status());
  if (r.status() === 302) {
    const loc = r.headers()["location"] ?? "";
    expect(loc.length).toBeGreaterThan(0);
  }
});

// ─── Callback error handling ───────────────────────────────────────────────

test("Google callback with error param redirects to /auth?error=google_auth_failed", async ({
  request,
}) => {
  const r = await request.get(`${BASE}/api/auth/google/callback?error=access_denied`, {
    maxRedirects: 0,
  });
  expect(r.status()).toBe(302);
  const loc = r.headers()["location"] ?? "";
  expect(loc).toContain("error=google_auth_failed");
});

test("Yandex callback with error param redirects to /auth?error=yandex_auth_failed", async ({
  request,
}) => {
  const r = await request.get(`${BASE}/api/auth/yandex/callback?error=access_denied`, {
    maxRedirects: 0,
  });
  expect(r.status()).toBe(302);
  const loc = r.headers()["location"] ?? "";
  expect(loc).toContain("error=yandex_auth_failed");
});

// ─── Redirect allowlist enforcement ───────────────────────────────────────

test("invalid redirect param //evil.com is not forwarded in Location", async ({ request }) => {
  // isAllowedRedirect() rejects paths that start with // or contain ://
  const r = await request.get(`${BASE}/api/auth/google?redirect=//evil.com`, {
    maxRedirects: 0,
  });
  const loc = r.headers()["location"] ?? "";
  expect(loc).not.toContain("evil.com");
});

test("invalid redirect with protocol is rejected", async ({ request }) => {
  const r = await request.get(
    `${BASE}/api/auth/google?redirect=https://evil.com`,
    { maxRedirects: 0 },
  );
  const loc = r.headers()["location"] ?? "";
  expect(loc).not.toContain("evil.com");
});

// ─── OAuth rate limiting ───────────────────────────────────────────────────

test("OAuth rate limit: 21 rapid requests to /api/auth/google → 429", async ({ request }) => {
  // oauthLimiter: max 20 per 15 minutes per IP
  let got429 = false;
  for (let i = 0; i < 21; i++) {
    const r = await request.get(`${BASE}/api/auth/google`, { maxRedirects: 0 });
    if (r.status() === 429) {
      got429 = true;
      break;
    }
  }
  expect(got429).toBe(true);
});

// ─── Scope contracts (documented, require real auth fixtures) ─────────────

test.skip("email-linked account: signing in with Google after email registration uses same userId", async () => {
  // Contract: if email X registered via local auth, then user signs in via Google with email X,
  // the session sub should be the original local user's ID (not google:{id})
  // Requires seeded test users — implement when auth fixtures exist.
});

test.skip("role param is preserved through OAuth callback to /auth?role=", async () => {
  // Contract: GET /api/auth/google?role=owner → after callback → redirect to /auth?role=owner
  // Requires real Google OAuth completion — implement in integration environment.
});
