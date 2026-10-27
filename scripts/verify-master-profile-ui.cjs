const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
    let master = {
      id: "master-id",
      name: "Malika",
      phone: "",
      experience: 2,
      bio: { ru: "", uz: "", en: "" },
      photo: null,
      averageRating: "4.5",
      reviewCount: 2,
    };
    let saved;
    await p.route("**/api/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      let json = [];
      if (path === "/api/auth/user") json = { id: "user-id", role: "master" };
      if (path === "/api/master/me")
        json = {
          master,
          salon: { name: { ru: "Test" } },
          bookings: [],
          reviews: [
            { id: "1", rating: 5, comment: "Отличная работа", createdAt: "2026-09-30" },
            { id: "2", rating: 4, comment: "Спасибо", createdAt: "2026-09-29" },
          ],
        };
      if (path === "/api/master/profile") {
        saved = r.request().postDataJSON();
        master = { ...master, ...saved };
        json = master;
      }
      return r.fulfill({ json });
    });
    await p.goto("http://127.0.0.1:5000/master");
    await p.getByRole("tab", { name: "Отзывы и оценки" }).click();
    await p.getByText("Отличная работа", { exact: true }).waitFor();
    assert.ok((await p.getByRole("tabpanel").innerText()).includes("4.5 / 5"));
    await p.getByRole("tab", { name: "Настройки профиля" }).click();
    await p.getByLabel("Имя и фамилия").fill("Malika Updated");
    await p.getByLabel("О себе (RU)", { exact: true }).fill("Мастер салона");
    await p.getByRole("button", { name: "Сохранить профиль" }).click();
    await p.getByText("Профиль успешно обновлён", { exact: true }).waitFor();
    assert.equal(saved.name, "Malika Updated");
    assert.equal(saved.bio.ru, "Мастер салона");
    await p.reload();
    assert.equal(await p.getByLabel("Имя и фамилия").inputValue(), "Malika Updated");
    await p.screenshot({ path: "reports/master-profile-mobile.png" });
    console.log("PASS reviews, rating, mobile tabs, profile save and reload");
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
