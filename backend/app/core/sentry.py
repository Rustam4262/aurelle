"""
Sentry Error Monitoring Setup

Конфигурация Sentry для отслеживания ошибок в production.

Features:
- Автоматический захват исключений
- Отслеживание производительности (traces)
- Профилирование (profiles)
- Breadcrumbs для контекста ошибок
- Фильтрация чувствительных данных
"""
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging

# Опциональный импорт Celery - только если установлен
try:
    from sentry_sdk.integrations.celery import CeleryIntegration
    CELERY_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    CELERY_AVAILABLE = False
    CeleryIntegration = None

from app.core.config import settings


def before_send(event, hint):
    """
    Фильтрация чувствительных данных перед отправкой в Sentry

    Удаляет из ошибок:
    - Пароли
    - API ключи
    - Секретные ключи
    - Токены доступа
    - Персональные данные
    """

    # Список полей для фильтрации
    sensitive_fields = [
        'password', 'secret', 'token', 'api_key',
        'authorization', 'cookie', 'session',
        'card_number', 'cvv', 'pin'
    ]

    # Фильтрация request data
    if 'request' in event and 'data' in event['request']:
        data = event['request']['data']
        if isinstance(data, dict):
            for field in sensitive_fields:
                if field in data:
                    data[field] = '[FILTERED]'

    # Фильтрация extra context
    if 'extra' in event:
        for field in sensitive_fields:
            if field in event['extra']:
                event['extra'][field] = '[FILTERED]'

    # Фильтрация breadcrumbs
    if 'breadcrumbs' in event:
        for breadcrumb in event['breadcrumbs']:
            if 'data' in breadcrumb and isinstance(breadcrumb['data'], dict):
                for field in sensitive_fields:
                    if field in breadcrumb['data']:
                        breadcrumb['data'][field] = '[FILTERED]'

    return event


def init_sentry():
    """
    Инициализация Sentry

    Вызывается при старте приложения.
    Если SENTRY_DSN не установлен, Sentry не инициализируется.
    """

    if not settings.SENTRY_DSN:
        logging.info("Sentry DSN not configured, skipping Sentry initialization")
        return

    # Настройка логирования для Sentry
    sentry_logging = LoggingIntegration(
        level=logging.INFO,        # Захватывать INFO и выше
        event_level=logging.ERROR  # Отправлять как events только ERROR и выше
    )

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,

        # Интеграции для автоматического захвата ошибок
        integrations=[
            FastApiIntegration(transaction_style="url"),
            SqlalchemyIntegration(),
            RedisIntegration(),
            *([CeleryIntegration()] if CELERY_AVAILABLE else []),  # Добавляем только если Celery установлен
            sentry_logging,
        ],

        # Performance Monitoring
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,

        # Profiling
        profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,

        # Фильтрация чувствительных данных
        before_send=before_send,

        # Дополнительные настройки
        send_default_pii=False,  # Не отправлять персональные данные
        attach_stacktrace=True,  # Прикреплять stack trace

        # Release tracking (опционально)
        # release="beauty-salon@1.0.0",
    )

    logging.info(f"Sentry initialized for environment: {settings.SENTRY_ENVIRONMENT}")


def capture_exception(error: Exception, context: dict = None):
    """
    Вручную отправить исключение в Sentry с дополнительным контекстом

    Args:
        error: Исключение для отправки
        context: Дополнительный контекст для отладки

    Example:
        try:
            risky_operation()
        except Exception as e:
            capture_exception(e, {
                "user_id": user.id,
                "operation": "payment_processing",
                "amount": payment.amount
            })
    """
    if context:
        sentry_sdk.set_context("additional_context", context)

    sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", context: dict = None):
    """
    Отправить сообщение в Sentry

    Args:
        message: Сообщение для отправки
        level: Уровень важности (debug, info, warning, error, fatal)
        context: Дополнительный контекст

    Example:
        capture_message(
            "Suspicious payment activity detected",
            level="warning",
            context={"user_id": user.id, "amount": 1000000}
        )
    """
    if context:
        sentry_sdk.set_context("additional_context", context)

    sentry_sdk.capture_message(message, level)


def set_user_context(user_id: int, email: str = None, username: str = None):
    """
    Установить контекст пользователя для текущего scope

    Args:
        user_id: ID пользователя
        email: Email (опционально)
        username: Имя пользователя (опционально)

    Example:
        @router.get("/profile")
        def get_profile(current_user: User = Depends(get_current_user)):
            set_user_context(
                user_id=current_user.id,
                email=current_user.email,
                username=current_user.name
            )
            # ... rest of the endpoint
    """
    sentry_sdk.set_user({
        "id": user_id,
        "email": email,
        "username": username
    })


def add_breadcrumb(message: str, category: str = "default", level: str = "info", data: dict = None):
    """
    Добавить breadcrumb для отслеживания последовательности действий

    Args:
        message: Описание действия
        category: Категория (auth, payment, booking, etc.)
        level: Уровень важности
        data: Дополнительные данные

    Example:
        add_breadcrumb(
            message="User initiated payment",
            category="payment",
            level="info",
            data={"amount": 50000, "method": "payme"}
        )
    """
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {}
    )


# Middleware для автоматического добавления breadcrumbs
class SentryBreadcrumbMiddleware:
    """
    Middleware для автоматического добавления breadcrumbs к каждому запросу

    Добавляется в main.py:
        app.add_middleware(SentryBreadcrumbMiddleware)
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            add_breadcrumb(
                message=f"{scope['method']} {scope['path']}",
                category="request",
                level="info",
                data={
                    "method": scope['method'],
                    "path": scope['path'],
                    "query_string": scope.get('query_string', b'').decode()
                }
            )

        await self.app(scope, receive, send)
