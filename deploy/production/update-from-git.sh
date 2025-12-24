#!/bin/bash

# ============================================
# UPDATE PRODUCTION FROM GIT
# AURELLE - Beauty Salon Marketplace
# ============================================
# This script pulls latest changes from GitHub
# and redeploys the application
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

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

cd "$PROJECT_ROOT"

log_step "Starting update from GitHub..."

# Check if .env exists
if [ ! -f ".env" ]; then
    log_error ".env file not found!"
    exit 1
fi

# Step 1: Pull latest code from GitHub
log_step "1/6 Pulling latest code from GitHub..."
if [ -d ".git" ]; then
    # Get current commit
    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    log_info "Current commit: $CURRENT_COMMIT"
    
    # Pull latest code
    git pull origin main || git pull origin master || {
        log_error "Failed to pull latest code!"
        exit 1
    }
    
    # Get new commit
    NEW_COMMIT=$(git rev-parse HEAD)
    
    if [ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]; then
        log_info "Already up to date!"
    else
        log_info "Updated from $CURRENT_COMMIT to $NEW_COMMIT"
        log_info "Changes:"
        git log --oneline $CURRENT_COMMIT..$NEW_COMMIT | head -10
    fi
else
    log_error "Not a git repository!"
    exit 1
fi
echo ""

# Step 2: Stop existing containers
log_step "2/6 Stopping existing containers..."
docker-compose -f deploy/production/docker-compose.prod-external-db.yml down || true
log_info "Containers stopped"
echo ""

# Step 3: Build new images
log_step "3/6 Building new Docker images..."
log_info "This may take a few minutes..."
docker-compose -f deploy/production/docker-compose.prod-external-db.yml build --no-cache || {
    log_error "Failed to build Docker images!"
    exit 1
}
log_info "Images built successfully"
echo ""

# Step 4: Start services
log_step "4/6 Starting services..."
docker-compose -f deploy/production/docker-compose.prod-external-db.yml up -d || {
    log_error "Failed to start services!"
    exit 1
}
log_info "Services started"
echo ""

# Step 5: Wait for backend to be ready
log_step "5/6 Waiting for backend to be ready..."
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
echo ""

# Step 6: Run migrations
log_step "6/6 Running database migrations..."
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec -T backend alembic upgrade head || {
    log_warn "Migrations failed or already up to date"
}
log_info "Migrations completed"
echo ""

# Final status
log_step "Update completed successfully!"
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

