-- Migration: Create admin-user chat system
-- This implements support chat threads between admins and users

-- Chat Threads (переписка)
CREATE TABLE IF NOT EXISTS chat_threads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'support' CHECK (type IN ('support')),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_admin_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMP,
  closed_at TIMESTAMP,
  closed_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  close_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id VARCHAR NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'admin')),
  sender_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
  text TEXT,
  attachments JSONB,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat Message Reads (отметки о прочтении)
CREATE TABLE IF NOT EXISTS chat_message_reads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  reader_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, reader_user_id)
);

-- Chat Templates (шаблоны быстрых ответов)
CREATE TABLE IF NOT EXISTS chat_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_assigned ON chat_threads(assigned_admin_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last_message ON chat_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_reader ON chat_message_reads(reader_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_message ON chat_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_templates_category ON chat_templates(category);

-- Insert default chat templates
INSERT INTO chat_templates (name, content, category, created_by)
SELECT
  'Приветствие',
  'Здравствуйте! Я администратор службы поддержки AURELLE. Чем могу помочь?',
  'greeting',
  id
FROM users LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO chat_templates (name, content, category, created_by)
SELECT
  'Получили жалобу',
  'Спасибо за обращение. Мы получили вашу жалобу и рассмотрим её в ближайшее время.',
  'complaint',
  id
FROM users LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO chat_templates (name, content, category, created_by)
SELECT
  'Проблема решена',
  'Ваша проблема решена. Если у вас остались вопросы, пожалуйста, дайте знать.',
  'resolution',
  id
FROM users LIMIT 1
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE chat_threads IS 'Треды переписки между пользователями и администраторами';
COMMENT ON TABLE chat_messages IS 'Сообщения в чатах';
COMMENT ON TABLE chat_message_reads IS 'Отметки о прочтении сообщений';
COMMENT ON TABLE chat_templates IS 'Шаблоны быстрых ответов для администраторов';
COMMENT ON COLUMN chat_messages.sender_type IS 'user - от пользователя, admin - от админа';
COMMENT ON COLUMN chat_messages.message_type IS 'text - обычное сообщение, system - системное уведомление';
