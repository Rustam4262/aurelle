#!/bin/bash

# ==========================================
# Production Environment Startup Script
# ==========================================

echo "🚀 Starting aurelle.uz production environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Please create .env file with production settings"
    exit 1
fi

# Validate critical environment variables
echo "🔍 Validating environment variables..."

required_vars=(
    "SECRET_KEY"
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
    "SMTP_HOST"
    "SMTP_USER"
    "SMTP_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env; then
        echo "❌ ERROR: ${var} is not set in .env"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Pull latest changes (if this is a git repository)
if [ -d .git ]; then
    echo "📥 Pulling latest changes from git..."
    git pull origin main
fi

# Build and start containers
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check health of services
echo "🏥 Checking service health..."

services=("postgres" "redis" "backend")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "${service}.*Up"; then
        echo "  ✅ ${service} is running"
    else
        echo "  ❌ ${service} is not running"
        docker-compose -f docker-compose.prod.yml logs ${service}
        exit 1
    fi
done

# Run migrations
echo "📦 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# Check backend health endpoint
echo "🔍 Checking backend health..."
for i in {1..30}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend health check failed"
        docker-compose -f docker-compose.prod.yml logs backend
        exit 1
    fi
    echo "  Waiting for backend... ($i/30)"
    sleep 2
done

echo ""
echo "✅ Production environment is running!"
echo ""
echo "📝 Services:"
echo "  - Backend API:     http://localhost:8000"
echo "  - Frontend:        http://localhost"
echo "  - Flower (Celery): http://localhost:5555"
echo ""
echo "🔧 Useful commands:"
echo "  - View logs:       docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Stop services:   docker-compose -f docker-compose.prod.yml down"
echo "  - Restart:         docker-compose -f docker-compose.prod.yml restart"
echo "  - Stats:           docker stats"
echo ""
echo "⚠️  Don't forget to:"
echo "  - Configure SSL certificates"
echo "  - Set up domain DNS records"
echo "  - Configure backup schedule"
echo "  - Set up monitoring (Sentry)"
echo ""
