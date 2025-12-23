# AURELLE - Master Sprint Plan
## From "Pet Project" to "Real Product"

**Goal:** Production-ready beauty salon marketplace with real user onboarding

**Timeline:** Sprint 0 → Sprint 1 → Sprint 2 → Sprint 3 (5-7 weeks total)

---

# 🔥 Sprint 0: Stabilization & Production Readiness
**Duration:** 3-5 days
**Goal:** Everything deploys with one command, backups active, admin tools working

## Definition of Done (MVP)
- [ ] Salon owner can onboard through admin
- [ ] Salon goes through moderation (approve/reject)
- [ ] Clients see only approved salons
- [ ] Bookings created/cancelled without double slots
- [ ] Backups running daily, restore tested

---

## 👑 Owner/PM/CTO Tasks

**Priority:** Strategic decisions and unblocking

- [ ] Define "Definition of Done" for MVP
- [ ] Prioritize: C1+C2 → Owner Cabinet → Booking → Payments
- [ ] Review and approve Sprint 0 deliverables
- [ ] Make architectural decisions for Salon Owner flows
- [ ] Unblock team on product decisions

**Owner:** You
**Status:** ⬜ Not Started

---

## 🧠 Backend (FastAPI) - 8 Tasks

### Task 1: C1 - Role Change Endpoint ✅ DONE
```
PATCH /api/admin/users/{id}/role
```

**Requirements:**
- [x] Change user role (client → salon_owner, etc.)
- [x] Protect against removing last admin (409 Conflict)
- [x] Audit log entry with old/new role
- [x] Authorization: ADMIN only

**DoD:** Role changes + logged + tested
**Owner:** Backend Dev
**Status:** ✅ Code Complete (needs deployment)

---

### Task 2: C2 - Password Reset Endpoint ✅ DONE
```
POST /api/admin/users/{id}/reset-password
```

**Requirements:**
- [x] Generate secure temporary password (8 chars, bcrypt)
- [x] Return temp password in response (MVP version)
- [x] Audit log entry
- [x] Authorization: ADMIN only

**DoD:** Admin resets password, user can login with temp password
**Owner:** Backend Dev
**Status:** ✅ Code Complete (needs deployment)

---

### Task 3: C3 - Salon Moderation ✅ DONE
```
POST /api/admin/salons/{id}/approve
POST /api/admin/salons/{id}/reject
```

**Requirements:**
- [x] Approve: set is_verified=true, is_active=true, approved_at, approved_by
- [x] Reject: set both false, store rejection_reason
- [x] Clear rejection_reason on re-approval
- [x] Audit logging

**DoD:** Rejected salons invisible in public search
**Owner:** Backend Dev
**Status:** ✅ Complete (deployed)

---

### Task 4: Public Endpoints Filtering ⬜ TODO
**Requirements:**
- [ ] All public salon lists: `WHERE is_verified=TRUE AND is_active=TRUE`
- [ ] Endpoints to update:
  - `GET /api/salons/` ✅ DONE
  - `GET /api/salons/{id}` ✅ DONE
  - `GET /api/salons/for-map` ✅ DONE
- [ ] Add tests: pending/rejected salons return 404 or not in list

**DoD:** No pending/rejected salons visible publicly
**Owner:** Backend Dev
**Estimate:** 1 hour

---

### Task 5: Pagination Contract Verification ✅ DONE
**Requirements:**
- [x] All list endpoints return `{items, total, skip, limit}`
- [x] Endpoints updated:
  - `/api/admin/users` ✅
  - `/api/admin/salons` ✅
  - `/api/admin/bookings` ✅

**DoD:** Tests pass for pagination format
**Owner:** Backend Dev
**Status:** ✅ Complete

---

### Task 6: Booking Constraints Testing ⬜ TODO
**Requirements:**
- [ ] Verify unique index prevents double booking
- [ ] Test concurrent booking attempts (race condition)
- [ ] Test edge cases: same master, same time, different salons

