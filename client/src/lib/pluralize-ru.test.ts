/**
 * Unit tests for Russian noun pluralization after a count.
 * Zero external dependencies — uses Node.js built-in assert module.
 *
 * Run: npx tsx client/src/lib/pluralize-ru.test.ts
 */
import assert from "node:assert/strict";
import { reviewsWordRu } from "./pluralize-ru";

// one: ends in 1, but not 11
assert.equal(reviewsWordRu(1), "отзыв");
assert.equal(reviewsWordRu(21), "отзыв");
assert.equal(reviewsWordRu(31), "отзыв");
assert.equal(reviewsWordRu(101), "отзыв");

// few: ends in 2-4, but not 12-14
assert.equal(reviewsWordRu(2), "отзыва");
assert.equal(reviewsWordRu(3), "отзыва");
assert.equal(reviewsWordRu(4), "отзыва");
assert.equal(reviewsWordRu(22), "отзыва");
assert.equal(reviewsWordRu(104), "отзыва");

// many: 0, 5-20, 25-30… — including the 11-14 exception within the "ends in 1-4" range
assert.equal(reviewsWordRu(0), "отзывов");
assert.equal(reviewsWordRu(5), "отзывов");
assert.equal(reviewsWordRu(11), "отзывов"); // ends in 1, but 11 is the exception
assert.equal(reviewsWordRu(12), "отзывов"); // ends in 2, but 12 is the exception
assert.equal(reviewsWordRu(13), "отзывов");
assert.equal(reviewsWordRu(14), "отзывов");
assert.equal(reviewsWordRu(20), "отзывов");
assert.equal(reviewsWordRu(25), "отзывов");
assert.equal(reviewsWordRu(111), "отзывов"); // 111 ends in 11-pattern too

console.log("pluralize-ru.test.ts: all assertions passed");
