# Production Fixes Log - January 5, 2026

## Fix #1: Booking Creation Failing (500 Error)

### Problem
**Error:** `null value in column "master_id" of relation "bookings" violates not-null constraint`

**Symptoms:**
- Clients unable to book services
- 500 Internal Server Error when submitting booking form
- Error shown in UI: "marketplace.salon.bookingFailed 500: {"error":"Failed to create booking"}"

**Root Cause:**
The database schema had `master_id` column defined as NOT NULL, but the application logic allowed clients to book without selecting a specific master (passing `null` value). This created a constraint violation.

### Solution
Made `master_id` column nullable in the bookings table schema.

**Changed File:** `shared/schema.ts` (line 166)

**Before:**
```typescript
masterId: varchar("master_id").notNull(),
```

**After:**
```typescript
masterId: varchar("master_id"), // Optional - allows booking without specific master
```

### Deployment

**Option A: Automated (Recommended)**
SSH to production server and run:
```bash
cd /var/www/aurelle
bash deploy_booking_fix.sh
```

**Option B: Manual Steps**
```bash
# 1. Pull code
cd /var/www/aurelle
git pull origin main

# 2. Copy updated schema
docker cp /var/www/aurelle/shared/schema.ts aurelle_app_1:/app/shared/schema.ts
docker cp /var/www/aurelle/drizzle.config.ts aurelle_app_1:/app/drizzle.config.ts

# 3. Apply schema changes
docker exec aurelle_app_1 npm run db:push

# 4. Rebuild
docker exec aurelle_app_1 npm run build

# 5. Restart
docker restart aurelle_app_1
```

**Verification:**
1. Log in as a client
2. Select a salon and service
3. Try booking WITHOUT selecting a master
4. Booking should succeed

### Commit
- **Commit Hash:** `51f07c2b`
- **Message:** "Fix booking creation: make master_id nullable in bookings table"
- **Date:** January 5, 2026

---

## Fix #2: Photo Upload Failing (FIXED)

### Problem
**Error:** "Upload failed. Failed to upload image. Please try again."

**Symptoms:**
- Master portfolio photo upload fails
- Salon photo upload fails
- ImageUpload component shows error toast

**Root Cause:**
Upload directories didn't exist on the production server. When multer tried to save uploaded files to `server/uploads/{salons|masters|portfolio|avatars}/`, the directories were missing, causing the upload to fail silently.

### Solution
Created automatic directory initialization on server startup.

**New File:** `server/initUploads.ts`
```typescript
export function initializeUploadDirectories() {
  const uploadsBasePath = path.join(process.cwd(), "server", "uploads");
  const uploadTypes = ["salons", "masters", "portfolio", "avatars"];

  // Create base and subdirectories
  if (!fs.existsSync(uploadsBasePath)) {
    fs.mkdirSync(uploadsBasePath, { recursive: true });
  }

  uploadTypes.forEach((type) => {
    const typePath = path.join(uploadsBasePath, type);
    if (!fs.existsSync(typePath)) {
      fs.mkdirSync(typePath, { recursive: true });
    }
  });
}
```

**Modified:** `server/index.ts` - Added initialization call on startup
**Added:** `.gitkeep` files in each upload subdirectory to track structure in git

### Deployment
Will be deployed together with booking fix using the deployment script.

### Verification
1. Upload a photo to master portfolio
2. Upload a photo to salon photos
3. Check that files are saved to `server/uploads/` directory
4. Verify images are accessible via `/uploads/{type}/{filename}` URL

### Commit
- **Commit Hash:** `fd05f5e4`
- **Message:** "Fix photo upload: initialize upload directories on server startup"
- **Date:** January 5, 2026

---

## Fix #3: Missing Geolocation Feature (PENDING)

### Problem
Salon owners cannot set their salon's geolocation via Yandex Maps. Clients cannot see salon location on a map.

**User Request:**
"в платформе нет возможность для владелца салона указать геолокацию через yandex своего салона, у клиентов допольнытельный возможность, при выборе салона должен показыть где он находится по геолокацию и адрес чтобы клиенты просто скопировали"

**Requirements:**
1. For Salon Owners:
   - Add Yandex Maps picker in salon settings
   - Allow owner to click on map to set location
   - Save latitude/longitude to database

2. For Clients:
   - Display Yandex Maps on salon detail page
   - Show salon location with marker
   - Display address in copyable format

**Status:** 🔄 Planning phase

**Technical Notes:**
- VITE_YANDEX_MAPS_API_KEY already configured
- Database schema already has latitude/longitude columns
- Need to integrate @pbe/react-yandex-maps or yandex-maps API

---

## Production Server Details

**Server:** 185.217.131.144
**Application Path:** /var/www/aurelle
**Database:** PostgreSQL 14 (Docker container: `aurelle_postgres_1`)
**App Container:** `aurelle_app_1`
**Database User:** `aurelle_user`
**Database Name:** `aurelle`

**Backup Location:** `/root/backups/`
**Latest Backup:** `backup_before_update_20260105_005003.sql` (22KB)

---

## Deployment Checklist

Before deploying any fix:
- [ ] Create database backup
- [ ] Test locally
- [ ] Commit changes to git
- [ ] Push to GitHub
- [ ] SSH to production server
- [ ] Run deployment script
- [ ] Verify deployment
- [ ] Monitor logs for errors
- [ ] Test fix in browser

## Rollback Procedure

If deployment fails:
```bash
# 1. Restore database
docker exec -i aurelle_postgres_1 psql -U aurelle_user -d aurelle < /root/backups/[BACKUP_FILE]

# 2. Revert code
cd /var/www/aurelle
git checkout [PREVIOUS_COMMIT_HASH]

# 3. Rebuild
docker exec aurelle_app_1 npm run build

# 4. Restart
docker restart aurelle_app_1
```

---

**Last Updated:** January 5, 2026 20:30 UTC
**Updated By:** Claude Code AI Assistant
