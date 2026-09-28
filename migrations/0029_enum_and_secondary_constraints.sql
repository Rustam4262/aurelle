ALTER TABLE "salons"
  ADD CONSTRAINT "chk_salons_status"
  CHECK ("status" IN ('draft', 'active', 'paused'));

ALTER TABLE "masters"
  ADD CONSTRAINT "chk_masters_status"
  CHECK ("status" IN ('draft', 'active', 'paused'));

ALTER TABLE "masters"
  ADD CONSTRAINT "chk_masters_service_mode"
  CHECK ("service_mode" IN ('at_master', 'mobile', 'both'));

ALTER TABLE "masters"
  ADD CONSTRAINT "chk_masters_mobile_extra_nonnegative"
  CHECK ("mobile_extra_charge" >= 0);

ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "uidx_push_subscriptions_endpoint"
  ON "push_subscriptions" ("endpoint");

ALTER TABLE "waitlist"
  ADD CONSTRAINT "waitlist_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "waitlist"
  ADD CONSTRAINT "waitlist_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "waitlist"
  ADD CONSTRAINT "waitlist_service_id_services_id_fk"
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "waitlist"
  ADD CONSTRAINT "chk_waitlist_status"
  CHECK ("status" IN ('waiting', 'notified', 'booked', 'expired'));

ALTER TABLE "waitlist"
  ADD CONSTRAINT "chk_waitlist_time_range"
  CHECK ("preferred_time_start" IS NULL OR "preferred_time_end" IS NULL OR "preferred_time_start" < "preferred_time_end");

ALTER TABLE "bookings"
  ADD CONSTRAINT "chk_bookings_status"
  CHECK ("status" IN ('pending', 'confirmed', 'cancelled', 'completed'));

ALTER TABLE "bookings"
  ADD CONSTRAINT "chk_bookings_payment_status"
  CHECK ("payment_status" IN ('not_required', 'pending', 'paid', 'refunded'));

ALTER TABLE "owner_permissions"
  ADD CONSTRAINT "owner_permissions_owner_id_users_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "uidx_owner_permissions_owner_permission"
  ON "owner_permissions" ("owner_id", "permission");

ALTER TABLE "salon_breaks"
  ADD CONSTRAINT "salon_breaks_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "salon_breaks"
  ADD CONSTRAINT "chk_salon_breaks_time_range"
  CHECK ("start_time" < "end_time");

ALTER TABLE "salon_managers"
  ADD CONSTRAINT "salon_managers_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "salon_managers"
  ADD CONSTRAINT "salon_managers_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "salon_managers"
  ADD CONSTRAINT "salon_managers_invited_by_users_id_fk"
  FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "uidx_salon_managers_salon_user"
  ON "salon_managers" ("salon_id", "user_id");

ALTER TABLE "salon_managers"
  ADD CONSTRAINT "chk_salon_managers_status"
  CHECK ("status" IN ('pending', 'active', 'revoked'));

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_provider"
  CHECK ("provider" IN ('payme', 'click'));

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_type"
  CHECK ("type" IN ('full', 'deposit'));

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_status"
  CHECK ("status" IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded'));

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "chk_password_reset_expiry"
  CHECK ("expires_at" > "created_at");

ALTER TABLE "email_verification_tokens"
  ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "email_verification_tokens"
  ADD CONSTRAINT "chk_email_verification_expiry"
  CHECK ("expires_at" > "created_at");

ALTER TABLE "scheduled_notifications"
  ADD CONSTRAINT "scheduled_notifications_booking_id_bookings_id_fk"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "scheduled_notifications"
  ADD CONSTRAINT "chk_scheduled_notifications_type"
  CHECK ("type" IN ('REMINDER_24H', 'REMINDER_2H'));

ALTER TABLE "scheduled_notifications"
  ADD CONSTRAINT "chk_scheduled_notifications_channel"
  CHECK ("channel" IN ('email', 'sms', 'push'));

ALTER TABLE "scheduled_notifications"
  ADD CONSTRAINT "chk_scheduled_notifications_status"
  CHECK ("status" IN ('pending', 'sent', 'failed', 'cancelled'));

ALTER TABLE "webhook_events"
  ADD CONSTRAINT "chk_webhook_events_provider"
  CHECK ("provider" IN ('payme', 'click'));

ALTER TABLE "platform_fee_config"
  ADD CONSTRAINT "platform_fee_config_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "platform_fee_config"
  ADD CONSTRAINT "platform_fee_config_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "platform_fee_config"
  ADD CONSTRAINT "chk_platform_fee_config_percent_range"
  CHECK ("fee_percent" >= 0 AND "fee_percent" <= 100);

ALTER TABLE "salon_subscriptions"
  ADD CONSTRAINT "salon_subscriptions_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "salon_subscriptions"
  ADD CONSTRAINT "salon_subscriptions_plan_id_subscription_plans_id_fk"
  FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "salon_subscriptions"
  ADD CONSTRAINT "chk_salon_subscriptions_status"
  CHECK ("status" IN ('trialing', 'active', 'past_due', 'cancelled', 'expired'));
