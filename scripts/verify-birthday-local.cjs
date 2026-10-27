const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch();
  try {
    for (const timezoneId of ["Asia/Tashkent", "America/Los_Angeles"]) {
      const c = await b.newContext({
        serviceWorkers: "block",
        timezoneId,
        viewport: { width: 1100, height: 900 },
      });
      const p = await c.newPage();
      let profile = {
        id: "test",
        userId: "test",
        fullName: "Calendar Test",
        birthday: "2000-02-29",
        gender: "other",
        role: "client",
      };
      await p.route("**/api/**", (r) => {
        const path = new URL(r.request().url()).pathname;
        if (path === "/api/auth/user")
          return r.fulfill({
            json: { id: "test", role: "client", email: "calendar@example.invalid" },
          });
        if (path === "/api/client/profile") {
          if (r.request().method() === "PUT")
            profile = { ...profile, ...r.request().postDataJSON() };
          return r.fulfill({ json: profile });
        }
        return r.fulfill({ json: [] });
      });
      await p.goto("http://127.0.0.1:5000/client");
      await p.getByRole("tab", { name: "Редактировать профиль" }).click();
      await p.getByText("29.02.2000", { exact: true }).click();
      const month = p.locator('select[name="months"]');
      const year = p.locator('select[name="years"]');
      console.log("month labels", await month.locator("option").allTextContents());
      assert.equal(await year.inputValue(), "2000");
      await year.selectOption("1995");
      await month.selectOption("4");
      await p.getByRole("gridcell", { name: "15", exact: true }).click();
      await p.keyboard.press("Escape");
      await p.getByTestId("button-save-profile").click();
      await p.waitForTimeout(300);
      assert.equal(profile.birthday, "1995-05-15");
      await p.getByText("15.05.1995", { exact: true }).click();
      await p.waitForTimeout(500);
      await p.screenshot({ path: "reports/birthday-" + timezoneId.replace("/", "-") + ".png" });
      await p.evaluate(() => document.documentElement.classList.add("dark"));
      await p.keyboard.press('Escape');await p.setViewportSize({ width: 390, height: 844 });await p.getByText('15.05.1995',{exact:true}).click();
      await p.waitForTimeout(500);
      await p.screenshot({
        path: "reports/birthday-mobile-" + timezoneId.replace("/", "-") + ".png",
      });
      console.log("PASS birthday in", timezoneId);
      await c.close();
    }
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

