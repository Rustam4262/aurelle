#!/bin/bash
# AURELLE Server Setup Script
# Для сервера: 89.39.94.194
# Автоматическая установка и настройка

set -e

echo "🚀 AURELLE Server Setup Started"
echo "================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Clean old installation
echo -e "${BLUE}📦 Step 1: Cleaning old installation...${NC}"
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
rm -rf /var/www/aurelle
rm -rf /root/aurelle
rm -f /etc/nginx/sites-enabled/aurelle
rm -f /etc/nginx/sites-available/aurelle
echo -e "${GREEN}✅ Cleanup completed${NC}"

# Step 2: Install software
echo -e "${BLUE}📦 Step 2: Installing required software...${NC}"
apt update
apt install -y curl

# Node.js
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# PostgreSQL
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
fi

# Certbot
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Git
if ! command -v git &> /dev/null; then
    apt install -y git
fi

echo -e "${GREEN}✅ Software installation completed${NC}"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PostgreSQL: $(psql --version | head -1)"

# Step 3: Setup PostgreSQL
echo -e "${BLUE}📦 Step 3: Setting up PostgreSQL...${NC}"
sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS aurelle;
DROP USER IF EXISTS aurelle_user;
CREATE DATABASE aurelle;
CREATE USER aurelle_user WITH PASSWORD 'w2@nT*6D';
GRANT ALL PRIVILEGES ON DATABASE aurelle TO aurelle_user;
ALTER DATABASE aurelle OWNER TO aurelle_user;
EOF
echo -e "${GREEN}✅ PostgreSQL setup completed${NC}"

# Step 4: Create project directory
echo -e "${BLUE}📦 Step 4: Creating project directory...${NC}"
mkdir -p /var/www/aurelle
cd /var/www/aurelle

if [ -f "/root/aurelle-deploy.tar.gz" ]; then
    echo "Extracting project from archive..."
    tar -xzf /root/aurelle-deploy.tar.gz
    rm /root/aurelle-deploy.tar.gz
    echo -e "${GREEN}✅ Project extracted${NC}"
else
    echo -e "${RED}❌ Archive not found at /root/aurelle-deploy.tar.gz${NC}"
    echo "Please upload the archive first using:"
    echo "scp d:\\AURELLE\\aurelle-deploy.tar.gz root@89.39.94.194:/root/"
    exit 1
fi

# Step 5: Install dependencies
echo -e "${BLUE}📦 Step 5: Installing npm dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 6: Create .env file
echo -e "${BLUE}📦 Step 6: Creating .env file...${NC}"
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

cat > .env <<EOF
# Database
DATABASE_URL=postgresql://aurelle_user:w2@nT*6D@localhost:5432/aurelle

# Session Secret (auto-generated)
SESSION_SECRET=$SESSION_SECRET

# Production
NODE_ENV=production
PORT=5000

# Google OAuth
GOOGLE_CLIENT_ID=60089668488-9gvr0ahqda3neh2p3dsdvbofd39piguj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Yandex OAuth
YANDEX_CLIENT_ID=3b79a753092d49bb977ce1ec5b3017ec
YANDEX_CLIENT_SECRET=3086c3c9bf844b5298f801005307e4d4

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Twilio (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SERVICE_SID=
EOF

echo -e "${GREEN}✅ .env file created${NC}"

# Step 7: Build project
echo -e "${BLUE}📦 Step 7: Building project...${NC}"
npm run build
echo -e "${GREEN}✅ Project built${NC}"

# Step 8: Initialize database
echo -e "${BLUE}📦 Step 8: Initializing database...${NC}"
npm run db:push
echo -e "${GREEN}✅ Database initialized${NC}"

# Step 9: Setup Nginx
echo -e "${BLUE}📦 Step 9: Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/aurelle <<'NGINXCONF'
server {
    listen 80;
    listen [::]:80;
    server_name aurelle.uz www.aurelle.uz 89.39.94.194;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
NGINXCONF

ln -sf /etc/nginx/sites-available/aurelle /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
echo -e "${GREEN}✅ Nginx configured${NC}"

# Step 10: Start application
echo -e "${BLUE}📦 Step 10: Starting application with PM2...${NC}"
pm2 start npm --name "aurelle" -- start
pm2 startup systemd -u root --hp /root
pm2 save
echo -e "${GREEN}✅ Application started${NC}"

# Step 11: Setup firewall
echo -e "${BLUE}📦 Step 11: Configuring firewall...${NC}"
ufw allow ssh
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 'Nginx Full'
echo "y" | ufw enable
echo -e "${GREEN}✅ Firewall configured${NC}"

# Final status
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}🎉 AURELLE Setup Completed!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "✅ Application URLs:"
echo "   - http://aurelle.uz"
echo "   - http://www.aurelle.uz"
echo "   - http://89.39.94.194"
echo ""
echo "✅ PM2 Status: $(pm2 list | grep aurelle || echo 'running')"
echo ""
echo "📝 Next steps:"
echo "1. Setup SSL certificate:"
echo "   certbot --nginx -d aurelle.uz -d www.aurelle.uz"
echo ""
echo "2. Update OAuth redirect URIs to:"
echo "   - Google: https://aurelle.uz/api/auth/google/callback"
echo "   - Yandex: https://aurelle.uz/api/auth/yandex/callback"
echo ""
echo "📊 Useful commands:"
echo "  pm2 logs aurelle       - View logs"
echo "  pm2 restart aurelle    - Restart app"
echo "  pm2 monit             - Monitor"
echo ""
