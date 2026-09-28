CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "excl_bookings_master_active_time_overlap"
  EXCLUDE USING gist (
    "master_id" WITH =,
    (("booking_date")::date) WITH =,
    int4range(
      ((substring("start_time" from 1 for 2)::int * 60) + substring("start_time" from 4 for 2)::int),
      ((substring("end_time" from 1 for 2)::int * 60) + substring("end_time" from 4 for 2)::int),
      '[)'
    ) WITH &&
  )
  WHERE ("master_id" IS NOT NULL AND "status" IN ('pending', 'confirmed'));

ALTER TABLE "bookings"
  ADD CONSTRAINT "excl_bookings_salon_unassigned_active_time_overlap"
  EXCLUDE USING gist (
    "salon_id" WITH =,
    (("booking_date")::date) WITH =,
    int4range(
      ((substring("start_time" from 1 for 2)::int * 60) + substring("start_time" from 4 for 2)::int),
      ((substring("end_time" from 1 for 2)::int * 60) + substring("end_time" from 4 for 2)::int),
      '[)'
    ) WITH &&
  )
  WHERE ("salon_id" IS NOT NULL AND "master_id" IS NULL AND "status" IN ('pending', 'confirmed'));
