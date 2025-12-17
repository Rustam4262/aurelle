from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.sentry import init_sentry, SentryBreadcrumbMiddleware
# ========================================
# MVP IMPORTS - ТОЛЬКО ЭТИ МОДУЛИ
# ========================================
from app.api import auth, users, salons, services, bookings
# Вспомогательные модули для MVP:
from app.api import masters, availability, uploads, geocoding
# MVP FIX: Re-enable for UI stubs (prevent 404 errors)
from app.api import favorites, service_masters, notifications

# ========================================
# ОТКЛЮЧЕНО ДО 22.12.2025
# ========================================
# from app.api import reviews, statistics, chat
# from app.api import promo_codes, recommendations, notifications, admin
# from app.api import master_dashboard, schedule, payments, consents, bookings_detailed
# from app.websocket import chat as ws_chat, notifications as ws_notifications
from app.middleware import AuditMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
from app.middleware.security import SecurityHeadersMiddleware, RequestValidationMiddleware
from app.middleware.idempotency import IdempotencyMiddleware
from pathlib import Path

# Initialize Sentry for error monitoring
init_sentry()

app = FastAPI(
    title="Beauty Salon Marketplace API",
    description="Маркетплейс для записи в салоны красоты",
    version="1.0.0"
)

# ========================================
# MIDDLEWARE - ОТКЛЮЧЕНЫ ДЛЯ УПРОЩЕНИЯ MVP
# ========================================
# Security Middleware (порядок важен!)
# 1. Sentry Breadcrumbs - отслеживание последовательности действий
# app.add_middleware(SentryBreadcrumbMiddleware)

# 2. Security Headers - добавляет защитные заголовки
# app.add_middleware(SecurityHeadersMiddleware)

# 3. Request Validation - валидация размера и содержимого запросов
# app.add_middleware(RequestValidationMiddleware)

# 4. Rate Limiting - защита от DDoS и brute-force
# app.add_middleware(RateLimitMiddleware, enabled=settings.RATE_LIMIT_ENABLED)

# 5. Idempotency - защита от дублирования операций
# app.add_middleware(IdempotencyMiddleware)

# 6. CORS - должен быть после rate limiting и idempotency
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 7. Audit logging - должен быть последним для логирования всех запросов
# app.add_middleware(AuditMiddleware)  # ОТКЛЮЧЕНО ДЛЯ MVP

# ========================================
# MVP ROUTES - ТОЛЬКО ЭТИ РОУТЫ ВКЛЮЧЕНЫ
# ========================================
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(salons.router, prefix="/api/salons", tags=["Salons"])
app.include_router(services.router, prefix="/api/services", tags=["Services"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])

# ========================================
# ВСПОМОГАТЕЛЬНЫЕ РОУТЫ (для MVP)
# ========================================
app.include_router(masters.router, prefix="/api/masters", tags=["Masters"])
app.include_router(availability.router, prefix="/api/availability", tags=["Availability"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["Uploads"])
# MVP FIX: Re-enable to prevent UI 404 errors
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(service_masters.router, prefix="/api/service-masters", tags=["Service Masters"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])

# ========================================
# ОТКЛЮЧЕНО ДО 22.12.2025
# НЕ УДАЛЯТЬ - ПРОСТО ЗАКОММЕНТИРОВАНО
# ========================================
# app.include_router(bookings_detailed.router, prefix="/api/bookings", tags=["Bookings Detailed"])
# app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])
# app.include_router(statistics.router, prefix="/api/statistics", tags=["Statistics"])
# app.include_router(chat.router, prefix="/api", tags=["Chat"])
# app.include_router(promo_codes.router, prefix="/api", tags=["Promo Codes"])
# app.include_router(recommendations.router, prefix="/api", tags=["Recommendations"])
# app.include_router(admin.router, prefix="/api", tags=["Admin"])
# app.include_router(master_dashboard.router, prefix="/api/master", tags=["Master Dashboard"])
# app.include_router(geocoding.router, prefix="/api/geocoding", tags=["Geocoding"])
# app.include_router(schedule.router, prefix="/api/schedule", tags=["Schedule"])
# app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
# app.include_router(consents.router, prefix="/api/consents", tags=["User Consents"])

# ========================================
# WEBSOCKET - ОТКЛЮЧЕНО ДЛЯ MVP
# ========================================
# app.include_router(ws_chat.router, tags=["WebSocket Chat"])
# app.include_router(ws_notifications.router, tags=["WebSocket Notifications"])

# Static files for uploads
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/")
async def root():
    return {
        "message": "Beauty Salon Marketplace API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/sentry-debug")
async def trigger_error():
    """
    Тестовый endpoint для проверки интеграции Sentry

    Вызывает намеренную ошибку для проверки что:
    1. Sentry корректно инициализирован
    2. Ошибки автоматически отправляются в Sentry
    3. Performance monitoring работает

    После вызова проверьте Sentry dashboard:
    - Issues: должна появиться ошибка ZeroDivisionError
    - Performance: должна появиться транзакция GET /sentry-debug
    """
    division_by_zero = 1 / 0
