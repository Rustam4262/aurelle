"""
Rate Limiting Middleware для защиты от DDoS и brute-force атак
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import asyncio


class RateLimiter:
    """
    Rate limiter с использованием sliding window алгоритма
    """

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.window_size = timedelta(minutes=1)
        # Хранилище: {ip_address: [(timestamp, path), ...]}
        self.requests: Dict[str, list[Tuple[datetime, str]]] = defaultdict(list)
        self.cleanup_task = None

    def _cleanup_old_requests(self, ip: str, now: datetime):
        """Удалить старые запросы вне окна"""
        cutoff_time = now - self.window_size
        self.requests[ip] = [
            (ts, path) for ts, path in self.requests[ip]
            if ts > cutoff_time
        ]

    def is_allowed(self, ip: str, path: str) -> bool:
        """Проверить, разрешен ли запрос"""
        now = datetime.now()

        # Очистить старые запросы
        self._cleanup_old_requests(ip, now)

        # Проверить лимит
        if len(self.requests[ip]) >= self.requests_per_minute:
            return False

        # Добавить текущий запрос
        self.requests[ip].append((now, path))
        return True

    def get_remaining(self, ip: str) -> int:
        """Получить количество оставшихся запросов"""
        now = datetime.now()
        self._cleanup_old_requests(ip, now)
        return max(0, self.requests_per_minute - len(self.requests[ip]))

    def get_reset_time(self, ip: str) -> datetime:
        """Получить время сброса лимита"""
        if not self.requests[ip]:
            return datetime.now()

        oldest_request = min(ts for ts, _ in self.requests[ip])
        return oldest_request + self.window_size


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware для rate limiting

    Более строгие лимиты для чувствительных endpoints:
    - /api/auth/login: 5 запросов в минуту (защита от brute-force)
    - /api/auth/register: 3 запроса в минуту (защита от спама)
    - /api/payments/*: 10 запросов в минуту (защита платежей)
    - Остальные: 60 запросов в минуту (общий лимит)
    """

    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled

        # Разные лимиты для разных endpoints
        self.limiters = {
            "auth_login": RateLimiter(requests_per_minute=5),
            "auth_register": RateLimiter(requests_per_minute=3),
            "payments": RateLimiter(requests_per_minute=10),
            "default": RateLimiter(requests_per_minute=60),
        }

    def _get_limiter(self, path: str) -> Tuple[str, RateLimiter]:
        """Получить подходящий rate limiter для пути"""
        if "/api/auth/login" in path:
            return "auth_login", self.limiters["auth_login"]
        elif "/api/auth/register" in path:
            return "auth_register", self.limiters["auth_register"]
        elif "/api/payments" in path:
            return "payments", self.limiters["payments"]
        else:
            return "default", self.limiters["default"]

    async def dispatch(self, request: Request, call_next):
        if not self.enabled:
            return await call_next(request)

        # Получить IP адрес клиента
        client_ip = request.client.host if request.client else "unknown"

        # Пропустить health checks
        if request.url.path in ["/health", "/api/health"]:
            return await call_next(request)

        # Выбрать limiter
        limiter_name, limiter = self._get_limiter(request.url.path)

        # Проверить rate limit
        if not limiter.is_allowed(client_ip, request.url.path):
            reset_time = limiter.get_reset_time(client_ip)
            retry_after = int((reset_time - datetime.now()).total_seconds())

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limiter.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": reset_time.isoformat()
                }
            )

        # Выполнить запрос
        response = await call_next(request)

        # Добавить заголовки rate limit в ответ
        remaining = limiter.get_remaining(client_ip)
        reset_time = limiter.get_reset_time(client_ip)

        response.headers["X-RateLimit-Limit"] = str(limiter.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = reset_time.isoformat()

        return response
