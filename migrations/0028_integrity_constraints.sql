ALTER TABLE "salons"
  ADD CONSTRAINT "salons_owner_id_users_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "salons"
  ADD CONSTRAINT "chk_salons_deposit_percent_range"
  CHECK ("deposit_percent" >= 0 AND "deposit_percent" <= 99);

ALTER TABLE "salon_working_hours"
  ADD CONSTRAINT "salon_working_hours_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "salon_settings"
  ADD CONSTRAINT "salon_settings_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "masters"
  ADD CONSTRAINT "masters_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "masters"
  ADD CONSTRAINT "masters_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "portfolio_items"
  ADD CONSTRAINT "portfolio_items_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "master_working_hours"
  ADD CONSTRAINT "master_working_hours_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "master_portfolio"
  ADD CONSTRAINT "master_portfolio_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "services"
  ADD CONSTRAINT "services_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "services"
  ADD CONSTRAINT "chk_services_price_range"
  CHECK ("price_min" >= 0 AND ("price_max" IS NULL OR "price_max" >= "price_min"));

ALTER TABLE "services"
  ADD CONSTRAINT "chk_services_duration_positive"
  CHECK ("duration" > 0);

ALTER TABLE "master_services"
  ADD CONSTRAINT "master_services_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "master_services"
  ADD CONSTRAINT "master_services_service_id_services_id_fk"
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "uidx_master_services_master_service"
  ON "master_services" ("master_id", "service_id");

ALTER TABLE "solo_master_services"
  ADD CONSTRAINT "solo_master_services_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "solo_master_services"
  ADD CONSTRAINT "chk_solo_master_services_price_range"
  CHECK ("price_min" >= 0 AND ("price_max" IS NULL OR "price_max" >= "price_min"));

ALTER TABLE "solo_master_services"
  ADD CONSTRAINT "chk_solo_master_services_duration_positive"
  CHECK ("duration" > 0);

ALTER TABLE "solo_master_services"
  ADD CONSTRAINT "chk_solo_master_services_mobile_extra_nonnegative"
  CHECK ("mobile_extra_charge" IS NULL OR "mobile_extra_charge" >= 0);

ALTER TABLE "solo_master_settings"
  ADD CONSTRAINT "solo_master_settings_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_service_id_services_id_fk"
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_solo_master_service_id_solo_master_services_id_fk"
  FOREIGN KEY ("solo_master_service_id") REFERENCES "solo_master_services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "bookings"
  ADD CONSTRAINT "chk_bookings_time_range"
  CHECK ("start_time" < "end_time");

ALTER TABLE "bookings"
  ADD CONSTRAINT "chk_bookings_price_nonnegative"
  CHECK ("price_snapshot" >= 0);

ALTER TABLE "bookings"
  ADD CONSTRAINT "chk_bookings_mobile_extra_nonnegative"
  CHECK ("mobile_extra_charge" >= 0);

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "uidx_favorites_user_salon"
  ON "favorites" ("user_id", "salon_id");

ALTER TABLE "master_favorites"
  ADD CONSTRAINT "master_favorites_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "uidx_master_favorites_user_master"
  ON "master_favorites" ("user_id", "master_id");

ALTER TABLE "booking_history"
  ADD CONSTRAINT "booking_history_booking_id_bookings_id_fk"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_booking_id_bookings_id_fk"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_amount_nonnegative"
  CHECK ("amount_uzs" >= 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_gross_nonnegative"
  CHECK ("gross_amount_uzs" IS NULL OR "gross_amount_uzs" >= 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_fee_nonnegative"
  CHECK ("platform_fee_uzs" IS NULL OR "platform_fee_uzs" >= 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_net_nonnegative"
  CHECK ("net_amount_uzs" IS NULL OR "net_amount_uzs" >= 0);

ALTER TABLE "booking_drafts"
  ADD CONSTRAINT "booking_drafts_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "booking_drafts"
  ADD CONSTRAINT "booking_drafts_service_id_services_id_fk"
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "booking_drafts"
  ADD CONSTRAINT "booking_drafts_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "uidx_booking_drafts_user"
  ON "booking_drafts" ("user_id");
