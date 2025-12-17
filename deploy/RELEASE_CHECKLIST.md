# 🚀 AURELLE MVP Release Checklist

**Deadline:** 22.12.2025
**Status:** Release Candidate

---

## 📋 LOCAL RELEASE (CTO Machine)

### Prerequisites
- [ ] Docker + Docker Compose installed
- [ ] Git installed
- [ ] Ports available: 5173, 8000, 5432, 6379
- [ ] **Windows:** Use WSL2 Ubuntu or Docker Desktop with WSL integration

### Step 1: Clone & Setup (5 minutes)
```bash
# Clone repo
git clone <repo-url>
cd beauty_salon

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env 2>/dev/null || true
cp frontend/.env.local.example frontend/.env.local 2>/dev/null || true

# Review and update .env files with production secrets
# IMPORTANT: Change SECRET_KEY, DATABASE_URL, etc.
```

### Step 2: Build & Run (10 minutes)
```bash
# Clean start
docker compose down -v

# Build and start all containers
docker compose up -d --build

# Check all containers are healthy
docker compose ps
# Expected: backend, postgres, redis, frontend all "Up" and "healthy"
```

### Step 3: Seed MVP Data (2 minutes)
```bash
# Run MVP seeds (idempotent - safe to re-run)
docker compose exec backend python seed_mvp.py

# Expected output:
# ✅ 3 salons created
# ✅ 15 services created
# ✅ 6 masters created
# ✅ 90 service-master links created
```

### Step 4: Smoke Test (3 minutes)
```bash
# Test backend API
curl -s http://localhost:8000/api/salons | head -20

# Open in browser
# Frontend: http://localhost:5173
# Swagger:  http://localhost:8000/api/docs
```

### Step 5: UI E2E Test (5 minutes)
1. Open **Incognito window**: http://localhost:5173/login
2. Login: `client@test.uz` / `test123`
3. Navigate: Dashboard → Salons → Open Salon
4. Create booking: Select service → Select master → Pick date/time → Submit
5. Check: My Bookings page shows new booking

**✅ If all steps pass → LOCAL RELEASE SUCCESS**

---

## 🌐 PRODUCTION DEPLOYMENT (VPS)

### Prerequisites
- [ ] VPS with Ubuntu 20.04+ (2GB RAM minimum)
- [ ] Domain configured: `aurelle.uz`, `api.aurelle.uz`
- [ ] SSH access to VPS
- [ ] SSL certificate ready (Let's Encrypt)

### Step 1: VPS Setup
```bash
# SSH into VPS
ssh user@your-vps-ip

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Deploy Application
```bash
# Clone repo on VPS
git clone <repo-url> /var/www/beauty_salon
cd /var/www/beauty_salon

# Copy production env files
cp deploy/.env.prod .env
cp deploy/backend.env.prod backend/.env
cp deploy/frontend.env.prod frontend/.env.local

# IMPORTANT: Edit .env files with production secrets
nano .env
# Update: SECRET_KEY, DATABASE_URL, ALLOWED_HOSTS, CORS_ORIGINS

# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations & seeds
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
docker-compose -f docker-compose.prod.yml exec backend python seed_mvp.py
```

### Step 3: Nginx Configuration
```bash
# Install Nginx
sudo apt update && sudo apt install -y nginx

# Copy nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/aurelle.uz
sudo ln -s /etc/nginx/sites-available/aurelle.uz /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: SSL with Certbot
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d aurelle.uz -d www.aurelle.uz -d api.aurelle.uz

# Auto-renewal test
sudo certbot renew --dry-run
```

### Step 5: Production Sanity Check
- [ ] https://aurelle.uz loads (frontend)
- [ ] https://api.aurelle.uz/api/docs (Swagger)
- [ ] https://api.aurelle.uz/api/salons (returns JSON)
- [ ] Can register new user
- [ ] Can login
- [ ] Can create booking
- [ ] No CORS errors in browser console

**✅ If all checks pass → PRODUCTION RELEASE SUCCESS**

---

## 🔍 Troubleshooting

### Issue: Containers not starting
```bash
# Check logs
docker-compose logs backend
docker-compose logs postgres

# Common fixes
docker-compose down -v  # Clean volumes
docker system prune -a  # Clean all Docker resources
```

### Issue: 401 errors / auth not working
```bash
# Check SECRET_KEY matches in .env
docker-compose exec backend env | grep SECRET_KEY

# Restart backend
docker-compose restart backend
```

### Issue: Database connection errors
```bash
# Check postgres is healthy
docker-compose ps postgres

# Check connection from backend
docker-compose exec backend python -c "from app.core.database import engine; print(engine.url)"
```

### Issue: Frontend can't reach backend
```bash
# Check VITE_API_URL in frontend/.env.local
# Dev: http://localhost:8000/api
# Prod: https://api.aurelle.uz/api

# Rebuild frontend
docker-compose up -d --build frontend
```

---

## 📊 MVP Feature Status

### ✅ ENABLED (P0 - Core Features)
- Registration & Login (email or phone)
- Session persistence (F5 reload)
- Salons list (3 salons with addresses)
- Salon detail page (services + masters)
- Create booking (date/time picker)
- My Bookings page (list with status)
- Logout

### ❌ DISABLED (Post-MVP)
- Reviews system
- Chat with salons
- Favorites
- Personalized recommendations
- Yandex Maps integration
- Email/SMS notifications
- Payment processing

**Feature flags in `.env.local`:**
```
VITE_FEATURE_MAPS=false
VITE_FEATURE_CHAT=false
VITE_FEATURE_REVIEWS=false
VITE_FEATURE_FAVORITES=false
VITE_FEATURE_RECOMMENDATIONS=false
```

---

## 🎯 Success Criteria

**Local Release:** All 5 UI E2E steps pass without errors
**Production Release:** All 5 sanity checks pass + no 500 errors in 1 hour

---

## 📞 Support

**Issues:** Report at GitHub Issues
**Docs:** See `QUICKSTART.md` and `DEPLOYMENT.md`

**Created:** 2025-12-17
**Last Updated:** 2025-12-17