**SQL to verify:**
```sql
-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'bookings'
AND indexname LIKE '%unique%';
```

**DoD:** Duplicate booking test fails with unique constraint error
**Owner:** Backend Dev
**Estimate:** 2 hours

---

### Task 7: Error Standardization ⬜ TODO
**Requirements:**
- [ ] Create `schemas/errors.py` with standard error format
- [ ] Format: `{code: str, message: str, details?: object}`
- [ ] Update all HTTPException handlers
- [ ] Examples:
  - `USER_NOT_FOUND`
  - `SALON_ALREADY_APPROVED`
  - `CANNOT_REMOVE_LAST_ADMIN`

**DoD:** All API errors follow consistent format
**Owner:** Backend Dev
**Estimate:** 3 hours

---

### Task 8: API Documentation ⬜ TODO
**Requirements:**
- [ ] Add OpenAPI descriptions to all endpoints
- [ ] Add request/response examples
- [ ] Document error codes
- [ ] Add tags for grouping (Admin, Salons, Bookings, etc.)

**DoD:** Swagger UI has complete descriptions and examples
**Owner:** Backend Dev
**Estimate:** 2 hours

---

## 🎨 Frontend (React) - 8 Tasks

### Task 1: Update API Client for Pagination ⬜ TODO
**Requirements:**
- [ ] Update API types: `PaginatedResponse<T> = {items: T[], total, skip, limit}`
- [ ] Update admin panel calls to handle pagination
- [ ] Add pagination controls (Next/Prev, page numbers)

**DoD:** All admin lists show pagination
**Owner:** Frontend Dev
**Estimate:** 3 hours

---

### Task 2: Admin Panel - Users Management ⬜ TODO
**Requirements:**
- [ ] Users list with search and role filter
- [ ] Actions per user:
  - Change Role button (modal with role select)
  - Reset Password button (shows temp password)
  - Toggle Active/Inactive
- [ ] Success/error notifications
- [ ] Audit log display (optional)

**DoD:** Admin can manage users without touching database
**Owner:** Frontend Dev
**Estimate:** 6 hours

---

### Task 3: Admin Panel - Salons Management ⬜ TODO
**Requirements:**
- [ ] Salons list with status badges (Pending/Approved/Rejected)
- [ ] Filter by status
- [ ] Actions per salon:
  - Approve button
  - Reject button (modal for reason input)
- [ ] Show rejection reason if exists
- [ ] Show approved_by and approved_at

**DoD:** Admin can approve/reject salons with reasons
**Owner:** Frontend Dev
**Estimate:** 6 hours

---

### Task 4: Admin Panel - Bookings Management ⬜ TODO
**Requirements:**
- [ ] Bookings list with filters:
  - Salon (dropdown)
  - Master (dropdown)
  - Status (pending/confirmed/completed/cancelled)
  - Date range
- [ ] Actions per booking:
  - Confirm
  - Cancel
  - Mark No-Show
- [ ] Show client/master/salon/service details

**DoD:** Admin can manage bookings
**Owner:** Frontend Dev
**Estimate:** 8 hours

---

### Task 5: Salon Owner Cabinet - Skeleton ⬜ TODO
**Requirements:**
- [ ] Route: `/salon-owner/salons`
- [ ] Layout with navigation
- [ ] "My Salons" list (empty state if none)
- [ ] "Create Salon" button (placeholder)
- [ ] Status badges per salon:
  - ⏳ Pending moderation
  - ✅ Approved
  - ❌ Rejected (show reason)

**DoD:** Salon owner sees their salons and status
**Owner:** Frontend Dev
**Estimate:** 6 hours

---

### Task 6: Role-Based Guards & Redirects ⬜ TODO
**Requirements:**
- [ ] Create `ProtectedRoute` component
- [ ] Role-based redirects:
  - `admin` → `/admin`
  - `salon_owner` → `/salon-owner`
  - `master` → `/master` (future)
  - `client` → `/`
