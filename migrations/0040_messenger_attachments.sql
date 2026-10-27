BEGIN;
CREATE TABLE messenger_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id integer NOT NULL UNIQUE REFERENCES messenger_messages(id) ON DELETE CASCADE,
  name text NOT NULL,
  content_type text NOT NULL,
  size integer NOT NULL CHECK (size BETWEEN 1 AND 8388608),
  data bytea NOT NULL
);
COMMIT;
