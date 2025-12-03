from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.booking import Booking
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = 50,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all notifications for current user"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == 0)

    notifications = query.order_by(Notification.sent_at.desc()).limit(limit).all()

    return notifications


@router.post("/{notification_id}/mark-read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        return {"message": "Notification not found"}

    notification.is_read = 1
    db.commit()

    return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == 0
    ).update({"is_read": 1})

    db.commit()

    return {"message": "All notifications marked as read"}


@router.get("/upcoming-reminders")
def get_upcoming_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get upcoming booking reminders"""
    # Get all confirmed bookings for the user
    upcoming_bookings = db.query(Booking).filter(
        Booking.client_id == current_user.id,
        Booking.status == "confirmed"
    ).all()

    reminders = []

    for booking in upcoming_bookings:
        # Calculate time until booking
        booking_datetime = booking.start_at.replace(tzinfo=None) if booking.start_at.tzinfo else booking.start_at

        time_diff = booking_datetime - datetime.now()

        # Send reminders at different intervals
        if time_diff.total_seconds() > 0:
            hours_until = time_diff.total_seconds() / 3600
            booking_time_str = booking.start_at.strftime("%H:%M")

            reminder_message = None

            if hours_until <= 1:
                reminder_message = f"Ваша запись через {int(hours_until * 60)} минут!"
            elif hours_until <= 24:
                reminder_message = f"Ваша запись сегодня в {booking_time_str}"
            elif hours_until <= 48:
                reminder_message = f"Ваша запись завтра в {booking_time_str}"

            if reminder_message:
                reminders.append({
                    "booking_id": booking.id,
                    "message": reminder_message,
                    "time_until": hours_until,
                })

    return {"reminders": reminders}
