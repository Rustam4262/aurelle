-- AURELLE Production Manual Wipe
-- Execute this SQL directly in psql if you prefer manual control
--
-- Connection:
-- docker exec -i beauty_db_prod psql -U beauty_user -d beauty_salon_db < manual_wipe.sql
--
-- OR interactive:
-- docker exec -it beauty_db_prod psql -U beauty_user -d beauty_salon_db
-- Then copy-paste this SQL

BEGIN;

-- Show current state
SELECT 'BEFORE WIPE:' as status;
SELECT
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'salons', COUNT(*) FROM salons
UNION ALL SELECT 'masters', COUNT(*) FROM masters
UNION ALL SELECT 'services', COUNT(*) FROM services
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews;

-- ============================================
-- TRUNCATE TABLES (FK-aware order)
-- ============================================

-- Level 1: No dependencies
TRUNCATE TABLE consent_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_consents RESTART IDENTITY CASCADE;
TRUNCATE TABLE idempotency_keys RESTART IDENTITY CASCADE;
TRUNCATE TABLE login_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE refresh_tokens RESTART IDENTITY CASCADE;
TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE;

-- Level 2: Notifications
TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;

-- Level 3: Reviews
TRUNCATE TABLE reviews RESTART IDENTITY CASCADE;

-- Level 4: Chat
TRUNCATE TABLE chat_messages RESTART IDENTITY CASCADE;

-- Level 5: Bookings
TRUNCATE TABLE bookings RESTART IDENTITY CASCADE;

-- Level 6: Master schedules
TRUNCATE TABLE time_slots RESTART IDENTITY CASCADE;
TRUNCATE TABLE work_shifts RESTART IDENTITY CASCADE;
TRUNCATE TABLE master_day_offs RESTART IDENTITY CASCADE;
TRUNCATE TABLE master_schedules RESTART IDENTITY CASCADE;

-- Level 7: Service-Master links
TRUNCATE TABLE service_masters RESTART IDENTITY CASCADE;

-- Level 8: Services
TRUNCATE TABLE services RESTART IDENTITY CASCADE;

-- Level 9: Masters
TRUNCATE TABLE masters RESTART IDENTITY CASCADE;

-- Level 10: Salon-related
TRUNCATE TABLE promo_codes RESTART IDENTITY CASCADE;
TRUNCATE TABLE favorites RESTART IDENTITY CASCADE;

-- Level 11: Salons
TRUNCATE TABLE salons RESTART IDENTITY CASCADE;

-- ============================================
-- DELETE USERS (except admin ID 14)
-- ============================================

DELETE FROM users WHERE id <> 14;

-- Ensure admin is active
UPDATE users SET is_active = TRUE WHERE id = 14;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'AFTER WIPE:' as status;
SELECT
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'salons', COUNT(*) FROM salons
UNION ALL SELECT 'masters', COUNT(*) FROM masters
UNION ALL SELECT 'services', COUNT(*) FROM services
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews;

SELECT 'PRESERVED ADMIN:' as info;
SELECT id, phone, email, role, is_active FROM users WHERE id = 14;

-- Review before committing!
-- If everything looks good, type: COMMIT;
-- If something is wrong, type: ROLLBACK;

-- Uncomment to auto-commit:
-- COMMIT;
