# 🔧 Error Handling - Implementation Guide

## ✅ Что создано

### Новая система error handling

- ✅ **Centralized error handler middleware**
- ✅ **Custom error classes** (8 типов)
- ✅ **Structured error responses**
- ✅ **Async handler wrapper**
- ✅ **Not found handler**

**Файл:** [server/middleware/errorHandler.ts](server/middleware/errorHandler.ts)

---

## 📊 Error Classes

### 1. AppError (base class)

```typescript
throw new AppError(statusCode, message, code, details);
```

### 2. BadRequestError (400)

```typescript
throw new BadRequestError("Invalid input", { field: "email" });
```

### 3. UnauthorizedError (401)

```typescript
throw new UnauthorizedError("Please log in");
```

### 4. ForbiddenError (403)

```typescript
throw new ForbiddenError("You don't have permission");
```

### 5. NotFoundError (404)

```typescript
throw new NotFoundError("Salon"); // "Salon not found"
```

### 6. ConflictError (409)

```typescript
throw new ConflictError("Booking slot already taken", {
  date: "2026-01-15",
  time: "10:00",
});
```

### 7. ValidationError (422)

```typescript
throw new ValidationError("Invalid data", {
  errors: ["Email is required"],
});
```

### 8. TooManyRequestsError (429)

```typescript
throw new TooManyRequestsError();
```

### 9. InternalServerError (500)

```typescript
throw new InternalServerError("Database connection failed");
```

---

## 🚀 Как использовать

### Шаг 1: Обновить server/index.ts

```typescript
// server/index.ts
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// ... existing code ...

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

// Заменить на:
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// After all routes
app.use(notFoundHandler); // 404 handler
app.use(errorHandler); // Error handler
```

### Шаг 2: Обновить routes

#### Было (старый способ):

```typescript
router.get("/salons/:id", async (req, res) => {
  try {
    const salon = await db.select()...;
    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }
    return res.json(salon);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to get salon" });
  }
});
```

#### Стало (новый способ):

```typescript
import { asyncHandler, NotFoundError } from "../middleware/errorHandler";

router.get("/salons/:id", asyncHandler(async (req, res) => {
  const salon = await db.select()...;
  if (!salon) {
    throw new NotFoundError("Salon");
  }
  return res.json(salon);
}));
```

**Преимущества:**

- ✅ Меньше кода
- ✅ Consistent error format
- ✅ Автоматический catch
- ✅ Structured logging

---

## 📋 Migration Examples

### Example 1: Booking Creation

#### Было:

```typescript
router.post("/bookings", async (req: any, res) => {
  try {
    const data = req.body;

    // Check conflicts
    const conflicts = await db.select()...;
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: "Time slot already booked"
      });
    }

    const booking = await db.insert(bookings).values(data);
    return res.json(booking);
  } catch (error) {
    console.error("Booking creation error:", error);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});
```

#### Стало:

```typescript
import { asyncHandler, ConflictError } from "../middleware/errorHandler";

router.post("/bookings", asyncHandler(async (req: any, res) => {
  const data = req.body;

  // Check conflicts
  const conflicts = await db.select()...;
  if (conflicts.length > 0) {
    throw new ConflictError("Time slot already booked", {
      date: data.date,
      time: data.startTime,
      masterId: data.masterId
    });
  }

  const booking = await db.insert(bookings).values(data).returning();
  return res.json(booking[0]);
}));
```

### Example 2: Authentication

#### Было:

```typescript
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await db.select()...;
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ... rest of logic
  } catch (error) {
    return res.status(500).json({ error: "Login failed" });
  }
});
```

#### Стало:

```typescript
import {
  asyncHandler,
  BadRequestError,
  UnauthorizedError
} from "../middleware/errorHandler";

router.post("/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError("Email and password required");
  }

  const user = await db.select()...;
  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // ... rest of logic
}));
```

### Example 3: Permission Check

#### Было:

```typescript
router.delete("/salons/:id", async (req: any, res) => {
  try {
    const salon = await db.select()...;
    if (!salon) {
      return res.status(404).json({ error: "Salon not found" });
    }

    if (salon.ownerId !== req.user.id) {
      return res.status(403).json({ error: "You don't own this salon" });
    }

    await db.delete(salons).where(eq(salons.id, req.params.id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete salon" });
  }
});
```

#### Стало:

