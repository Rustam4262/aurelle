import assert from "node:assert/strict";
import { reviewInput, reviewEligibility } from "../server/lib/review-input";

const input = reviewInput.parse({
  bookingId: "booking",
  rating: 5,
  clientId: "victim",
  isHidden: true,
});
assert.equal("clientId" in input, false);
assert.equal("isHidden" in input, false);
for (const bad of [
  { rating: 5 },
  { bookingId: "b", rating: 0 },
  { bookingId: "b", rating: 6 },
  { bookingId: "b", rating: 2.5 },
  { bookingId: "b", rating: 5, comment: "a".repeat(5001) },
]) {
  assert.equal(reviewInput.safeParse(bad).success, false);
}
const booking = { clientId: "user", status: "completed", salonId: "salon", masterId: "master" };
assert.equal(reviewEligibility(booking, "user", "profile", input), null);
assert.equal(
  reviewEligibility({ ...booking, clientId: "profile" }, "user", "profile", input),
  null,
);
assert.equal(reviewEligibility(booking, "attacker", "other", input)?.status, 403);
assert.equal(
  reviewEligibility({ ...booking, status: "pending" }, "user", "profile", input)?.status,
  400,
);
assert.equal(
  reviewEligibility(booking, "user", "profile", { ...input, salonId: "other" })?.status,
  400,
);
assert.equal(
  reviewEligibility(booking, "user", "profile", { ...input, masterId: "other" })?.status,
  400,
);
console.log("PASS: review identity, target, completion, rating and field allowlist");
