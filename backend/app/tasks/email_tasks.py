"""
Celery tasks для отправки email

Все email отправляются асинхронно через Celery
"""
from app.core.celery_app import celery_app
from app.services.email_service import get_email_service
import asyncio
import logging

logger = logging.getLogger(__name__)


def run_async(coro):
    """Helper для запуска async функций в Celery"""
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)


@celery_app.task(bind=True, max_retries=3)
def send_booking_confirmation_email(self, to_email: str, booking_data: dict):
    """
    Отправить подтверждение бронирования

    Args:
        to_email: Email клиента
        booking_data: Данные бронирования
    """
    try:
        email_service = get_email_service()
        result = run_async(
            email_service.send_booking_confirmation(to_email, booking_data)
        )

        if not result:
            raise Exception("Failed to send email")

        logger.info(f"Booking confirmation email sent to {to_email}")
        return {"status": "sent", "to": to_email}

    except Exception as e:
        logger.error(f"Error sending booking confirmation: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, max_retries=3)
def send_booking_reminder_email(self, to_email: str, booking_data: dict):
    """
    Отправить напоминание о бронировании

    Args:
        to_email: Email клиента
        booking_data: Данные бронирования
    """
    try:
        email_service = get_email_service()
        result = run_async(
            email_service.send_booking_reminder(to_email, booking_data)
        )

        if not result:
            raise Exception("Failed to send email")

        logger.info(f"Booking reminder email sent to {to_email}")
        return {"status": "sent", "to": to_email}

    except Exception as e:
        logger.error(f"Error sending booking reminder: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, max_retries=3)
def send_booking_cancellation_email(
    self,
    to_email: str,
    booking_data: dict,
    cancelled_by: str
):
    """
    Отправить уведомление об отмене

    Args:
        to_email: Email получателя
        booking_data: Данные бронирования
        cancelled_by: Кто отменил
    """
    try:
        email_service = get_email_service()
        result = run_async(
            email_service.send_booking_cancellation(
                to_email, booking_data, cancelled_by
            )
        )

        if not result:
            raise Exception("Failed to send email")

        logger.info(f"Cancellation email sent to {to_email}")
        return {"status": "sent", "to": to_email}

    except Exception as e:
        logger.error(f"Error sending cancellation email: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, max_retries=3)
def send_new_review_notification_email(self, to_email: str, review_data: dict):
    """
    Отправить уведомление о новом отзыве

    Args:
        to_email: Email владельца салона
        review_data: Данные отзыва
    """
    try:
        email_service = get_email_service()
        result = run_async(
            email_service.send_new_review_notification(to_email, review_data)
        )

        if not result:
            raise Exception("Failed to send email")

        logger.info(f"New review notification sent to {to_email}")
        return {"status": "sent", "to": to_email}

    except Exception as e:
        logger.error(f"Error sending review notification: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, max_retries=3)
def send_welcome_email(self, to_email: str, user_data: dict):
    """
    Отправить приветственное письмо

    Args:
        to_email: Email нового пользователя
        user_data: Данные пользователя
    """
    try:
        email_service = get_email_service()
        result = run_async(
            email_service.send_welcome_email(to_email, user_data)
        )

        if not result:
            raise Exception("Failed to send email")

        logger.info(f"Welcome email sent to {to_email}")
        return {"status": "sent", "to": to_email}

    except Exception as e:
        logger.error(f"Error sending welcome email: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, max_retries=3)
def send_password_reset_email(
    self,
    to_email: str,
    reset_link: str,
    user_name: str
):
    """
    Отправить ссылку для сброса пароля

    Args:
        to_email: Email пользователя
        reset_link: Ссылка для сброса
        user_name: Имя пользователя
    """
    try:
        email_service = get_email_service()
        result = run_async(
            email_service.send_password_reset(to_email, reset_link, user_name)
        )

        if not result:
            raise Exception("Failed to send email")

        logger.info(f"Password reset email sent to {to_email}")
        return {"status": "sent", "to": to_email}

    except Exception as e:
        logger.error(f"Error sending password reset email: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
