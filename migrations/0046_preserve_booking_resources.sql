-- Preserve both upcoming appointments and historical booking references.
-- Transactional replacement: no window without foreign-key enforcement.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_master_id_masters_id_fk;
ALTER TABLE bookings ADD CONSTRAINT bookings_master_id_masters_id_fk
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE RESTRICT;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_id_services_id_fk;
ALTER TABLE bookings ADD CONSTRAINT bookings_service_id_services_id_fk
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT;
COMMIT;
