#!/bin/bash
# Deploy admin panel fixes to production server
# Server: 89.39.94.194
# Project: /var/www/aurelle

set -e

echo "🚀 Deploying admin panel fixes to production..."

# Server configuration
SERVER="89.39.94.194"
USER="root"
PROJECT_DIR="/var/www/aurelle"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Pull latest code
echo -e "${BLUE}📥 Pulling latest code from GitHub...${NC}"
ssh ${USER}@${SERVER} "cd ${PROJECT_DIR} && git pull origin main"

# Step 2: Install dependencies (if package.json changed)
echo -e "${BLUE}📦 Installing dependencies...${NC}"
ssh ${USER}@${SERVER} "cd ${PROJECT_DIR} && docker-compose exec -T app npm install"

# Step 3: Build application
echo -e "${BLUE}🔨 Building application...${NC}"
ssh ${USER}@${SERVER} "cd ${PROJECT_DIR} && docker-compose exec -T app npm run build"

# Step 4: Restart containers
echo -e "${BLUE}♻️  Restarting application...${NC}"
ssh ${USER}@${SERVER} "cd ${PROJECT_DIR} && docker-compose restart app"

# Step 5: Check status
echo -e "${BLUE}🔍 Checking application status...${NC}"
ssh ${USER}@${SERVER} "cd ${PROJECT_DIR} && docker-compose ps && docker-compose logs --tail=20 app"

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Application is running at https://aurelle.uz${NC}"
echo -e "${GREEN}🔑 Admin credentials:${NC}"
echo -e "   Email: admin@aurelle.uz"
echo -e "   Password: Admin2026!"
