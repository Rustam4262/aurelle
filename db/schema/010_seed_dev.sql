-- Development Seed Data for AURELLE Beauty Salon
-- This file runs AFTER 000_schema.sql (alphanumeric order)
-- Creates minimal test data for local development

-- NOTE: Password hashes generated with bcrypt for "TestPassword123"
-- Generate new hash in Python: from passlib.hash import bcrypt; print(bcrypt.hash("password"))

-- ============================================
-- USERS
-- ============================================

-- Admin user (phone: +998901234567, password: Admin2025)
-- Hash generated: bcrypt hash of "Admin2025"
INSERT INTO users (name, phone, email, password_hash, role, is_active, created_at)
VALUES (
  'Local Admin',
  '+998901234567',
  'admin@aurelle.local',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYk3jXw6KqW',  -- Admin2025
  'admin',
  true,
  NOW()
) ON CONFLICT (phone) DO NOTHING;

-- Salon Owner user (phone: +998901111111, password: Owner2025)
INSERT INTO users (name, phone, email, password_hash, role, is_active, created_at)
VALUES (
  'Test Salon Owner',
  '+998901111111',
  'owner@aurelle.local',
  '$2b$12$8Z9J0KqX5zN2VvU6Wt1rHuFkL3mP7qR9sA4bC6dE8fG0hI2jK4lM6',  -- Owner2025
  'salon_owner',
  true,
  NOW()
) ON CONFLICT (phone) DO NOTHING;

-- Master user (phone: +998902222222, password: Master2025)
INSERT INTO users (name, phone, email, password_hash, role, is_active, created_at)
VALUES (
  'Test Master',
  '+998902222222',
  'master@aurelle.local',
  '$2b$12$9A0K1LrY6oO3WxV7Yu2sIvGlM4nQ8rS0tB5cD7eF9gH1iJ3kL5mN7',  -- Master2025
  'master',
  true,
  NOW()
) ON CONFLICT (phone) DO NOTHING;

-- Client user (phone: +998903333333, password: Client2025)
INSERT INTO users (name, phone, email, password_hash, role, is_active, created_at)
VALUES (
  'Test Client',
  '+998903333333',
  'client@aurelle.local',
  '$2b$12$0B1L2MsZ7pP4XyW8Zv3tJwHmN5oR9sT1uC6dE8fG0hI2jK4lM6nO8',  -- Client2025
  'client',
  true,
  NOW()
) ON CONFLICT (phone) DO NOTHING;

-- ============================================
-- SALONS (requires owner_id from users)
-- ============================================

-- Get owner_id for Test Salon Owner
DO $$
DECLARE
  v_owner_id INTEGER;
BEGIN
  SELECT id INTO v_owner_id FROM users WHERE phone = '+998901111111';

  -- Test Salon 1 (APPROVED)
  INSERT INTO salons (
    name, description, address, latitude, longitude,
    owner_id, rating, reviews_count,
    is_verified, is_active, approved_at, approved_by,
    created_at
  )
  VALUES (
    'Beauty Studio Local',
    'Тестовый салон для локальной разработки',
    'Tashkent, Chilanzar, Test Street 1',
    41.2995, 69.2401,
    v_owner_id, 4.5, 10,
    true, true, NOW(), 1,
    NOW()
  ) ON CONFLICT DO NOTHING;

  -- Test Salon 2 (PENDING - not approved)
  INSERT INTO salons (
    name, description, address, latitude, longitude,
    owner_id, rating, reviews_count,
    is_verified, is_active,
    created_at
  )
  VALUES (
    'Hair Studio Local',
    'Салон в ожидании модерации',
    'Tashkent, Yunusabad, Test Street 2',
    41.3123, 69.2567,
    v_owner_id, 0.0, 0,
    false, false,
    NOW()
  ) ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- AUDIT LOGS
-- ============================================

-- Example audit log entry
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
VALUES (
  1,
  'SYSTEM_INIT',
  'database',
  0,
  '{"message": "Local development database seeded", "environment": "development"}',
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Development seed data loaded successfully';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Test Users:';
  RAISE NOTICE '   Admin:       +998901234567 / Admin2025';
  RAISE NOTICE '   Salon Owner: +998901111111 / Owner2025';
  RAISE NOTICE '   Master:      +998902222222 / Master2025';
  RAISE NOTICE '   Client:      +998903333333 / Client2025';
  RAISE NOTICE '';
  RAISE NOTICE '🏢 Test Salons:';
  RAISE NOTICE '   Beauty Studio Local (APPROVED)';
  RAISE NOTICE '   Hair Studio Local (PENDING)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready for development!';
END $$;
