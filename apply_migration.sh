#!/bin/bash
# Apply migration to production database

set -e

echo "Applying migration: Make master_id nullable..."

# Execute the ALTER TABLE command
docker exec aurelle_postgres_1 psql -U aurelle_user -d aurelle -c "ALTER TABLE bookings ALTER COLUMN master_id DROP NOT NULL;"

echo "Migration applied successfully!"

# Verify the change
echo "Verifying column definition..."
docker exec aurelle_postgres_1 psql -U aurelle_user -d aurelle -c "\d bookings" | grep master_id

echo "Done!"
