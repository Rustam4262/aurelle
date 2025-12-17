#!/bin/bash
# AURELLE MVP - Local Setup Script for CTO
# Run this on your local machine to set up the development environment

set -e  # Exit on error

echo "🚀 AURELLE MVP - Local Setup"
echo "=============================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker: $(docker --version)"
echo "✅ Docker Compose: $(docker-compose --version 2>/dev/null || docker compose version)"
echo ""

# Copy environment files if they don't exist
echo "📁 Setting up environment files..."

if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and set production secrets!"
fi

if [ ! -f backend/.env ]; then
    echo "Creating backend/.env..."
    cp backend/.env.example backend/.env 2>/dev/null || echo "# Backend env" > backend/.env
fi

if [ ! -f frontend/.env.local ]; then
    echo "Creating frontend/.env.local..."
    cat > frontend/.env.local <<EOF
# API Configuration
VITE_API_URL=http://localhost:8000/api

# MVP Feature Flags
VITE_FEATURE_MAPS=false
VITE_FEATURE_CHAT=false
VITE_FEATURE_REVIEWS=false
VITE_FEATURE_FAVORITES=false
VITE_FEATURE_RECOMMENDATIONS=false

# Yandex Maps API Key
VITE_YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0
EOF
fi

echo "✅ Environment files ready"
echo ""

# Clean previous containers
echo "🧹 Cleaning previous containers..."
docker compose down -v 2>/dev/null || true
echo "✅ Cleaned"
echo ""

# Build and start
echo "🏗️  Building and starting containers..."
docker compose up -d --build

echo ""
echo "⏳ Waiting for containers to be healthy..."
sleep 10

# Check container status
echo ""
echo "📊 Container status:"
docker compose ps

# Seed MVP data
echo ""
echo "🌱 Seeding MVP data..."
docker compose exec backend python seed_mvp.py || echo "⚠️  Seed failed, but containers are running"

# Final status
echo ""
echo "✅ ============================================"
echo "✅  LOCAL RELEASE COMPLETE!"
echo "✅ ============================================"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   Swagger:   http://localhost:8000/api/docs"
echo ""
echo "👤 Test Credentials:"
echo "   Email:     client@test.uz"
echo "   Password:  test123"
echo ""
echo "📋 Next Steps:"
echo "   1. Open http://localhost:5173 in incognito browser"
echo "   2. Login with test credentials"
echo "   3. Test: Salons → Salon Detail → Create Booking → My Bookings"
echo ""
echo "🛑 To stop: docker compose down"
echo "🔄 To restart: docker compose restart"
echo "📜 To view logs: docker compose logs -f backend"
echo ""
