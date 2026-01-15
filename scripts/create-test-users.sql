-- SQL Script to create test users for AURELLE platform
-- Run this directly in Database Client if the TypeScript script doesn't work
--
-- All test users have password: password123
-- Hashed with bcrypt (10 rounds): $2b$10$rKJ5VqZ.5yF3kqXJ3qX3YeYqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3YeY
--
-- IMPORTANT: This is a placeholder hash. You need to generate real bcrypt hashes.
-- Use: node -e "const bcrypt = require('bcrypt'); bcrypt.hash('password123', 10, (err, hash) => console.log(hash));"

BEGIN;

-- Clean up existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@aurelle.uz');
-- DELETE FROM specialists WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@aurelle.uz');
-- DELETE FROM services WHERE salon_id IN (SELECT id FROM salons WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%@aurelle.uz'));
-- DELETE FROM salons WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%@aurelle.uz');
-- DELETE FROM users WHERE email LIKE '%@aurelle.uz';

-- Insert Admin User
INSERT INTO users (id, email, password, name, role, phone, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'admin@aurelle.uz', '$2b$10$K8zX3kJ5yF3kqXJ3qX3YeXqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3Ye.', 'Admin User', 'admin', '+998901234567', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Salon Owner 1
INSERT INTO users (id, email, password, name, role, phone, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'salon1@aurelle.uz', '$2b$10$K8zX3kJ5yF3kqXJ3qX3YeXqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3Ye.', 'Beauty Lounge Owner', 'salon_owner', '+998901234568', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Salon Owner 2
INSERT INTO users (id, email, password, name, role, phone, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'salon2@aurelle.uz', '$2b$10$K8zX3kJ5yF3kqXJ3qX3YeXqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3Ye.', 'Elegant Salon Owner', 'salon_owner', '+998901234569', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Specialists
INSERT INTO users (id, email, password, name, role, phone, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'specialist1@aurelle.uz', '$2b$10$K8zX3kJ5yF3kqXJ3qX3YeXqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3Ye.', 'Maria Ivanova', 'specialist', '+998901234570', true, NOW(), NOW()),
  (gen_random_uuid(), 'specialist2@aurelle.uz', '$2b$10$K8zX3kJ5yF3kqXJ3qX3YeXqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3Ye.', 'Anna Petrova', 'specialist', '+998901234571', true, NOW(), NOW()),
  (gen_random_uuid(), 'specialist3@aurelle.uz', '$2b$10$K8zX3kJ5yF3kqXJ3qX3YeXqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3Ye.', 'Elena Sidorova', 'specialist', '+998901234572', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Clients
INSERT INTO users (id, email, password, name, role, phone, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'client1@aurelle.uz', '$2b$10$K8zX3kJ5yF3kqXJ3qX3YeXqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3Ye.', 'John Doe', 'client', '+998901234573', true, NOW(), NOW()),
  (gen_random_uuid(), 'client2@aurelle.uz', '$2b$10$K8zX3kJ5yF3kqXJ3qX3YeXqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3Ye.', 'Jane Smith', 'client', '+998901234574', true, NOW(), NOW()),
  (gen_random_uuid(), 'client3@aurelle.uz', '$2b$10$K8zX3kJ5yF3kqXJ3qX3YeXqZ3YeYqZ3YeYqZ3YeYqZ3YeYqZ3Ye.', 'Alice Johnson', 'client', '+998901234575', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Salons
INSERT INTO salons (id, name, owner_id, city, address, description, phone, working_hours, rating, reviews_count, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Beauty Lounge Tashkent',
  u.id,
  'Tashkent',
  'Amir Temur Street, 12, Tashkent',
  'Premium beauty salon in the heart of Tashkent offering professional hair, nail, and skincare services.',
  '+998901234568',
  '{"monday": {"open": "09:00", "close": "20:00"}, "tuesday": {"open": "09:00", "close": "20:00"}, "wednesday": {"open": "09:00", "close": "20:00"}, "thursday": {"open": "09:00", "close": "20:00"}, "friday": {"open": "09:00", "close": "20:00"}, "saturday": {"open": "10:00", "close": "18:00"}, "sunday": {"open": "10:00", "close": "18:00"}}'::jsonb,
  4.8,
  0,
  NOW(),
  NOW()
FROM users u
WHERE u.email = 'salon1@aurelle.uz'
ON CONFLICT DO NOTHING;

INSERT INTO salons (id, name, owner_id, city, address, description, phone, working_hours, rating, reviews_count, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Elegant Salon Tashkent',
  u.id,
  'Tashkent',
  'Buyuk Ipak Yuli Street, 45, Tashkent',
  'Modern and elegant salon providing high-quality beauty services with experienced professionals.',
  '+998901234569',
  '{"monday": {"open": "09:00", "close": "20:00"}, "tuesday": {"open": "09:00", "close": "20:00"}, "wednesday": {"open": "09:00", "close": "20:00"}, "thursday": {"open": "09:00", "close": "20:00"}, "friday": {"open": "09:00", "close": "20:00"}, "saturday": {"open": "10:00", "close": "18:00"}, "sunday": {"open": "10:00", "close": "18:00"}}'::jsonb,
  4.5,
  0,
  NOW(),
  NOW()
FROM users u
WHERE u.email = 'salon2@aurelle.uz'
ON CONFLICT DO NOTHING;

-- Insert Services for Beauty Lounge
INSERT INTO services (id, salon_id, name, price, duration, category, description, created_at, updated_at)
SELECT
  gen_random_uuid(),
  s.id,
  service.name,
  service.price,
  service.duration,
  service.category,
  service.description,
  NOW(),
  NOW()
FROM salons s
CROSS JOIN (
  VALUES
    ('Women Haircut', 150000, 60, 'Hair', 'Professional women haircut with styling'),
    ('Men Haircut', 80000, 30, 'Hair', 'Classic men haircut'),
    ('Hair Coloring', 300000, 120, 'Hair', 'Full hair coloring service'),
    ('Manicure', 100000, 45, 'Nails', 'Classic manicure with polish'),
    ('Pedicure', 120000, 60, 'Nails', 'Professional pedicure service'),
    ('Facial Treatment', 200000, 90, 'Skincare', 'Deep cleansing facial treatment')
) AS service(name, price, duration, category, description)
WHERE s.name = 'Beauty Lounge Tashkent';

-- Insert Services for Elegant Salon
INSERT INTO services (id, salon_id, name, price, duration, category, description, created_at, updated_at)
SELECT
  gen_random_uuid(),
  s.id,
  service.name,
  service.price,
  service.duration,
  service.category,
  service.description,
  NOW(),
  NOW()
FROM salons s
CROSS JOIN (
  VALUES
    ('Women Haircut', 180000, 60, 'Hair', 'Premium women haircut with consultation'),
    ('Men Haircut', 100000, 30, 'Hair', 'Premium men haircut'),
    ('Hair Coloring', 350000, 150, 'Hair', 'Premium hair coloring with treatment'),
    ('Manicure', 120000, 45, 'Nails', 'Luxury manicure with gel polish'),
    ('Pedicure', 150000, 60, 'Nails', 'Spa pedicure treatment'),
    ('Massage', 250000, 90, 'Wellness', 'Relaxing full body massage')
) AS service(name, price, duration, category, description)
WHERE s.name = 'Elegant Salon Tashkent';

-- Insert Specialists (assign to Beauty Lounge)
INSERT INTO specialists (id, user_id, salon_id, specialization, bio, rating, reviews_count, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  s.id,
  'Hair Stylist',
  'Experienced hair stylist with 5+ years in the beauty industry.',
  4.7,
  0,
  NOW(),
  NOW()
FROM users u
CROSS JOIN salons s
WHERE u.email IN ('specialist1@aurelle.uz', 'specialist2@aurelle.uz', 'specialist3@aurelle.uz')
  AND s.name = 'Beauty Lounge Tashkent'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify created data
SELECT 'Users created:' AS info, COUNT(*) AS count FROM users WHERE email LIKE '%@aurelle.uz'
UNION ALL
SELECT 'Salons created:', COUNT(*) FROM salons WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%@aurelle.uz')
UNION ALL
SELECT 'Services created:', COUNT(*) FROM services WHERE salon_id IN (SELECT id FROM salons WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%@aurelle.uz'))
UNION ALL
SELECT 'Specialists created:', COUNT(*) FROM specialists WHERE user_id IN (SELECT id FROM users WHERE email IN ('specialist1@aurelle.uz', 'specialist2@aurelle.uz', 'specialist3@aurelle.uz'));

-- Display test credentials
SELECT
  '========================================' AS "TEST CREDENTIALS",
  '' AS " ",
  'All users password: password123' AS " ",
  '' AS " ",
  'ADMIN:' AS " ",
  '  admin@aurelle.uz' AS " ",
  '' AS " ",
  'SALON OWNERS:' AS " ",
  '  salon1@aurelle.uz' AS " ",
  '  salon2@aurelle.uz' AS " ",
  '' AS " ",
  'SPECIALISTS:' AS " ",
  '  specialist1@aurelle.uz' AS " ",
  '  specialist2@aurelle.uz' AS " ",
  '  specialist3@aurelle.uz' AS " ",
  '' AS " ",
  'CLIENTS:' AS " ",
  '  client1@aurelle.uz' AS " ",
  '  client2@aurelle.uz' AS " ",
  '  client3@aurelle.uz' AS " ",
  '========================================' AS " ";
