-- migrations/0026_subscriptions.sql
-- Subscription plans catalogue + per-salon subscription state.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                  VARCHAR       PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                VARCHAR(50)   NOT NULL UNIQUE,
  name                JSONB         NOT NULL DEFAULT '{"en":"","ru":"","uz":""}',
  description         JSONB,
  price_monthly_uzs   INTEGER       NOT NULL DEFAULT 0,
  price_yearly_uzs    INTEGER       NOT NULL DEFAULT 0,
  trial_days          INTEGER       NOT NULL DEFAULT 14,
  features            JSONB         NOT NULL DEFAULT '[]',
  feature_keys        JSONB         NOT NULL DEFAULT '[]',
  is_active           BOOLEAN       NOT NULL DEFAULT true,
  sort_order          INTEGER       NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON subscription_plans (is_active);

-- ── Seed default plans ──────────────────────────────────────────────────────

INSERT INTO subscription_plans (slug, name, price_monthly_uzs, price_yearly_uzs, trial_days, features, feature_keys, sort_order)
VALUES
  (
    'free',
    '{"en":"Free","ru":"Бесплатный","uz":"Bepul"}',
    0, 0, 0,
    '["Up to 2 masters","Up to 50 bookings/month","Basic analytics"]',
    '[]',
    0
  ),
  (
    'starter',
    '{"en":"Starter","ru":"Стартовый","uz":"Boshlang''ich"}',
    149000, 1490000, 14,
    '["Up to 5 masters","Unlimited bookings","Advanced analytics","Email notifications"]',
    '["analytics.advanced","notifications.email"]',
    1
  ),
  (
    'pro',
    '{"en":"Pro","ru":"Про","uz":"Pro"}',
    349000, 3490000, 14,
    '["Unlimited masters","Unlimited bookings","Full analytics","SMS + Push notifications","Priority support"]',
    '["analytics.advanced","analytics.funnel","notifications.sms","notifications.push","support.priority"]',
    2
  ),
  (
    'enterprise',
    '{"en":"Enterprise","ru":"Корпоративный","uz":"Korporativ"}',
    0, 0, 30,
    '["Custom terms","Dedicated support","API access","White-label"]',
    '["analytics.advanced","analytics.funnel","notifications.sms","notifications.push","support.priority","api.access","white_label"]',
    3
  )
ON CONFLICT (slug) DO NOTHING;

-- ── Per-salon subscription ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salon_subscriptions (
  id                       VARCHAR       PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id                 VARCHAR       NOT NULL UNIQUE,
  plan_id                  VARCHAR       NOT NULL REFERENCES subscription_plans(id),
  status                   VARCHAR(20)   NOT NULL DEFAULT 'trialing',
  trial_starts_at          TIMESTAMPTZ,
  trial_ends_at            TIMESTAMPTZ,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  cancellation_reason      VARCHAR(500),
  external_subscription_id VARCHAR(255),
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_salon      ON salon_subscriptions (salon_id);
CREATE INDEX IF NOT EXISTS idx_subs_status     ON salon_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subs_trial_ends ON salon_subscriptions (trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_subs_period_end ON salon_subscriptions (current_period_end);

-- Constraint: status must be one of the allowed values
ALTER TABLE salon_subscriptions
  DROP CONSTRAINT IF EXISTS salon_subscriptions_status_check;

ALTER TABLE salon_subscriptions
  ADD CONSTRAINT salon_subscriptions_status_check
  CHECK (status IN ('trialing','active','past_due','cancelled','expired'));