- [ ] Block unauthorized access (403 page)

**DoD:** Users see only their role-appropriate pages
**Owner:** Frontend Dev
**Estimate:** 3 hours

---

### Task 7: UX Improvements ⬜ TODO
**Requirements:**
- [ ] Loading states for all async operations
- [ ] Error boundaries and error pages
- [ ] Empty states:
  - No salons found
  - No masters assigned
  - No services created
- [ ] Toast notifications for success/error
- [ ] Form validation feedback

**DoD:** App feels polished, no jarring blank screens
**Owner:** Frontend Dev
**Estimate:** 4 hours

---

### Task 8: QA - Mobile & Cross-Browser ⬜ TODO
**Requirements:**
- [ ] Test on mobile (Chrome Android, Safari iOS)
- [ ] Test on desktop (Chrome, Firefox, Safari, Edge)
- [ ] Check responsive breakpoints
- [ ] Fix layout issues

**DoD:** App works on all major browsers and mobile
**Owner:** Frontend Dev / QA
**Estimate:** 4 hours

---

## 🧩 DevOps/Infra - 10 Tasks

### Task 1: Unified docker-compose.prod.yml ⬜ TODO
**Requirements:**
- [ ] Single file with: db, backend, frontend, nginx
- [ ] Environment variables from `.env.production`
- [ ] Volume mounts for persistence
- [ ] Healthchecks for all services

**DoD:** `docker-compose -f docker-compose.prod.yml up -d` starts everything
**Owner:** DevOps
**Estimate:** 4 hours

---

### Task 2: Backups Cron 🔴 CRITICAL
**Requirements:**
- [ ] Copy `db/scripts/backup_prod_db.sh` to server
- [ ] Make executable: `chmod +x /root/backup_prod_db.sh`
- [ ] Run first backup: `sudo /root/backup_prod_db.sh`
- [ ] Setup cron: `0 3 * * * /root/backup_prod_db.sh >> /var/log/beauty_salon_backup.log 2>&1`
- [ ] Verify cron with `sudo crontab -l`

**DoD:** Daily backups running, log file exists
**Owner:** DevOps
**Status:** 🔴 BLOCKER - Do this NOW
**Estimate:** 5 minutes

---

### Task 3: Restore Playbook ⬜ TODO
**Requirements:**
- [ ] Document step-by-step restore procedure
- [ ] Test restore on staging/test database
- [ ] Create runbook: "How to restore DB in 15 minutes"
- [ ] Include troubleshooting section

**DoD:** Non-expert can restore database following playbook
**Owner:** DevOps
**Estimate:** 2 hours

---

### Task 4: Secrets Management ⬜ TODO
**Requirements:**
- [ ] Create `.env.production` (not in Git)
- [ ] Move secrets from docker-compose.yml to .env:
  - `JWT_SECRET`
  - `REFRESH_SECRET`
  - `POSTGRES_PASSWORD`
  - `DATABASE_URL`
- [ ] Document how to regenerate secrets
- [ ] Use Docker secrets or encrypted files

**DoD:** No hardcoded secrets in repository
**Owner:** DevOps
**Estimate:** 2 hours

---

### Task 5: Nginx Reverse Proxy ⬜ TODO
**Requirements:**
- [ ] `/` → frontend (React)
- [ ] `/api` → backend (FastAPI)
- [ ] Static files served with caching headers
- [ ] Gzip compression enabled

**DoD:** Single domain serves both frontend and API
**Owner:** DevOps
**Estimate:** 3 hours

---

### Task 6: SSL (Let's Encrypt) ⬜ TODO
**Requirements:**
- [ ] Install certbot
- [ ] Generate SSL cert for domain
- [ ] Auto-renewal cron job
- [ ] Force HTTPS redirect

**DoD:** Site accessible via HTTPS with valid certificate
**Owner:** DevOps
**Estimate:** 2 hours

---

