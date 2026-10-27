import "dotenv/config";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import router from "../server/routes/publicMaster.routes";
import { db } from "../server/db";
import { masters, reviews, portfolioItems, masterPortfolio } from "../shared/schema";
const photo =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="pink"/></svg>',
  );
const current = {
  id: "current",
  masterId: "test",
  imageUrl: photo,
  description: { ru: "Новая работа" },
};
const legacy = {
  id: "legacy",
  masterId: "test",
  imageUrl: photo + "#legacy",
  description: { ru: "Старая работа" },
};
const originalSelect = db.select;
let result: any;
try {
  (db as any).select = () => ({
    from(table: any) {
      const rows =
        table === masters
          ? [{ id: "test", slug: "test", name: "Test", status: "active" }]
          : table === reviews
            ? [{ avgRating: "0", reviewCount: 0 }]
            : table === portfolioItems
              ? [current]
              : table === masterPortfolio
                ? [{ ...current, id: "duplicate" }, legacy]
                : [];
      const chain: any = {
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
      };
      return chain;
    },
  });
  const route = (router as any).stack.find((r: any) => r.route?.path === "/:slug");
  await route.route.stack[0].handle(
    { params: { slug: "test" } },
    {
      json: (data: any) => {
        result = data;
      },
      status: (code: number) => {
        throw new Error(String(code));
      },
    },
  );
  assert.deepEqual(
    result.portfolio.map((p: any) => p.id),
    ["current", "legacy"],
  );
} finally {
  db.select = originalSelect;
}
const browser = await chromium.launch();
try {
  for (const authenticated of [false, true]) {
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.route("**/api/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      if (path === "/api/auth/user")
        return r.fulfill(
          authenticated ? { json: { id: "client", role: "client" } } : { status: 401, json: {} },
        );
      return r.fulfill({ json: path === "/api/masters/test" ? result : [] });
    });
    await page.goto("http://127.0.0.1:5000/ru/master/test");
    await page.getByRole("tab", { name: /Портфолио/ }).click();
    const imgs = page.getByRole("tabpanel").locator("img");
    assert.equal(await imgs.count(), 2);
    await imgs.first().waitFor();
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("[role=tabpanel] img")).every(
        (i: any) => i.complete && i.naturalWidth > 0,
      ),
    );
    console.log(
      "PASS actual public route merge + visible portfolio",
      authenticated ? "client" : "guest",
    );
    await context.close();
  }
} finally {
  await browser.close();
}
process.exit(0);
