import assert from "node:assert/strict";
process.env.DATABASE_URL = "postgres://unused@127.0.0.1:1/unused";
const { db } = await import("../server/db");
const { reviews, bookings } = await import("../shared/schema");
const { createReviewHandler } = await import("../server/routes/reviews.routes");
const { default: clientRouter } = await import("../server/routes/client.routes");
let booking: any = { id: "booking", clientId: "user", status: "completed", salonId: "salon", masterId: null };
let existing = false;
let inserted: any;
let locked = false;
(db as any).select = () => ({
  from: () => ({ where: async () => [{ id: "profile", userId: "user" }] }),
});
(db as any).update = () => ({ set: () => ({ where: async () => [] }) });
(db as any).transaction = async (fn: any) => fn({
  select: () => ({
    from: (table: any) => ({
      where: () => table === bookings
        ? { for: async (mode: string) => { assert.equal(mode, "update"); locked = true; return booking ? [booking] : []; } }
        : Promise.resolve(existing ? [{ id: "existing" }] : []),
    }),
  }),
  insert: (table: any) => {
    assert.equal(table, reviews);
    assert(locked);
    return { values: (data: any) => {
      inserted = data;
      return { returning: async () => [{ id: "new", ...data }] };
    } };
  },
});
async function request(body: any) {
  inserted = undefined; locked = false;
  let status = 200;
  const res: any = { status: (n: number) => { status = n; return res; }, json: () => res };
  await createReviewHandler({ user: { claims: { sub: "user" } }, body }, res);
  return status;
}
const good = { bookingId: "booking", rating: 5 };
assert.equal(await request({ rating: 5 }), 400);
assert.equal(inserted, undefined);
assert.equal(await request({ ...good, salonId: "victim" }), 400);
assert.equal(inserted, undefined);
booking.clientId = "victim";
assert.equal(await request(good), 403);
booking.clientId = "user";
booking.status = "pending";
assert.equal(await request(good), 400);
booking.status = "completed"; existing = true;
assert.equal(await request(good), 409);
existing = false;
assert.equal(await request({ ...good, clientId: "victim", ownerResponse: "forged" }), 201);
assert.equal(inserted.clientId, "profile");
assert.equal(inserted.salonId, "salon");
assert.equal(inserted.ownerResponse, undefined);
booking.clientId = "profile";
assert.equal(await request(good), 201);
const alias = (clientRouter as any).stack.find((layer: any) =>
  layer.route?.path === "/reviews" && layer.route.methods.post);
assert.equal(alias.route.stack.at(-1).handle, createReviewHandler);
console.log("PASS: both review endpoints share protected handler; ownership, target, lock, duplicate and input checks");
process.exit(0);
