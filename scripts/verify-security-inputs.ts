import assert from "node:assert/strict";
import { clientBookingInput } from "../server/lib/booking-create-input";
import { mayJoinRoom, type RoomAccess } from "../server/lib/ws-room-policy";

const legitimate = {
  salonId: "salon1",
  serviceId: "service1",
  bookingDate: new Date("2026-11-01"),
  startTime: "10:00",
  notes: "Hello",
};
const parsed = clientBookingInput.parse({
  ...legitimate,
  clientId: "victim",
  status: "completed",
  paymentStatus: "paid",
  priceSnapshot: 1,
  endTime: "23:00",
  mobileExtraCharge: -500,
  notificationVersion: 42,
  modificationHistory: [{ action: "forged" }],
  id: "existing-booking",
  cancellationReason: "forged",
  modifiedBy: "admin",
});
assert.deepEqual(parsed, legitimate);
assert.equal(clientBookingInput.safeParse({ ...legitimate, isMobileBooking: true }).success, false);

const access: RoomAccess = {
  isActiveUser: async (id) => id !== "blocked",
  isSuperAdmin: async (id) => id === "admin",
  ownsSalon: async (id, salon) => id === "owner" && salon === "salon1",
};
assert.equal(await mayJoinRoom("client", "admin", access), false);
assert.equal(await mayJoinRoom("client", "salon_salon1", access), false);
assert.equal(await mayJoinRoom("owner", "salon_salon1", access), true);
assert.equal(await mayJoinRoom("owner", "salon_other", access), false);
assert.equal(await mayJoinRoom("admin", "admin", access), true);
assert.equal(await mayJoinRoom("blocked", "admin", access), false);
for (const room of ["admin_extra", "administrator", "salon_", "user_victim", {}, null]) {
  assert.equal(await mayJoinRoom("admin", room, access), false);
}
await assert.rejects(
  mayJoinRoom("admin", "admin", {
    ...access,
    isActiveUser: async () => {
      throw new Error("database unavailable");
    },
  }),
);
console.log("PASS: booking field injection and WebSocket room authorization");
