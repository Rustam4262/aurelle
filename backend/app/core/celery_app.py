"""
Celery Application Configuration

Используется для асинхронных задач:
- Отправка email
- Отправка SMS
- Scheduled tasks (напоминания о бронировании)
- Batch processing
"""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# Создать Celery app
celery_app = Celery(
    "beauty_salon",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.sms_tasks",
        "app.tasks.notification_tasks"
    ]
)

# Конфигурация Celery
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task execution
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes

    # Retry settings
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Result backend settings
    result_expires=3600,  # 1 hour
    result_backend_transport_options={
        'master_name': 'mymaster'
    },

    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,

    #Beat schedule (для periodic tasks)
    beat_schedule={
        # Отправка напоминаний о бронированиях (каждые 10 минут)
        "send-booking-reminders": {
            "task": "app.tasks.notification_tasks.send_booking_reminders",
            "schedule": crontab(minute="*/10"),  # Every 10 minutes
        },

        # Очистка старых уведомлений (каждый день в 3:00)
        "cleanup-old-notifications": {
            "task": "app.tasks.notification_tasks.cleanup_old_notifications",
            "schedule": crontab(hour=3, minute=0),
        },

        # Проверка истекших броней (каждый час)
        "check-expired-bookings": {
            "task": "app.tasks.notification_tasks.check_expired_bookings",
            "schedule": crontab(minute=0),  # Every hour
        },
    }
)

# Auto-discover tasks
celery_app.autodiscover_tasks(['app.tasks'])

if __name__ == "__main__":
    celery_app.start()
