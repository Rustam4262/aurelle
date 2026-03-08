/**
 * E2E: mobile layout sanity checks
 *
 * Verifies that the home page renders correctly across a wide range of mobile
 * and tablet/desktop viewport sizes. Each test checks:
 *
 *   1. h1 is visible and NOT clipped by the fixed navbar
 *   2. h1 line-height/font-size ratio is ≥ 1.35 (guards against leading-tight
 *      regression that caused Cyrillic lines to overlap in Cormorant Garamond)
 *   3. h1 bottom edge does not exceed the hero section bottom edge
 *   4. Search input is visible (not hidden under its icon)
 *   5. Map container has a reasonable height on mobile (≤ 400px)
 *   6. No horizontal body overflow
 *
 * === Root-cause context ===
 * Cormorant Garamond has very tall ascenders/descenders (~1.65em visual line
 * height). With leading-tight (1.25) the lines had −0.4em clearance and Cyrillic
 * characters physically overlapped.  iPhone XR (414px) happened to wrap the
 * Russian title in exactly 2 lines; narrower viewports produced 3-line stacks
 * where the overlap was obvious.  The fix is leading-[1.4] on mobile.
 * Test #2 below will catch any future reintroduction of that bug.
 */

import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Viewport matrix
// ---------------------------------------------------------------------------

const MOBILE_VIEWPORTS = [
  // Narrow / Galaxy Z Fold folded
  { name: "Galaxy Z Fold 5 folded (344×882)", width: 344, height: 882 },
  // Small Android
  { name: "Galaxy S8+ (360×740)", width: 360, height: 740 },
  // iPhone SE / 12
  { name: "iPhone SE (375×667)", width: 375, height: 667 },
  { name: "iPhone 12 Pro (390×844)", width: 390, height: 844 },
  // Medium Android
  { name: "Galaxy S20 Ultra (412×915)", width: 412, height: 915 },
  // iPhone XR / plus sizes
  { name: "iPhone XR (414×896)", width: 414, height: 896 },
  { name: "iPhone 14 Pro Max (430×932)", width: 430, height: 932 },
] as const;

const TABLET_VIEWPORTS = [
  { name: "iPad Mini (768×1024)", width: 768, height: 1024 },
  { name: "iPad Air (820×1180)", width: 820, height: 1180 },
  { name: "iPad Pro (1024×1366)", width: 1024, height: 1366 },
] as const;

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

/**
 * Assert the hero layout is structurally sound on the given page.
 * isMobile controls whether the map-height check runs.
 */
async function assertHeroLayout(page: Page, { isMobile }: { isMobile: boolean }) {
  await page.waitForSelector('[data-testid="section-hero"]', { timeout: 10_000 });

  // ── 1. h1 visible and above nav ────────────────────────────────────────
  const h1 = page.locator('[data-testid="hero-title"]');
  await expect(h1).toBeVisible({ timeout: 8_000 });

  const h1Box = await h1.boundingBox();
  expect(h1Box).not.toBeNull();
  // Nav is h-16 (64px).  h1 top must be below it.  Allow 4px sub-pixel tolerance.
  expect(h1Box!.y).toBeGreaterThan(60);

  // ── 2. Line-height regression guard ────────────────────────────────────
  // leading-tight (1.25) on Cormorant Garamond Cyrillic causes line overlap.
  // The fixed value is leading-[1.4] (mobile) / leading-snug (sm+).
  // Minimum acceptable ratio is 1.35 — anything lower reintroduces the bug.
  const { lineHeight, fontSize } = await h1.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      lineHeight: parseFloat(cs.lineHeight),
      fontSize: parseFloat(cs.fontSize),
    };
  });
  // lineHeight may be "normal" (browser default ~1.2) if CSS fails to apply.
  // If fontSize is 0 something is very wrong — both assertions below will catch it.
  expect(fontSize).toBeGreaterThan(0);
  const ratio = lineHeight / fontSize;
  expect(ratio).toBeGreaterThanOrEqual(1.35); // 1.4 for mobile, 1.375 for sm+

  // ── 3. h1 must not overflow the hero section ────────────────────────────
  const heroBox = await page.locator('[data-testid="section-hero"]').boundingBox();
  if (heroBox) {
    const h1Bottom = h1Box!.y + h1Box!.height;
    const heroBottom = heroBox.y + heroBox.height;
    expect(h1Bottom).toBeLessThanOrEqual(heroBottom + 4); // 4px sub-pixel tolerance
  }

  // ── 4. Search input visible ─────────────────────────────────────────────
  const searchInput = page.locator('[data-testid="input-search-hero"]');
  await expect(searchInput).toBeVisible();

  // ── 5. Map height reasonable on mobile ─────────────────────────────────
  if (isMobile) {
    const mapContainer = page.locator('[data-testid="map-container"]');
    await mapContainer.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
    const mapVisible = await mapContainer.isVisible().catch(() => false);
    if (mapVisible) {
      const mapBox = await mapContainer.boundingBox();
      if (mapBox) {
        expect(mapBox.height).toBeLessThan(400); // h-[260px] on mobile
      }
    }
  }

  // ── 6. No horizontal body overflow ─────────────────────────────────────
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
}

// ---------------------------------------------------------------------------
// Mobile tests
// ---------------------------------------------------------------------------

for (const vp of MOBILE_VIEWPORTS) {
  test(`mobile layout — ${vp.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    });
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHeroLayout(page, { isMobile: true });
    await ctx.close();
  });
}

// ---------------------------------------------------------------------------
// Tablet / desktop tests
// ---------------------------------------------------------------------------

for (const vp of TABLET_VIEWPORTS) {
  test(`tablet layout — ${vp.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHeroLayout(page, { isMobile: false });
    await ctx.close();
  });
}

// ---------------------------------------------------------------------------
// Category chips horizontal scroll (iPhone 14 Pro Max — widest common phone)
// ---------------------------------------------------------------------------

test("category chips scroll without body overflow — iPhone 14 Pro Max", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="section-categories"]', { timeout: 10_000 });

  const chipRow = page.locator('[data-testid="section-categories"] .overflow-x-auto').first();
  await expect(chipRow).toBeVisible();

  await chipRow.evaluate((el) => {
    el.scrollLeft += 200;
  });

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await expect(page.locator('[data-testid="button-category-all"]')).toBeAttached();
  await ctx.close();
});
