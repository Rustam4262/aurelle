BEGIN;
CREATE TABLE messenger_conversations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  direct_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE messenger_members (
  conversation_id varchar NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_id integer NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX messenger_members_user ON messenger_members(user_id);
CREATE TABLE messenger_messages (
  id serial PRIMARY KEY,
  conversation_id varchar NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  sender_id varchar NOT NULL REFERENCES users(id),
  client_id uuid NOT NULL,
  body text NOT NULL CONSTRAINT messenger_body_length CHECK (length(trim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messenger_message_retry UNIQUE (conversation_id, sender_id, client_id)
);
CREATE INDEX messenger_messages_history ON messenger_messages(conversation_id, id);
CREATE TABLE messenger_blocks (
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, blocked_user_id),
  CONSTRAINT messenger_block_self CHECK (user_id <> blocked_user_id)
);
COMMIT;