### Task 7: Rate Limiting ⬜ TODO
**Requirements:**
- [ ] Add rate limit middleware or nginx limit_req
- [ ] Protect endpoints:
  - `/api/auth/login` - 5 req/min per IP
  - `/api/auth/register` - 3 req/min per IP
  - `/api/admin/*` - 60 req/min per user
- [ ] Return 429 Too Many Requests

**DoD:** Brute force attacks rate-limited
**Owner:** Backend Dev / DevOps
**Estimate:** 3 hours

---

### Task 8: Monitoring ⬜ TODO
**Requirements:**
- [ ] Container status monitoring (Docker health checks)
- [ ] Disk usage alerts (> 80%)
- [ ] Database connection pool monitoring
- [ ] Uptime monitoring (UptimeRobot or similar)

**DoD:** Team notified if service goes down
**Owner:** DevOps
**Estimate:** 4 hours

---

### Task 9: Log Rotation ⬜ TODO
**Requirements:**
- [ ] Setup logrotate for:
  - Nginx logs
  - Backend logs
  - Backup logs
- [ ] Keep 14 days of logs
- [ ] Compress old logs

**DoD:** Logs don't fill up disk
**Owner:** DevOps
**Estimate:** 1 hour

---

### Task 10: Staging Environment ⬜ TODO
**Requirements:**
- [ ] Separate docker-compose.staging.yml OR separate server
- [ ] Separate database (copy of prod schema)
- [ ] Test deployments on staging first
- [ ] Automated tests run on staging

**DoD:** Changes tested on staging before production
**Owner:** DevOps
**Estimate:** 6 hours

---

## 🧪 QA / Testing - 7 Tasks

### Task 1: Smoke Tests on Production ⬜ TODO
**Requirements:**
- [ ] Test after each deployment:
  - Login as admin
  - Approve a salon
  - Change user role client → salon_owner
  - Reset user password
- [ ] Automate with script (optional)

**DoD:** Smoke test suite passes after deployment
**Owner:** QA / Backend Dev
**Estimate:** 2 hours

---

### Task 2: API Tests - Pagination & Filters ⬜ TODO
**Requirements:**
- [ ] Test pagination: skip=0/10/20, limit=10/50/100
- [ ] Test filters: role, status, search query
- [ ] Test edge cases: skip > total, limit=0

**DoD:** Automated tests for pagination
**Owner:** QA / Backend Dev
**Estimate:** 3 hours

---

### Task 3: Booking Double-Slot Prevention Test ⬜ TODO
**Requirements:**
- [ ] Test concurrent booking to same slot
- [ ] Test sequential booking to same slot
- [ ] Verify unique constraint error

**DoD:** Double booking impossible
**Owner:** QA / Backend Dev
**Estimate:** 2 hours

---

### Task 4: Security Tests ⬜ TODO
**Requirements:**
- [ ] Test `/admin` access without admin role (should 403)
- [ ] Test SQL injection on search fields
- [ ] Test XSS on user inputs
- [ ] Test CSRF protection

**DoD:** Common vulnerabilities blocked
**Owner:** QA / Security
**Estimate:** 4 hours

---

### Task 5: Regression Tests After Deploy ⬜ TODO
**Requirements:**
- [ ] Checklist of critical paths:
  - User registration
  - Login
  - Salon search
  - Booking creation
  - Admin actions
- [ ] Run after each production deployment

**DoD:** No regressions after deployment
**Owner:** QA
**Estimate:** 2 hours

---

### Task 6: Schema Sync Verification ⬜ TODO
**Requirements:**
- [ ] After prod schema change, dump to `000_schema.sql`
- [ ] Reset local DB and verify matches prod
- [ ] Check tables, indexes, constraints match

**DoD:** Local = Production schema
**Owner:** DevOps / Backend Dev
**Estimate:** 1 hour

---