```typescript
import {
  asyncHandler,
  NotFoundError,
  ForbiddenError
} from "../middleware/errorHandler";

router.delete("/salons/:id", asyncHandler(async (req: any, res) => {
  const salon = await db.select()...;
  if (!salon) {
    throw new NotFoundError("Salon");
  }

  if (salon.ownerId !== req.user.id) {
    throw new ForbiddenError("You don't own this salon");
  }

  await db.delete(salons).where(eq(salons.id, req.params.id));
  return res.json({ success: true });
}));
```

---

## 📊 Error Response Format

### Client receives structured errors:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Time slot already booked",
    "details": {
      "date": "2026-01-15",
      "time": "10:00",
      "masterId": "..."
    },
    "timestamp": "2026-01-09T12:34:56.789Z",
    "path": "/api/bookings"
  }
}
```

### Development includes stack trace:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Database connection failed",
    "timestamp": "2026-01-09T12:34:56.789Z",
    "path": "/api/bookings",
    "stack": "Error: Database connection failed\n  at ..."
  }
}
```

---

## 🧪 Testing

### Test error responses:

```bash
# Not found
curl https://aurelle.uz/api/salons/invalid-id

# Response:
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Salon not found",
    "timestamp": "2026-01-09T12:34:56.789Z",
    "path": "/api/salons/invalid-id"
  }
}

# Conflict
curl -X POST https://aurelle.uz/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"salonId": "...", "date": "2026-01-15", "startTime": "10:00"}'

# Response (if slot taken):
{
  "error": {
    "code": "CONFLICT",
    "message": "Time slot already booked",
    "details": {
      "date": "2026-01-15",
      "time": "10:00"
    },
    "timestamp": "2026-01-09T12:34:56.789Z",
    "path": "/api/bookings"
  }
}
```

---

## 🎯 Migration Plan

### Phase 1: Core routes (High priority)

- [ ] server/routes/bookings.routes.ts
- [ ] server/routes/salons.routes.ts
- [ ] server/routes/auth.routes.ts
- [ ] server/routes/masters.routes.ts

### Phase 2: Secondary routes

- [ ] server/routes/services.routes.ts
- [ ] server/routes/reviews.routes.ts
- [ ] server/routes/favorites.routes.ts
- [ ] server/routes/notifications.routes.ts

### Phase 3: Admin routes

- [ ] server/routes/admin/\*.routes.ts

### Phase 4: Utility routes

- [ ] server/routes/calendar.routes.ts
- [ ] server/routes/portfolio.routes.ts
- [ ] server/routes/waitlist.routes.ts

---

## 📈 Benefits

### Before (inconsistent):

```typescript
// Different error formats across routes
res.status(404).json({ error: "Not found" });
res.status(404).json({ message: "Salon not found" });
res.status(404).send("Not found");
res.sendStatus(404);
```

### After (consistent):

```typescript
// Same format everywhere
throw new NotFoundError("Salon");

// Always produces:
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Salon not found",
    "timestamp": "...",
    "path": "/api/salons/123"
  }
}
```

### Metrics:

- ✅ 331 error handling points → можно унифицировать
- ✅ Сократит код на ~30%
- ✅ Улучшит debugging
- ✅ Consistent API responses
- ✅ Better client error handling

---

## 🔗 Next Steps

1. **Update server/index.ts** - подключить middleware
2. **Migrate bookings.routes.ts** - самый важный route
3. **Test error responses** - проверить формат
4. **Gradually migrate** - по одному route за раз
5. **Update frontend** - использовать structured errors

---

## 🆘 Troubleshooting

### Error not caught by middleware

**Problem:** Error not reaching errorHandler

**Solution:** Убедиться что используется `asyncHandler`:

```typescript
// ❌ Wrong
router.get("/test", async (req, res) => { ... });

// ✅ Correct
router.get("/test", asyncHandler(async (req, res) => { ... }));
```

### Stack trace in production

**Problem:** Stack traces exposed in production

**Solution:** Проверить NODE_ENV:

```bash
docker exec aurelle-server sh -c 'echo $NODE_ENV'
# Should be: production
```

### Error details not showing

**Problem:** `details` field missing

**Solution:** Pass details when throwing:

```typescript
throw new ConflictError("Slot taken", { date, time });
```

---

## ✅ Summary

**Новая система error handling готова к использованию!**

- ✅ Middleware создан
- ✅ 9 error classes
- ✅ Structured responses
- ✅ Async handler wrapper
- ✅ Documentation complete

**Можно постепенно мигрировать routes** без breaking changes.
