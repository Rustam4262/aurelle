ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_client_id_users_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_client_id_users_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_booking_id_bookings_id_fk"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "reviews"
  ADD CONSTRAINT "chk_reviews_rating_range"
  CHECK ("rating" >= 1 AND "rating" <= 5);

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_assigned_to_users_id_fk"
  FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "chk_support_tickets_status"
  CHECK ("status" IN ('open', 'in_progress', 'resolved', 'closed'));

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "chk_support_tickets_priority"
  CHECK ("priority" IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE "support_messages"
  ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "support_messages"
  ADD CONSTRAINT "support_messages_sender_id_users_id_fk"
  FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "support_messages"
  ADD CONSTRAINT "chk_support_messages_sender_type"
  CHECK ("sender_type" IN ('user', 'admin'));

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "master_statistics"
  ADD CONSTRAINT "master_statistics_master_id_masters_id_fk"
  FOREIGN KEY ("master_id") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "uidx_master_stats_master_month"
  ON "master_statistics" ("master_id", "month");

ALTER TABLE "master_statistics"
  ADD CONSTRAINT "chk_master_stats_total_bookings_nonnegative"
  CHECK ("total_bookings" >= 0);

ALTER TABLE "master_statistics"
  ADD CONSTRAINT "chk_master_stats_completed_bookings_nonnegative"
  CHECK ("completed_bookings" >= 0);

ALTER TABLE "user_activity_sessions"
  ADD CONSTRAINT "user_activity_sessions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "user_activity_sessions"
  ADD CONSTRAINT "chk_user_activity_sessions_duration_nonnegative"
  CHECK ("duration_seconds" >= 0);

ALTER TABLE "user_activity_sessions"
  ADD CONSTRAINT "chk_user_activity_sessions_page_views_nonnegative"
  CHECK ("page_views" >= 0);

ALTER TABLE "user_activity_sessions"
  ADD CONSTRAINT "chk_user_activity_sessions_actions_nonnegative"
  CHECK ("actions_count" >= 0);

ALTER TABLE "user_activity_actions"
  ADD CONSTRAINT "user_activity_actions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actor_id_users_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_salon_id_salons_id_fk"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "chk_audit_logs_result"
  CHECK ("result" IN ('success', 'failure'));

CREATE UNIQUE INDEX "uidx_bookings_master_exact_active_slot"
  ON "bookings" ("master_id", "booking_date", "start_time")
  WHERE "master_id" IS NOT NULL AND "status" IN ('pending', 'confirmed');

CREATE UNIQUE INDEX "uidx_bookings_salon_exact_active_slot"
  ON "bookings" ("salon_id", "booking_date", "start_time")
  WHERE "salon_id" IS NOT NULL AND "master_id" IS NULL AND "status" IN ('pending', 'confirmed');
