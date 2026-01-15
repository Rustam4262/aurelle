-- Complete Database Setup Script for AURELLE Platform
-- This script creates all tables and test data
-- Run this in Database Client after creating the 'aurelle' database

-- Drop existing tables if they exist (optional - uncomment if needed)
-- DROP TABLE IF EXISTS bookings CASCADE;
-- DROP TABLE IF EXISTS services CASCADE;
-- DROP TABLE IF EXISTS specialists CASCADE;
-- DROP TABLE IF EXISTS salons CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

BEGIN;

-- ============ USERS TABLE ============
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'client' CHECK (role IN ('client', 'specialist', 'salon_owner', 'admin')),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============ SALONS TABLE ============
CREATE TABLE IF NOT EXISTS salons (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  owner_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  phone VARCHAR(20),
  working_hours JSONB,
  rating DECIMAL(3,2) DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salons_city ON salons(city);
CREATE INDEX IF NOT EXISTS idx_salons_owner ON salons(owner_id);

-- ============ SERVICES TABLE ============
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  salon_id VARCHAR NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  category VARCHAR(100),
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_salon ON services(salon_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- ============ SPECIALISTS TABLE ============
CREATE TABLE IF NOT EXISTS specialists (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  salon_id VARCHAR NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  specialization VARCHAR(255),
  bio TEXT,
  rating DECIMAL(3,2) DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialists_user ON specialists(user_id);
CREATE INDEX IF NOT EXISTS idx_specialists_salon ON specialists(salon_id);

-- ============ BOOKINGS TABLE ============
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  salon_id VARCHAR NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  service_id VARCHAR NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  specialist_id VARCHAR REFERENCES specialists(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);

-- ============ PAYMENTS TABLE ============
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  booking_id VARCHAR NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

COMMIT;

-- ============ INSERT TEST DATA ============

BEGIN;

-- Password hash for 'password123': $2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi

-- Insert Admin User
INSERT INTO users (id, email, password, name, role, phone, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'admin@aurelle.uz', '$2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi', 'Admin User', 'admin', '+998901234567', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Salon Owners
INSERT INTO users (id, email, password, name, role, phone, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'salon1@aurelle.uz', '$2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi', 'Beauty Lounge Owner', 'salon_owner', '+998901234568', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'salon2@aurelle.uz', '$2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi', 'Elegant Salon Owner', 'salon_owner', '+998901234569', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Specialists
INSERT INTO users (id, email, password, name, role, phone, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'specialist1@aurelle.uz', '$2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi', 'Maria Ivanova', 'specialist', '+998901234570', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'specialist2@aurelle.uz', '$2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi', 'Anna Petrova', 'specialist', '+998901234571', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'specialist3@aurelle.uz', '$2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi', 'Elena Sidorova', 'specialist', '+998901234572', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Clients
INSERT INTO users (id, email, password, name, role, phone, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'client1@aurelle.uz', '$2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi', 'John Doe', 'client', '+998901234573', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'client2@aurelle.uz', '$2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi', 'Jane Smith', 'client', '+998901234574', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'client3@aurelle.uz', '$2b$10$/5zsGX/aqLgpjsWhjV5T7.7QmbCWE5Lrhmt3jktsTrCl.pxG99sbi', 'Alice Johnson', 'client', '+998901234575', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Salons
INSERT INTO salons (id, name, owner_id, city, address, description, phone, working_hours, rating, reviews_count, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
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
  AND NOT EXISTS (SELECT 1 FROM salons WHERE name = 'Beauty Lounge Tashkent');

INSERT INTO salons (id, name, owner_id, city, address, description, phone, working_hours, rating, reviews_count, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
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
  AND NOT EXISTS (SELECT 1 FROM salons WHERE name = 'Elegant Salon Tashkent');

-- Insert Services for Beauty Lounge
INSERT INTO services (id, salon_id, name, price, duration, category, description, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
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
WHERE s.name = 'Beauty Lounge Tashkent'
  AND NOT EXISTS (
    SELECT 1 FROM services sv
    WHERE sv.salon_id = s.id AND sv.name = service.name
  );

-- Insert Services for Elegant Salon
INSERT INTO services (id, salon_id, name, price, duration, category, description, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
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
WHERE s.name = 'Elegant Salon Tashkent'
  AND NOT EXISTS (
    SELECT 1 FROM services sv
    WHERE sv.salon_id = s.id AND sv.name = service.name
  );

-- Insert Specialists (assign to Beauty Lounge)
INSERT INTO specialists (id, user_id, salon_id, specialization, bio, rating, reviews_count, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
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
  AND NOT EXISTS (
    SELECT 1 FROM specialists sp
    WHERE sp.user_id = u.id AND sp.salon_id = s.id
  );

COMMIT;

-- ============ VERIFY DATA ============

SELECT
  '========================================' AS "SETUP COMPLETE",
  '' AS " ";

SELECT 'USERS CREATED:' AS info, COUNT(*) AS count FROM users WHERE email LIKE '%@aurelle.uz'
UNION ALL
SELECT 'SALONS CREATED:', COUNT(*) FROM salons
UNION ALL
SELECT 'SERVICES CREATED:', COUNT(*) FROM services
UNION ALL
SELECT 'SPECIALISTS CREATED:', COUNT(*) FROM specialists;

SELECT
  '' AS " ",
  '========================================' AS " ",
  'TEST CREDENTIALS' AS " ",
  '========================================' AS " ",
  '' AS " ",
  'Password for ALL users: password123' AS " ",
  '' AS " ",
  'ADMIN:           admin@aurelle.uz' AS " ",
  'SALON OWNER 1:   salon1@aurelle.uz' AS " ",
  'SALON OWNER 2:   salon2@aurelle.uz' AS " ",
  'SPECIALIST 1:    specialist1@aurelle.uz' AS " ",
  'SPECIALIST 2:    specialist2@aurelle.uz' AS " ",
  'SPECIALIST 3:    specialist3@aurelle.uz' AS " ",
  'CLIENT 1:        client1@aurelle.uz' AS " ",
  'CLIENT 2:        client2@aurelle.uz' AS " ",
  'CLIENT 3:        client3@aurelle.uz' AS " ",
  '' AS " ",
  '========================================' AS " ",
  'Next step: npm run dev' AS " ",
  'Access: http://localhost:5000' AS " ",
  '========================================' AS " ";
