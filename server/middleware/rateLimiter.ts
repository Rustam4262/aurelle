import rateLimit from "express-rate-limit";

// Лимиты для аутентификации (строже)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // Максимум 5 попыток
  message: {
    error: "Too many authentication attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Пропускаем успешные запросы
  skipSuccessfulRequests: true,
});

// Лимиты для регистрации (еще строже)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // Максимум 3 регистрации
  message: {
    error: "Too many accounts created. Please try again in 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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
