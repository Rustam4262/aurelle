#!/usr/bin/env bash
# Dump production database schema (no data) to local project
# Usage: ./db/scripts/dump_schema_from_prod.sh

set -e

PROD_SERVER="ubuntu@188.225.83.33"
CONTAINER_NAME="beauty_salon-db-1"
DB_NAME="beauty_salon"
DB_USER="beauty_user"

SCHEMA_FILE="db/schema/000_schema.sql"

echo "🔍 Dumping schema from production..."
echo "   Server: $PROD_SERVER"
echo "   Container: $CONTAINER_NAME"
echo "   Database: $DB_NAME"
echo ""

# Dump schema from production (schema-only, no data, no owner, no privileges)
ssh $PROD_SERVER "sudo docker exec -t $CONTAINER_NAME pg_dump \
  -U $DB_USER -d $DB_NAME \
  --schema-only \
  --no-owner \
  --no-privileges" > $SCHEMA_FILE

# Check if dump succeeded
if [ -s "$SCHEMA_FILE" ]; then
    echo "✅ Schema dumped successfully to $SCHEMA_FILE"

    # Show summary
    echo ""
    echo "📊 Schema summary:"
    echo "   Size: $(wc -c < $SCHEMA_FILE) bytes"
    echo "   Tables: $(grep -c 'CREATE TABLE' $SCHEMA_FILE || echo 0)"
    echo "   Indexes: $(grep -c 'CREATE INDEX' $SCHEMA_FILE || echo 0)"
    echo "   Enums: $(grep -c 'CREATE TYPE' $SCHEMA_FILE || echo 0)"
    echo ""
    echo "✅ Ready to use with docker-compose.local.yml"
else
    echo "❌ Schema dump failed or empty"
    exit 1
fi
