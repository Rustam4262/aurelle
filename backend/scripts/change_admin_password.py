#!/usr/bin/env python3
"""
Безопасная смена пароля админа платформы
Использование:
  docker exec -it beauty_backend_prod python scripts/change_admin_password.py <new_password>

Пример:
  docker exec -it beauty_backend_prod python scripts/change_admin_password.py "MySecureP@ss2025"
"""
import sys
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User

def change_admin_password(new_password: str) -> None:
    """Меняет пароль админа платформы"""
    if len(new_password) < 8:
        print("❌ Ошибка: Пароль должен быть минимум 8 символов!")
        sys.exit(1)

    session = SessionLocal()
    try:
        # Найти админа
        admin = session.query(User).filter(
            User.email == "admin@aurelle.uz",
            User.role == "admin"
        ).first()

        if not admin:
            print("❌ Админ не найден в базе!")
            sys.exit(1)

        # Обновить пароль
        admin.hashed_password = get_password_hash(new_password)
        session.commit()

        print(f"✅ Пароль админа успешно изменен!")
        print(f"   Email: {admin.email}")
        print(f"   Новый пароль: {new_password}")
        print(f"\n⚠️  ВАЖНО: Сохраните пароль в безопасном месте!")

    except Exception as e:
        session.rollback()
        print(f"❌ Ошибка при смене пароля: {e}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Использование: python scripts/change_admin_password.py <новый_пароль>")
        print("Пример: python scripts/change_admin_password.py 'MySecureP@ss2025'")
        sys.exit(1)

    new_password = sys.argv[1]
    change_admin_password(new_password)
