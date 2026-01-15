# 🚀 Ready to Deploy - Production Fixes

## What's Being Fixed

### ✅ Fix #1: Booking Creation Error (500)
**Problem:** Clients couldn't book services - "booking failed 500" error
**Solution:** Made `master_id` optional in database (allows booking without selecting specific master)

### ✅ Fix #2: Photo Upload Failure
**Problem:** "Upload failed" error when uploading photos
**Solution:** Automatically create upload directories on server startup

---

## 📋 Quick Deployment (One Command)

SSH to your production server and run:

```bash
ssh root@185.217.131.144
cd /var/www/aurelle
bash deploy_booking_fix.sh
```

That's it! The script will:
1. Pull latest code from GitHub ✓
2. Copy updated files to Docker container ✓
3. Apply database schema changes ✓
4. Rebuild the application ✓
5. Restart the server ✓

---

## 🔍 Manual Deployment (Step by Step)

If you prefer manual control:

```bash
# SSH to server
ssh root@185.217.131.144

# Navigate to project
cd /var/www/aurelle

# Pull latest code
git pull origin main

# Copy files to container
docker cp /var/www/aurelle/shared/schema.ts aurelle_app_1:/app/shared/schema.ts
docker cp /var/www/aurelle/server/initUploads.ts aurelle_app_1:/app/server/initUploads.ts
docker cp /var/www/aurelle/server/index.ts aurelle_app_1:/app/server/index.ts

# Apply database changes
docker exec aurelle_app_1 npm run db:push

# Rebuild
docker exec aurelle_app_1 npm run build

# Restart
docker restart aurelle_app_1

# Check status
docker logs --tail=20 aurelle_app_1
```

---

## ✅ Testing After Deployment

### Test Booking Fix:
1. Go to https://aurelle.uz
2. Log in as a client
3. Select any salon
4. Choose a service
5. **Don't select a master** (leave it empty/any)
6. Fill in date and time
7. Click "Записаться" (Book)
8. ✅ Should succeed without 500 error

### Test Photo Upload:
1. Log in as salon owner at https://aurelle.uz/owner
2. Click "Фотографии" (Photos)
3. Click "Добавить фото" (Add photo)
4. Select an image file from your computer
5. ✅ Should upload successfully

Or test as master:
1. Log in as master at https://aurelle.uz/master
2. Go to "Мое портфолио" (My Portfolio)
3. Click "Добавить фото"
4. Select an image
5. ✅ Should upload successfully

---

## 🛟 Rollback (If Needed)

If something goes wrong:

```bash
# Restore database from backup
docker exec -i aurelle_postgres_1 psql -U aurelle_user -d aurelle < /root/backups/backup_before_update_20260105_005003.sql

# Revert code to previous version
cd /var/www/aurelle
git checkout 60eba506  # Last known good commit

# Copy old files
docker cp /var/www/aurelle/shared/schema.ts aurelle_app_1:/app/shared/schema.ts
docker cp /var/www/aurelle/server/index.ts aurelle_app_1:/app/server/index.ts

# Rebuild and restart
docker exec aurelle_app_1 npm run build
docker restart aurelle_app_1
```

---

## 📊 Deployment Timeline

- **Estimated time:** 3-5 minutes
- **Downtime:** ~10 seconds (during container restart)
- **Risk level:** Low (database changes are safe, have backup)

---

## 📞 Support

If you encounter any issues:

1. **Check logs:**
   ```bash
   docker logs -f aurelle_app_1
   ```

2. **Check database:**
   ```bash
   docker exec aurelle_postgres_1 psql -U aurelle_user -d aurelle -c "\d bookings" | grep master_id
   ```
   Should show: `master_id | varchar | | |` (no "not null")

3. **Check upload directories:**
   ```bash
   docker exec aurelle_app_1 ls -la /app/server/uploads/
   ```
   Should show: `salons/`, `masters/`, `portfolio/`, `avatars/`

---

## 🎯 All Three Fixes Complete!

### ✅ Fix #1: Booking Creation (master_id nullable)
- Clients can now book without selecting specific master
- Database constraint removed

### ✅ Fix #2: Photo Upload (directory initialization)
- Upload directories auto-created on server startup
- Master portfolio and salon photos work

### ✅ Fix #3: Geolocation Feature (NEW!)
- Salon owners can set location via Yandex Maps
- Clients see salon location on interactive map
- Copy address and open in Yandex Maps buttons
- Search, click on map, or use current location

**Note:** Fix #3 requires rebuilding the frontend to include new components and dependencies.

---

**Deployment prepared:** January 5, 2026
**Files updated:**
- `shared/schema.ts` (master_id nullable)
- `server/initUploads.ts` (new file - upload dirs)
- `server/index.ts` (initialize uploads)
- `client/src/components/location-picker.tsx` (NEW - map picker)
- `client/src/components/location-display.tsx` (NEW - map display)
- `client/src/pages/owner-salon.tsx` (location editor)
- `client/src/pages/salon.tsx` (location display)
- `client/src/locales/*.json` (translations)
- `package.json` (@pbe/react-yandex-maps dependency)
- Upload directories structure

**Latest commit:** `460230a6`
**Repository:** https://github.com/Rustam4262/aurelle
