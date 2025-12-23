import sys
sys.path.insert(0, '/app')
from app.core.database import SessionLocal
from sqlalchemy import text

# Bcrypt hash for password "Admin2025"
password_hash = "$2b$12$TgcBaqtG2hQ5SQsb.o4vYeHRy3iVryYNa0K2SjrUONTIpnaJos5y."
phone = "+998932611804"

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
