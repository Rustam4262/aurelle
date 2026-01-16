# Production Deployment Guide - Phase 5-7

## Что развёртываем

### Phase 5: P0 Critical Bug Fixes ✅
- Улучшенная обработка ошибок dashboard
- Исправления i18n (analytics.title, узбекские переводы)
- Динамические рабочие часы вместо hardcoded 9-20
- i18n validation script

### Phase 6: Feature Flags Infrastructure ✅
- Система feature flags (10 флагов)
- API endpoint `/api/feature-flags`
- React hooks для frontend
- Полная документация

### Phase 7: Analytics Enhancements ✅
- 5 новых API endpoints для аналитики
- Date range picker component
- Salon switcher component
- Enhanced analytics dashboard
- 30+ новых переводов (EN/RU/UZ)

## Pre-deployment Checklist

- [x] Все изменения закоммичены в main branch
- [x] TypeScript компилируется без ошибок
- [x] i18n валидация пройдена
- [x] Feature flags по умолчанию FALSE
- [x] Документация обновлена

## Deployment Steps

### 1. Backup Current Production

```bash
# SSH to production server
ssh user@89.39.94.194

# Backup database
cd /path/to/aurelle
pg_dump -U postgres aurelle > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup .env file
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Backup current code
tar -czf backup_code_$(date +%Y%m%d_%H%M%S).tar.gz .
```

### 2. Pull Latest Changes

```bash
# Pull from GitHub
git fetch origin
git status
git pull origin main

# Verify commit
git log -1 --oneline
# Should show: 32072c89 Phase 7: Add enhanced analytics frontend components
```

### 3. Update Dependencies (if needed)

```bash
# Check if package.json changed
git diff HEAD~6 HEAD package.json

# If changed, install dependencies
npm install
```

### 4. Update Environment Variables

```bash
# Edit .env file
nano .env

# Add feature flags (all disabled by default):
# Phase 7: Analytics Enhancements
FEAT_ENHANCED_ANALYTICS=false

# Phase 8: Bookings Management
FEAT_BOOKING_RESCHEDULE=false
FEAT_MANUAL_BOOKING=false

# Phase 9: Services & Masters
FEAT_BULK_SERVICE_UPDATE=false
FEAT_MASTER_SCHEDULE=false

# Phase 10: Calendar & Working Hours
FEAT_ENHANCED_CALENDAR=false
FEAT_WORKING_HOURS_BREAKS=false

# Phase 11: RBAC - Salon Manager
FEAT_SALON_MANAGER=false

# Additional Features
FEAT_EXPORT_EXCEL=false
FEAT_EXPORT_PDF=false

# Save and exit (Ctrl+X, Y, Enter)
```

### 5. Build Application

```bash
# Build the application
npm run build

# Check for build errors
echo $?
# Should output: 0 (success)
```

### 6. Restart Application

```bash
# Restart with PM2
pm2 restart all

# Check status
pm2 status

# Check logs for errors
pm2 logs --lines 50
```

### 7. Verify Deployment

```bash
# Test feature flags endpoint
curl http://localhost:5000/api/feature-flags
# Should return JSON with all flags = false

# Test health check
curl http://localhost:5000/api/health
# Should return {"status":"ok"}

# Test analytics endpoint (requires auth)
# Will return 401 without token - this is expected
curl http://localhost:5000/api/owner/analytics/custom-range
```

### 8. Monitor Application

```bash
# Watch logs for any errors
pm2 logs aurelle --lines 100

# Monitor for 5-10 minutes
# Look for:
# - No TypeScript errors
# - No database connection errors
# - No authentication errors
# - API requests working normally
```

## Post-Deployment Verification

### 1. Check Website

1. Open browser: https://aurelle.uz
2. Test basic functionality:
   - Homepage loads ✓
   - User can login ✓
   - Owner dashboard accessible ✓
3. Verify no JavaScript errors in console

### 2. Test Feature Flags

1. Open: https://aurelle.uz/api/feature-flags
2. Verify all flags return `false`
3. Response should be:
```json
{
  "ENHANCED_ANALYTICS": false,
  "BOOKING_RESCHEDULE": false,
  "MANUAL_BOOKING_CREATE": false,
  "BULK_SERVICE_UPDATE": false,
  "MASTER_SCHEDULE_OVERRIDE": false,
  "ENHANCED_CALENDAR": false,
  "WORKING_HOURS_BREAKS": false,
  "SALON_MANAGER_ROLE": false,
  "EXPORT_EXCEL": false,
  "EXPORT_PDF": false
}
```

