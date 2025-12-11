"""
Idempotency Middleware для предотвращения дублирования операций
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import hashlib
import json
from typing import Optional
from app.core.database import get_db
from app.models.idempotency import IdempotencyKey


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """
    Middleware для обработки idempotency keys

    Работает только для POST/PUT/PATCH запросов к критическим endpoints:
    - /api/payments/* - платежи
    - /api/bookings/* - бронирования

    Клиент должен передать заголовок: Idempotency-Key: <unique-key>
    """

    # Endpoints, требующие idempotency
    IDEMPOTENT_PATHS = [
        "/api/payments/create",
        "/api/bookings",
    ]

    async def dispatch(self, request: Request, call_next):
        # Проверить, нужна ли idempotency для этого запроса
        if not self._requires_idempotency(request):
            return await call_next(request)

        # Получить idempotency key из заголовка
        idempotency_key = request.headers.get("Idempotency-Key")

        if not idempotency_key:
            # Для критических endpoints требуем idempotency key
            if request.url.path.startswith("/api/payments"):
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Idempotency-Key header is required for payment operations"}
                )
            # Для остальных - продолжаем без idempotency
            return await call_next(request)

        # Валидация idempotency key
        if len(idempotency_key) < 16 or len(idempotency_key) > 255:
            return JSONResponse(
                status_code=400,
                content={"detail": "Idempotency-Key must be between 16 and 255 characters"}
            )

        # Получить тело запроса и вычислить hash
        body = await request.body()
        body_hash = hashlib.sha256(body).hexdigest() if body else None

        # Проверить, существует ли уже такой ключ
        db = next(get_db())
        try:
            existing = db.query(IdempotencyKey).filter(
                IdempotencyKey.key == idempotency_key
            ).first()

            if existing:
                # Проверить, что это тот же запрос
                if (existing.request_path == request.url.path and
                    existing.request_method == request.method and
                    existing.request_body_hash == body_hash):

                    # Проверить, не истек ли ключ
                    if existing.is_expired():
                        # Удалить истекший ключ и выполнить запрос заново
                        db.delete(existing)
                        db.commit()
                    else:
                        # Вернуть сохраненный ответ
                        if existing.response_status and existing.response_body:
                            return Response(
                                content=existing.response_body,
                                status_code=existing.response_status,
                                media_type="application/json",
                                headers={"X-Idempotency-Replay": "true"}
                            )
                else:
                    # Тот же ключ, но другой запрос - ошибка
                    return JSONResponse(
                        status_code=409,
                        content={
                            "detail": "Idempotency key already used for a different request"
                        }
                    )

            # Выполнить запрос
            # Важно: воссоздать request с прочитанным body
            async def receive():
                return {"type": "http.request", "body": body}

            request._receive = receive

            response = await call_next(request)

            # Сохранить результат для будущих запросов с тем же ключом
            if response.status_code < 500:  # Не кешируем server errors
                # Прочитать body ответа
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk

                # Сохранить idempotency key
                idempotency_record = IdempotencyKey(
                    key=idempotency_key,
                    request_path=request.url.path,
                    request_method=request.method,
                    request_body_hash=body_hash,
                    response_status=response.status_code,
                    response_body=response_body.decode('utf-8'),
                    expires_at=IdempotencyKey.create_expiry_time(hours=24)
                )
                db.add(idempotency_record)
                db.commit()

                # Вернуть ответ с воссозданным body
                return Response(
                    content=response_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )

            return response

        finally:
            db.close()

    def _requires_idempotency(self, request: Request) -> bool:
        """Проверить, требуется ли idempotency для запроса"""
        # Только для POST/PUT/PATCH
        if request.method not in ["POST", "PUT", "PATCH"]:
            return False

        # Проверить путь
        path = request.url.path
        for idempotent_path in self.IDEMPOTENT_PATHS:
            if path.startswith(idempotent_path):
                return True

        return False
