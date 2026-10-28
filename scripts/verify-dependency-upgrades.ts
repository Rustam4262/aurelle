import assert from "node:assert/strict";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import nodemailer from "nodemailer";
import * as XLSX from "xlsx";
import { insertServiceSchema } from "../shared/schema";
import { insertSanctionSchema } from "../shared/admin-schema";

// Exercise integration boundaries affected by the security upgrades, without
// contacting SMTP or a database.
const service = {
  salonId: "test-salon", name: { en: "Haircut", ru: "Стрижка", uz: "Soch" },
  category: "hair", priceMin: 100000, duration: 60,
};
assert.equal(insertServiceSchema.safeParse(service).success, true);
for (const invalid of [{ priceMin: -1 }, { priceMin: 1.5 }, { duration: 0 }, { priceMax: 1 }]) {
  const result = insertServiceSchema.safeParse({ ...service, ...invalid });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.error.issues.length > 0);
}
assert.equal(insertSanctionSchema.safeParse({
  targetType: "user", targetId: "test", sanctionType: "feature_restrict",
  reasonText: "test", features: { chat: false, booking_create: true },
}).success, true);
const resolver = zodResolver(z.object({ email: z.string().email() }));
const invalidForm = await resolver({ email: "invalid" }, {}, { fields: {}, shouldUseNativeValidation: false });
assert.ok(invalidForm.errors.email?.message);
const validForm = await resolver({ email: "test@example.invalid" }, {}, { fields: {}, shouldUseNativeValidation: false });
assert.deepEqual(validForm.values, { email: "test@example.invalid" });

const book = XLSX.utils.book_new();
const rows = [{ name: "Стрижка", price: 100000, active: true }];
XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Услуги");
const exported = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
const imported = XLSX.read(exported, { type: "buffer" });
assert.deepEqual(XLSX.utils.sheet_to_json(imported.Sheets["Услуги"]), rows);

const mail = nodemailer.createTransport({ streamTransport: true, buffer: true });
const result = await mail.sendMail({
  from: "sender@example.invalid", to: "recipient@example.invalid",
  subject: "AURELLE — проверка", text: "Запись подтверждена", html: "<p>Запись подтверждена</p>",
});
assert.match(result.message.toString(), /multipart\/alternative/);
assert.match(result.message.toString(), /recipient@example.invalid/);
mail.close();
console.log("PASS: service validation, error issues, record keys, form resolver, XLSX roundtrip, email composition");
