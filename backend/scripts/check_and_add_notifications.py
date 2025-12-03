"""Check users and add test notifications"""
import sqlite3
from datetime import datetime, timedelta

# Connect to database
conn = sqlite3.connect('beauty_salon.db')
cursor = conn.cursor()

try:
    # Check all users
    cursor.execute("SELECT id, name, phone, role FROM users")
    users = cursor.fetchall()

    if not users:
        print("❌ No users found in database. Please register a user first via the web interface.")
        exit(1)

    print("Found users:")
    for user_id, name, phone, role in users:
        print(f"  - ID: {user_id}, Name: {name}, Phone: {phone}, Role: {role}")

    # Get any user (will work with any role for testing)
    user_id, user_name, user_phone, user_role = users[0]
    print(f"\nAdding notifications for user: {user_name} (Role: {user_role})")

    # Check existing notifications
    cursor.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ?", (user_id,))
    existing_count = cursor.fetchone()[0]

    if existing_count > 0:
        print(f"Found {existing_count} existing notifications. Clearing them first...")
        cursor.execute("DELETE FROM notifications WHERE user_id = ?", (user_id,))

    # Create test notifications
    now = datetime.utcnow()
    notifications = [
        (user_id, None, 'reminder', 'Напоминание о записи',
         'Ваша запись в салон "Красота и Стиль" сегодня в 15:00. Не забудьте!',
         0, (now - timedelta(hours=1)).isoformat(), None),

        (user_id, None, 'confirmation', 'Запись подтверждена',
         'Ваша запись на стрижку завтра в 10:00 успешно подтверждена.',
         0, (now - timedelta(hours=2)).isoformat(), None),

        (user_id, None, 'info', 'Новые услуги',
         'В вашем любимом салоне появились новые услуги! Посмотрите.',
         1, (now - timedelta(days=1)).isoformat(), None),

        (user_id, None, 'reminder', 'Скоро запись',
         'Через 24 часа у вас запись на маникюр в салоне "Nails Studio".',
         0, (now - timedelta(minutes=30)).isoformat(), None),

        (user_id, None, 'info', 'Акция!',
         'Специальное предложение: скидка 20% на все услуги в эти выходные!',
         1, (now - timedelta(days=2)).isoformat(), None),
    ]

    cursor.executemany(
        "INSERT INTO notifications (user_id, booking_id, type, title, message, is_read, sent_at, scheduled_for) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        notifications
    )

    conn.commit()
    print(f"\nSuccessfully added {len(notifications)} test notifications!")

    # Show what was added
    cursor.execute("SELECT id, type, title, is_read FROM notifications WHERE user_id = ? ORDER BY sent_at DESC", (user_id,))
    print("\nAdded notifications:")
    for row in cursor.fetchall():
        notif_id, notif_type, title, is_read = row
        status = "[UNREAD]" if is_read == 0 else "[READ]"
        print(f"  - {status} {title} ({notif_type})")

    print(f"\nNow log in as {user_name} (phone: {user_phone}) to see the notifications!")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    conn.rollback()
finally:
    conn.close()
