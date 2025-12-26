#!/bin/bash
set -e

echo "🚀 Starting AURELLE deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Pull latest changes
echo -e "${BLUE}📥 Pulling latest changes from git...${NC}"
git pull origin main

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Build application
echo -e "${BLUE}🔨 Building application...${NC}"
npm run build

# Update database schema
echo -e "${BLUE}🗄️  Updating database schema...${NC}"
npm run db:push

# Restart application
echo -e "${BLUE}♻️  Restarting application...${NC}"
pm2 restart aurelle

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Application is running at https://$(hostname -f)${NC}"
