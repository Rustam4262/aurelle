# ⚡ Rate Limiting - Status & Configuration

## ✅ Полностью настроено и работает

Rate limiting **УЖЕ РЕАЛИЗОВАН** и применяется на production! 🎉

---

## 📊 Текущая конфигурация

### 1. Global Rate Limiter (все API запросы)
```typescript
// server/routes.ts:22
app.use("/api", globalLimiter);
```

**Лимиты:**
- 200 запросов/минуту на IP
- Исключения: `/uploads`, `/assets`
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

**Результат:** Защита от DDoS атак ✅

---

### 2. Auth Rate Limiter (login/password)
```typescript
// server/middleware/rateLimiter.ts:4-14
windowMs: 15 * 60 * 1000,  // 15 минут
max: 5,                     // 5 попыток
skipSuccessfulRequests: true // Только неудачные попытки
```

**Применяется к:**
- `/api/auth/login`
- `/api/auth/phone/verify`

**Результат:** Защита от brute force атак ✅

---

### 3. Register Rate Limiter (регистрация)
```typescript
// server/middleware/rateLimiter.ts:17-25
windowMs: 60 * 60 * 1000,  // 1 час
max: 3                      // 3 регистрации
```

**Применяется к:**
- `/api/auth/register`

**Результат:** Защита от массовой регистрации ботов ✅

---

### 4. API Rate Limiter (обычные запросы)
```typescript
// server/middleware/rateLimiter.ts:28-36
windowMs: 1 * 60 * 1000,  // 1 минута
max: 100                   // 100 запросов/мин
```

**Применяется к:**
- Большинство GET endpoints

**Результат:** Защита от spam запросов ✅

---

### 5. Create Rate Limiter (создание контента)
```typescript
// server/middleware/rateLimiter.ts:39-48
windowMs: 1 * 60 * 1000,  // 1 минута
max: 10                    // 10 создания/мин
```

**Применяется к:**
- `/api/bookings` (POST)
- `/api/reviews` (POST)
- `/api/favorites` (POST)

**Результат:** Защита от spam бронирований/отзывов ✅

---

### 6. Upload Rate Limiter (загрузка файлов)
```typescript
// server/middleware/rateLimiter.ts:51-59
windowMs: 15 * 60 * 1000,  // 15 минут
max: 20                     // 20 загрузок
```

**Применяется к:**
- `/api/upload/*`

**Результат:** Защита от массовой загрузки файлов ✅

---

## 🧪 Тестирование

### Проверить что rate limiting работает

```bash
# Проверить headers
curl -I https://aurelle.uz/api/salons

# Должны увидеть:
RateLimit-Policy: 200;w=60
RateLimit-Limit: 200
RateLimit-Remaining: 199
RateLimit-Reset: 60
```

### Trigger rate limit (для теста)

```bash
# Быстро сделать 201 запрос
for i in {1..201}; do
  curl -s https://aurelle.uz/api/health > /dev/null
  echo "Request $i"
done

# 201-й запрос должен вернуть:
# HTTP/1.1 429 Too Many Requests
# {"error": "Too many requests from this IP. Please slow down."}
```

---

## 📈 Мониторинг

### Посмотреть rate limit warnings в логах

```bash
ssh root@89.39.94.194
docker logs aurelle-server | grep -i "429\|rate"
```

### Проверить кто trigger'ит лимиты

```bash
# Nginx access логи
tail -f /var/log/nginx/access.log | grep " 429 "

# Показывает IP адреса с rate limit errors
```

---

## ⚙️ Настройка (если нужно изменить)

### Увеличить лимиты для production

Если пользователей много и легитимные users trigger'ят лимиты:

```typescript
// server/middleware/rateLimiter.ts

// Глобальный лимит: 200 → 500
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,  // Увеличить
  ...
});
```

### Redis для distributed rate limiting

Если несколько серверов (horizontal scaling):

```bash
npm install rate-limit-redis
```

```typescript
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL
});

export const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:",
  }),
  windowMs: 1 * 60 * 1000,
  max: 200,
});
```

---

## 🎯 Критерии готовности

- ✅ express-rate-limit установлен
- ✅ Middleware созданы (6 типов)
- ✅ globalLimiter применён к `/api/*`
- ✅ Специфичные limiters применены к auth/register/create endpoints
- ✅ Rate limit headers возвращаются в responses
- ✅ 429 status код возвращается при превышении лимита
- ✅ Health endpoints исключены из rate limiting

**Статус:** ✅ READY FOR PRODUCTION

---

## 📝 Следующие шаги (опционально)

1. **Redis store** - для horizontal scaling (когда будет >1 сервера)
2. **IP whitelist** - исключить trusted IPs (например, мониторинг)
3. **User-based limits** - вместо IP-based (для authenticated users)
4. **Dynamic limits** - увеличивать лимиты для премиум пользователей

---

## 🔗 Файлы

- [server/middleware/rateLimiter.ts](server/middleware/rateLimiter.ts) - все rate limiters
- [server/routes.ts:22](server/routes.ts#L22) - применение globalLimiter
- [express-rate-limit docs](https://github.com/express-rate-limit/express-rate-limit)
