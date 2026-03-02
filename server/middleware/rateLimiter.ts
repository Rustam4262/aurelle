import rateLimit from "express-rate-limit";

// Login: 10 attempts/min (failed ones only)
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Too many login attempts. Please try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Password reset: 5 requests/min
export const resetLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many reset attempts. Please try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration: 5 accounts/min per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many registration attempts. Please try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Legacy alias (kept for any remaining callers)
export const authLimiter = loginLimiter;

// Лимиты для API endpoints (мягче)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 100, // 100 запросов в минуту
  message: {
    error: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Лимиты для создания контента (бронирования, отзывы)
export const createLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 10, // 10 создания в минуту
  message: {
    error: "Too many requests. Please wait before creating more.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Лимиты для загрузки файлов
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 20, // 20 загрузок за 15 минут
  message: {
    error: "Too many file uploads. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OAuth: 20 attempts per 15 minutes per IP (protects Google/Yandex start routes)
export const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many OAuth attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Глобальный лимит для всех запросов
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 200, // 200 запросов в минуту на весь API
  message: {
    error: "Too many requests from this IP. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем статические файлы
    return req.path.startsWith("/uploads") || req.path.startsWith("/assets");
  },
});
