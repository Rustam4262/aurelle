from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator


class Settings(BaseSettings):
    # Database (PostgreSQL для Docker, можно переопределить в .env)
    DATABASE_URL: str = "postgresql://beauty_user:beauty_pass@postgres:5432/beauty_salon_db"

    # JWT - ОБЯЗАТЕЛЬНО установите SECRET_KEY в .env для production!
    SECRET_KEY: str = "dev-secret-key-for-local-testing-12345678"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 дней для refresh токена

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    # Environment
    ENVIRONMENT: str = "development"

    # Logging
    LOG_LEVEL: str = "INFO"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60

    # Yandex Maps API
    YANDEX_MAPS_API_KEY: str = "99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0"

    # Sentry Error Monitoring
    SENTRY_DSN: str = ""  # Set in .env for error monitoring
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_TRACES_SAMPLE_RATE: float = 1.0  # 100% for dev, lower for production
    SENTRY_PROFILES_SAMPLE_RATE: float = 1.0  # 100% for dev, lower for production

    # Payment Systems
    PAYME_MERCHANT_ID: str = ""
    PAYME_SECRET_KEY: str = ""
    CLICK_SERVICE_ID: str = ""
    CLICK_SECRET_KEY: str = ""
    UZUM_MERCHANT_ID: str = ""
    UZUM_SECRET_KEY: str = ""

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from comma-separated string or list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True

    def validate_production_settings(self):
        """Проверка настроек для production"""
        if self.ENVIRONMENT == "production":
            if self.SECRET_KEY == "dev-secret-key-for-local-testing-12345678":
                raise ValueError("SECRET_KEY must be changed for production!")
            if len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters long!")

            # Проверка настроек платежных систем
            if not self.PAYME_SECRET_KEY:
                raise ValueError("PAYME_SECRET_KEY must be set for production!")
            if not self.CLICK_SECRET_KEY:
                raise ValueError("CLICK_SECRET_KEY must be set for production!")
            if not self.UZUM_SECRET_KEY:
                raise ValueError("UZUM_SECRET_KEY must be set for production!")


settings = Settings()

# Валидация настроек при импорте
if settings.ENVIRONMENT == "production":
    settings.validate_production_settings()
