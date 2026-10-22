/**
 * Unit tests for city-name alias matching.
 * Zero external dependencies — uses Node.js built-in assert module.
 *
 * Run: npx tsx shared/city-aliases.test.ts
 */
import assert from "node:assert/strict";
import { cityMatchesKey, CITY_ALIASES, CITY_KEYS } from "./city-aliases";

// Canonical key matches its own Latin spelling, regardless of case.
assert.equal(cityMatchesKey("Tashkent", "tashkent"), true);
assert.equal(cityMatchesKey("TASHKENT", "tashkent"), true);

// Cyrillic-stored city must still match the canonical English key — this is
// the exact mismatch that made the homepage city chips return zero results.
assert.equal(cityMatchesKey("Ташкент", "tashkent"), true);
assert.equal(cityMatchesKey("г. Ташкент", "tashkent"), true); // substring match
assert.equal(cityMatchesKey("Toshkent", "tashkent"), true); // Uzbek Latin spelling

assert.equal(cityMatchesKey("Самарканд", "samarkand"), true);
assert.equal(cityMatchesKey("Samarqand", "samarkand"), true);
assert.equal(cityMatchesKey("Бухара", "bukhara"), true);
assert.equal(cityMatchesKey("Buxoro", "bukhara"), true);

// A different city must not match.
assert.equal(cityMatchesKey("Самарканд", "tashkent"), false);
assert.equal(cityMatchesKey("Tashkent", "bukhara"), false);

// A canonical key with no alias table entry falls back to a plain substring
// check against the key itself, rather than matching nothing.
assert.equal(cityMatchesKey("Fergana", "fergana"), true);
assert.equal(cityMatchesKey("Tashkent", "fergana"), false);

// Every exported key must resolve to a non-empty alias list.
for (const key of CITY_KEYS) {
  assert.ok(CITY_ALIASES[key]?.length > 0, `missing aliases for ${key}`);
}

console.log("city-aliases.test.ts: all assertions passed");
