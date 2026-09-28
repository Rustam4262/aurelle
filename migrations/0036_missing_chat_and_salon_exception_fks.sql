-- Add foreign keys that were documented in code comments ("FK to X.id")
-- but never actually enforced at the database level. Verified zero orphaned
-- rows before applying (see conversation/session notes).

ALTER TABLE "chat_threads"
  ADD CONSTRAINT "chat_threads_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "chat_threads_assigned_admin_id_users_id_fk"
    FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE NO ACTION,
  ADD CONSTRAINT "chat_threads_closed_by_users_id_fk"
    FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE NO ACTION;

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_thread_id_chat_threads_id_fk"
    FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "chat_messages_sender_user_id_users_id_fk"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "chat_message_reads"
  ADD CONSTRAINT "chat_message_reads_message_id_chat_messages_id_fk"
    FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "chat_message_reads_reader_user_id_users_id_fk"
    FOREIGN KEY ("reader_user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "chat_templates"
  ADD CONSTRAINT "chat_templates_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION;

ALTER TABLE "salon_exceptions"
  ADD CONSTRAINT "salon_exceptions_salon_id_salons_id_fk"
    FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE;
