BEGIN;
ALTER TABLE messenger_conversations ALTER COLUMN direct_key DROP NOT NULL;
ALTER TABLE messenger_conversations ADD COLUMN kind text NOT NULL DEFAULT 'direct';
ALTER TABLE messenger_conversations ADD COLUMN title varchar(100);
ALTER TABLE messenger_conversations ADD COLUMN creator_id varchar REFERENCES users(id);
ALTER TABLE messenger_conversations ADD CONSTRAINT messenger_conversation_kind CHECK (
  (kind='direct' AND direct_key IS NOT NULL) OR
  (kind='group' AND direct_key IS NULL AND title IS NOT NULL AND length(trim(title)) BETWEEN 1 AND 100 AND creator_id IS NOT NULL)
);
COMMIT;
