from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api import auth, salons, bookings, reviews, users, services, masters, bookings_detailed, availability, uploads, statistics, favorites, service_masters, chat, promo_codes, recommendations, notifications, admin, master_dashboard, geocoding, schedule, payments
from app.middleware import AuditMiddleware
from pathlib import Path

app = FastAPI(
    title="Beauty Salon Marketplace API",
    description="Маркетплейс для записи в салоны красоты",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit logging middleware
app.add_middleware(AuditMiddleware)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(salons.router, prefix="/api/salons", tags=["Salons"])
app.include_router(masters.router, prefix="/api/masters", tags=["Masters"])
app.include_router(services.router, prefix="/api/services", tags=["Services"])
app.include_router(bookings_detailed.router, prefix="/api/bookings", tags=["Bookings Detailed"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(availability.router, prefix="/api/availability", tags=["Availability"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["Uploads"])
app.include_router(statistics.router, prefix="/api/statistics", tags=["Statistics"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(service_masters.router, prefix="/api/service-masters", tags=["Service Masters"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(promo_codes.router, prefix="/api", tags=["Promo Codes"])
app.include_router(recommendations.router, prefix="/api", tags=["Recommendations"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])
app.include_router(master_dashboard.router, prefix="/api/master", tags=["Master Dashboard"])
app.include_router(geocoding.router, prefix="/api/geocoding", tags=["Geocoding"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["Schedule"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])

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
