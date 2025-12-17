"""Celery periodic tasks для уведомлений и scheduled tasks"""
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.notification import Notification
from app.models.user import User
from datetime import datetime, timedelta, timezone
from app.tasks.email_tasks import send_booking_reminder_email
from app.tasks.sms_tasks import send_booking_reminder_sms
import logging

logger = logging.getLogger(__name__)


@celery_app.task
def send_booking_reminders():
    """
    Periodic task: Отправить напоминания о бронированиях

    Запускается каждые 10 минут
    Отправляет напоминания за 24 часа до визита
    """
    db = SessionLocal()
    try:
        # Найти брони на завтра
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        tomorrow_start = tomorrow.replace(hour=0, minute=0, second=0)
        tomorrow_end = tomorrow.replace(hour=23, minute=59, second=59)

        bookings = db.query(Booking).filter(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_at >= tomorrow_start,
            Booking.start_at <= tomorrow_end
        ).all()

        sent_count = 0

        for booking in bookings:
            # Проверить, не отправляли ли уже
            existing_reminder = db.query(Notification).filter(
                Notification.booking_id == booking.id,
                Notification.type == "reminder"
            ).first()

            if existing_reminder:
                continue  # Уже отправляли

            # Получить данные клиента
            client = db.query(User).get(booking.client_id)
            if not client:
                continue

            # Подготовить данные
            booking_data = {
                "id": booking.id,
                "date": booking.start_at.strftime("%d.%m.%Y"),
                "time": booking.start_at.strftime("%H:%M"),
                "salon_name": booking.salon.name if booking.salon else "Салон",
                "salon_address": booking.salon.address if booking.salon else "",
                "salon_phone": booking.salon.phone if booking.salon else "",
                "service_name": booking.service.name if booking.service else "Услуга",
                "master_name": booking.master.name if booking.master else "Мастер"
            }

            # Отправить email
            if client.email:
                send_booking_reminder_email.delay(client.email, booking_data)

            # Отправить SMS
            if client.phone:
                send_booking_reminder_sms.delay(client.phone, booking_data)

            # Создать запись о напоминании
            notification = Notification(
                user_id=client.id,
                booking_id=booking.id,
                type="reminder",
                title="Напоминание о визите",
                message=f"Завтра в {booking_data['time']} у вас запись в {booking_data['salon_name']}",
                scheduled_for=datetime.now(timezone.utc)
            )
            db.add(notification)
            sent_count += 1

        db.commit()
        logger.info(f"Sent {sent_count} booking reminders")
        return {"sent": sent_count}

    except Exception as e:
        logger.error(f"Error sending booking reminders: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task
def cleanup_old_notifications():
    """
    Periodic task: Удалить старые уведомления

    Запускается ежедневно в 3:00
    Удаляет прочитанные уведомления старше 30 дней
    """
    db = SessionLocal()
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)

        deleted_count = db.query(Notification).filter(
            Notification.is_read == True,
            Notification.created_at < cutoff_date
        ).delete()

        db.commit()
        logger.info(f"Deleted {deleted_count} old notifications")
        return {"deleted": deleted_count}

    except Exception as e:
        logger.error(f"Error cleaning up notifications: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task
def check_expired_bookings():
    """
    Periodic task: Проверить и обновить просроченные брони

    Запускается каждый час
    Отмечает брони как NO_SHOW если клиент не пришел
    """
    db = SessionLocal()
    try:
        # Найти брони, время которых прошло
        now = datetime.now(timezone.utc)
        grace_period = now - timedelta(hours=1)  # 1 час grace period

        expired_bookings = db.query(Booking).filter(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.end_at < grace_period
        ).all()

        updated_count = 0

        for booking in expired_bookings:
            booking.status = BookingStatus.NO_SHOW
            updated_count += 1

            # Уведомить салон
            if booking.salon and booking.salon.owner:
                notification = Notification(
                    user_id=booking.salon.owner.id,
                    booking_id=booking.id,
                    type="info",
                    title="Клиент не пришел",
                    message=f"Бронирование #{booking.id} отмечено как NO_SHOW"
                )
                db.add(notification)

        db.commit()
        logger.info(f"Marked {updated_count} bookings as NO_SHOW")
        return {"updated": updated_count}

    except Exception as e:
        logger.error(f"Error checking expired bookings: {e}")
        db.rollback()
        raise
    finally:
        db.close()
