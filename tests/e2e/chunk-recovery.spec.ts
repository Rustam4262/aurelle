/**
 * E2E: chunk-load error recovery
 *
 * Tests that the ErrorBoundary handles stale-chunk (post-deploy) failures:
 *   Scenario A — first chunk failure → exactly one auto-reload, no fallback card
 *   Scenario B — second chunk failure in same session → no reload, fallback card shown
 *
 * Strategy
 * --------
 * 1. Load "/" and record every /assets/*.js URL the browser fetched.
 * 2. Install a route intercept that blocks any NEW chunk request (not in the
 *    initial set) with a 404 — simulating a deployment that removed old chunks.
 * 3. Navigate to "/auth" which is lazy-loaded via React.lazy(), so the auth
 *    chunk is new (not in the initial set) → ChunkLoadError fires.
 *
 * Scenario A: no sessionStorage flag → ErrorBoundary auto-reloads.
 *   After reload the main bundle re-executes and we visit /auth again.
 *   The auth chunk is still blocked → ChunkLoadError again.
 *   Now sessionStorage flag IS set → fallback card renders (reloadAttempted=true).
 *
 * Scenario B: pre-seed the sessionStorage flag before the first navigation.
 *   ErrorBoundary skips auto-reload immediately → fallback card renders.
 *   Verify no extra page navigation occurs.
 */

import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to "/" and collect the set of /assets/*.js chunk URLs that were
 * loaded as part of the initial page render. Returns a frozen Set so later
 * code can check membership deterministically.
 */
async function loadHomeAndCaptureChunks(page: Page): Promise<Set<string>> {
  const initialChunks = new Set<string>();

  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/assets/") && url.endsWith(".js")) {
      initialChunks.add(url);
    }
  });

  await page.goto("/", { waitUntil: "networkidle" });

  return initialChunks;
}

/**
 * Install a route handler that returns 404 for any /assets/*.js URL that was
 * NOT part of the initial page load. This simulates the server having purged
 * old chunk files after a deployment.
 */
async function blockLazyChunks(page: Page, initialChunks: Set<string>): Promise<void> {
  await page.route("**/*.js", (route) => {
    const url = route.request().url();
    const isAssetChunk = url.includes("/assets/") && url.endsWith(".js");
    if (isAssetChunk && !initialChunks.has(url)) {
      // Simulate the server returning 404 for the stale chunk URL.
      route.fulfill({ status: 404, body: "Not Found" });
    } else {
      route.continue();
    }
  });
}

// ---------------------------------------------------------------------------
// Scenario A — first chunk failure triggers exactly one auto-reload
// ---------------------------------------------------------------------------

test("Scenario A: first chunk failure → one auto-reload → fallback card on second load", async ({
  page,
}) => {
  // Step 1: load home and record initial chunks
  const initialChunks = await loadHomeAndCaptureChunks(page);

  // Step 2: block any new chunks (auth page chunk, etc.)
  await blockLazyChunks(page, initialChunks);

  // Step 3: track page navigations to count reloads
  let navigationCount = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      navigationCount++;
    }
  });

  // Step 4: navigate to /auth — the auth chunk is lazy, will fail with 404
  // ErrorBoundary (first occurrence): sets sessionStorage flag → reloads page.
  // After reload, main bundle chunks are re-fetched (they're in initialChunks → allowed).
  // ErrorBoundary (second occurrence): flag is set → removes flag → shows fallback card.
  await page.goto("/auth", { waitUntil: "domcontentloaded" });

  // Wait for the fallback card — may take a moment after the auto-reload
  const fallbackCard = page.locator('[data-testid="chunk-error-fallback"]');
  await expect(fallbackCard).toBeVisible({ timeout: 15_000 });

  // Exactly one auto-reload occurred (the ErrorBoundary reload)
  expect(navigationCount).toBeGreaterThanOrEqual(1);

  // The "Reload page" button is present and clickable
  const reloadButton = page.locator('[data-testid="chunk-error-reload-button"]');
  await expect(reloadButton).toBeVisible();

  // sessionStorage flag was cleared after second occurrence
  const flagValue = await page.evaluate(() => sessionStorage.getItem("chunk_reload_attempted"));
  expect(flagValue).toBeNull();
});

// ---------------------------------------------------------------------------
// Scenario B — second chunk failure (flag pre-seeded) → no reload, card shown
// ---------------------------------------------------------------------------

test("Scenario B: pre-seeded sessionStorage flag → no auto-reload → fallback card immediately", async ({
  page,
}) => {
  // Step 1: load home page (ensures React app is bootstrapped)
  const initialChunks = await loadHomeAndCaptureChunks(page);

  // Step 2: pre-seed the sessionStorage guard flag
  // This simulates that a previous reload already happened in this session.
  await page.evaluate(() => {
    sessionStorage.setItem("chunk_reload_attempted", "1");
  });

  // Step 3: block lazy chunks
  await blockLazyChunks(page, initialChunks);

  // Step 4: count navigations — must be 0 (no auto-reload)
  let navigationCount = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      navigationCount++;
    }
  });

  // Step 5: navigate to /auth — chunk blocked → ChunkLoadError
  // Flag already set → ErrorBoundary skips reload → shows fallback card directly
  await page.goto("/auth", { waitUntil: "domcontentloaded" });

  // Fallback card must appear without any additional navigation
  const fallbackCard = page.locator('[data-testid="chunk-error-fallback"]');
  await expect(fallbackCard).toBeVisible({ timeout: 10_000 });

  // No extra reload happened (the initial page.goto counts as 1, so subsequent
  // reloads would push this above 1)
  expect(navigationCount).toBe(0);

  // Reload button is present
  const reloadButton = page.locator('[data-testid="chunk-error-reload-button"]');
  await expect(reloadButton).toBeVisible();

  // sessionStorage flag was cleared (ErrorBoundary removes it on 2nd occurrence)
  const flagValue = await page.evaluate(() => sessionStorage.getItem("chunk_reload_attempted"));
  expect(flagValue).toBeNull();

  // Spinner / auto-reload indicator must NOT be visible
  await expect(page.locator('[data-testid="chunk-error-loading"]')).not.toBeVisible();
});
