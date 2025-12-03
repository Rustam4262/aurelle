"""Add test notifications to database"""
from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.models.notification import Notification
from app.models.user import User

db = SessionLocal()

try:
    # Find first client user
    client = db.query(User).filter(User.role == 'client').first()

    if not client:
        print("No client users found. Please create a client user first.")
        exit(1)

    print(f"Adding notifications for user: {client.name} (ID: {client.id})")

    # Check if notifications already exist
    existing = db.query(Notification).filter(Notification.user_id == client.id).count()
    if existing > 0:
        print(f"Found {existing} existing notifications. Skipping...")
        exit(0)

    # Create test notifications
    notifications = [
        Notification(
            user_id=client.id,
            type="reminder",
            title="Напоминание о записи",
            message="Ваша запись в салон 'Красота и Стиль' сегодня в 15:00. Не забудьте!",
            is_read=0,
            sent_at=datetime.utcnow() - timedelta(hours=1),
        ),
        Notification(
            user_id=client.id,
            type="confirmation",
            title="Запись подтверждена",
            message="Ваша запись на стрижку завтра в 10:00 успешно подтверждена.",
            is_read=0,
            sent_at=datetime.utcnow() - timedelta(hours=2),
        ),
        Notification(
            user_id=client.id,
            type="info",
            title="Новые услуги",
            message="В вашем любимом салоне появились новые услуги! Посмотрите.",
            is_read=1,
            sent_at=datetime.utcnow() - timedelta(days=1),
        ),
        Notification(
            user_id=client.id,
            type="reminder",
            title="Скоро запись",
            message="Через 24 часа у вас запись на маникюр в салоне 'Nails Studio'.",
            is_read=0,
            sent_at=datetime.utcnow() - timedelta(minutes=30),
        ),
        Notification(
            user_id=client.id,
            type="info",
            title="Акция!",
            message="Специальное предложение: скидка 20% на все услуги в эти выходные!",
            is_read=1,
            sent_at=datetime.utcnow() - timedelta(days=2),
        ),
    ]

    for notification in notifications:
        db.add(notification)

    db.commit()
    print(f"Successfully added {len(notifications)} test notifications!")

    # Show what was added
    print("\nAdded notifications:")
    for notif in notifications:
        status = "📧 Непрочитано" if notif.is_read == 0 else "✅ Прочитано"
        print(f"  - [{status}] {notif.title}")

except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
