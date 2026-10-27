import assert from "node:assert/strict";
import { canonicalUrl, documentPolicy, xmlEscape } from "./seo-policy";

for (const path of [
  "/auth/reset-password?token=secret",
  "/owner",
  "/owner/salon/123",
  "/master",
  "/client",
  "/admin/users/123",
  "/solo-master/onboarding",
]) {
  assert.deepEqual(documentPolicy(path), { status: 200, noIndex: true }, path);
}
for (const path of ["/", "/master/public-slug", "/salon/123", "/about"]) {
  assert.deepEqual(documentPolicy(path), { status: 200, noIndex: false }, path);
}
assert.deepEqual(documentPolicy("/not-a-real-page"), { status: 404, noIndex: true });
assert.equal(documentPolicy("/search?city=tashkent").noIndex, true);
assert.equal(documentPolicy("/search?utm_source=test").noIndex, false);
assert.equal(
  canonicalUrl("http://localhost:5000/salon/123?utm_source=test&service=456#booking"),
  "https://aurelle.uz/ru/salon/123",
);
assert.equal(
  canonicalUrl("/search?utm_source=test&city=tashkent&q=hair"),
  "https://aurelle.uz/ru/search?city=tashkent&q=hair",
);
assert.equal(
  canonicalUrl("/auth/reset-password?token=secret"),
  "https://aurelle.uz/auth/reset-password",
);
assert.equal(canonicalUrl("/salons"), "https://aurelle.uz/ru/search");
assert.equal(xmlEscape('a&b<"'), "a&amp;b&lt;&quot;");
console.log("SEO policy assertions passed");
