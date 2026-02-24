import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Smoke Tests — AURELLE
 *
 * Установка:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *
 * Запуск:
 *   npx playwright test                    # все тесты
 *   npx playwright test --reporter=list    # подробный вывод
 *   BASE_URL=https://aurelle.uz npx playwright test  # против прода
 */

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5000",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
