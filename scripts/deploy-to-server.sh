#!/bin/bash

# Script to deploy AURELLE to production server from VS Code
# Usage: bash scripts/deploy-to-server.sh

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="89.39.94.194"
SERVER_USER="root"
SERVER_PATH="/var/www/aurelle"
APP_NAME="aurelle-production"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AURELLE Production Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check if git is clean
echo -e "${YELLOW}[1/8]${NC} Checking git status..."
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠${NC}  You have uncommitted changes:"
    git status -s
    echo ""
    read -p "Do you want to commit these changes? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " commit_msg
        git add .
        git commit -m "$commit_msg"
    else
        echo -e "${RED}✗${NC} Deployment cancelled. Please commit or stash your changes."
        exit 1
    fi
fi
echo -e "${GREEN}✓${NC} Git status clean"

# Step 2: Push to GitHub
echo ""
echo -e "${YELLOW}[2/8]${NC} Pushing to GitHub..."
git push origin main
echo -e "${GREEN}✓${NC} Pushed to GitHub"

# Step 3: Check SSH connection
echo ""
echo -e "${YELLOW}[3/8]${NC} Checking SSH connection to $SERVER_IP..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes $SERVER_USER@$SERVER_IP exit 2>/dev/null; then
    echo -e "${GREEN}✓${NC} SSH connection successful"
else
    echo -e "${RED}✗${NC} Cannot connect to server via SSH"
    echo "Please ensure:"
    echo "  1. Server IP is correct: $SERVER_IP"
    echo "  2. SSH key is configured"
    echo "  3. Server is accessible"
    exit 1
fi

# Step 4: Check if server has the project
echo ""
echo -e "${YELLOW}[4/8]${NC} Checking server setup..."
ssh $SERVER_USER@$SERVER_IP "
    if [ ! -d $SERVER_PATH/current ]; then
        echo '${YELLOW}⚠${NC}  Project not found on server. Setting up...'

        # Install prerequisites
        echo 'Installing Node.js 20...'
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs

        echo 'Installing PM2...'
        npm install -g pm2

        echo 'Installing PostgreSQL and Nginx...'
        apt install -y postgresql nginx

        # Create directory
        mkdir -p $SERVER_PATH
        cd $SERVER_PATH

        # Clone repository
        echo 'Cloning repository...'
        git clone https://github.com/Rustam4262/aurelle.git current

        echo '${GREEN}✓${NC} Server setup complete'
    else
        echo '${GREEN}✓${NC} Project found on server'
    fi
"

# Step 5: Pull latest changes on server
echo ""
echo -e "${YELLOW}[5/8]${NC} Pulling latest changes on server..."
ssh $SERVER_USER@$SERVER_IP "
    cd $SERVER_PATH/current
    git pull origin main
"
echo -e "${GREEN}✓${NC} Latest changes pulled"

# Step 6: Install dependencies and build
echo ""
echo -e "${YELLOW}[6/8]${NC} Installing dependencies and building..."
ssh $SERVER_USER@$SERVER_IP "
    cd $SERVER_PATH/current

    # Install dependencies
    echo 'Installing dependencies...'
    npm ci --production

    # Build project
    echo 'Building project...'
    npm run build
"
echo -e "${GREEN}✓${NC} Build complete"

# Step 7: Restart application
echo ""
echo -e "${YELLOW}[7/8]${NC} Restarting application..."
ssh $SERVER_USER@$SERVER_IP "
    # Check if PM2 process exists
    if pm2 list | grep -q $APP_NAME; then
        echo 'Reloading application (zero-downtime)...'
        pm2 reload $APP_NAME
    else
        echo 'Starting application for the first time...'
        cd $SERVER_PATH/current
        pm2 start npm --name $APP_NAME -- start
        pm2 save
    fi
"
echo -e "${GREEN}✓${NC} Application restarted"

# Step 8: Health check
echo ""
echo -e "${YELLOW}[8/8]${NC} Running health checks..."
sleep 3

# Check PM2 status
ssh $SERVER_USER@$SERVER_IP "pm2 status $APP_NAME" > /tmp/pm2_status.txt

if grep -q "online" /tmp/pm2_status.txt; then
    echo -e "${GREEN}✓${NC} PM2 status: online"
else
    echo -e "${RED}✗${NC} PM2 status: not online"
    ssh $SERVER_USER@$SERVER_IP "pm2 logs $APP_NAME --lines 20 --err"
    exit 1
fi

# Check HTTP
HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" http://$SERVER_IP 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} HTTP check: OK (200)"
else
    echo -e "${YELLOW}⚠${NC}  HTTP check: $HTTP_CODE"
fi

# Display final status
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Server: http://$SERVER_IP"
echo "PM2 status: $(ssh $SERVER_USER@$SERVER_IP "pm2 list | grep $APP_NAME")"
echo ""
echo "Useful commands:"
echo "  View logs:    ssh $SERVER_USER@$SERVER_IP \"pm2 logs $APP_NAME\""
echo "  Check status: ssh $SERVER_USER@$SERVER_IP \"pm2 status\""
echo "  Restart:      ssh $SERVER_USER@$SERVER_IP \"pm2 restart $APP_NAME\""
echo ""
echo -e "${BLUE}🎉 Your application is now live!${NC}"
