#!/bin/bash

# ==========================================
# SAFE UPDATE SCRIPT
# AURELLE - Beauty Salon Marketplace
# ==========================================
# Безопасное обновление приложения с автоматическим бэкапом
# Использование:
#   bash update.sh
# ==========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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
    echo -e "${CYAN}[STEP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
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

log_info "============================================"
log_info "  AURELLE - SAFE UPDATE PROCESS"
log_info "============================================"
log_info ""

# Step 1: Create backup
log_step "1/7 Creating database backup..."
bash ./deploy/scripts/backup.sh || {
    log_error "Backup failed! Aborting update."
    exit 1
}
log_success "Backup created successfully"
echo ""

# Step 2: Pull latest code (if using git)
if [ -d ".git" ]; then
    log_step "2/7 Pulling latest code from git..."

    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        log_warn "You have uncommitted changes!"
        log_warn "Please commit or stash them before updating."
        git status --short
        exit 1
    fi

    # Get current commit
    CURRENT_COMMIT=$(git rev-parse HEAD)
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
        log_success "Updated from $CURRENT_COMMIT to $NEW_COMMIT"

        # Show changes
        log_info "Changes:"
        git log --oneline $CURRENT_COMMIT..$NEW_COMMIT
    fi
else
    log_step "2/7 Skipping git pull (not a git repository)"
fi
echo ""

# Step 3: Check Docker containers health before update
log_step "3/7 Checking current system health..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    log_success "Containers are running"
else
    log_warn "Some containers are not running"
fi
echo ""

# Step 4: Build new images
log_step "4/7 Building new Docker images..."
log_info "This may take a few minutes..."
docker-compose -f docker-compose.prod.yml build --no-cache || {
    log_error "Failed to build Docker images!"
    log_warn "Your current version is still running."
    exit 1
}
log_success "Images built successfully"
echo ""

# Step 5: Stop current containers
log_step "5/7 Stopping current containers..."
docker-compose -f docker-compose.prod.yml down || {
    log_error "Failed to stop containers!"
    exit 1
}
log_success "Containers stopped"
echo ""

# Step 6: Start new containers
log_step "6/7 Starting updated containers..."
docker-compose -f docker-compose.prod.yml up -d || {
    log_error "Failed to start containers!"
    log_warn "Attempting rollback..."
    docker-compose -f docker-compose.prod.yml up -d
    exit 1
}
log_success "Containers started"
echo ""

# Wait for services to be ready
log_info "Waiting for services to initialize..."
sleep 10

# Step 7: Run migrations and health checks
log_step "7/7 Running database migrations and health checks..."

# Run migrations
log_info "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head || {
    log_error "Migration failed!"
    log_warn "Database might be in inconsistent state."
    log_info "Check logs: docker-compose -f docker-compose.prod.yml logs backend"
    exit 1
}
log_success "Migrations completed"

# Check backend health
log_info "Checking backend health..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Backend is healthy!"
        break
    fi
    ATTEMPT=$((ATTEMPT+1))
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        log_error "Backend failed to start!"
        log_info "Check logs: docker-compose -f docker-compose.prod.yml logs backend"
        exit 1
    fi
    sleep 2
done

# Check all containers
log_info "Checking all containers..."
docker-compose -f docker-compose.prod.yml ps

echo ""
log_info "============================================"
log_success "UPDATE COMPLETED SUCCESSFULLY!"
log_info "============================================"
echo ""
log_info "Services:"
log_info "  Frontend: https://aurelle.uz"
log_info "  API: https://api.aurelle.uz"
log_info "  API Docs: https://api.aurelle.uz/docs"
echo ""
log_info "Useful commands:"
log_info "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
log_info "  Check status: docker-compose -f docker-compose.prod.yml ps"
log_info "  Restart service: docker-compose -f docker-compose.prod.yml restart [service]"
echo ""
log_warn "💡 Test your application thoroughly!"
log_warn "💡 If you encounter issues, restore from backup:"
log_warn "    bash ./deploy/scripts/restore.sh ./backups/backup_XXXXXX.sql.gz"
echo ""
