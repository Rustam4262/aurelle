-- Migration: Create portfolio_items table
-- This allows masters to showcase their work

CREATE TABLE IF NOT EXISTS portfolio_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id VARCHAR NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  title JSONB,
  description JSONB,
  service_category VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_master ON portfolio_items(master_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_category ON portfolio_items(service_category);

-- Add comment
COMMENT ON TABLE portfolio_items IS 'Portfolio/gallery items showcasing master work';
