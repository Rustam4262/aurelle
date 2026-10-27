import assert from "node:assert/strict";
import { insertServiceSchema } from "../shared/schema";
import { updateServiceSchema } from "../shared/service-input";

const service = {
  salonId: "test-salon", name: { en: "Cut", ru: "Стрижка", uz: "Soch" },
  description: { en: "", ru: "", uz: "" }, category: "hair",
  priceMin: 50000, priceMax: 100000, duration: 60, isActive: true,
};
for (const schema of [insertServiceSchema, updateServiceSchema]) {
  for (const priceMax of [50000, 100000, null]) {
    assert.equal(schema.safeParse({ ...service, priceMax }).success, true);
  }
  for (const field of ["priceMin", "priceMax", "duration"]) {
    for (const value of [-1, 0, 0.5, NaN, Infinity, 2147483648, "60"]) {
      assert.equal(schema.safeParse({ ...service, [field]: value }).success, false,
        `${field} must reject ${String(value)}`);
    }
  }
  assert.equal(schema.safeParse({ ...service, priceMax: 49999 }).success, false);
}
assert.equal(insertServiceSchema.safeParse({ ...service, priceMax: undefined }).success, true);
// An update must explicitly send a range or null, otherwise an old maximum could remain below the new minimum.
assert.equal(updateServiceSchema.safeParse({ ...service, priceMax: undefined }).success, false);
assert.equal(updateServiceSchema.safeParse({ ...service, duration: undefined }).success, false);
console.log("Service validation passed: create/update, fixed/range prices, invalid numbers and storage boundaries");
