"""
Security Middleware для добавления защитных заголовков
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Добавляет security headers для защиты от различных атак

    Headers:
    - X-Content-Type-Options: Защита от MIME sniffing
    - X-Frame-Options: Защита от clickjacking
    - X-XSS-Protection: Защита от XSS (для старых браузеров)
    - Strict-Transport-Security: HSTS для HTTPS
    - Content-Security-Policy: CSP для защиты от XSS и инъекций
    - Referrer-Policy: Контроль передачи referer
    - Permissions-Policy: Контроль доступа к браузерным API
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HSTS - только для HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api-maps.yandex.ru; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api-maps.yandex.ru; "
            "frame-ancestors 'none';"
        )

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy (formerly Feature-Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(self), "
            "microphone=(), "
            "camera=(), "
            "payment=(self)"
        )

        # Remove server header (скрыть информацию о сервере)
        response.headers.pop("server", None)

        return response


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Базовая валидация запросов для защиты от атак
    """

    # Максимальные размеры
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB
    MAX_HEADER_SIZE = 8192  # 8 KB

    async def dispatch(self, request: Request, call_next):
        # Проверка размера content-length
        content_length = request.headers.get("content-length")
        if content_length:
            if int(content_length) > self.MAX_CONTENT_LENGTH:
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Request body too large"
                )

        # Проверка размера заголовков
        total_header_size = sum(len(k) + len(v) for k, v in request.headers.items())
        if total_header_size > self.MAX_HEADER_SIZE:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_431_REQUEST_HEADER_FIELDS_TOO_LARGE,
                detail="Request headers too large"
            )

        # Проверка на подозрительные символы в query parameters
        suspicious_chars = ["<", ">", "script", "javascript:", "onerror="]
        query_string = str(request.url.query).lower()

        for char in suspicious_chars:
            if char in query_string:
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid characters in query parameters"
                )

        return await call_next(request)