### Task 7: UX Testing ⬜ TODO
**Requirements:**
- [ ] Test error states (network error, 404, 500)
- [ ] Test loading states (skeleton screens)
- [ ] Test empty states (no data)
- [ ] Test form validation errors

**DoD:** App handles errors gracefully
**Owner:** QA / Frontend Dev
**Estimate:** 3 hours

---

## 📈 Product / Growth - 5 Tasks

### Task 1: Salon Onboarding Scenario ⬜ TODO
**Requirements:**
- [ ] Document step-by-step onboarding flow
- [ ] Create script for calling salon owners
- [ ] Prepare demo account credentials
- [ ] FAQ for common questions

**DoD:** Sales/support team can onboard salon without dev help
**Owner:** Product Manager
**Estimate:** 3 hours

---

### Task 2: Mini-Landing for Salons ⬜ TODO
**Requirements:**
- [ ] Simple page: "Why join AURELLE?"
- [ ] Benefits: more clients, easy booking, analytics
- [ ] CTA: "Contact us to join"
- [ ] Mobile-optimized

**DoD:** Link to share with potential salon partners
**Owner:** Product Manager / Designer
**Estimate:** 6 hours

---

### Task 3: Metrics Dashboard ⬜ TODO
**Requirements:**
- [ ] Track key metrics:
  - User registrations (by role)
  - Active salons (approved)
  - Total bookings
  - Revenue (future)
- [ ] Simple dashboard (Google Sheets or internal page)

**DoD:** Weekly metrics review possible
**Owner:** Product Manager / Backend Dev
**Estimate:** 4 hours

---

### Task 4: Test Data - Real Salons ⬜ TODO
**Requirements:**
- [ ] Create 3-5 test salons with:
  - Real-looking names (not "Salon 1")
  - Real services (haircut, coloring, massage)
  - Real prices
  - Photos (stock images)
- [ ] Seed to staging/production

**DoD:** Platform looks "real" for demos
**Owner:** Product Manager
**Estimate:** 3 hours

---

### Task 5: Policies & Legal ⬜ TODO
**Requirements:**
- [ ] Terms of Service (basic)
- [ ] Privacy Policy (basic)
- [ ] Data processing agreement (GDPR-lite)
- [ ] Service agreement for salons

**DoD:** Legal basics covered before real users
**Owner:** Product Manager / Legal
**Estimate:** 6 hours (if using templates)

---

# 🚀 Sprint 1: Salon Owner Onboarding
**Duration:** 5-7 days
**Goal:** Salon can be onboarded in 10 minutes without dev intervention

## Sprint 1 - Backend Tasks

### Owner Salons CRUD
- [ ] `GET /api/owner/salons` - My salons
- [ ] `POST /api/owner/salons` - Create salon
- [ ] `PATCH /api/owner/salons/{id}` - Update salon
- [ ] `DELETE /api/owner/salons/{id}` - Delete salon (soft delete)

### Owner Masters CRUD
- [ ] `GET /api/owner/salons/{salon_id}/masters`
- [ ] `POST /api/owner/salons/{salon_id}/masters`
- [ ] `PATCH /api/owner/masters/{id}`
- [ ] `DELETE /api/owner/masters/{id}`

### Owner Services CRUD
- [ ] `GET /api/owner/salons/{salon_id}/services`
- [ ] `POST /api/owner/salons/{salon_id}/services`
- [ ] `PATCH /api/owner/services/{id}`
- [ ] `DELETE /api/owner/services/{id}`

### Master ↔ Service Linking
- [ ] `POST /api/owner/services/{service_id}/masters` - Assign masters to service
- [ ] `DELETE /api/owner/services/{service_id}/masters/{master_id}` - Unassign

### Owner Bookings
- [ ] `GET /api/owner/bookings` - All bookings for my salons
- [ ] `PATCH /api/owner/bookings/{id}/status` - Confirm/cancel

---

## Sprint 1 - Frontend Tasks

