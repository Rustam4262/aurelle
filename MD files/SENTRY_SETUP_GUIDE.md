# Sentry Error Monitoring Setup Guide - AURELLE Beauty Salon Platform

## 📋 Table of Contents

1. [Overview](#overview)
2. [Sentry Account Setup](#sentry-account-setup)
3. [Frontend Integration (React)](#frontend-integration-react)
4. [Backend Integration (Node.js)](#backend-integration-nodejs)
5. [Source Maps Configuration](#source-maps-configuration)
6. [Release Tracking](#release-tracking)
7. [Alerts & Notifications](#alerts--notifications)
8. [Testing & Verification](#testing--verification)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Sentry provides real-time error tracking and performance monitoring for both frontend and backend applications.

### Features Implemented

✅ **Frontend (React) Monitoring**:

- Automatic error capture
- Performance monitoring
- Session replay
- User feedback
- Source maps for readable stack traces

✅ **Backend (Node.js) Monitoring**:

- Express middleware integration
- Request tracing
- Performance profiling
- User context tracking

✅ **Release Tracking**:

- Version-based error tracking
- Deployment notifications
- Source map uploads

✅ **Advanced Features**:

- Environment separation (production, staging, development)
- Custom error filtering
- User context tracking
- Breadcrumb tracking
- Performance monitoring

---

## Sentry Account Setup

### Step 1: Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Click "Get Started" or "Sign Up"
3. Choose plan:
   - **Developer (Free)**: 5,000 events/month, 1 user
   - **Team ($26/month)**: 50,000 events/month, unlimited users
   - **Business**: Custom pricing

### Step 2: Create Organization

1. After signup, create organization
2. Organization slug: `aurelle` or `your-company-name`
3. This slug will be used in configuration

### Step 3: Create Projects

Create **two projects** (or one project with multiple environments):

#### Option 1: Single Project (Recommended)

**Project Name**: `aurelle`

- **Platform**: JavaScript
- **Environments**: production, staging, development
- Both frontend and backend use same DSN

**Benefits**:

- Unified error view
- Single dashboard
- Easier management

#### Option 2: Separate Projects

**Frontend Project**:

- **Name**: `aurelle-frontend`
- **Platform**: React
- **Alert Name**: AURELLE Frontend

**Backend Project**:

- **Name**: `aurelle-backend`
- **Platform**: Node.js - Express
- **Alert Name**: AURELLE Backend

### Step 4: Get DSN (Data Source Name)

1. Go to **Settings → Projects → [Your Project]**
2. Click "Client Keys (DSN)"
3. Copy DSN: `https://abc123...@o123.ingest.sentry.io/456`

**DSN Format**:

```
https://[public_key]@[organization].ingest.sentry.io/[project_id]
```

### Step 5: Create Auth Token

For source map uploads:

1. Go to **Settings → Account → API → Auth Tokens**
2. Click "Create New Token"
3. **Scopes**:
   - ✅ `project:read`
   - ✅ `project:releases`
   - ✅ `org:read`
4. Copy token (starts with `sntrys_...`)

---

## Frontend Integration (React)

### Files Created

1. **[client/src/lib/sentry.ts](client/src/lib/sentry.ts)** - Sentry initialization
2. **[client/src/main.tsx](client/src/main.tsx)** - Import and initialize

### Configuration

The frontend Sentry is already integrated. Configure via environment variables:

```bash
# .env or .env.production
VITE_SENTRY_DSN=https://your-public-key@o123.ingest.sentry.io/456
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=aurelle@1.0.0
VITE_APP_VERSION=1.0.0
```

### Features Enabled

**1. Error Boundary**

Wrap components with Sentry Error Boundary:

```tsx
import { SentryErrorBoundary } from "@/lib/sentry";

function App() {
  return (
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <div>
          <h1>Something went wrong</h1>
          <pre>{error.message}</pre>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
    >
      <YourApp />
    </SentryErrorBoundary>
  );
}
```

**2. Manual Error Capture**

```tsx
import { captureException, captureMessage } from "@/lib/sentry";

try {
  // Some code that might fail
  riskyOperation();
} catch (error) {
  captureException(error, {
    context: "Payment processing",
    userId: user.id,
  });
}

// Capture informational message
captureMessage("User completed onboarding", "info");
```

**3. User Context Tracking**

```tsx
import { setUser } from "@/lib/sentry";

// After user login
setUser({
  id: user.id,
  email: user.email,
  username: user.username,
  role: user.role,
});

// After logout
setUser(null);
```

**4. Breadcrumbs**

```tsx
import { addBreadcrumb } from "@/lib/sentry";

addBreadcrumb({
  message: "User clicked book button",
  category: "user-action",
  level: "info",
  data: {
    salonId: "salon_123",
    serviceId: "service_456",
  },
});
```

**5. User Feedback**

```tsx
import { showFeedbackDialog } from "@/lib/sentry";

// Show feedback dialog after error
<button onClick={showFeedbackDialog}>Report Issue</button>;
```

### Performance Monitoring

Automatically tracks:

- Page load time
- Navigation between routes
- API request duration
- Component render time

---

## Backend Integration (Node.js)

### Files Created

1. **[server/lib/sentry.ts](server/lib/sentry.ts)** - Sentry initialization
2. **[server/index.ts](server/index.ts)** - Middleware setup

### Configuration

```bash
# .env or .env.production
SENTRY_DSN=https://your-public-key@o123.ingest.sentry.io/456
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=aurelle@1.0.0
```

### Middleware Order (IMPORTANT)

In [server/index.ts](server/index.ts:9-18):

```typescript
// 1. Initialize Sentry FIRST
initializeSentry();

// 2. Sentry request handler (MUST be first middleware)
setupSentryMiddleware(app);

// 3. Your other middleware (body parser, etc.)
app.use(express.json());
app.use(express.urlencoded());

// 4. Your routes
app.use("/api", apiRoutes);

// 5. Track user context
app.use(trackUserMiddleware());

// 6. Sentry error handler (BEFORE other error handlers)
setupSentryErrorHandler(app);

// 7. Your error handlers
app.use((err, req, res, next) => { ... });
```

### Features Enabled

**1. Automatic Error Capture**

All unhandled errors with status >= 500 are automatically captured:

```typescript
// This will be captured by Sentry
app.get("/api/test", (req, res) => {
  throw new Error("Something went wrong!");
});
```

**2. Manual Error Capture**

```typescript
import { captureException, captureMessage } from "./lib/sentry";

try {
  await processPayment(paymentData);
} catch (error) {
  captureException(error, {
    userId: req.user.id,
    paymentId: payment.id,
  });
  res.status(500).json({ error: "Payment failed" });
}
```

**3. User Context from Request**

```typescript
import { setUserFromRequest } from "./lib/sentry";

app.use((req, res, next) => {
  if (req.user) {
    setUserFromRequest(req);
  }
  next();
});
```

**4. Performance Monitoring**

```typescript
import { startTransaction } from "./lib/sentry";

const transaction = startTransaction("Process Booking", "task");

try {
  // Create booking
  const booking = await createBooking(data);

  // Send notification
  await sendBookingEmail(booking);

  transaction.setStatus("ok");
} catch (error) {
  transaction.setStatus("internal_error");
  throw error;
} finally {
  transaction.finish();
}
```

**5. Breadcrumbs**

```typescript
import { addBreadcrumb } from "./lib/sentry";

addBreadcrumb({
  message: "Database query executed",
  category: "database",
  level: "info",
  data: {
    query: "SELECT * FROM bookings",
    duration: 45,
  },
});
```

---

## Source Maps Configuration

Source maps allow Sentry to show readable stack traces instead of minified code.

### Frontend Source Maps

**Enabled in [vite.config.ts](vite.config.ts:56)**:

```typescript
build: {
  sourcemap: true, // Generate source maps
}
```

**Sentry Vite Plugin** ([vite.config.ts](vite.config.ts:23-43)):

```typescript
sentryVitePlugin({
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: {
    name: process.env.SENTRY_RELEASE || "aurelle@1.0.0",
  },
  sourcemaps: {
    assets: ["dist/public/**"],
    filesToDeleteAfterUpload: ["dist/public/**/*.map"], // Delete source maps after upload
  },
});
```

### Backend Source Maps

For backend, source maps are less critical since code isn't minified. However, if using esbuild:

```javascript
// script/build.ts - Add sourcemap option
esbuild.build({
  entryPoints: ["server/index.ts"],
  bundle: true,
  outfile: "dist/index.cjs",
  platform: "node",
  sourcemap: true, // Enable source maps
});
```

### Environment Variables

```bash
# Required for source map upload
SENTRY_AUTH_TOKEN=sntrys_your_auth_token_here
SENTRY_ORG=aurelle
SENTRY_PROJECT=aurelle
SENTRY_RELEASE=aurelle@1.0.0
```

### Verification

After build with source maps enabled:

1. Check build directory:

   ```bash
   ls -la dist/public/assets/*.map
   # Should show .map files before upload
   ```

2. After upload, maps are deleted:

   ```bash
   ls -la dist/public/assets/*.map
   # Should be empty
   ```

3. Verify in Sentry:
   - Go to **Settings → Projects → [Project] → Source Maps**
   - Should see uploaded artifacts for release

---

## Release Tracking

### What is a Release?

A release is a version of your code deployed to an environment. Sentry uses releases to:

- Track which errors occur in which version
- Show when errors were introduced
- Link commits to errors
- Monitor deploy health

### Release Format

```
aurelle@1.0.0
aurelle@1.0.1
aurelle@2024-01-10-production
aurelle@git-abc123f
```

### Setting Releases

**Frontend**:

```bash
VITE_SENTRY_RELEASE=aurelle@1.0.0
```

**Backend**:

```bash
SENTRY_RELEASE=aurelle@1.0.0
```

### Automated Release Creation

In CI/CD (GitHub Actions):

```yaml
# .github/workflows/deploy-production.yml
- name: Create Sentry Release
  run: |
    # Install Sentry CLI
    curl -sL https://sentry.io/get-cli/ | bash

    # Create release
    export SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }}
    export SENTRY_ORG=aurelle
    export SENTRY_PROJECT=aurelle

    RELEASE_VERSION="aurelle@$(date +%Y%m%d-%H%M%S)"

    # Create release
    sentry-cli releases new $RELEASE_VERSION

    # Associate commits
    sentry-cli releases set-commits $RELEASE_VERSION --auto

    # Finalize release
    sentry-cli releases finalize $RELEASE_VERSION

    # Create deploy
    sentry-cli releases deploys $RELEASE_VERSION new -e production
```

### Manual Release Creation

Using Sentry CLI:

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Create release
sentry-cli releases new aurelle@1.0.0

# Upload source maps
sentry-cli releases files aurelle@1.0.0 upload-sourcemaps dist/public

# Associate commits
sentry-cli releases set-commits aurelle@1.0.0 --auto

# Finalize release
sentry-cli releases finalize aurelle@1.0.0

# Mark as deployed
sentry-cli releases deploys aurelle@1.0.0 new -e production
```

---

## Alerts & Notifications

### Issue Alerts

Configure alerts for critical errors:

1. Go to **Alerts → Create Alert**
2. Select project
3. Configure conditions:

**Example 1: Critical Errors**

```
When an event is captured
  AND event.level equals error
  AND event.tags.environment equals production

Then send a notification via:
  - Email to team@aurelle.uz
  - Slack #alerts channel
```

**Example 2: High Error Volume**

```
When number of events
  is greater than 100
  in 1 minute

Then send a notification via:
  - Email
  - Slack
  - PagerDuty (optional)
```

**Example 3: New Issue**

```
When a new issue is created
  AND event.tags.environment equals production

Then send a notification via:
  - Slack #dev-alerts
```

### Metric Alerts

Monitor performance metrics:

**Example: High Error Rate**

```
When error rate
  is above 5%
  for 10 minutes

Then send notification
```

### Slack Integration

1. Go to **Settings → Integrations → Slack**
2. Click "Add to Slack"
3. Authorize workspace
4. Configure channels:
   - `#dev-alerts` - Development issues
   - `#prod-alerts` - Production issues
   - `#sentry` - All Sentry notifications

### Email Notifications

1. Go to **Settings → Notifications**
2. Configure:
   - **Issue Alerts**: Always
   - **Workflow**: Weekly Report
   - **Deploy**: On every deploy
   - **Quota**: When approaching limit

### Telegram Notifications (Optional)

Using Sentry webhooks + custom service:

1. Go to **Settings → Integrations → Webhooks**
2. Add webhook URL: `https://your-server.com/sentry-webhook`
3. Select events: Issue, Deploy, etc.

Webhook handler:

```typescript
app.post("/sentry-webhook", async (req, res) => {
  const event = req.body;

  if (event.action === "created" && event.data.issue) {
    const message = `
🚨 New Error in ${event.data.project.name}

Error: ${event.data.issue.title}
Environment: ${event.data.issue.metadata.environment}
Count: ${event.data.issue.count}

View: ${event.data.issue.web_url}
    `;

    await sendTelegramMessage(TELEGRAM_CHAT_ID, message);
  }

  res.json({ success: true });
});
```

---

## Testing & Verification

### Test Frontend Integration

**1. Test Error Capture**

Add a test button to your app:

```tsx
import { captureException } from "@/lib/sentry";

function TestButton() {
  const testError = () => {
    try {
      throw new Error("Test error from frontend");
    } catch (error) {
      captureException(error);
    }
  };

  return <button onClick={testError}>Test Sentry</button>;
}
```

Click button → Check Sentry dashboard → Should see error

**2. Test Error Boundary**

```tsx
function BrokenComponent() {
  throw new Error("This component is broken!");
  return <div>Never rendered</div>;
}

// Wrap in error boundary
<SentryErrorBoundary fallback={<ErrorPage />}>
  <BrokenComponent />
</SentryErrorBoundary>;
```

**3. Test Performance Monitoring**

Navigate between pages → Check Sentry → Performance → Transactions

### Test Backend Integration

**1. Create Test Endpoint**

```typescript
// server/routes/test.routes.ts
app.get("/api/sentry-test", (req, res) => {
  throw new Error("Test error from backend");
});
```

**2. Trigger Error**

```bash
curl http://localhost:5000/api/sentry-test
```

Check Sentry dashboard → Should see error

**3. Test User Context**

```typescript
app.get("/api/sentry-test-user", (req, res) => {
  setUserFromRequest(req);
  throw new Error("Test error with user context");
});
```

Error should include user information

### Verification Checklist

- [ ] Frontend errors appear in Sentry
- [ ] Backend errors appear in Sentry
- [ ] User context is attached to errors
- [ ] Breadcrumbs are recorded
- [ ] Performance transactions are tracked
- [ ] Source maps show readable stack traces
- [ ] Releases are tracked
- [ ] Alerts are triggered
- [ ] Notifications are received

---

## Best Practices

### 1. Environment Separation

Always use different environments:

```bash
# Production
SENTRY_ENVIRONMENT=production

# Staging
SENTRY_ENVIRONMENT=staging

# Development (disabled by default)
SENTRY_ENVIRONMENT=development
SENTRY_FORCE_ENABLE=true  # Optional: enable in dev
```

### 2. Error Filtering

Don't capture everything:

```typescript
// ❌ Bad - Capturing expected errors
try {
  await api.login(credentials);
} catch (error) {
  captureException(error); // Bad: Login failures are expected
}

// ✅ Good - Only capture unexpected errors
try {
  await api.login(credentials);
} catch (error) {
  if (error.status >= 500) {
    captureException(error); // Only server errors
  }
}
```

### 3. Add Context

Always add context to errors:

```typescript
// ❌ Bad - No context
captureException(error);

// ✅ Good - With context
captureException(error, {
  tags: {
    section: "payment",
    paymentMethod: "credit_card",
  },
  extra: {
    orderId: order.id,
    amount: order.total,
    userId: user.id,
  },
});
```

### 4. Use Breadcrumbs

Add breadcrumbs before critical operations:

```typescript
addBreadcrumb({
  message: "Starting payment processing",
  category: "payment",
  data: { amount: 1000, currency: "UZS" },
});

try {
  await processPayment();
} catch (error) {
  // Error will include breadcrumb
  captureException(error);
}
```

### 5. Set User Context Early

```typescript
// After authentication
app.use((req, res, next) => {
  if (req.user) {
    setUser({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });
  }
  next();
});
```

### 6. Monitor Performance

Track slow operations:

```typescript
const transaction = startTransaction("Database Query", "db");

const span = transaction.startChild({
  op: "db.query",
  description: "SELECT * FROM bookings WHERE user_id = ?",
});

const results = await db.query(/* ... */);

span.finish();
transaction.finish();
```

### 7. Privacy

Mask sensitive data:

```typescript
Sentry.init({
  beforeSend(event) {
    // Remove sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.creditCard;
    }
    return event;
  },
});
```

### 8. Sampling

Use appropriate sample rates:

```typescript
// Production - Lower sample rate to save quota
tracesSampleRate: 0.2, // 20% of transactions

// Staging - Higher sample rate for testing
tracesSampleRate: 0.5, // 50%

// Development - 100% for debugging
tracesSampleRate: 1.0,
```

### 9. Release Health

Monitor release adoption:

- Track crash-free sessions
- Monitor new error introduction
- Set up release alerts

### 10. Regular Review

- Review unresolved issues weekly
- Archive/resolve old issues
- Update ignored errors list
- Review performance bottlenecks

---

## Troubleshooting

### Issue: No errors appearing in Sentry

**Check**:

1. Is DSN configured?

   ```bash
   echo $SENTRY_DSN
   echo $VITE_SENTRY_DSN
   ```

2. Is environment production?

   ```bash
   echo $NODE_ENV
   ```

3. Check console for Sentry initialization:

   ```
   ✅ Sentry initialized for backend error monitoring
   ```

4. Force enable in development:
   ```bash
   SENTRY_FORCE_ENABLE=true
   VITE_SENTRY_FORCE_ENABLE=true
   ```

### Issue: Source maps not working

**Check**:

1. Are source maps generated?

   ```bash
   ls dist/public/assets/*.map
   ```

2. Is auth token configured?

   ```bash
   echo $SENTRY_AUTH_TOKEN
   ```

3. Check Sentry project settings → Source Maps

4. Verify release name matches:
   ```bash
   echo $SENTRY_RELEASE
   echo $VITE_SENTRY_RELEASE
   ```

### Issue: Too many events (quota exceeded)

**Solutions**:

1. Lower sample rate:

   ```typescript
   tracesSampleRate: 0.1, // 10% instead of 20%
   ```

2. Filter errors:

   ```typescript
   ignoreErrors: [
     "NetworkError",
     "ResizeObserver",
     // Add more patterns
   ],
   ```

3. Upgrade Sentry plan

### Issue: Alerts not triggering

**Check**:

1. Alert rules are enabled
2. Notification settings are correct
3. Slack integration is authorized
4. Email addresses are verified

### Issue: Performance transactions not appearing

**Check**:

1. Is performance monitoring enabled?

   ```typescript
   tracesSampleRate: 1.0, // Should be > 0
   ```

2. Are integrations configured?
   ```typescript
   integrations: [
     Sentry.browserTracingIntegration(),
   ],
   ```

### Issue: User context not attached

**Check**:

1. Is `setUser()` called after login?
2. Is `trackUserMiddleware()` added to Express?
3. Is user object in correct format?

---

## Appendix

### Useful Links

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Node.js SDK](https://docs.sentry.io/platforms/node/)
- [Source Maps Guide](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Release Health](https://docs.sentry.io/product/releases/health/)

### Sentry CLI Commands

```bash
# Install CLI
npm install -g @sentry/cli

# Login
sentry-cli login

# Create release
sentry-cli releases new aurelle@1.0.0

# Upload source maps
sentry-cli releases files aurelle@1.0.0 upload-sourcemaps ./dist

# List releases
sentry-cli releases list

# Delete release
sentry-cli releases delete aurelle@1.0.0

# View project info
sentry-cli info
```

### Environment Variables Reference

```bash
# Backend
SENTRY_DSN=https://...@sentry.io/123
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=aurelle@1.0.0

# Frontend
VITE_SENTRY_DSN=https://...@sentry.io/123
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=aurelle@1.0.0
VITE_APP_VERSION=1.0.0

# Build/Upload
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=aurelle
SENTRY_PROJECT=aurelle
```

---

**Last Updated**: January 10, 2026
**Version**: 1.0.0
**Maintainer**: DevOps Team
