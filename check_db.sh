#!/bin/bash
# Check master_id column in bookings table
docker exec aurelle_postgres_1 psql -U aurelle_user -d aurelle -c "\d bookings" | grep master_id
