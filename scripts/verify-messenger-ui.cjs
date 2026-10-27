const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch();
  try {
    async function context(user, width) {
      const ctx = await b.newContext({ serviceWorkers: "block", viewport: { width, height: 844 } });
      await ctx.addCookies([
        { name: "testUser", value: user, url: "http://127.0.0.1:55440" },
        { name: "csrf-token", value: "test", url: "http://127.0.0.1:55440" },
      ]);
      return ctx;
    }
    const ca = await context("alice", 390),
      cb = await context("bob", 1280);
    const a = await ca.newPage(),
      p = await cb.newPage();
    const errors = [];
    a.on("pageerror", (e) => errors.push(e.message));
    p.on("pageerror", (e) => errors.push(e.message));
    await a.goto("http://127.0.0.1:55440/messenger?to=bob");
    await a.waitForURL("**/messenger?chat=*");
    const url = a.url();
    const text = "Здравствуйте! Есть время на стрижку? " + Date.now();
    await a.getByRole("textbox", { name: "Сообщение", exact: true }).fill(text);
    await a.getByRole("button", { name: "Отправить", exact: true }).click();
    await a.locator("article").getByText(text, { exact: true }).waitFor();
    await p.goto(url);
    await p.locator("article").getByText(text, { exact: true }).waitFor();
    const reply = "Да, напишите удобное время " + Date.now();
    await p.getByRole("textbox", { name: "Сообщение", exact: true }).fill(reply);
    await p.getByRole("button", { name: "Отправить", exact: true }).click();
    await a.bringToFront();
    await a.locator("article").getByText(reply, { exact: true }).waitFor({ timeout: 15000 });
    const retry = "Сообщение после ошибки " + Date.now();
    let failed = false;
    await a.route("**/api/messenger/conversations/*/messages", (r) => {
      if (r.request().method() === "POST" && !failed) {
        failed = true;
        return r.fulfill({ status: 503, json: { code: "MESSENGER_UNAVAILABLE" } });
      }
      return r.continue();
    });
    await a.getByRole("textbox", { name: "Сообщение", exact: true }).fill(retry);
    await a.getByRole("button", { name: "Отправить", exact: true }).click();
    await a.getByRole("alert").filter({ hasText: "Сообщение не отправлено" }).waitFor();
    assert.equal(
      await a.getByRole("textbox", { name: "Сообщение", exact: true }).inputValue(),
      retry,
    );
    await a.getByRole("button", { name: "Отправить", exact: true }).click();
    await a.locator("article").getByText(retry, { exact: true }).waitFor();
    await a.reload();
    await a.locator("article").getByText(retry, { exact: true }).waitFor();
    assert.equal(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await a.screenshot({ path: "reports/messenger-mobile.png", fullPage: true });
    const sharp = require("sharp");
    const photo = await sharp({
      create: { width: 320, height: 220, channels: 3, background: "#ec2970" },
    })
      .png()
      .toBuffer();
    const filename = "work-" + Date.now() + ".png";
    await a
      .getByLabel("Прикрепить файл", { exact: true })
      .setInputFiles({ name: filename, mimeType: "image/png", buffer: photo });
    await a.locator("form img").waitFor();
    await a.getByRole("button", { name: "Отправить", exact: true }).click();
    const photoName = filename.replace(".png", ".webp");
    await a.locator("article img").getByAltText(photoName).count();
    await a.locator("article").getByAltText(photoName, { exact: true }).waitFor();
    await p.bringToFront();
    await p.locator("article").getByAltText(photoName, { exact: true }).waitFor({ timeout: 15000 });
    assert.equal(
      await p
        .locator("article")
        .getByAltText(photoName, { exact: true })
        .evaluate((i) => i.naturalWidth > 0),
      true,
    );
    await a.bringToFront();
    const pdfName = "document-" + Date.now() + ".pdf";
    await a
      .getByLabel("Прикрепить файл", { exact: true })
      .setInputFiles({
        name: pdfName,
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\n%%EOF"),
      });
    await a.getByRole("button", { name: "Отправить", exact: true }).click();
    await a.locator("article a").filter({ hasText: pdfName }).waitFor();
    const href = await a.locator("article a").filter({ hasText: pdfName }).getAttribute("href");
    const fileResponse = await cb.request.get("http://127.0.0.1:55440" + href);
    assert.equal(fileResponse.status(), 200);
    assert.ok(fileResponse.headers()["content-disposition"].startsWith("attachment;"));
    await a.screenshot({ path: "reports/messenger-attachments-mobile.png", fullPage: true });
    console.log(
      "PASS UI attachments: photo picker/preview, photo received and decoded, PDF upload/download",
    );
    await a.getByRole("button", { name: "К списку чатов", exact: true }).click();
    await a.getByRole("button", { name: "Новый чат", exact: true }).click();
    await a.getByRole("textbox", { name: "Найти мастера или салон" }).fill("Малика");
    await a
      .getByRole("button")
      .filter({ hasText: "Малика" })
      .filter({ hasText: "Мастер" })
      .waitFor();
    await p.screenshot({ path: "reports/messenger-desktop.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log(
      "PASS real API: two users send/receive, mobile layout, network failure preserves draft, retry, persisted history, contacts search; no browser errors",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
