# Phase 1 Owner Dashboard - Production Deployment Guide

## ✅ Development Complete

All Phase 1 features have been implemented and committed to the `main` branch:

**Commit:** `f29a2bf1` - "Phase 1: Owner Dashboard Improvements - Complete Implementation"

**Push Status:** ✅ Pushed to `origin/main`

---

## 🚀 Automated Deployment Process

The push to `main` has automatically triggered the **Deploy to Production** GitHub Actions workflow.

### Deployment Steps (Automated):

1. **Build & Prepare** (Job 1)
   - ✅ Checkout code
   - ✅ Install dependencies (`npm ci`)
   - ⚠️ TypeScript check (`npm run check`) - may have pre-existing errors
   - ✅ Build project (`npm run build`)
   - ✅ Create deployment package (`deploy.tar.gz`)
   - ✅ Upload artifact for deployment

2. **Manual Approval** (Job 2)
   - ⏸️ **REQUIRES YOUR ACTION**: Go to [GitHub Actions](https://github.com/Rustam4262/aurelle/actions) and approve the deployment
   - Environment: `production-approval`

3. **Deploy to Production** (Job 3 - after approval)
   - 📦 Backup current version (10 backups kept)
   - 📥 Upload deployment package to server
   - 📂 Extract to `/var/www/aurelle-production`
   - 📥 Install production dependencies
   - 💾 Backup database (safety)
   - 🗄️ Run database migrations (`drizzle-kit push`)
   - 🔄 Restart PM2 with zero-downtime reload
   - 🏥 Health checks (PM2 status, HTTP endpoints)
   - 🧪 Smoke tests (homepage, API endpoints)
   - 📢 Telegram/Slack notifications

---

## 📋 Manual Deployment Steps

If CI/CD fails or you prefer manual deployment:

### Step 1: Access Production Server

```bash
# SSH into production (adjust port if needed)
ssh root@89.169.172.197 -p 22
```

**Note:** If SSH connection is refused, the server may use a custom port. Check your deployment configs.

### Step 2: Pull Latest Changes

```bash
cd /var/www/aurelle-production  # or /root/aurelle
git pull origin main
```

### Step 3: Install Dependencies

```bash
npm ci --production
```

### Step 4: Run Database Migration

```bash
# Set DATABASE_URL from .env.production
export DATABASE_URL="postgresql://aurelle_user:aurelle_pass_2026@localhost:5433/aurelle_production"

# Apply schema changes
npx drizzle-kit push --config=drizzle.config.ts
```

**Expected Changes:**

- Add `services.booking_count`, `services.last_booked_at`, `services.display_order`
- Add `bookings.modified_by`, `bookings.modification_history`
- Create `master_statistics` table
- Create `booking_history` table
- Add indexes for performance

### Step 5: Build Application

```bash
npm run build
```

### Step 6: Restart PM2

```bash
# Zero-downtime reload
pm2 reload aurelle-production

# Or restart if needed
pm2 restart aurelle-production

# Save configuration
pm2 save
```

### Step 7: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs aurelle-production --lines 50

# Test API
curl http://localhost:5000/api/health
curl http://localhost:5000/api/owner/dashboard/overview
```

---

## 🧪 Testing Phase 1 Features

### 1. Dashboard Overview (Default Tab)

**URL:** https://aurelle.uz/owner

**Test Scenarios:**

- ✅ Login as owner
- ✅ Verify Dashboard tab is default/first tab
- ✅ Check KPI cards: Revenue, Bookings, Completion Rate, New Clients
- ✅ Verify week trends with percentage changes
- ✅ Check Top 5 Services list
- ✅ Check Top 5 Masters list
- ✅ Verify Recent Activity feed
- ✅ Check Alerts section for pending bookings
- ✅ Confirm auto-refresh (watch data update after 60s)

### 2. Service Management

**Tab:** Services

**Test Scenarios:**

- ✅ View all services across salons
- ✅ Edit service (name, description, price, duration) in EN/RU/UZ
- ✅ Drag-and-drop to reorder services
- ✅ Duplicate service to another salon
- ✅ Toggle service active/inactive
- ✅ Verify booking count and last booked date display

### 3. Master Management

**Tab:** Masters

**Test Scenarios:**

- ✅ View all masters with performance stats
- ✅ Edit master profile (name, bio, specialization, phone) in EN/RU/UZ
- ✅ Set working hours for each day of week
- ✅ Upload portfolio images (add image URL)
- ✅ Delete portfolio images
- ✅ Toggle master active/inactive
- ✅ Verify revenue, bookings, completion rate display (last 30 days)

### 4. Booking Management

**Tab:** Bookings

**Test Scenarios:**

- ✅ View bookings table with all columns
- ✅ Filter by status (pending, confirmed, completed, cancelled)
- ✅ Filter by salon
- ✅ Filter by master
- ✅ Filter by date range (from/to)
- ✅ Search by client name/email
- ✅ Sort by clicking column headers
- ✅ Paginate through results
- ✅ Select multiple bookings (checkboxes)
- ✅ Bulk update status with notes
- ✅ View modification history for a booking
- ✅ Export bookings to CSV

---

## 🔍 API Endpoints to Test

### Dashboard Endpoints

```bash
# Overview with KPIs
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://aurelle.uz/api/owner/dashboard/overview

# Recent activity
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://aurelle.uz/api/owner/dashboard/recent-activity

# Alerts
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://aurelle.uz/api/owner/dashboard/alerts
```

### Service Endpoints

```bash
# Get all services with stats
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://aurelle.uz/api/owner/services/stats

# Update service
curl -X PUT -H "Cookie: connect.sid=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' \
  https://aurelle.uz/api/owner/salons/SALON_ID/services/SERVICE_ID

# Reorder services
curl -X PUT -H "Cookie: connect.sid=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"services": [{"id": "SERVICE_ID", "displayOrder": 0}]}' \
  https://aurelle.uz/api/owner/services/reorder
```

### Master Endpoints

```bash
# Get all masters with stats
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  https://aurelle.uz/api/owner/masters/stats

# Update master
curl -X PUT -H "Cookie: connect.sid=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' \
  https://aurelle.uz/api/owner/salons/SALON_ID/masters/MASTER_ID
```

### Booking Endpoints

```bash
# Advanced search with filters
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  "https://aurelle.uz/api/owner/bookings/advanced?status=pending&limit=10"

# Bulk update
curl -X POST -H "Cookie: connect.sid=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"bookingIds": ["ID1", "ID2"], "status": "confirmed"}' \
  https://aurelle.uz/api/owner/bookings/bulk-update

# Export CSV
curl -H "Cookie: connect.sid=YOUR_SESSION" \
  "https://aurelle.uz/api/owner/bookings/export" > bookings.csv
```

---

## 🐛 Troubleshooting

### Issue: TypeScript Build Errors

**Status:** There are pre-existing TypeScript errors in `analytics-dashboard.tsx`, `server/upload.ts`, etc. These are NOT related to Phase 1 changes.

**Solution:**

- Phase 1 code is TypeScript-compliant
- If build fails, check that dependencies are installed: `npm install @dnd-kit/core @dnd-kit/sortable @tanstack/react-table`

### Issue: Database Migration Fails

**Error:** "Cannot find package 'drizzle-kit'"

**Solution:**

```bash
npm install drizzle-kit --save-dev
npx drizzle-kit push
```

### Issue: Missing Dependencies on Production

**Error:** "Cannot find module '@dnd-kit/core'"

**Solution:**

```bash
npm ci --production
# or
npm install @dnd-kit/core @dnd-kit/sortable @tanstack/react-table
```

### Issue: PM2 App Not Starting

**Solution:**

```bash
# Check logs
pm2 logs aurelle-production --lines 100

# Check environment variables
pm2 env aurelle-production

# Restart with full logs
pm2 delete aurelle-production
pm2 start dist/index.cjs --name aurelle-production -i max
```

### Issue: Dashboard Shows No Data

**Possible Causes:**

1. Database migration not applied
2. No bookings/services/masters in database
3. User is not logged in as owner
4. API endpoints returning errors

**Debug Steps:**

```bash
# Check database tables exist
psql -U aurelle_user -d aurelle_production -c "\dt"

# Check if new columns exist
psql -U aurelle_user -d aurelle_production -c "\d services"
psql -U aurelle_user -d aurelle_production -c "\d bookings"

# Check API response
curl -v https://aurelle.uz/api/owner/dashboard/overview
```

---

## 📊 Performance Expectations

### Database Queries

- Dashboard overview: ~200-500ms (depends on data volume)
- Services list: ~100-300ms
- Masters list: ~150-400ms (includes booking aggregations)
- Bookings table: ~200-600ms (with filters and pagination)

### Auto-Refresh

- Dashboard overview: Every 60 seconds
- Recent activity: Every 30 seconds
- Alerts: Every 30 seconds

### Indexes Added

- `services.booking_count` - for popularity sorting
- `services.display_order` - for drag-drop ordering
- `services.last_booked_at` - for recency filters

---

## ✅ Deployment Checklist

Before marking deployment as complete:

- [ ] GitHub Actions workflow completed successfully
- [ ] Database migration applied (check tables: `master_statistics`, `booking_history`)
- [ ] PM2 process is online and stable
- [ ] Dashboard Overview loads and shows KPIs
- [ ] Service Management drag-drop works
- [ ] Master Management displays stats correctly
- [ ] Booking Management filters work
- [ ] All 15 new API endpoints respond correctly
- [ ] No errors in PM2 logs
- [ ] Page load time < 3 seconds
- [ ] Mobile responsive (test on phone)
- [ ] Multi-language works (switch EN/RU/UZ)

---

## 📁 Files Changed (9 files, 3341+ lines added)

### Backend

- `server/routes/owner.routes.ts` - Added 15 new API endpoints (662 lines)
- `shared/schema.ts` - Updated schema with new tables and fields (60 lines)

### Frontend

- `client/src/components/owner-dashboard-overview.tsx` - 370 lines (NEW)
- `client/src/components/service-management.tsx` - 700 lines (NEW)
- `client/src/components/master-management.tsx` - 610 lines (NEW)
- `client/src/components/booking-management.tsx` - 700 lines (NEW)
- `client/src/pages/owner.tsx` - Integrated 7-tab layout (50 lines modified)

### Configuration

- `package.json` - Added dependencies: @dnd-kit, @tanstack/react-table
- `package-lock.json` - Dependency lock file updated

---

## 🎯 Next Steps (Future Phases)

After Phase 1 is verified in production, the remaining 14 tasks can be implemented:

**Phase 2** (Priority 1):

- Financial Analytics Dashboard
- Review & Rating Management
- Data Export System
- Advanced Search & Filtering

**Phase 3** (Priority 1):

- Client CRM System
- Interactive Calendar View
- Salon Settings Management
- Mobile App Optimization

**Phase 4** (Priority 2):

- Real-time Notifications
- Third-party Integrations
- Multi-salon Dashboard

**Phase 5** (Priority 2):

- Loyalty Program
- AI-powered Recommendations
- A/B Testing Framework

---

## 📞 Support

If deployment issues occur:

1. Check GitHub Actions logs: https://github.com/Rustam4262/aurelle/actions
2. SSH into production and check PM2 logs
3. Verify database connection and migration status
4. Test API endpoints directly with curl
5. Check browser console for frontend errors

**Emergency Rollback:**

```bash
# Via GitHub Actions
gh workflow run rollback.yml -f environment=production -f backup=latest

# Or manually on server
cd /var/www/aurelle-production-backups
cp -r latest/* /var/www/aurelle-production/
pm2 restart aurelle-production
```

---

**Deployment Status:** ⏸️ Awaiting GitHub Actions approval

**Next Action:** Approve production deployment in [GitHub Actions](https://github.com/Rustam4262/aurelle/actions)
