# Database Cleanup Instructions

## ⚠️ IMPORTANT: Backup First!

Before running this cleanup script, **ALWAYS create a database backup**:

```bash
# For PostgreSQL
pg_dump -U your_username -d aurelle > aurelle_backup_$(date +%Y%m%d).sql

# Or if using Neon/cloud provider, use their backup feature
```

## What This Script Does

1. **Removes duplicate salons** - Keeps the oldest entry, deletes newer duplicates
2. **Removes test data** - Deletes salons/users with "TEST" in name or email
3. **Cleans up orphaned records** - Removes masters, services, bookings that reference deleted salons
4. **Reclaims database space** - Runs VACUUM to optimize database

## How to Run

### Option 1: Using psql command line

```bash
# Connect to your database
psql -U your_username -d aurelle

# Run the script
\i cleanup-database.sql

# Or in one command
psql -U your_username -d aurelle -f cleanup-database.sql
```

### Option 2: Using Neon Console

1. Go to Neon console (https://console.neon.tech)
2. Select your project
3. Go to SQL Editor
4. Copy-paste the content of `cleanup-database.sql`
5. Click "Run"

### Option 3: Using Database GUI (TablePlus, DBeaver, etc.)

1. Open your database connection
2. Open SQL query editor
3. Copy-paste the content of `cleanup-database.sql`
4. Execute the query

## Expected Results

Before cleanup:
- Duplicate salons: Multiple entries for "Relax SPA", "Luxury Beauty Salon", "Style & Beauty"
- Test data: "Khulkar TEST" and similar test entries

After cleanup:
- 0 duplicate salons
- 0 test entries
- Clean, production-ready database

## Verification

The script includes verification queries that will show:
1. Final record counts for all tables
2. Check for remaining duplicates (should be 0)
3. Check for remaining test data (should be 0)

## Rollback

If something goes wrong:

```bash
# Restore from backup
psql -U your_username -d aurelle < aurelle_backup_YYYYMMDD.sql
```

## After Cleanup

1. **Test the website** - Ensure all functionality works
2. **Check user accounts** - Verify no real users were accidentally deleted
3. **Monitor for errors** - Check application logs for any issues

## Support

If you encounter issues, contact the development team with:
- Database backup file
- Error messages
- Steps you performed
