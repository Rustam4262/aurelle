-- Migration: Create sanctions system tables
-- This implements user/salon blocking and feature restrictions

-- Sanction Reason Codes (справочник причин)
CREATE TABLE IF NOT EXISTS sanction_reason_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sanctions (блокировки и ограничения)
CREATE TABLE IF NOT EXISTS sanctions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('user', 'salon', 'master', 'client')),
  target_id VARCHAR NOT NULL,
  sanction_type VARCHAR(30) NOT NULL CHECK (sanction_type IN ('temp_block', 'perm_block', 'feature_restrict')),
  features JSONB,
  reason_code_id VARCHAR REFERENCES sanction_reason_codes(id) ON DELETE SET NULL,
  reason_text TEXT NOT NULL,
  comment_to_user TEXT,
  internal_note TEXT,
  starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  revoked_at TIMESTAMP,
  revoked_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  revoke_reason TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_sanction_reason_codes_code ON sanction_reason_codes(code);
CREATE INDEX IF NOT EXISTS idx_sanctions_target ON sanctions(target_type, target_id, status);
CREATE INDEX IF NOT EXISTS idx_sanctions_status_ends ON sanctions(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_sanctions_created_by ON sanctions(created_by, created_at);

-- Insert default sanction reason codes
INSERT INTO sanction_reason_codes (code, title, description) VALUES
  ('spam', 'Spam / Массовая рассылка', 'Пользователь занимается рассылкой спама или нежелательных сообщений'),
  ('fraud', 'Мошенничество', 'Обнаружены признаки мошеннических действий'),
  ('fake_profile', 'Фейковый профиль', 'Профиль содержит недостоверную информацию'),
  ('inappropriate_content', 'Неуместный контент', 'Размещение неуместного или оскорбительного контента'),
  ('harassment', 'Домогательство / Угрозы', 'Домогательство, угрозы или агрессивное поведение'),
  ('policy_violation', 'Нарушение правил', 'Нарушение пользовательского соглашения или правил платформы'),
  ('payment_issue', 'Проблемы с оплатой', 'Неоплаченные услуги или финансовые споры'),
  ('quality_complaints', 'Множественные жалобы на качество', 'Многочисленные жалобы клиентов на качество услуг'),
  ('no_show', 'Систематические неявки', 'Пользователь регулярно не приходит на записи без отмены'),
  ('abuse', 'Злоупотребление системой', 'Злоупотребление функциями платформы'),
  ('other', 'Другая причина', 'Другая причина, не указанная в списке')
ON CONFLICT (code) DO NOTHING;

-- Add comments
COMMENT ON TABLE sanction_reason_codes IS 'Справочник стандартных причин для блокировок';
COMMENT ON TABLE sanctions IS 'Блокировки и ограничения для пользователей/салонов';
COMMENT ON COLUMN sanctions.features IS 'JSON объект с ограничениями функций: {"chat": false, "booking_create": false}';
COMMENT ON COLUMN sanctions.status IS 'active - действует, expired - истек срок, revoked - отменена админом';
