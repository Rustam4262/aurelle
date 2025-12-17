# 📦 AURELLE MVP Deployment Package

**Created:** 2025-12-17
**Status:** Release Candidate
**Target Date:** 22.12.2025

---

## 📁 Package Contents

```
deploy/
├── README.md                    # This file
├── RELEASE_CHECKLIST.md         # Complete step-by-step release guide
├── setup-local.sh               # One-command local setup script
├── .env.prod.example            # Production environment template
├── docker-compose.prod.yml      # Production Docker config
└── nginx.conf                   # Production Nginx reverse proxy config
```

---

## 🚀 Quick Start (Local - CTO Machine)

### One-Command Setup
```bash
cd beauty_salon
./deploy/setup-local.sh
```

This script will:
1. Check Docker prerequisites
2. Create `.env` files
3. Build and start all containers
4. Seed MVP data (3 salons, 15 services, 6 masters)
5. Display access URLs and test credentials

### Manual Setup
```bash
# 1. Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 2. Start containers
docker compose down -v
docker compose up -d --build

# 3. Seed data
docker compose exec backend python seed_mvp.py

# 4. Check status
docker compose ps
```

### Access Points
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Swagger Docs:** http://localhost:8000/api/docs

### Test Credentials
- **Email:** client@test.uz
- **Password:** test123

---

## 🌐 Production Deployment (VPS)

See detailed guide in [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md#production-deployment-vps)

### Quick Overview
1. **Provision VPS** (Ubuntu 20.04+, 2GB RAM)
2. **Install Docker** + Docker Compose
3. **Clone repo** to `/var/www/beauty_salon`
4. **Configure `.env`** with production secrets
5. **Deploy:** `docker-compose -f docker-compose.prod.yml up -d --build`
6. **Setup Nginx** reverse proxy
7. **Get SSL** with Let's Encrypt
8. **Run seeds:** `docker-compose exec backend python seed_mvp.py`

---

## ✅ MVP Features (Enabled)

| Feature | Status | Description |
|---------|--------|-------------|
| Registration | ✅ | Email or phone + password |
| Login | ✅ | JWT tokens with refresh |
| Session | ✅ | Persists after F5 reload |
| Salons List | ✅ | 3 salons with addresses |
| Salon Detail | ✅ | Services + masters list |
| Create Booking | ✅ | Date/time picker, master selection |
| My Bookings | ✅ | List with status (pending/confirmed) |
| Logout | ✅ | Clears tokens, redirects to login |

---

## ❌ Disabled Features (Post-MVP)

Controlled via feature flags in `.env.local`:

```env
VITE_FEATURE_MAPS=false
VITE_FEATURE_CHAT=false
VITE_FEATURE_REVIEWS=false
VITE_FEATURE_FAVORITES=false
VITE_FEATURE_RECOMMENDATIONS=false
```

To enable after MVP launch:
1. Change flag to `true`
2. Uncomment code in respective components
3. Re-enable backend routes in `main.py`
4. Rebuild and deploy

---

## 🧪 Testing Checklist

### Smoke Test (2 minutes)
```bash
# API health
curl http://localhost:8000/api/salons

# Frontend loads
curl http://localhost:5173

# Swagger available
open http://localhost:8000/api/docs
```

### UI E2E Test (5 minutes)
1. **Incognito browser** → http://localhost:5173/login
2. **Login:** client@test.uz / test123
3. **Navigate:** Dashboard → Salons
4. **Open salon** → verify services + masters load
5. **Create booking** → select service/master/time
6. **Submit** → check POST /bookings returns 201
7. **My Bookings** → verify new booking appears

**✅ Success:** All steps complete without errors

---

## 🔧 Troubleshooting

### Containers won't start
```bash
docker compose down -v
docker system prune -a
docker compose up -d --build
```

### 401 errors
```bash
# Check SECRET_KEY
docker compose exec backend env | grep SECRET_KEY

# Restart backend
docker compose restart backend
```

### Database errors
```bash
# Check postgres
docker compose ps postgres

# View logs
docker compose logs postgres
```

### Frontend can't reach backend
```bash
# Check VITE_API_URL
cat frontend/.env.local | grep VITE_API_URL

# Should be: http://localhost:8000/api (local)
# Or: https://api.aurelle.uz/api (prod)
```

---

## 📊 Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│    Nginx    │ (SSL termination, reverse proxy)
└──────┬──────┘
       │
       ├──────► Frontend (React SPA on port 5173)
       │
       └──────► Backend API (FastAPI on port 8000)
                    │
                    ├──► PostgreSQL (port 5432)
                    └──► Redis (port 6379)
```

---

## 📝 Environment Variables

### Required (Production)
- `SECRET_KEY` - 64-char random string for JWT
- `DATABASE_URL` - PostgreSQL connection string
- `ALLOWED_HOSTS` - Comma-separated domains
- `CORS_ORIGINS` - Comma-separated frontend URLs

### Optional (MVP disabled)
- `SENTRY_DSN` - Error tracking
- `SMTP_*` - Email notifications
- `SMS_*` - SMS notifications
- `PAYME_*`, `CLICK_*`, `UZUM_*` - Payment providers

See `.env.prod.example` for full list.

---

## 🎯 Success Metrics

**Local Release:**
- ✅ All containers healthy
- ✅ UI E2E test passes
- ✅ No console errors

**Production Release:**
- ✅ HTTPS works (SSL valid)
- ✅ API responds within 200ms
- ✅ No 500 errors in first hour
- ✅ User can create booking

---

## 📞 Support

**Documentation:**
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) - Complete deployment guide
- [../QUICKSTART.md](../QUICKSTART.md) - Quick start guide
- [../DEPLOYMENT.md](../DEPLOYMENT.md) - Advanced deployment topics

**Issues:**
- Report bugs at GitHub Issues
- Contact: CTO

---

**Last Updated:** 2025-12-17
**Version:** MVP 1.0 RC
