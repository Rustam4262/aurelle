"""
Middleware для автоматического аудита всех HTTP запросов
"""
import json
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
from app.core.database import SessionLocal
from app.models.audit_log import AuditLog


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware для логирования всех HTTP запросов в audit_logs таблицу

    Записывает:
    - Метод и путь запроса
    - IP адрес клиента
    - User Agent
    - Статус код ответа
    - ID пользователя (если авторизован)
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Получаем начальное время
        start_time = time.time()

        # Получаем данные запроса
        request_method = request.method
        request_path = str(request.url.path)
        request_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", None)

        # Получаем user_id из request.state (устанавливается в get_current_user)
        user_id = getattr(request.state, "user_id", None)

        # Выполняем запрос
        response = await call_next(request)

        # Получаем статус код
        status_code = response.status_code

        # Определяем действие и тип сущности из пути
        action = self._determine_action(request_method, request_path)
        entity_type = self._determine_entity_type(request_path)

        # Не логируем статические файлы и health check
        if not self._should_log(request_path):
            return response

        # Сохраняем в БД асинхронно (не блокируем ответ)
        try:
            db = SessionLocal()
            audit_log = AuditLog(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=None,  # TODO: извлекать из response body или path params
                request_method=request_method,
                request_path=request_path,
                request_ip=request_ip,
                user_agent=user_agent,
                status_code=status_code,
                details=None  # TODO: можно добавить request body
            )
            db.add(audit_log)
            db.commit()
        except Exception as e:
            # Не роняем запрос если аудит не удался
            print(f"Audit log error: {e}")
        finally:
            db.close()

        return response

    def _should_log(self, path: str) -> bool:
        """Определяет нужно ли логировать этот путь"""
        # Не логируем статические файлы
        if path.startswith("/uploads/"):
            return False
        if path.startswith("/static/"):
            return False
        # Не логируем health check
        if path == "/health":
            return False
        if path == "/":
            return False
        # Не логируем OpenAPI docs
        if path in ["/docs", "/redoc", "/openapi.json"]:
            return False
        return True

    def _determine_action(self, method: str, path: str) -> str:
        """Определяет действие из метода и пути"""
        # Специальные endpoint'ы
        if "/login" in path:
            return "auth.login"
        if "/register" in path:
            return "auth.register"
        if "/logout" in path:
            return "auth.logout"

        # Стандартные CRUD операции
        if method == "GET":
            if path.endswith("/me"):
                return f"{self._determine_entity_type(path)}.get_me"
            return f"{self._determine_entity_type(path)}.list"
        elif method == "POST":
            return f"{self._determine_entity_type(path)}.create"
        elif method == "PUT" or method == "PATCH":
            return f"{self._determine_entity_type(path)}.update"
        elif method == "DELETE":
            return f"{self._determine_entity_type(path)}.delete"

        return f"{method.lower()}.{path}"

    def _determine_entity_type(self, path: str) -> str:
        """Определяет тип сущности из пути"""
        if "/users" in path:
            return "user"
        if "/salons" in path:
            return "salon"
        if "/services" in path:
            return "service"
        if "/masters" in path:
            return "master"
        if "/bookings" in path:
            return "booking"
        if "/reviews" in path:
            return "review"
        if "/favorites" in path:
            return "favorite"
        if "/notifications" in path:
            return "notification"
        if "/statistics" in path:
            return "statistics"
        if "/auth" in path:
            return "auth"

        # Default
        return "unknown"
