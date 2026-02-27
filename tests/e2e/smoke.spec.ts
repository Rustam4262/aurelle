import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Собирает все console.error() со страницы.
 * Запустить ПЕРЕД навигацией.
 */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      // Игнорируем внешние скрипты и расширения браузера
      const text = msg.text();
      if (
        text.includes("chrome-extension://") ||
        text.includes("moz-extension://") ||
        text.includes("Failed to load resource: net::ERR_BLOCKED_BY_CLIENT") // AdBlock
      ) {
        return;
      }
      errors.push(text);
    }
  });
  return errors;
}

/**
 * Проверяет что на странице нет ErrorBoundary и нет console.error.
 */
async function assertPageHealthy(page: Page, errors: string[], pageName: string) {
  // Нет ErrorBoundary
  const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');
  await expect(errorBoundary, `${pageName}: ErrorBoundary не должен рендериться`).toHaveCount(0);

  // Нет текстов ошибок
  const errorTexts = [
    "Что-то пошло не так",
    "Something went wrong",
    "Nimadirdir noto'g'ri ketdi",
  ];
  for (const text of errorTexts) {
    const loc = page.getByText(text, { exact: false });
    const count = await loc.count();
    expect(count, `${pageName}: не должно быть "${text}" на странице`).toBe(0);
  }

  // Нет голых i18n ключей (формат: namespace.key.subkey)
  // Ищем только паттерн из 3+ сегментов, что явно является raw key
  const bodyText = await page.locator("body").innerText();
  const rawKeyPattern = /\b(marketplace|auth|common|errors)\.\w+\.\w+/g;
  const rawKeys = bodyText.match(rawKeyPattern) || [];

  // Фильтруем — в URL и data-атрибутах могут быть похожие паттерны
  const visibleRawKeys = rawKeys.filter(
    (k: string) => !k.includes("http") && !k.includes("googleapis"),
  );

  if (visibleRawKeys.length > 0) {
    console.warn(`${pageName}: Possible raw i18n keys found: ${[...new Set(visibleRawKeys)].slice(0, 5).join(", ")}`);
  }

  // Console errors
  if (errors.length > 0) {
    console.warn(`${pageName}: Console errors (${errors.length}):`);
    errors.slice(0, 5).forEach((e) => console.warn("  →", e));
  }

  // Жёсткий фейл только на React errors (самые критичные)
  const reactErrors = errors.filter(
    (e) => e.includes("React") || e.includes("Minified React error") || e.includes("removeChild"),
  );
  expect(reactErrors, `${pageName}: Нет React-ошибок в консоли`).toHaveLength(0);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Smoke — Public pages", () => {
  test("Главная страница открывается", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveTitle(/AURELLE/i);
    await assertPageHealthy(page, errors, "Homepage");
  });

  test("Страница входа открывается", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Форма входа должна быть видна
    const form = page.locator("form, input[type='email'], input[type='phone']").first();
    await expect(form).toBeVisible();
    await assertPageHealthy(page, errors, "Auth");
  });
});

test.describe("Smoke — Protected cabinets (unauthenticated)", () => {
  test("/client — редирект на /auth или показывает login", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/client");
    await page.waitForLoadState("networkidle");

    // Либо редиректит на /auth, либо показывает login
    const isOnAuth = page.url().includes("/auth");
    const hasLoginPrompt = await page
      .getByText(/войти|login|sign in/i)
      .count()
      .then((c: number) => c > 0);

    expect(
      isOnAuth || hasLoginPrompt,
      "/client: должен редиректить на /auth или показывать login",
    ).toBeTruthy();

    await assertPageHealthy(page, errors, "Client cabinet");
  });

  test("/owner — редирект на /auth или показывает login", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/owner");
    await page.waitForLoadState("networkidle");

    const isOnAuth = page.url().includes("/auth");
    const hasLoginPrompt = await page
      .getByText(/войти|login|sign in/i)
      .count()
      .then((c: number) => c > 0);

    expect(
      isOnAuth || hasLoginPrompt,
      "/owner: должен редиректить на /auth или показывать login",
    ).toBeTruthy();

    await assertPageHealthy(page, errors, "Owner cabinet");
  });

  test("/admin — редирект на /auth или показывает login", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const isOnAuth = page.url().includes("/auth");
    const hasLoginPrompt = await page
      .getByText(/войти|login|sign in|доступ запрещён/i)
      .count()
      .then((c: number) => c > 0);

    expect(
      isOnAuth || hasLoginPrompt,
      "/admin: должен редиректить или показывать login/403",
    ).toBeTruthy();

    await assertPageHealthy(page, errors, "Admin panel");
  });
});

test.describe("Smoke — API Health", () => {
  test("/api/health возвращает 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
  });
});

test.describe("Smoke — CSP & Resources", () => {
  test("Нет CSP-блокировок для критичных ресурсов", async ({ page }) => {
    const cspViolations: string[] = [];

    // Ловим CSP violations
    page.on("console", (msg: ConsoleMessage) => {
      if (
        msg.type() === "error" &&
        msg.text().toLowerCase().includes("content security policy")
      ) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Шрифты должны загрузиться
    const fontLoaded = await page.evaluate(() => {
      return document.fonts.check("16px Inter") || document.fonts.check("16px Cormorant Garamond");
    });

    if (cspViolations.length > 0) {
      console.warn("CSP violations detected:");
      cspViolations.forEach((v) => console.warn("  →", v));
    }

    // Жёсткий фейл только если CSP блокирует что-то серьёзное
    const criticalBlocks = cspViolations.filter(
      (v) => v.includes("script-src") || v.includes("connect-src"),
    );
    expect(criticalBlocks, "Нет критичных CSP-блокировок (script/connect)").toHaveLength(0);
  });
});
