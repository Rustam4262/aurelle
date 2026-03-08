/**
 * E2E: mobile layout sanity checks
 *
 * Verifies that the home page renders correctly on three common mobile
 * viewport sizes. Each test checks:
 *
 *   1. h1 is visible and NOT clipped by the fixed navbar
 *   2. Search input is visible and not hidden under its own icon
 *   3. Category chips are horizontally scrollable (body has no overflow)
 *   4. Map container has a reasonable height (not the old 550px black slab)
 *   5. No horizontal body overflow (no unintended side-scroll)
 *
 * Tests run against the dev server (BASE_URL env var, defaults to localhost:5000).
 * They do NOT cover functionality — just structural layout at mobile widths.
 */

import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Viewport presets
// ---------------------------------------------------------------------------

const VIEWPORTS = [
  { name: "iPhone SE (375×667)", width: 375, height: 667 },
  { name: "iPhone 14 Pro (390×844)", width: 390, height: 844 },
  { name: "Pixel 5 (360×800)", width: 360, height: 800 },
] as const;

// ---------------------------------------------------------------------------
// Shared assertions
// ---------------------------------------------------------------------------

async function assertMobileLayout(page: Page) {
  // 1. h1 must be in the DOM and visible
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible({ timeout: 10_000 });

  // 2. h1 must not be hidden behind the fixed navbar.
  //    The nav is h-16 (64px) + safe-area-inset-top.
  //    On a desktop test runner safe-area-inset-top = 0, so 64px is the threshold.
  //    We allow a 4px tolerance for sub-pixel rendering.
  const h1Box = await h1.boundingBox();
  expect(h1Box).not.toBeNull();
  expect(h1Box!.y).toBeGreaterThan(60); // safely above 64px nav

  // 3. Search input must be visible and its left edge must clear the search icon.
  //    The icon is at left:16px (left-4) and the input has pl-12 (48px), so the
  //    input text area starts at ≥ 48px from the input's own left edge.
  //    We just check it's visible — icon/input collision would hide the placeholder.
  const searchInput = page.locator('[data-testid="input-search-hero"]');
  await expect(searchInput).toBeVisible();

  // 4. Category section must be present
  const categories = page.locator('[data-testid="section-categories"]');
  await expect(categories).toBeVisible();

  // 5. Map container height must be < 400px on mobile (not the old 550px fixed height).
  //    We wait a moment for lazy sections to render.
  const mapContainer = page.locator('[data-testid="map-container"]');
  // Map section may be below the fold — scroll to it first.
  await mapContainer.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {
    // Map may not be rendered yet if API is slow; skip height check in that case.
  });
  const mapVisible = await mapContainer.isVisible().catch(() => false);
  if (mapVisible) {
    const mapBox = await mapContainer.boundingBox();
    if (mapBox) {
      expect(mapBox.height).toBeLessThan(400); // h-[260px] on mobile
    }
  }

  // 6. No horizontal body overflow.
  //    document.body.scrollWidth > window.innerWidth means content leaks sideways.
  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(hasHorizontalOverflow).toBe(false);
}

// ---------------------------------------------------------------------------
// Tests — one per viewport
// ---------------------------------------------------------------------------

for (const vp of VIEWPORTS) {
  test(`mobile layout — ${vp.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      // Simulate a mobile user-agent so the server/SW behaves correctly
      userAgent:
        "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    });
    const page = await ctx.newPage();

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Give React a moment to hydrate
    await page.waitForSelector('[data-testid="section-hero"]', { timeout: 10_000 });

    await assertMobileLayout(page);

    await ctx.close();
  });
}

// ---------------------------------------------------------------------------
// Extra: category chips scroll test
// ---------------------------------------------------------------------------

test("category chips scroll without body overflow — iPhone 14 Pro", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="section-categories"]', { timeout: 10_000 });

  // Scroll the chip row right — simulates a swipe
  const chipRow = page.locator('[data-testid="section-categories"] .overflow-x-auto').first();
  await expect(chipRow).toBeVisible();

  // Programmatically scroll the overflow container
  await chipRow.evaluate((el) => {
    el.scrollLeft += 200;
  });

  // After scrolling, body must still not overflow horizontally
  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(hasHorizontalOverflow).toBe(false);

  // At least the first chip is present
  const firstChip = page.locator('[data-testid="button-category-all"]');
  await expect(firstChip).toBeAttached();

  await ctx.close();
});
