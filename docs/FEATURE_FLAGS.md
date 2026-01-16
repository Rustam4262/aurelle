# Feature Flags System

Feature flags allow gradual rollout of new features to prevent disruption to active users.

## Overview

All feature flags default to **FALSE** (disabled) until explicitly enabled in environment variables. This ensures new features don't affect production users until thoroughly tested.

## Architecture

### Backend (`server/featureFlags.ts`)
- Reads feature flags from environment variables
- Provides middleware to protect endpoints behind feature flags
- Exposes API endpoint to query flag states

### Frontend (`client/src/hooks/useFeatureFlag.ts`)
- React hooks to check feature flag status
- Caches flag state for 5 minutes to reduce API calls
- Conditionally renders UI based on flags

## Available Feature Flags

### Phase 7: Analytics Enhancements
- `FEAT_ENHANCED_ANALYTICS` - Date range picker, comparison mode, master/service performance analytics

### Phase 8: Bookings Management
- `FEAT_BOOKING_RESCHEDULE` - Allow owners to reschedule bookings
- `FEAT_MANUAL_BOOKING` - Create bookings manually from owner dashboard

### Phase 9: Services & Masters
- `FEAT_BULK_SERVICE_UPDATE` - Bulk edit pricing and duration
- `FEAT_MASTER_SCHEDULE` - Master-specific schedule overrides

### Phase 10: Calendar & Working Hours
- `FEAT_ENHANCED_CALENDAR` - Drag-and-drop booking management
- `FEAT_WORKING_HOURS_BREAKS` - Break time configuration

### Phase 11: RBAC
- `FEAT_SALON_MANAGER` - Salon manager role with limited permissions

### Additional Features
- `FEAT_EXPORT_EXCEL` - Export analytics to Excel
- `FEAT_EXPORT_PDF` - Export reports as PDF

## Usage

### Backend - Protect Endpoint

```typescript
import { requireFeatureFlag } from "../featureFlags";

router.post("/bookings/:id/reschedule",
  isAuthenticated,
  requireFeatureFlag("BOOKING_RESCHEDULE"),
  requirePermission("BOOKINGS", "update"),
  async (req, res) => {
    // Reschedule logic
  }
);
```

### Backend - Check Flag

```typescript
import { isFeatureEnabled } from "../featureFlags";

if (isFeatureEnabled("ENHANCED_ANALYTICS")) {
  // Additional analytics logic
}
```

### Frontend - Conditional Rendering

```typescript
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

export function BookingActions({ bookingId }) {
  const canReschedule = useFeatureFlag("BOOKING_RESCHEDULE");

  return (
    <div>
      {canReschedule && (
        <Button onClick={handleReschedule}>Reschedule</Button>
      )}
    </div>
  );
}
```

### Frontend - Check Multiple Flags

```typescript
import { useFeatureFlagsMultiple } from "@/hooks/useFeatureFlag";

export function AdvancedBookings() {
  const hasAdvancedFeatures = useFeatureFlagsMultiple([
    "BOOKING_RESCHEDULE",
    "MANUAL_BOOKING_CREATE"
  ]);

  if (!hasAdvancedFeatures) {
    return <BasicBookingsView />;
  }

  return <AdvancedBookingsView />;
}
```

## Rollout Strategy

### 1. Initial Deployment (All Flags OFF)
Deploy feature flag infrastructure with all flags disabled. No user impact.

```bash
# All flags default to false - no .env changes needed
git pull
pm2 restart all
```

### 2. Enable Feature (Development/Staging First)

Test on development/staging environment:

```bash
# .env on staging server
FEAT_ENHANCED_ANALYTICS=true
```

### 3. Monitor Metrics (48 hours)

Before enabling next feature:
- Check error rates in Sentry
- Review API response times
- Monitor user complaints/feedback
- Verify audit logs show correct behavior

### 4. Gradual Production Rollout

Enable for production in stages:

**Week 1: Internal Testing (10% rollout)**
- Enable flag on production
- Test with internal salon accounts
- Monitor closely

**Week 2: Beta Users (50% rollout)**
- Enable for select beta salon owners
- Collect feedback
- Fix any issues

**Week 3: Full Rollout (100%)**
- Enable for all users
- Continue monitoring
- Mark feature as stable

### 5. Feature Flag Cleanup

After feature is stable for 2+ weeks:
- Remove feature flag checks from code
- Remove flag from environment variables
- Update documentation

## Environment Configuration

### Development
```bash
# .env.local
FEAT_ENHANCED_ANALYTICS=true  # Enable for local testing
FEAT_BOOKING_RESCHEDULE=true
```

### Staging
```bash
# .env on staging server
FEAT_ENHANCED_ANALYTICS=true  # Test before production
```

### Production
```bash
# .env on production server (89.39.94.194)
FEAT_ENHANCED_ANALYTICS=false  # Keep disabled until ready
FEAT_BOOKING_RESCHEDULE=false
```

## API Endpoint

### GET /api/feature-flags

Returns current state of all feature flags.

**Response:**
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

**No authentication required** - flags control UI visibility and are safe to expose.

## Rollback Procedure

If a feature causes issues:

1. **Immediate disable** (< 1 minute)
```bash
# SSH to production server
ssh user@89.39.94.194
cd /path/to/aurelle

# Edit .env
FEAT_PROBLEMATIC_FEATURE=false

# Restart
pm2 restart all
```

2. **Verify rollback**
- Check `/api/feature-flags` endpoint
- Verify UI no longer shows feature
- Confirm error rates return to normal

3. **Investigate and fix**
- Review error logs in Sentry
- Fix issue in development
- Re-test before re-enabling

## Best Practices

1. **Start disabled** - Always deploy new features with flags OFF
2. **Test thoroughly** - Enable on staging first, never skip this
3. **Monitor closely** - Watch metrics for 48h before next rollout
4. **Gradual rollout** - 10% → 50% → 100%, not 0% → 100%
5. **Document flags** - Update this file when adding new flags
6. **Clean up old flags** - Remove flags after feature is stable
7. **Never skip stages** - Even "small" features need gradual rollout

## Troubleshooting

### Feature flag not updating
- Clear React Query cache: `queryClient.invalidateQueries(["/api/feature-flags"])`
- Check browser console for errors
- Verify .env file on server has correct value
- Ensure PM2 was restarted after .env change

### Feature flag returns 404
- Check middleware order in routes
- Verify flag name matches exactly
- Ensure `requireFeatureFlag` is after auth middleware

### Frontend not respecting flag
- Check `useFeatureFlag` hook is used correctly
- Verify React Query is working (check Network tab)
- Clear browser cache and reload
- Check feature flag API endpoint manually: `/api/feature-flags`
