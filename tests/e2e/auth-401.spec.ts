/**
 * Regression test: /auth page must render the login form when
 * GET /api/auth/user returns 401 (unauthenticated user).
 *
 * Before the fix, a ChunkLoadError (stale cache after deploy) would trigger
 * the ErrorBoundary and show "Что-то пошло не так" instead of the login form.
 * fetchUser also wasn't defensive against non-401 server errors.
 */

import { test, expect } from "@playwright/test";

test.describe("Auth page — 401 regression", () => {
  test("shows login form when /api/auth/user returns 401", async ({ page }) => {
    // Intercept the auth endpoint and force-return 401
    await page.route("**/api/auth/user", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Not authenticated" }),
      });
    });

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Login form must be visible
    const emailInput = page.locator('[data-testid="input-email"]');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    // Error boundary must NOT appear
    const errorHeading = page.getByText("Что-то пошло не так", { exact: false });
    await expect(errorHeading).toHaveCount(0);

    // No React errors
    const reactErrors = consoleErrors.filter(
      (e) => e.includes("React") || e.includes("Minified React error"),
    );
    expect(reactErrors, "No React errors in console").toHaveLength(0);
  });

  test("shows login form when /api/auth/user returns 500", async ({ page }) => {
    // Simulate a transient server error — page should still render login form
    await page.route("**/api/auth/user", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal server error" }),
      });
    });

    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('[data-testid="input-email"]');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    const errorHeading = page.getByText("Что-то пошло не так", { exact: false });
    await expect(errorHeading).toHaveCount(0);
  });

  test("shows login form when /api/auth/user network fails", async ({ page }) => {
    // Simulate total network failure
    await page.route("**/api/auth/user", (route) => {
      route.abort("failed");
    });

    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('[data-testid="input-email"]');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    const errorHeading = page.getByText("Что-то пошло не так", { exact: false });
    await expect(errorHeading).toHaveCount(0);
  });
});
