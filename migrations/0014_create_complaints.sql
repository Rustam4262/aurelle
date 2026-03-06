-- Migration: Create complaints and moderation system
-- This implements complaint submission and resolution workflow

CREATE TABLE IF NOT EXISTS complaints (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  complainant_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('salon', 'master', 'client', 'user')),
  target_id VARCHAR NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('spam', 'fraud', 'abuse', 'quality', 'other')),
  description TEXT NOT NULL,
  attachments JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  assigned_admin_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  resolution_comment TEXT,
  decision VARCHAR(30) CHECK (decision IN ('warning', 'sanction_applied', 'no_action')),
  sanction_id VARCHAR REFERENCES sanctions(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status, created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_target ON complaints(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_admin_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_complainant ON complaints(complainant_user_id);

-- Add comments
COMMENT ON TABLE complaints IS 'Жалобы пользователей на салоны, мастеров или других пользователей';
COMMENT ON COLUMN complaints.category IS 'Категория жалобы: spam, fraud, abuse, quality, other';
COMMENT ON COLUMN complaints.status IS 'open - новая, in_review - на рассмотрении, resolved - решена, rejected - отклонена';
COMMENT ON COLUMN complaints.decision IS 'warning - предупреждение, sanction_applied - применена санкция, no_action - нет действий';
COMMENT ON COLUMN complaints.attachments IS 'JSON массив URLs прикрепленных файлов (скриншоты, фото)';
