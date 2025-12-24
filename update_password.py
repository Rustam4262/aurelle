import sys
import os
sys.path.insert(0, '/app')
from app.core.database import SessionLocal
from sqlalchemy import text

# ⚠️ ВАЖНО: НЕ храните реальные пароли или их хэши в git!
# Этот файл - только пример. Используйте переменные окружения.
# Bcrypt hash - должен быть сгенерирован во время выполнения
password_hash = os.getenv("ADMIN_PASSWORD_HASH", "CHANGE_THIS")
phone = os.getenv("ADMIN_PHONE", "CHANGE_THIS")

session = SessionLocal()
try:
    result = session.execute(
        text("UPDATE users SET hashed_password = :hash WHERE phone = :phone RETURNING id, phone, role"),
        {"hash": password_hash, "phone": phone}
    )
    row = result.fetchone()
    session.commit()
    print(f"✅ Updated user ID {row[0]}, phone {row[1]}, role {row[2]}")
    print(f"   Password: Admin2025")
except Exception as e:
    session.rollback()
    print(f"❌ Error: {e}")
finally:
    session.close()
