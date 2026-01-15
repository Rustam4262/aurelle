# Security Documentation

## Overview

This document outlines the security measures implemented in the AURELLE platform to protect user data, prevent common vulnerabilities, and ensure safe operation.

## Authentication & Session Management

### Multiple Authentication Methods

The platform supports two authentication methods:

1. **Local Authentication** (Email/Password)
   - Location: [server/localAuth.ts](server/localAuth.ts)
   - Password hashing: bcrypt with 12 rounds
   - Minimum password length: 8 characters
   - Rate limiting: 5 attempts per 15 minutes

2. **Yandex OAuth**
   - Standard OAuth 2.0 flow
   - Configured via environment variables

### Session Security

- **Storage**: PostgreSQL-backed sessions (connect-pg-simple)
- **Cookie Configuration**:
  - `httpOnly: true` - Prevents XSS access to cookies
  - `secure: true` - HTTPS only in production
  - `sameSite: 'strict'` - CSRF protection
  - Session TTL: 30 days

## Critical Security Fixes Applied

### 1. SQL Injection Prevention ✅

**Issue**: Raw SQL template strings with user-controlled data allowed SQL injection attacks.

**Locations Fixed**:
- [server/routes.ts:667](server/routes.ts#L667) - Service details query
- [server/routes.ts:1476-1482](server/routes.ts#L1476-L1482) - Batch service queries

**Solution**: Replaced `sql` template with Drizzle ORM's `inArray()` function:

```typescript
// BEFORE (VULNERABLE):
const services = await db.select().from(services)
  .where(sql`${services.id} IN ${serviceIds}`);

// AFTER (SECURE):
const services = await db.select().from(services)
  .where(inArray(services.id, serviceIds));
```

### 2. Rate Limiting ✅

**Implementation**: [server/middleware/rateLimiter.ts](server/middleware/rateLimiter.ts)

**Limiters Configured**:

| Limiter | Window | Max Requests | Applied To |
|---------|--------|--------------|------------|
| `authLimiter` | 15 min | 5 | Login, password reset |
| `registerLimiter` | 15 min | 3 | Registration |
| `createLimiter` | 1 min | 10 | Bookings, reviews, favorites |
| `updateLimiter` | 1 min | 30 | Profile updates, master edits |
| `globalLimiter` | 1 min | 200 | All API routes |

**Endpoints Protected**:
- `/api/auth/login` - authLimiter
- `/api/auth/register` - registerLimiter
- `/api/bookings` (POST) - createLimiter
- `/api/reviews` (POST) - createLimiter
- `/api/favorites` (POST) - createLimiter
- `/api/*` - globalLimiter

### 3. Input Validation ✅

**Implementation**: Zod schemas for all user inputs

**Examples**:

1. **Salon Updates** ([routes.ts:1139-1169](server/routes.ts#L1139-L1169)):
```typescript
const updateSalonSchema = z.object({
  name: z.object({
    en: z.string().min(1),
    ru: z.string().min(1),
    uz: z.string().min(1),
  }).optional(),
  address: z.string().min(5).optional(),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/).optional(),
  // ... all fields validated
});
```

2. **Authentication** ([localAuth.ts:9-19](server/localAuth.ts#L9-L19)):
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
```

**Validation Pattern**:
```typescript
const parsed = schema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({
    error: "Invalid input",
    details: parsed.error.errors
  });
}
```

### 4. CSRF Protection ✅

**Method**: SameSite cookie attribute

**Implementation**: Session cookie configuration in [localAuth.ts](server/localAuth.ts)

```typescript
cookie: {
  httpOnly: true,
  secure: true,
  sameSite: "strict", // CSRF protection
  maxAge: sessionTtl,
}
```

**Protection Level**: `strict` prevents all cross-site request forgery attacks by blocking cookies on all cross-site requests.

### 5. Password Security ✅

**Hashing Algorithm**: bcrypt with 12 rounds

**Locations**:
- [localAuth.ts:22](server/localAuth.ts#L22) - Registration
- [routes.ts:1181](server/routes.ts#L1181) - Master account creation

```typescript
const BCRYPT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

**Strength**: 12 rounds = ~300ms hashing time, resistant to GPU cracking attacks.

### 6. Database Transactions ✅

**Critical Operations Using Transactions**:

1. **Master Creation with User Account** ([routes.ts:1203-1255](server/routes.ts#L1203-L1255)):
```typescript
const result = await db.transaction(async (tx) => {
  // Create user account
  await tx.insert(users).values({...});
  // Create user profile
  await tx.insert(userProfiles).values({...});
  // Create master record
  const [master] = await tx.insert(masters).values([...]).returning();
  return master;
});
```

**Benefit**: Ensures atomicity - all operations succeed or all fail together, preventing orphaned records.

### 7. N+1 Query Prevention ✅

**Problem**: Loading related data in loops causes excessive database queries.

**Solution**: Batch loading with `inArray()`

**Example** ([routes.ts:663-667](server/routes.ts#L663-L667)):
```typescript
// Extract all service IDs
const serviceIds = bookings
  .flatMap(b => b.serviceIds)
  .filter((id, idx, arr) => arr.indexOf(id) === idx);

// Single batch query instead of N queries
const serviceDetails = await db.select().from(services)
  .where(inArray(services.id, serviceIds));
```

## Environment Variables Security

### Required Variables

**Location**: [.env](.env) (excluded from git)

```bash
# Critical - must be set in production
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=<min-32-chars-random-string>

# Optional - for OAuth providers
YANDEX_CLIENT_ID=<yandex-oauth-client-id>
YANDEX_CLIENT_SECRET=<yandex-oauth-client-secret>
```

### Best Practices

1. **Never commit .env to git** - Already in .gitignore
2. **SESSION_SECRET**: Generate with `openssl rand -base64 32`
3. **Rotate secrets** every 90 days in production
4. **Use different secrets** for dev/staging/production

## File Upload Security

**Implementation**: [server/upload.ts](server/upload.ts)

### Restrictions

- **File Types**: Only images (jpeg, jpg, png, gif, webp)
- **File Size**: Max 5MB
- **Storage**: Local filesystem (server/uploads/)
- **Optimization**: Automatic compression with Sharp

### Validation

```typescript
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images allowed."));
  }
};
```

### Future Recommendation

Migrate to cloud storage (Cloudinary/AWS S3) with:
- Signed upload URLs
- Content-Type validation
- Virus scanning
- CDN delivery

## Known Remaining Issues

### High Priority

1. **Missing HTTPS in Development**
   - Impact: Cookies with `secure: true` won't work on localhost
   - Fix: Use `secure: process.env.NODE_ENV === 'production'`

2. **No Request Origin Validation**
   - Impact: API can be called from any domain
   - Fix: Add CORS middleware with allowed origins whitelist

3. **Weak Password Requirements**
   - Current: Min 8 characters, no complexity rules
   - Recommendation: Require uppercase, lowercase, numbers, symbols

### Medium Priority

4. **No Account Lockout**
   - Issue: Rate limiting only delays attacks
   - Fix: Lock account after 10 failed attempts for 1 hour

5. **No Email Verification**
   - Issue: Anyone can register with any email
   - Fix: Send verification token, activate account on click

6. **No Two-Factor Authentication**
   - Recommendation: Implement TOTP (Google Authenticator compatible)

### Low Priority

7. **Session Fixation Risk**
   - Issue: Session ID not regenerated after login
   - Fix: Call `req.session.regenerate()` after authentication

8. **No Content Security Policy**
   - Missing CSP headers to prevent XSS
   - Fix: Add helmet middleware with CSP configuration

## Authorization & Access Control

### Role-Based Access

**Roles**: Client, Master, Owner, Admin

**Implementation**: Middleware checks in [routes.ts](server/routes.ts)

```typescript
// Example: Only salon owner can update salon
const ownerSalons = await db.select({ id: salons.id })
  .from(salons)
  .where(eq(salons.ownerId, userId));

const ownedSalonIds = ownerSalons.map(s => s.id);
if (!ownedSalonIds.includes(salonId)) {
  return res.status(403).json({ error: "Forbidden" });
}
```

### Missing Features

- [ ] Granular permissions system
- [ ] Resource-level access control
- [ ] Audit trail of privileged operations
- [ ] Role hierarchy (super admin > owner > master)

## Monitoring & Incident Response

### Current Logging

- Console logging only (not production-ready)
- No structured logging
- No security event tracking

### Recommendations

1. **Add Winston or Pino** for structured logging
2. **Track Security Events**:
   - Failed login attempts
   - Rate limit hits
   - Invalid tokens
   - Permission denials
3. **Set Up Alerts**:
   - Multiple failed logins from same IP
   - Unusual API usage patterns
   - Database errors

## Deployment Checklist

Before deploying to production:

- [ ] Set strong `SESSION_SECRET` (min 32 random chars)
- [ ] Configure `DATABASE_URL` with production credentials
- [ ] Enable HTTPS and set `secure: true` for cookies
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS with allowed origins
- [ ] Review rate limits for production traffic
- [ ] Set up database backups
- [ ] Configure error monitoring (Sentry, etc.)
- [ ] Add security headers (helmet middleware)
- [ ] Review and test all authentication flows
- [ ] Scan dependencies for vulnerabilities (`npm audit`)

## Security Contacts

For security vulnerabilities, please contact:
- **Email**: [Your security email]
- **Response Time**: Within 48 hours
- **Disclosure Policy**: Responsible disclosure - 90 days before public release

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Drizzle ORM Security](https://orm.drizzle.team/docs/security)

---

**Last Updated**: 2025-12-25
**Security Fixes Audit**: All critical items from security audit completed
