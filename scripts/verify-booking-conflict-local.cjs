const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch();
  try {
    for (const timezoneId of ["Asia/Tashkent", "America/Los_Angeles"]) {
      const context = await browser.newContext({ timezoneId, serviceWorkers: "block" });
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date("2030-10-01T12:00:00Z"));
      let booking;
      let rejected = false;
      const dates = [];
      const service = {
        id: "service",
        name: { ru: "Тестовая услуга", en: "Test", uz: "Test" },
        duration: 30,
        priceMin: 50000,
        audience: "unisex",
        category: "hair",
        isActive: true,
      };
      await page.route("**/api/**", (r) => {
        const url = new URL(r.request().url());
        let json = [];
        if (url.pathname === "/api/auth/user")
          json = { id: "test", role: "client", email: "test@example.invalid" };
        else if (url.pathname === "/api/masters/date-test")
          json = {
            id: "master",
            slug: "date-test",
            name: "Date Test",
            averageRating: "0",
            reviewCount: 0,
            workingHours: [],
            portfolio: [],
          };
        else if (url.pathname === "/api/salons/date-test")
          json = {
            id: "date-test",
            name: { ru: "Date Test", en: "Date Test", uz: "Date Test" },
            description: { ru: "Test" },
            city: "Tashkent",
            averageRating: "0",
            reviewCount: 0,
          };
        else if (url.pathname.endsWith("/services")) json = [service];
        else if (url.pathname.endsWith("/availability")) {
          dates.push(url.searchParams.get("date"));
          json = { available: true, slots: [{ time: "10:00", available: true }] };
        } else if (
          ["/api/bookings", "/api/client/bookings"].includes(url.pathname) &&
          r.request().method() === "POST"
        ) {
          if (!rejected) {
            rejected = true;
            return r.fulfill({
              status: 409,
              json: {
                code: "BOOKING_TIME_UNAVAILABLE",
                error: "Time slot not available",
                message: "Technical error",
              },
            });
          }
          booking = r.request().postDataJSON();
          json = { id: "booking", ...booking };
        }
        return r.fulfill({ json });
      });
      await page.goto("http://127.0.0.1:5000/ru/master/date-test");
      await page
        .getByRole("button", { name: /Записаться/ })
        .first()
        .click();
      await page.getByRole("gridcell", { name: "23", exact: true }).click();
      await page.getByRole("button", { name: "10:00", exact: true }).click();
      await page.getByRole("button", { name: /Подтвердить/ }).click();
      await page.waitForTimeout(300);
      assert.equal(booking, undefined);
      assert.ok(dates.length >= 2, "availability refreshed");
      assert.ok(!(await page.locator("body").innerText()).includes("Technical error"));
      assert.equal(await page.getByRole("button", { name: /Подтвердить/ }).isDisabled(), true);
      await page.getByRole("button", { name: "10:00", exact: true }).click();
      await page.getByRole("button", { name: /Подтвердить/ }).click();
      await page.waitForTimeout(300);
      assert.equal(dates.at(-1), "2030-10-23");
      assert.equal(booking.bookingDate, "2030-10-23");
      console.log("PASS master booking date", timezoneId);
      await page.goto("http://127.0.0.1:5000/ru/salon/date-test");
      await page
        .getByRole("button", { name: /Записаться/ })
        .first()
        .click();
      await page.locator("input[type=date]").fill("2030-10-23");
      await page.locator("input[type=time]").fill("10:00");
      await page.getByRole("button", { name: /Подтвердить/ }).click();
      await page.waitForTimeout(300);
      assert.equal(booking.bookingDate, "2030-10-23");
      assert.equal(booking.salonId, "date-test");
      console.log("PASS salon booking date", timezoneId);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
