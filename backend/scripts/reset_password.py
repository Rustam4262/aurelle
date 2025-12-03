"""
Скрипт для сброса пароля пользователя
"""
import sys
from pathlib import Path

# Добавляем путь к приложению
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def reset_password(phone: str, new_password: str = "password123"):
    """Сбрасывает пароль пользователя"""
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.phone == phone).first()

        if user:
            user.hashed_password = get_password_hash(new_password)
            db.commit()

            print("✅ ПАРОЛЬ УСПЕШНО СБРОШЕН!")
            print("\n" + "="*60)
            print(f"Телефон:     {user.phone}")
            print(f"Имя:         {user.name}")
            print(f"Роль:        {user.role.value}")
            print(f"Новый пароль: {new_password}")
            print("="*60)
            print("\nТеперь можете войти с новым паролем!")
            print(f"http://localhost:5173/login")
        else:
            print(f"❌ Пользователь с номером {phone} НЕ НАЙДЕН")
            print("\nСоздайте нового пользователя:")
            print("http://localhost:5173/register")

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        phone = sys.argv[1]
        new_password = sys.argv[2] if len(sys.argv) > 2 else "password123"
    else:
        phone = "+998932611804"
        new_password = "password123"

    print(f"\nСброс пароля для: {phone}\n")
    reset_password(phone, new_password)