### 3. Test P0 Fixes

1. **Dashboard Error Handling**:
   - Login as owner
   - Navigate to dashboard
   - Should load without errors
   - Check browser console for enhanced error logging (if any errors occur)

2. **i18n Fixes**:
   - Change language to Russian
   - Go to Analytics tab - should show "Аналитика" not "analytics.title"
   - Change to Uzbek - all translations should work

3. **Dynamic Working Hours**:
   - Try to book appointment
   - Verify time slots match actual salon working hours (not hardcoded 9-20)

## Enable Enhanced Analytics (Optional - when ready)

### Phase 1: Enable on Staging/Development First

```bash
# On development server first
FEAT_ENHANCED_ANALYTICS=true
pm2 restart all

# Test thoroughly for 24-48 hours
```

### Phase 2: Enable on Production (after testing)

```bash
# On production server
nano .env
# Change: FEAT_ENHANCED_ANALYTICS=true
pm2 restart all

# Monitor closely for 1-2 hours
pm2 logs --lines 200
```

### Phase 3: Verify Enhanced Analytics

1. Login as owner with multiple salons
2. Go to Analytics tab
3. Should see:
   - Date range picker
   - Salon switcher (if multiple salons)
   - Refresh button
   - 4 metric cards with trends
   - 3 tabs: Masters / Services / Peak Hours
4. Test date range filtering
5. Test salon filtering
6. Verify data loads correctly

## Rollback Procedure (if needed)

### Quick Rollback (revert code)

```bash
# Rollback to previous commit
git log --oneline -10
git reset --hard <previous-commit-hash>

# Rebuild and restart
npm run build
pm2 restart all
```

### Disable Feature (faster)

```bash
# Just disable the problematic feature flag
nano .env
# Set flag to false, e.g.: FEAT_ENHANCED_ANALYTICS=false
pm2 restart all

# No code changes needed!
```

### Full Rollback (restore backup)

```bash
# Stop application
pm2 stop all

# Restore code backup
rm -rf node_modules
tar -xzf backup_code_YYYYMMDD_HHMMSS.tar.gz

# Restore .env
cp .env.backup.YYYYMMDD_HHMMSS .env

# Restore database (if needed)
psql -U postgres aurelle < backup_YYYYMMDD_HHMMSS.sql

# Restart
npm install
pm2 restart all
```

## Troubleshooting

### Issue: "Module not found" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
pm2 restart all
```

### Issue: Database connection errors

```bash
# Check database is running
sudo systemctl status postgresql

# Check connection string in .env
cat .env | grep DATABASE_URL

# Test connection
psql -U postgres aurelle -c "SELECT 1"
```

### Issue: PM2 not restarting

```bash
# Force restart
pm2 delete all
pm2 start ecosystem.config.js

# Or manually
pm2 start npm --name "aurelle" -- start
```

### Issue: Build fails

```bash
# Check Node version (should be 18+)
node --version

# Clear cache and rebuild
npm cache clean --force
rm -rf dist/
npm run build
```

## Performance Monitoring

After deployment, monitor these metrics:

1. **Response Times**: Should remain < 500ms for most endpoints
2. **Error Rate**: Should stay < 1%
3. **Memory Usage**: Watch for memory leaks in PM2
4. **Database Queries**: New analytics endpoints add queries

```bash
# Monitor memory
pm2 monit

# Check database connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname='aurelle';"

# Watch error logs
tail -f /path/to/logs/error.log
```

## Success Criteria

✅ Application starts without errors
✅ All pages load correctly
✅ No JavaScript console errors
✅ Feature flags API returns correct values
✅ P0 bug fixes working (dashboard, i18n, working hours)
✅ No increase in error rate
✅ Response times normal
✅ No user complaints

## Timeline

- **Deploy**: ~15-20 minutes
- **Verification**: ~10-15 minutes
- **Monitoring**: First 2 hours critical
- **Feature Enable**: After 24-48 hours of stability

## Support Contacts

If issues arise:
- Check logs: `pm2 logs`
- Review this guide: `docs/FEATURE_FLAGS.md`
- Rollback if critical: See "Rollback Procedure" above

## Deployment Date

**Planned**: [To be filled]
**Executed**: [To be filled]
**Executed By**: [To be filled]
**Status**: [Success/Rollback]
**Notes**: [Any issues encountered]
