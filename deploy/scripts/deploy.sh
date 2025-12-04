#!/bin/bash

# ==========================================
# PRODUCTION DEPLOYMENT SCRIPT
# AURELLE - Beauty Salon Marketplace
# ==========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   log_error "Do not run this script as root!"
   exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    log_error ".env file not found!"
    log_info "Please copy .env.production.template to .env and configure it"
    exit 1
fi

log_info "Starting deployment..."

# 1. Pull latest code (if using git)
if [ -d ".git" ]; then
    log_info "Pulling latest code from git..."
    git pull origin main || git pull origin master
fi

# 2. Backup current database
log_info "Creating database backup..."
bash ./deploy/scripts/backup.sh

# 3. Stop current containers
log_info "Stopping current containers..."
docker-compose -f docker-compose.prod.yml down

# 4. Build new images
log_info "Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Start services
log_info "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# 6. Wait for services to be healthy
log_info "Waiting for services to be ready..."
sleep 10

# Check backend health
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_info "Backend is healthy!"
        break
    fi
    ATTEMPT=$((ATTEMPT+1))
    log_warn "Waiting for backend... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    log_error "Backend failed to start!"
    log_info "Check logs: docker-compose -f docker-compose.prod.yml logs backend"
    exit 1
fi

# 7. Run migrations
log_info "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# 8. Check container status
log_info "Checking container status..."
docker-compose -f docker-compose.prod.yml ps

# 9. Show logs
log_info "Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=50

log_info "================================"
log_info "Deployment completed successfully!"
log_info "================================"
log_info ""
log_info "Services:"
log_info "  Frontend: https://aurelle.uz"
log_info "  API: https://api.aurelle.uz"
log_info "  API Docs: https://api.aurelle.uz/docs"
log_info ""
log_info "Useful commands:"
log_info "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
log_info "  Stop: docker-compose -f docker-compose.prod.yml down"
log_info "  Restart: docker-compose -f docker-compose.prod.yml restart"
log_info ""
