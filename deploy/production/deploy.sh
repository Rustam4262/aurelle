#!/bin/bash

# ============================================
# PRODUCTION DEPLOYMENT SCRIPT
# AURELLE - Beauty Salon Marketplace
# ============================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if .env exists
if [ ! -f ".env" ]; then
    log_error ".env file not found!"
    log_info "Please create .env file from .env.production.template"
    log_info "cp .env.production.template .env"
    log_info "nano .env  # Fill in all values"
    exit 1
fi

log_step "Starting deployment to production server..."

# 1. Validate environment variables
log_step "Validating environment variables..."
if ! grep -q "SECRET_KEY=" .env || grep -q "SECRET_KEY=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ" .env; then
    log_error "SECRET_KEY is not set or using default value!"
    log_info "Generate one with: openssl rand -hex 32"
    exit 1
fi

if ! grep -q "DATABASE_URL=" .env || grep -q "ВАШ_ПАРОЛЬ_БД" .env; then
    log_error "DATABASE_URL is not properly configured!"
    log_info "Update DATABASE_URL in .env with correct database password"
    exit 1
fi

log_info "Environment variables validated"

# 2. Stop existing containers
log_step "Stopping existing containers..."
docker-compose -f deploy/production/docker-compose.prod-external-db.yml down || true

# 3. Build images
log_step "Building Docker images..."
docker-compose -f deploy/production/docker-compose.prod-external-db.yml build --no-cache

# 4. Start services
log_step "Starting services..."
docker-compose -f deploy/production/docker-compose.prod-external-db.yml up -d

# 5. Wait for services
log_step "Waiting for services to be ready..."
sleep 15

# 6. Check backend health
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec -T backend curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_info "Backend is healthy!"
        break
    fi
    ATTEMPT=$((ATTEMPT+1))
    log_warn "Waiting for backend... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    log_error "Backend failed to start!"
    log_info "Check logs with: docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs backend"
    exit 1
fi

# 7. Run migrations
log_step "Running database migrations..."
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec -T backend alembic upgrade head

# 8. Check nginx
log_step "Checking Nginx..."
sleep 5
if docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec -T nginx nginx -t > /dev/null 2>&1; then
    log_info "Nginx configuration is valid!"
else
    log_warn "Nginx configuration check failed"
    docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec -T nginx nginx -t
fi

# 9. Final status
log_step "Deployment completed!"
echo ""
log_info "Services status:"
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps

echo ""
log_info "Access URLs:"
log_info "  Frontend: Check your server IP or domain"
log_info "  Backend API: Check your server IP or domain/api"
log_info "  API Docs: Check your server IP or domain/api/docs"
echo ""
log_info "To view logs:"
log_info "  docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs -f"
echo ""
log_info "To restart services:"
log_info "  docker-compose -f deploy/production/docker-compose.prod-external-db.yml restart"
echo ""

