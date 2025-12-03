"""
Простой скрипт для создания пользователей напрямую в БД
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def main():
    print("=" * 70)
    print("  СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ")
    print("=" * 70)
    print()

    db = SessionLocal()

    users_data = [
        {
            "phone": "+998901111111",
            "email": "client@test.com",
            "name": "Тестовый Клиент",
            "password": "password123",
            "role": UserRole.CLIENT
        },
        {
            "phone": "+998902222222",
            "email": "owner@test.com",
            "name": "Владелец Салона",
            "password": "password123",
            "role": UserRole.SALON_OWNER
        },
        {
            "phone": "+998903333333",
            "email": "admin@test.com",
            "name": "Администратор",
            "password": "password123",
            "role": UserRole.ADMIN
        }
    ]

    try:
        for data in users_data:
            # Проверяем существует ли
            existing = db.query(User).filter(User.phone == data["phone"]).first()

            if existing:
                print(f"⚠ Пользователь {data['phone']} уже существует")
                # Обновляем пароль на случай если забыли
                existing.hashed_password = get_password_hash(data["password"])
                db.commit()
                print(f"  → Пароль обновлен на: {data['password']}")
            else:
                # Создаем нового
                user = User(
                    phone=data["phone"],
                    email=data["email"],
                    name=data["name"],
                    hashed_password=get_password_hash(data["password"]),
                    role=data["role"],
                    is_active=True
                )
                db.add(user)
                db.commit()
                print(f"✓ Создан: {data['name']} ({data['role'].value})")

            print(f"  Телефон: {data['phone']}")
            print(f"  Пароль:  {data['password']}")
            print()

        print("=" * 70)
        print("✓ ВСЕ ГОТОВО!")
        print("=" * 70)
        print()
        print("🔐 ДАННЫЕ ДЛЯ ВХОДА:")
        print()
        print("🧑 КЛИЕНТ:")
        print("   Телефон: +998901111111")
        print("   Пароль:  password123")
        print("   URL: http://localhost:5173/login")
        print()
        print("🏢 ВЛАДЕЛЕЦ САЛОНА:")
        print("   Телефон: +998902222222")
        print("   Пароль:  password123")
        print("   URL: http://localhost:5173/login")
        print()
        print("👨‍💼 АДМИНИСТРАТОР:")
        print("   Телефон: +998903333333")
        print("   Пароль:  password123")
        print("   URL: http://localhost:5173/login")
        print()
        print("=" * 70)

    except Exception as e:
        print(f"✗ Ошибка: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
