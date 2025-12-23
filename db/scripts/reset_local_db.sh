#!/usr/bin/env bash
# Reset local database to clean state from schema.sql
# Usage: ./db/scripts/reset_local_db.sh

set -e

echo "🔥 Dropping local DB volume (full reset)..."
docker-compose -f docker-compose.local.yml down -v

echo ""
echo "🚀 Starting local DB from schema..."
docker-compose -f docker-compose.local.yml up -d db

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

# Wait for health check
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    health=$(docker inspect --format='{{.State.Health.Status}}' aurelle_db_local 2>/dev/null || echo "unknown")

    if [ "$health" = "healthy" ]; then
        echo "✅ Database is ready!"
        break
    fi

    echo "   Attempt $attempt/$max_attempts - Status: $health"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Database failed to start within timeout"
    exit 1
fi

echo ""
echo "📊 Verifying schema..."

# Check tables
tables=$(docker exec aurelle_db_local psql -U beauty_user -d beauty_salon -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")

echo "   Tables created: $tables"

if [ "$tables" = "0" ]; then
    echo "⚠️  WARNING: No tables found. Check db/schema/000_schema.sql exists"
fi

echo ""
echo "✅ Local DB is ready! Schema loaded from db/schema/000_schema.sql"
echo ""
echo "Next steps:"
echo "  • Start backend: docker-compose -f docker-compose.local.yml up -d backend"
echo "  • Start frontend: docker-compose -f docker-compose.local.yml up -d frontend"
echo "  • View logs: docker-compose -f docker-compose.local.yml logs -f"
