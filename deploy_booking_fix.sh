#!/bin/bash
set -e

echo "🚀 Deploying All Fixes to Production..."
echo "   - Fix #1: Booking creation (master_id nullable)"
echo "   - Fix #2: Photo upload (directory initialization)"
echo "   - Fix #3: Geolocation feature (Yandex Maps)"
echo ""

# Navigate to project directory
cd /var/www/aurelle

# Pull latest changes
echo "📥 [1/6] Pulling latest changes from git..."
git pull origin main
echo "✓ Code updated"
echo ""

# Copy updated files to container
echo "📦 [2/6] Copying updated files to container..."
docker cp /var/www/aurelle/shared/schema.ts aurelle_app_1:/app/shared/schema.ts
docker cp /var/www/aurelle/drizzle.config.ts aurelle_app_1:/app/drizzle.config.ts
docker cp /var/www/aurelle/server/initUploads.ts aurelle_app_1:/app/server/initUploads.ts
docker cp /var/www/aurelle/server/index.ts aurelle_app_1:/app/server/index.ts
docker cp /var/www/aurelle/package.json aurelle_app_1:/app/package.json
docker cp /var/www/aurelle/package-lock.json aurelle_app_1:/app/package-lock.json
echo "✓ Files copied"
echo ""

# Install new dependencies
echo "📦 [3/6] Installing new dependencies..."
docker exec aurelle_app_1 npm install
echo "✓ Dependencies installed"
echo ""

# Push database schema changes
echo "🗄️  [4/6] Applying database schema changes..."
docker exec aurelle_app_1 npm run db:push
echo "✓ Schema updated"
echo ""

# Build application
echo "🔨 [5/6] Building application..."
docker exec aurelle_app_1 npm run build 2>&1 | tail -n 10
echo "✓ Build complete"
echo ""

# Restart application
echo "♻️  [6/6] Restarting application..."
docker restart aurelle_app_1
sleep 5
echo "✓ Application restarted"
echo ""

echo "✅ Deployment completed successfully!"
echo ""
echo "Checking application status..."
docker ps --filter name=aurelle_app_1 --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "📋 Recent logs:"
docker logs --tail=20 aurelle_app_1
