"""Celery tasks для отправки SMS"""
from app.core.celery_app import celery_app
from app.services.sms_service import get_sms_service
import asyncio
import logging

logger = logging.getLogger(__name__)


def run_async(coro):
    """Helper для запуска async функций"""
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)


@celery_app.task(bind=True, max_retries=3)
def send_booking_confirmation_sms(self, phone: str, booking_data: dict):
    """Отправить SMS подтверждение бронирования"""
    try:
        sms_service = get_sms_service()
        result = run_async(
            sms_service.send_booking_confirmation_sms(phone, booking_data)
        )

        if not result:
            raise Exception("Failed to send SMS")

        logger.info(f"Booking confirmation SMS sent to {phone}")
        return {"status": "sent", "to": phone}

    except Exception as e:
        logger.error(f"Error sending booking confirmation SMS: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, max_retries=3)
def send_booking_reminder_sms(self, phone: str, booking_data: dict):
    """Отправить SMS напоминание"""
    try:
        sms_service = get_sms_service()
        result = run_async(
            sms_service.send_booking_reminder_sms(phone, booking_data)
        )

        if not result:
            raise Exception("Failed to send SMS")

        logger.info(f"Booking reminder SMS sent to {phone}")
        return {"status": "sent", "to": phone}

    except Exception as e:
        logger.error(f"Error sending booking reminder SMS: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, max_retries=3)
def send_verification_code_sms(self, phone: str, code: str):
    """Отправить код верификации"""
    try:
        sms_service = get_sms_service()
        result = run_async(
            sms_service.send_verification_code(phone, code)
        )

        if not result:
            raise Exception("Failed to send SMS")

        logger.info(f"Verification code SMS sent to {phone}")
        return {"status": "sent", "to": phone}

    except Exception as e:
        logger.error(f"Error sending verification code SMS: {e}")
        raise self.retry(exc=e, countdown=30 * (2 ** self.request.retries))
