import assert from "node:assert/strict";
import { matchesAudience, matchesCategory } from "./service-audience";

for (const selected of ["women", "men"] as const) {
  assert.equal(matchesAudience(selected, selected), true);
  assert.equal(matchesAudience("unisex", selected), true);
  assert.equal(matchesAudience(null, selected), false);
  assert.equal(matchesAudience(undefined, selected), false);
}
assert.equal(matchesAudience("women", "men"), false);
assert.equal(matchesAudience("men", "women"), false);
assert.equal(matchesAudience(null, "all"), true);
assert.equal(matchesCategory("manicure", "nails"), true);
assert.equal(matchesCategory("haircut", "hair"), true);
assert.equal(matchesCategory("facial", "skincare"), true);
assert.equal(matchesCategory("makeup", "hair"), false);
console.log("Audience and category rules passed");
