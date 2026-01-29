# AURELLE - Metrics Dashboard Guide

## Overview

This guide provides comprehensive documentation for setting up and using the AURELLE metrics dashboard system. We use the **AARRR framework** (Acquisition, Activation, Retention, Revenue, Referral) to track key performance indicators in real-time.

**Tech Stack:**

- **Google Analytics 4 (GA4)**: Event tracking and user behavior analytics
- **Metabase**: Open-source BI tool for custom dashboards
- **PostgreSQL**: Database analytics queries
- **Node.js Analytics Service**: Server-side event tracking

**Acceptance Criteria:**
✅ All key metrics visible in real-time
✅ AARRR framework implemented
✅ GA4 tracking all critical events
✅ Metabase dashboards for each KPI category
✅ Automated daily/weekly reports

---

## Table of Contents

1. [KPI Definitions (AARRR Framework)](#1-kpi-definitions-aarrr-framework)
2. [Google Analytics 4 Setup](#2-google-analytics-4-setup)
3. [Event Tracking Implementation](#3-event-tracking-implementation)
4. [Metabase Installation](#4-metabase-installation)
5. [Dashboard Creation](#5-dashboard-creation)
6. [PostgreSQL Analytics Queries](#6-postgresql-analytics-queries)
7. [Automated Reports](#7-automated-reports)
8. [Monitoring & Alerts](#8-monitoring--alerts)
9. [Best Practices](#9-best-practices)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. KPI Definitions (AARRR Framework)

### 1.1 AARRR Framework Overview

The **AARRR** (Pirate Metrics) framework tracks the user lifecycle:

```
Acquisition → Activation → Retention → Revenue → Referral
    ↓            ↓            ↓           ↓         ↓
 Get users   First exp.   Come back   Pay money  Tell others
```

### 1.2 Acquisition Metrics

**Goal:** Measure how users discover AURELLE

| Metric                          | Definition                              | Target       | Tracking    |
| ------------------------------- | --------------------------------------- | ------------ | ----------- |
| **Total Visitors**              | Unique visitors to website              | 10,000/month | GA4         |
| **Traffic Sources**             | Organic, Direct, Social, Referral, Paid | Mix analysis | GA4         |
| **Landing Page Views**          | Homepage, salon pages viewed            | 15,000/month | GA4         |
| **User Acquisition Cost (UAC)** | Marketing spend / New users             | < ₸5,000     | Manual calc |
| **Bounce Rate**                 | % users leaving after 1 page            | < 40%        | GA4         |
| **Session Duration**            | Avg time on site                        | > 3 minutes  | GA4         |

**Key Events:**

- `page_view` - User views any page
- `salon_viewed` - User views salon detail page
- `search_performed` - User searches for salons
- `service_viewed` - User views service details

### 1.3 Activation Metrics

**Goal:** Measure quality of first user experience

| Metric                    | Definition                          | Target      | Tracking |
| ------------------------- | ----------------------------------- | ----------- | -------- |
| **Sign-up Rate**          | % visitors who register             | > 15%       | GA4 + DB |
| **Time to First Action**  | Time from signup to first booking   | < 24 hours  | DB query |
| **Onboarding Completion** | % users completing profile          | > 70%       | GA4      |
| **First Booking Rate**    | % new users making first booking    | > 30%       | DB query |
| **Mobile App Installs**   | Downloads from App Store/Play Store | 1,000/month | GA4      |

**Key Events:**

- `sign_up` - User creates account
- `profile_completed` - User fills profile
- `first_booking_created` - User makes first booking
- `salon_favorited` - User saves favorite salon
- `app_installed` - Mobile app download

### 1.4 Retention Metrics

**Goal:** Measure user engagement over time

| Metric                         | Definition                       | Target       | Tracking   |
| ------------------------------ | -------------------------------- | ------------ | ---------- |
| **Daily Active Users (DAU)**   | Users active in last 24 hours    | 1,000+       | GA4 + DB   |
| **Weekly Active Users (WAU)**  | Users active in last 7 days      | 5,000+       | GA4 + DB   |
| **Monthly Active Users (MAU)** | Users active in last 30 days     | 15,000+      | GA4 + DB   |
| **DAU/MAU Ratio**              | Stickiness ratio                 | > 20%        | Calculated |
| **Churn Rate**                 | % users not returning in 30 days | < 40%        | DB query   |
| **Cohort Retention**           | % users returning by cohort      | Week 1: 40%+ | DB query   |
| **Booking Frequency**          | Avg bookings per user per month  | > 1.5        | DB query   |

**Key Events:**

- `session_start` - User opens app/website
- `booking_viewed` - User checks booking details
- `notification_clicked` - User engages with push/email
- `return_visit` - User returns after 7+ days

**Cohort Retention Table:**

```
Cohort     | Week 0 | Week 1 | Week 2 | Week 3 | Week 4
-----------|--------|--------|--------|--------|--------
Jan 2026   | 100%   | 45%    | 35%    | 30%    | 28%
Feb 2026   | 100%   | 50%    | 40%    | 35%    | 32%
Mar 2026   | 100%   | 55%    | 45%    | 40%    | 38%
```

### 1.5 Revenue Metrics

**Goal:** Measure business financial performance

| Metric                              | Definition                      | Target     | Tracking |
| ----------------------------------- | ------------------------------- | ---------- | -------- |
| **Total Revenue**                   | Sum of all booking payments     | ₸10M/month | DB query |
| **Average Revenue Per User (ARPU)** | Total revenue / Total users     | ₸3,000     | DB query |
| **Average Order Value (AOV)**       | Avg booking amount              | ₸15,000    | DB query |
| **Conversion Rate**                 | % visitors who book             | > 8%       | GA4 + DB |
| **Revenue by Source**               | Organic, Paid, Referral revenue | Analysis   | DB query |
| **Revenue Growth Rate**             | MoM revenue increase            | > 20%      | DB query |
| **Customer Lifetime Value (CLV)**   | Total value per customer        | ₸50,000    | DB query |
| **Salon Revenue**                   | Revenue per salon               | Analysis   | DB query |
| **Commission Revenue**              | Platform commission earned      | Analysis   | DB query |

**Key Events:**

- `booking_created` - User creates booking
- `payment_initiated` - User starts payment
- `payment_completed` - Payment successful
- `booking_cancelled` - User cancels booking
- `refund_issued` - Payment refunded

**Revenue Funnel:**

```
1000 Visitors → 300 Sign-ups (30%) → 150 Search (50%) → 90 Booking Created (60%) → 80 Payment Completed (89%)

Conversion Rate: 80 / 1000 = 8%
```

### 1.6 Referral Metrics

**Goal:** Measure viral growth and user advocacy

| Metric                       | Definition                          | Target    | Tracking |
| ---------------------------- | ----------------------------------- | --------- | -------- |
| **Net Promoter Score (NPS)** | Likelihood to recommend (0-10)      | > 50      | Survey   |
| **Referral Rate**            | % users who refer others            | > 10%     | DB query |
| **Viral Coefficient (K)**    | Avg invites sent × conversion rate  | > 1.0     | DB query |
| **Referral Conversion**      | % referrals who sign up             | > 25%     | DB query |
| **Social Shares**            | Shares on Instagram, Facebook, etc. | 500/month | GA4      |
| **Review Score**             | Avg rating on Google/2GIS           | > 4.5/5   | Manual   |

**Key Events:**

- `referral_sent` - User sends referral link
- `referral_signup` - New user from referral
- `social_share` - User shares on social media
- `review_submitted` - User leaves review
- `invite_opened` - Referral link clicked

**Viral Loop:**

```
100 Users → 30 Send Invites (30%) → 90 Total Invites (3 each) → 23 Sign-ups (25%) = K = 0.23

Need K > 1.0 for viral growth
```

---

## 2. Google Analytics 4 Setup

### 2.1 Create GA4 Property

**Step 1: Create Google Analytics Account**

1. Go to https://analytics.google.com/
2. Click **Start measuring**
3. Enter account details:
   - Account name: `AURELLE Beauty Platform`
   - Data sharing settings: Enable all
4. Click **Next**

**Step 2: Create Property**

1. Property details:
   - Property name: `AURELLE Web`
   - Time zone: `(GMT+05:00) Tashkent`
   - Currency: `Uzbekistani Som (UZS)`
2. Click **Next**

**Step 3: Configure Data Stream**

1. Select platform: **Web**
2. Enter details:
   - Website URL: `https://aurelle.uz`
   - Stream name: `AURELLE Website`
3. Click **Create stream**

**Step 4: Get Measurement ID**

Copy the **Measurement ID**: `G-XXXXXXXXXX`

Save this for client integration.

### 2.2 Client-Side GA4 Integration

**Installation (React)**

```bash
npm install react-ga4
```

**Configuration: `client/src/utils/analytics.ts`**

```typescript
import ReactGA from "react-ga4";

const MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

export const initGA = () => {
  ReactGA.initialize(MEASUREMENT_ID, {
    gaOptions: {
      cookieFlags: "SameSite=None;Secure",
    },
    gtagOptions: {
      send_page_view: false, // We'll send manually
    },
  });
};

// Track page views
export const trackPageView = (path: string) => {
  ReactGA.send({ hitType: "pageview", page: path });
};

// Track events
export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

// Track custom events
export const trackCustomEvent = (eventName: string, params?: Record<string, any>) => {
  ReactGA.event(eventName, params);
};
```

**App.tsx Integration**

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, trackPageView } from './utils/analytics';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Initialize GA on app mount
    initGA();
  }, []);

  useEffect(() => {
    // Track page views on route change
    trackPageView(location.pathname + location.search);
  }, [location]);

  return (
    // Your app components
  );
}
```

**Environment Variables: `client/.env`**

```bash
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 2.3 Server-Side GA4 Integration

For tracking server-side events (bookings, payments), we'll use Google Analytics Measurement Protocol.

**Installation**

```bash
npm install @analytics/google-analytics
```

We'll create a comprehensive analytics service in the next section.

### 2.4 Enable Enhanced Measurement

In GA4 console:

1. Go to **Admin** → **Data Streams** → Click your stream
2. Enable **Enhanced measurement**:
   - ✅ Page views
   - ✅ Scrolls
   - ✅ Outbound clicks
   - ✅ Site search
   - ✅ Video engagement
   - ✅ File downloads

### 2.5 Configure Conversions

In GA4, mark key events as conversions:

1. Go to **Configure** → **Events**
2. Mark as conversion:
   - `sign_up`
   - `first_booking_created`
   - `booking_created`
   - `payment_completed`
   - `referral_signup`

---

## 3. Event Tracking Implementation

### 3.1 Event Taxonomy

All events follow this naming convention:

```
{object}_{action}
```

Examples:

- `salon_viewed` - User views salon
- `booking_created` - User creates booking
- `payment_completed` - Payment successful

### 3.2 Standard Event Properties

All events include these properties:

```typescript
interface BaseEventProperties {
  user_id?: string; // Logged-in user ID
  session_id: string; // Session identifier
  timestamp: string; // ISO 8601 timestamp
  platform: "web" | "ios" | "android";
  screen_resolution?: string;
  user_agent?: string;
}
```

### 3.3 Client-Side Event Tracking

**Acquisition Events**

```typescript
// Page view
trackPageView("/salons/tashkent");

// Salon viewed
trackCustomEvent("salon_viewed", {
  salon_id: "123",
  salon_name: "Beauty Lounge",
  city: "Tashkent",
  category: "Hair Salon",
});

// Search performed
trackCustomEvent("search_performed", {
  query: "hair salon",
  filters: {
    city: "Tashkent",
    service: "Haircut",
  },
  results_count: 15,
});

// Service viewed
trackCustomEvent("service_viewed", {
  salon_id: "123",
  service_id: "456",
  service_name: "Haircut",
  price: 50000,
});
```

**Activation Events**

```typescript
// Sign up
trackCustomEvent("sign_up", {
  method: "email", // 'email', 'google', 'phone'
  user_type: "client", // 'client', 'specialist', 'salon_owner'
});

// Profile completed
trackCustomEvent("profile_completed", {
  user_id: "789",
  completion_percentage: 100,
  time_to_complete: 120, // seconds
});

// First booking created
trackCustomEvent("first_booking_created", {
  user_id: "789",
  salon_id: "123",
  service_id: "456",
  booking_id: "BK001",
  time_to_first_booking: 3600, // seconds since signup
});

// Salon favorited
trackCustomEvent("salon_favorited", {
  user_id: "789",
  salon_id: "123",
});
```

**Retention Events**

```typescript
// Session start
trackCustomEvent("session_start", {
  user_id: "789",
  days_since_last_visit: 3,
});

// Booking viewed
trackCustomEvent("booking_viewed", {
  user_id: "789",
  booking_id: "BK001",
  booking_status: "confirmed",
});

// Notification clicked
trackCustomEvent("notification_clicked", {
  user_id: "789",
  notification_type: "booking_reminder",
  notification_id: "N123",
});

// Return visit
trackCustomEvent("return_visit", {
  user_id: "789",
  days_since_signup: 14,
  days_since_last_visit: 7,
});
```

**Revenue Events**

```typescript
// Booking created
trackCustomEvent("booking_created", {
  booking_id: "BK001",
  user_id: "789",
  salon_id: "123",
  service_id: "456",
  service_name: "Haircut",
  price: 50000,
  booking_date: "2026-01-15",
  booking_time: "14:00",
});

// Payment initiated
trackCustomEvent("payment_initiated", {
  booking_id: "BK001",
  payment_method: "card", // 'card', 'cash', 'payme'
  amount: 50000,
});

// Payment completed
trackCustomEvent("payment_completed", {
  booking_id: "BK001",
  transaction_id: "TXN123",
  payment_method: "card",
  amount: 50000,
  currency: "UZS",
});

// Booking cancelled
trackCustomEvent("booking_cancelled", {
  booking_id: "BK001",
  user_id: "789",
  cancellation_reason: "schedule_conflict",
  days_before_booking: 2,
});
```

**Referral Events**

```typescript
// Referral sent
trackCustomEvent("referral_sent", {
  user_id: "789",
  referral_code: "REF789",
  method: "whatsapp", // 'whatsapp', 'telegram', 'email', 'copy_link'
});

// Referral signup
trackCustomEvent("referral_signup", {
  new_user_id: "999",
  referrer_id: "789",
  referral_code: "REF789",
});

// Social share
trackCustomEvent("social_share", {
  user_id: "789",
  platform: "instagram", // 'instagram', 'facebook', 'telegram'
  content_type: "salon", // 'salon', 'booking', 'review'
  content_id: "123",
});

// Review submitted
trackCustomEvent("review_submitted", {
  user_id: "789",
  salon_id: "123",
  booking_id: "BK001",
  rating: 5,
  has_comment: true,
});
```

### 3.4 Component-Level Tracking Examples

**Salon Card Component**

```typescript
import { trackCustomEvent } from '../utils/analytics';

const SalonCard = ({ salon }) => {
  const handleClick = () => {
    // Track salon view
    trackCustomEvent('salon_viewed', {
      salon_id: salon.id,
      salon_name: salon.name,
      city: salon.city,
      category: salon.category,
      rating: salon.rating,
    });

    // Navigate to salon page
    navigate(`/salons/${salon.id}`);
  };

  return (
    <div onClick={handleClick}>
      {/* Salon card UI */}
    </div>
  );
};
```

**Booking Form Component**

```typescript
const BookingForm = ({ salon, service }) => {
  const handleSubmit = async (formData) => {
    try {
      // Create booking
      const booking = await createBooking(formData);

      // Track booking creation
      trackCustomEvent('booking_created', {
        booking_id: booking.id,
        user_id: user.id,
        salon_id: salon.id,
        service_id: service.id,
        service_name: service.name,
        price: service.price,
        booking_date: formData.date,
        booking_time: formData.time,
      });

      // Navigate to payment
      navigate(`/bookings/${booking.id}/payment`);
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

**Search Component**

```typescript
const SearchBar = () => {
  const handleSearch = async (query, filters) => {
    const results = await searchSalons(query, filters);

    // Track search
    trackCustomEvent('search_performed', {
      query,
      filters,
      results_count: results.length,
    });

    setResults(results);
  };

  return (
    <div>
      <input onChange={(e) => setQuery(e.target.value)} />
      <button onClick={() => handleSearch(query, filters)}>Search</button>
    </div>
  );
};
```

---

## 4. Metabase Installation

### 4.1 System Requirements

- **OS**: Ubuntu 20.04+ LTS
- **Memory**: 2GB RAM minimum (4GB recommended)
- **Disk**: 10GB available
- **Java**: OpenJDK 11 or later
- **Database**: PostgreSQL 12+ (already installed)

### 4.2 Installation Script

I'll create a comprehensive installation script: `scripts/setup-metabase.sh`

This script will:

- Install Java 11
- Download Metabase JAR
- Configure systemd service
- Setup Metabase database
- Configure Nginx reverse proxy
- Setup SSL with Let's Encrypt
- Configure firewall

### 4.3 Access URLs

After installation:

- **Metabase Dashboard**: https://metrics.aurelle.uz
- **Admin Panel**: https://metrics.aurelle.uz/admin

---

## 5. Dashboard Creation

### 5.1 Metabase Initial Setup

**Step 1: First Login**

1. Open https://metrics.aurelle.uz
2. Create admin account:
   - Email: `admin@aurelle.uz`
   - Password: [Use strong password]
3. Click **Get started**

**Step 2: Connect Database**

1. Click **Add a database**
2. Select **PostgreSQL**
3. Enter connection details:
   ```
   Name: AURELLE Production
   Host: localhost
   Port: 5432
   Database name: aurelle_db
   Username: aurelle_user
   Password: [From /etc/aurelle-db.conf]
   ```
4. Click **Save**

**Step 3: Sync Schema**

Wait 2-5 minutes for Metabase to analyze your database schema.

### 5.2 Dashboard Templates

I'll create 5 main dashboards, one for each AARRR metric category.

#### Dashboard 1: Acquisition Dashboard

**Metrics:**

- Total visitors (last 7 days, 30 days)
- Traffic sources breakdown (pie chart)
- Landing page views (bar chart)
- Bounce rate trend (line chart)
- Session duration distribution (histogram)
- Top salons viewed (table)

**SQL Queries:**

```sql
-- Total Visitors (Last 7 Days)
SELECT COUNT(DISTINCT user_id) as total_visitors
FROM sessions
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Traffic Sources
SELECT
  source,
  COUNT(DISTINCT user_id) as users,
  COUNT(*) as sessions
FROM sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY source
ORDER BY users DESC;

-- Top Salons Viewed
SELECT
  s.name as salon_name,
  s.city,
  COUNT(DISTINCT sv.user_id) as unique_viewers,
  COUNT(*) as total_views
FROM salon_views sv
JOIN salons s ON sv.salon_id = s.id
WHERE sv.created_at >= NOW() - INTERVAL '7 days'
GROUP BY s.id, s.name, s.city
ORDER BY unique_viewers DESC
LIMIT 10;
```

#### Dashboard 2: Activation Dashboard

**Metrics:**

- Sign-ups (last 7 days, 30 days)
- Sign-up rate trend (line chart)
- Onboarding completion rate (gauge)
- First booking rate (gauge)
- Time to first booking (histogram)
- Sign-up methods breakdown (pie chart)

**SQL Queries:**

```sql
-- Sign-ups Last 7 Days
SELECT COUNT(*) as signups
FROM users
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Sign-up Rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as signups,
  (COUNT(*) * 100.0 / (
    SELECT COUNT(DISTINCT user_id)
    FROM sessions
    WHERE DATE(created_at) = DATE(u.created_at)
  )) as signup_rate
FROM users u
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- First Booking Rate
SELECT
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN u.id END) as users_with_booking,
  (COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN u.id END) * 100.0 / COUNT(DISTINCT u.id)) as first_booking_rate
FROM users u
LEFT JOIN bookings b ON u.id = b.user_id AND b.created_at <= u.created_at + INTERVAL '7 days'
WHERE u.created_at >= NOW() - INTERVAL '30 days';

-- Time to First Booking
SELECT
  EXTRACT(EPOCH FROM (b.created_at - u.created_at)) / 3600 as hours_to_first_booking
FROM users u
JOIN (
  SELECT user_id, MIN(created_at) as created_at
  FROM bookings
  GROUP BY user_id
) b ON u.id = b.user_id
WHERE u.created_at >= NOW() - INTERVAL '30 days';
```

#### Dashboard 3: Retention Dashboard

**Metrics:**

- DAU, WAU, MAU (big numbers)
- DAU/MAU ratio (gauge)
- Churn rate (gauge)
- Cohort retention table
- Booking frequency (histogram)
- User engagement trend (line chart)

**SQL Queries:**

```sql
-- Daily Active Users
SELECT COUNT(DISTINCT user_id) as dau
FROM user_activities
WHERE created_at >= NOW() - INTERVAL '1 day';

-- Weekly Active Users
SELECT COUNT(DISTINCT user_id) as wau
FROM user_activities
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Monthly Active Users
SELECT COUNT(DISTINCT user_id) as mau
FROM user_activities
WHERE created_at >= NOW() - INTERVAL '30 days';

-- DAU/MAU Ratio
WITH metrics AS (
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM user_activities WHERE created_at >= NOW() - INTERVAL '1 day') as dau,
    (SELECT COUNT(DISTINCT user_id) FROM user_activities WHERE created_at >= NOW() - INTERVAL '30 days') as mau
)
SELECT
  dau,
  mau,
  ROUND((dau * 100.0 / NULLIF(mau, 0)), 2) as dau_mau_ratio
FROM metrics;

-- Churn Rate (Users who haven't been active in 30 days)
WITH active_users AS (
  SELECT COUNT(DISTINCT user_id) as total
  FROM user_activities
  WHERE created_at >= NOW() - INTERVAL '60 days'
    AND created_at < NOW() - INTERVAL '30 days'
),
churned_users AS (
  SELECT COUNT(DISTINCT u.user_id) as churned
  FROM (
    SELECT DISTINCT user_id
    FROM user_activities
    WHERE created_at >= NOW() - INTERVAL '60 days'
      AND created_at < NOW() - INTERVAL '30 days'
  ) u
  LEFT JOIN user_activities ua ON u.user_id = ua.user_id
    AND ua.created_at >= NOW() - INTERVAL '30 days'
  WHERE ua.user_id IS NULL
)
SELECT
  churned,
  total,
  ROUND((churned * 100.0 / NULLIF(total, 0)), 2) as churn_rate
FROM active_users, churned_users;

-- Cohort Retention
WITH cohorts AS (
  SELECT
    id as user_id,
    DATE_TRUNC('week', created_at) as cohort_week
  FROM users
  WHERE created_at >= NOW() - INTERVAL '12 weeks'
),
activities AS (
  SELECT
    c.cohort_week,
    DATE_TRUNC('week', ua.created_at) as activity_week,
    COUNT(DISTINCT c.user_id) as active_users
  FROM cohorts c
  JOIN user_activities ua ON c.user_id = ua.user_id
  WHERE ua.created_at >= c.cohort_week
  GROUP BY c.cohort_week, DATE_TRUNC('week', ua.created_at)
)
SELECT
  cohort_week,
  activity_week,
  active_users,
  ROUND(active_users * 100.0 / FIRST_VALUE(active_users) OVER (
    PARTITION BY cohort_week
    ORDER BY activity_week
  ), 2) as retention_rate
FROM activities
ORDER BY cohort_week DESC, activity_week;
```

#### Dashboard 4: Revenue Dashboard

**Metrics:**

- Total revenue (last 7 days, 30 days)
- Revenue trend (line chart)
- ARPU (big number)
- AOV (big number)
- Conversion rate (gauge)
- Revenue by source (bar chart)
- Revenue growth rate (big number with trend)
- Top revenue salons (table)

**SQL Queries:**

```sql
-- Total Revenue Last 30 Days
SELECT
  SUM(amount) as total_revenue,
  COUNT(*) as total_bookings
FROM payments
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '30 days';

-- Revenue Trend
SELECT
  DATE(created_at) as date,
  SUM(amount) as daily_revenue,
  COUNT(*) as bookings_count
FROM payments
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- ARPU (Average Revenue Per User)
SELECT
  ROUND(SUM(p.amount) / COUNT(DISTINCT p.user_id), 2) as arpu
FROM payments p
WHERE p.status = 'completed'
  AND p.created_at >= NOW() - INTERVAL '30 days';

-- AOV (Average Order Value)
SELECT
  ROUND(AVG(amount), 2) as aov
FROM payments
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '30 days';

-- Conversion Rate
WITH visitors AS (
  SELECT COUNT(DISTINCT user_id) as total
  FROM sessions
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
converters AS (
  SELECT COUNT(DISTINCT user_id) as total
  FROM payments
  WHERE status = 'completed'
    AND created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  c.total as paying_users,
  v.total as total_visitors,
  ROUND((c.total * 100.0 / NULLIF(v.total, 0)), 2) as conversion_rate
FROM visitors v, converters c;

-- Revenue by Source
SELECT
  s.source,
  SUM(p.amount) as revenue,
  COUNT(DISTINCT p.user_id) as paying_users
FROM payments p
JOIN sessions s ON p.user_id = s.user_id
WHERE p.status = 'completed'
  AND p.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.source
ORDER BY revenue DESC;

-- Revenue Growth Rate
WITH current_month AS (
  SELECT SUM(amount) as revenue
  FROM payments
  WHERE status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW())
),
previous_month AS (
  SELECT SUM(amount) as revenue
  FROM payments
  WHERE status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    AND created_at < DATE_TRUNC('month', NOW())
)
SELECT
  cm.revenue as current_revenue,
  pm.revenue as previous_revenue,
  ROUND(((cm.revenue - pm.revenue) * 100.0 / NULLIF(pm.revenue, 0)), 2) as growth_rate
FROM current_month cm, previous_month pm;

-- Top Revenue Salons
SELECT
  s.name as salon_name,
  s.city,
  SUM(p.amount) as total_revenue,
  COUNT(p.id) as bookings_count,
  ROUND(AVG(p.amount), 2) as avg_booking_value
FROM payments p
JOIN bookings b ON p.booking_id = b.id
JOIN salons s ON b.salon_id = s.id
WHERE p.status = 'completed'
  AND p.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.id, s.name, s.city
ORDER BY total_revenue DESC
LIMIT 10;
```

#### Dashboard 5: Referral Dashboard

**Metrics:**

- NPS score (big number with color)
- Referral rate (gauge)
- Viral coefficient K (big number)
- Referral conversion rate (gauge)
- Social shares (bar chart)
- Top referrers (table)

**SQL Queries:**

```sql
-- NPS Score
WITH nps_data AS (
  SELECT
    CASE
      WHEN score >= 9 THEN 'promoter'
      WHEN score >= 7 THEN 'passive'
      ELSE 'detractor'
    END as category
  FROM nps_surveys
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  COUNT(*) FILTER (WHERE category = 'promoter') * 100.0 / COUNT(*) as promoter_pct,
  COUNT(*) FILTER (WHERE category = 'detractor') * 100.0 / COUNT(*) as detractor_pct,
  (COUNT(*) FILTER (WHERE category = 'promoter') - COUNT(*) FILTER (WHERE category = 'detractor')) * 100.0 / COUNT(*) as nps_score
FROM nps_data;

-- Referral Rate
WITH total_users AS (
  SELECT COUNT(*) as total
  FROM users
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
referring_users AS (
  SELECT COUNT(DISTINCT referrer_id) as total
  FROM referrals
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  ru.total as referring_users,
  tu.total as total_users,
  ROUND((ru.total * 100.0 / NULLIF(tu.total, 0)), 2) as referral_rate
FROM total_users tu, referring_users ru;

-- Viral Coefficient K
WITH referral_metrics AS (
  SELECT
    COUNT(DISTINCT referrer_id) as referring_users,
    COUNT(*) as total_invites,
    COUNT(*) FILTER (WHERE referred_user_id IS NOT NULL) as converted_signups
  FROM referrals
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  referring_users,
  total_invites,
  converted_signups,
  ROUND((total_invites::NUMERIC / NULLIF(referring_users, 0)), 2) as invites_per_user,
  ROUND((converted_signups::NUMERIC / NULLIF(total_invites, 0)), 2) as conversion_rate,
  ROUND((total_invites::NUMERIC / NULLIF(referring_users, 0)) * (converted_signups::NUMERIC / NULLIF(total_invites, 0)), 2) as viral_coefficient_k
FROM referral_metrics;

-- Social Shares
SELECT
  platform,
  COUNT(*) as shares,
  COUNT(DISTINCT user_id) as unique_sharers
FROM social_shares
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY platform
ORDER BY shares DESC;

-- Top Referrers
SELECT
  u.name as referrer_name,
  u.email as referrer_email,
  COUNT(r.id) as total_referrals,
  COUNT(r.referred_user_id) FILTER (WHERE r.referred_user_id IS NOT NULL) as successful_referrals,
  ROUND((COUNT(r.referred_user_id) FILTER (WHERE r.referred_user_id IS NOT NULL) * 100.0 / NULLIF(COUNT(r.id), 0)), 2) as conversion_rate
FROM users u
JOIN referrals r ON u.id = r.referrer_id
WHERE r.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name, u.email
ORDER BY successful_referrals DESC
LIMIT 10;
```

### 5.3 Creating Questions in Metabase

**Example: Total Visitors**

1. Click **New** → **Question**
2. Select **Simple question**
3. Choose database: **AURELLE Production**
4. Choose table: **Sessions**
5. Click **Summarize** → **Count of rows**
6. Click **Filter** → **Created At** → **Previous 7 days**
7. Click **Visualize**
8. Save as: **"Total Visitors (Last 7 Days)"**

**Example: Revenue Trend (SQL)**

1. Click **New** → **Question**
2. Select **Native query**
3. Paste SQL:

```sql
SELECT
  DATE(created_at) as date,
  SUM(amount) as daily_revenue
FROM payments
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date
```

4. Click **Visualize**
5. Change visualization to **Line chart**
6. X-axis: `date`, Y-axis: `daily_revenue`
7. Save as: **"Revenue Trend (Last 30 Days)"**

### 5.4 Creating Dashboards

**Step 1: Create Dashboard**

1. Click **New** → **Dashboard**
2. Name: `Acquisition Dashboard`
3. Click **Create**

**Step 2: Add Questions**

1. Click **Add a question**
2. Select saved question: **"Total Visitors (Last 7 Days)"**
3. Resize and position
4. Repeat for all acquisition metrics

**Step 3: Add Filters**

1. Click **Add a filter**
2. Select **Time** → **Created At**
3. Apply to all cards

**Step 4: Set Auto-Refresh**

1. Click **Dashboard settings** (gear icon)
2. Set **Auto-refresh**: **5 minutes**
3. Click **Done**

---

## 6. PostgreSQL Analytics Queries

### 6.1 Create Analytics Views

For better performance, create materialized views for common queries.

**File: `server/database/analytics_views.sql`**

```sql
-- Materialized view: Daily Active Users
CREATE MATERIALIZED VIEW mv_daily_active_users AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau
FROM user_activities
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at);

CREATE INDEX idx_mv_dau_date ON mv_daily_active_users(date);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_daily_active_users()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_active_users;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh via cron (run daily at 1 AM)
-- Add to crontab: 0 1 * * * psql -U aurelle_user -d aurelle_db -c "SELECT refresh_daily_active_users();"
```

### 6.2 Performance Optimization

**Add indexes for common analytics queries:**

```sql
-- Sessions table
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_user_id_created_at ON sessions(user_id, created_at);
CREATE INDEX idx_sessions_source ON sessions(source);

-- User activities table
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX idx_user_activities_user_id_created_at ON user_activities(user_id, created_at);

-- Payments table
CREATE INDEX idx_payments_status_created_at ON payments(status, created_at);
CREATE INDEX idx_payments_user_id_created_at ON payments(user_id, created_at);

-- Bookings table
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_bookings_salon_id_created_at ON bookings(salon_id, created_at);
```

---

## 7. Automated Reports

### 7.1 Daily Email Reports

Create automated daily reports sent to stakeholders.

**Slack/Telegram Integration**

I'll create a script: `scripts/send-daily-report.sh`

This will:

- Query key metrics from PostgreSQL
- Format as readable message
- Send via Telegram Bot API

### 7.2 Weekly Summary Reports

More detailed weekly reports with:

- Week-over-week comparisons
- Top performers (salons, specialists)
- Anomaly detection

---

## 8. Monitoring & Alerts

### 8.1 Alert Rules

Set up alerts for critical metrics:

| Metric          | Condition               | Alert    |
| --------------- | ----------------------- | -------- |
| DAU             | < 500                   | Critical |
| Conversion Rate | < 5%                    | Warning  |
| Churn Rate      | > 50%                   | Critical |
| Revenue         | Day-over-day drop > 30% | Critical |
| NPS             | < 30                    | Warning  |

### 8.2 Grafana Integration (Optional)

For real-time monitoring, integrate with Grafana:

```bash
# Install Grafana
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

Access: `http://localhost:3000` (default: admin/admin)

---

## 9. Best Practices

### 9.1 Data Privacy

✅ **DO:**

- Anonymize user data in analytics
- Use user IDs, not names/emails in GA4
- Comply with GDPR/local data protection laws
- Allow users to opt-out of tracking

❌ **DON'T:**

- Send PII (Personally Identifiable Information) to GA4
- Track sensitive data (payment details, passwords)
- Share analytics access publicly

### 9.2 Event Tracking Guidelines

✅ **DO:**

- Use consistent naming conventions
- Include context properties (salon_id, service_id)
- Track both success and failure events
- Document all events in a tracking plan

❌ **DON'T:**

- Track too many events (focus on critical ones)
- Send duplicate events
- Track before user consent

### 9.3 Dashboard Design

✅ **DO:**

- Use clear, descriptive titles
- Show trends over time (not just current values)
- Include comparisons (week-over-week, month-over-month)
- Use appropriate visualizations (line for trends, pie for proportions)

❌ **DON'T:**

- Overcrowd dashboards (max 6-8 cards)
- Use 3D charts (confusing)
- Show vanity metrics without context

### 9.4 Performance

✅ **DO:**

- Use materialized views for complex queries
- Add indexes on frequently queried columns
- Refresh materialized views during off-peak hours
- Cache dashboard data (refresh every 5-10 minutes)

❌ **DON'T:**

- Run complex queries on production DB during peak hours
- Store historical data indefinitely (archive after 2 years)
- Query individual events (aggregate first)

---

## 10. Troubleshooting

### 10.1 GA4 Issues

**Problem: Events not appearing in GA4**

Solutions:

1. Check **Measurement ID** is correct
2. Open browser DevTools → Network → Filter `google-analytics` → Check requests
3. Use **GA4 DebugView**: Add `?_dbg=1` to URL
4. Wait 24 hours (GA4 has processing delay)

**Problem: Low data quality**

Solutions:

1. Enable **Google Signals** (Admin → Data Settings)
2. Disable **Data Sampling** (use unsampled reports)
3. Set up **Server-Side Tracking** for critical events

### 10.2 Metabase Issues

**Problem: Slow query performance**

Solutions:

1. Check indexes: `EXPLAIN ANALYZE SELECT ...`
2. Use materialized views for complex queries
3. Reduce date range (30 days instead of 90 days)
4. Enable Metabase query caching

**Problem: Metabase service crashes**

Solutions:

1. Check logs: `sudo journalctl -u metabase -n 100`
2. Increase Java heap size: Edit `/etc/systemd/system/metabase.service`

```bash
Environment="JAVA_OPTS=-Xmx4g"
```

3. Restart service: `sudo systemctl restart metabase`

**Problem: Can't connect to PostgreSQL**

Solutions:

1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Check credentials: `cat /etc/aurelle-db.conf`
3. Test connection: `psql -h localhost -U aurelle_user -d aurelle_db`
4. Check PostgreSQL allows local connections: `sudo nano /etc/postgresql/14/main/pg_hba.conf`

### 10.3 Dashboard Issues

**Problem: "No data" on dashboard**

Solutions:

1. Check date filter (expand date range)
2. Check database connection
3. Check SQL query syntax
4. Verify data exists: Run query in `psql`

**Problem: Incorrect numbers**

Solutions:

1. Check for duplicate events (deduplicate with `DISTINCT`)
2. Verify date timezone matches server timezone
3. Check for test data (filter out test accounts)

---

## Appendix A: SQL Queries Cheat Sheet

### User Metrics

```sql
-- Total Users
SELECT COUNT(*) FROM users;

-- New Users Today
SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE;

-- Users by Type
SELECT user_type, COUNT(*) FROM users GROUP BY user_type;
```

### Booking Metrics

```sql
-- Total Bookings
SELECT COUNT(*) FROM bookings;

-- Bookings Today
SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = CURRENT_DATE;

-- Bookings by Status
SELECT status, COUNT(*) FROM bookings GROUP BY status;

-- Bookings by Salon
SELECT
  s.name,
  COUNT(b.id) as bookings
FROM salons s
LEFT JOIN bookings b ON s.id = b.salon_id
GROUP BY s.id, s.name
ORDER BY bookings DESC;
```

### Revenue Metrics

```sql
-- Total Revenue
SELECT SUM(amount) FROM payments WHERE status = 'completed';

-- Revenue Today
SELECT SUM(amount) FROM payments
WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE;

-- Revenue by Salon
SELECT
  s.name,
  SUM(p.amount) as revenue
FROM salons s
JOIN bookings b ON s.id = b.salon_id
JOIN payments p ON b.id = p.booking_id
WHERE p.status = 'completed'
GROUP BY s.id, s.name
ORDER BY revenue DESC;
```

---

## Appendix B: Event Tracking Checklist

### Acquisition Events

- [ ] `page_view` - All pages
- [ ] `salon_viewed` - Salon detail pages
- [ ] `search_performed` - Search functionality
- [ ] `service_viewed` - Service pages

### Activation Events

- [ ] `sign_up` - Registration
- [ ] `profile_completed` - Profile completion
- [ ] `first_booking_created` - First booking
- [ ] `salon_favorited` - Add to favorites

### Retention Events

- [ ] `session_start` - App/website opens
- [ ] `booking_viewed` - View booking details
- [ ] `notification_clicked` - Notification engagement
- [ ] `return_visit` - User returns after 7+ days

### Revenue Events

- [ ] `booking_created` - Booking creation
- [ ] `payment_initiated` - Payment start
- [ ] `payment_completed` - Payment success
- [ ] `booking_cancelled` - Cancellation

### Referral Events

- [ ] `referral_sent` - Referral link shared
- [ ] `referral_signup` - New user from referral
- [ ] `social_share` - Social media share
- [ ] `review_submitted` - Review posted

---

## Appendix C: Dashboard Access

### User Roles

| Role            | Access      | Dashboards                      |
| --------------- | ----------- | ------------------------------- |
| **Admin**       | Full access | All 5 dashboards                |
| **Manager**     | View + Edit | All 5 dashboards                |
| **Salon Owner** | View only   | Revenue dashboard (their salon) |
| **Viewer**      | View only   | Public dashboards               |

### Credentials

Store in **1Password** or secure vault:

```
Metabase Admin
URL: https://metrics.aurelle.uz
Email: admin@aurelle.uz
Password: [REDACTED]

PostgreSQL
Host: localhost
Database: aurelle_db
User: metabase_viewer
Password: [REDACTED]
```

---

## Conclusion

You now have a comprehensive metrics dashboard system with:

✅ **AARRR framework** - All 5 metric categories defined
✅ **Google Analytics 4** - Event tracking on all critical actions
✅ **Metabase dashboards** - 5 dashboards with real-time data
✅ **PostgreSQL queries** - Optimized analytics queries
✅ **Automated reports** - Daily/weekly summaries via Telegram
✅ **Monitoring** - Alerts on critical metrics

**Next Steps:**

1. Run setup scripts (GA4, Metabase, analytics service)
2. Create Metabase dashboards using SQL queries above
3. Test event tracking on staging environment
4. Deploy to production
5. Monitor for 1 week, iterate on dashboards
6. Train team on dashboard usage

**Support:**

- Metabase docs: https://www.metabase.com/docs/
- GA4 docs: https://support.google.com/analytics/
- Questions: admin@aurelle.uz

---

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Author:** AURELLE Development Team