### Owner Dashboard
- [ ] `/salon-owner/salons` - List my salons
- [ ] `/salon-owner/salons/new` - Create new salon form
- [ ] `/salon-owner/salons/{id}` - Edit salon
- [ ] `/salon-owner/salons/{id}/masters` - Manage masters
- [ ] `/salon-owner/salons/{id}/services` - Manage services
- [ ] `/salon-owner/bookings` - View/manage bookings

### Admin Workflows
- [ ] Approve/reject salons with UI feedback
- [ ] Assign SALON_OWNER role to user
- [ ] Reset password and show temp password

---

## Sprint 1 - DoD

**Success Criteria:**
1. Salon owner creates account (admin assigns role)
2. Salon owner creates salon with details
3. Salon owner adds masters and services
4. Salon owner submits for moderation
5. Admin approves salon
6. Salon appears in public search
7. Clients can see salon and book services

**Total Time:** Backend (20h) + Frontend (30h) + Testing (10h) = 60 hours

---

# ⚙️ Sprint 2: Booking & Slots "Professional Grade"
**Duration:** 7-10 days
**Goal:** Real-time booking with slot management and conflict prevention

## Key Features
- [ ] Dynamic slot generation (not pre-stored)
- [ ] Master schedule configuration (working hours, days off)
- [ ] Service duration-based slot calculation
- [ ] Double-booking prevention (unique constraint + optimistic locking)
- [ ] Booking cancellation/rescheduling
- [ ] No-show tracking
- [ ] Waitlist (optional)

**Total Time:** Backend (30h) + Frontend (25h) + Testing (15h) = 70 hours

---

# 💳 Sprint 3: Payments (Click/Payme)
**Duration:** 10-14 days
**Goal:** Secure payment processing with Uzbekistan payment providers

## Key Features
- [ ] `payments` table with statuses (pending/completed/failed/refunded)
- [ ] `transactions` table for audit trail
- [ ] Click.uz integration (webhooks)
- [ ] Payme.uz integration (webhooks)
- [ ] Idempotency keys (prevent double charge)
- [ ] Payment status tracking
- [ ] Refund handling
- [ ] Commission calculation (platform fee)

**Total Time:** Backend (40h) + Frontend (20h) + Testing (20h) + Integration (10h) = 90 hours

---

# 📊 Summary Timeline

| Sprint | Duration | Focus | Total Hours |
|--------|----------|-------|-------------|
| **Sprint 0** | 3-5 days | Stabilization & Production Readiness | 80-100h |
| **Sprint 1** | 5-7 days | Salon Owner Onboarding | 60h |
| **Sprint 2** | 7-10 days | Booking & Slots | 70h |
| **Sprint 3** | 10-14 days | Payments | 90h |
| **Total** | **5-7 weeks** | **MVP to Production** | **300-320h** |

---

# 🎯 Critical Path

```
Sprint 0 (MUST FINISH FIRST)
   ↓
Backups Active → C1/C2 Deployed → Admin Panel Working
   ↓
Sprint 1 (SALON OWNER ONBOARDING)
   ↓
Owner can create salon → Admin approves → Public search shows salon
   ↓
Sprint 2 (BOOKING)
   ↓
Clients can book → Masters see bookings → No double-booking
   ↓
Sprint 3 (PAYMENTS)
   ↓
Bookings require payment → Platform earns commission
```

---

# 🔴 Blockers to Track

| Blocker | Impact | Owner | Status |
|---------|--------|-------|--------|
| Backups not active | 🔴 CRITICAL - Data loss risk | DevOps | ⬜ TODO |
| C1/C2 not deployed | 🟠 HIGH - Can't onboard owners | Backend | ⬜ TODO |
| Admin panel not working | 🟠 HIGH - Manual DB edits needed | Frontend | ⬜ TODO |
| No staging environment | 🟡 MEDIUM - Risky deployments | DevOps | ⬜ TODO |

---

**Last Updated:** 2025-12-23
**Version:** 1.0
**Status:** Sprint 0 in Progress
