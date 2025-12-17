#!/bin/bash

# ==========================================
# Development Environment Startup Script
# ==========================================

echo "🚀 Starting aurelle.uz development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found, copying from backend/.env.example..."
    cp backend/.env.example .env
    echo "✅ Please edit .env file with your settings"
fi

# Start Docker Compose
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if database is ready
echo "🔍 Checking database connection..."
docker-compose exec -T backend python -c "
from app.core.database import engine
try:
    with engine.connect() as conn:
        print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"

# Run migrations
echo "📦 Running database migrations..."
docker-compose exec -T backend alembic upgrade head

# Initialize database
echo "🌱 Initializing database..."
docker-compose exec -T backend python init_db.py

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📝 Services:"
echo "  - Backend API:     http://localhost:8000"
echo "  - API Docs:        http://localhost:8000/docs"
echo "  - Frontend:        http://localhost:5173"
echo "  - Database:        localhost:5432"
echo "  - Redis:           localhost:6379"
echo ""
echo "🔧 Useful commands:"
echo "  - View logs:       docker-compose logs -f"
echo "  - Stop services:   docker-compose down"
echo "  - Restart:         docker-compose restart"
echo ""
