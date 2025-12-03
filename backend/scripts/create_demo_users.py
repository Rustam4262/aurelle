"""
Скрипт для создания демо-пользователей всех ролей.
Запуск: python create_demo_users.py
"""
import sys
from pathlib import Path

# Добавляем путь к приложению
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash


def create_demo_users():
    """Создает демо-пользователей для всех ролей"""

    # Создаем таблицы если их нет
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    demo_users = [
        {
            "phone": "+998901111111",
            "email": "client@example.com",
            "name": "Тестовый Клиент",
            "password": "password123",
            "role": UserRole.CLIENT
        },
        {
            "phone": "+998902222222",
            "email": "owner@example.com",
            "name": "Владелец Салона",
            "password": "password123",
            "role": UserRole.SALON_OWNER
        },
        {
            "phone": "+998903333333",
            "email": "admin@example.com",
            "name": "Администратор",
            "password": "password123",
            "role": UserRole.ADMIN
        },
    ]

    try:
        created_count = 0
        skipped_count = 0

        for user_data in demo_users:
            # Проверяем существует ли пользователь
            existing_user = db.query(User).filter(User.phone == user_data["phone"]).first()

            if existing_user:
                print(f"⚠ Пользователь {user_data['phone']} уже существует, пропускаем...")
                skipped_count += 1
                continue

            # Создаем нового пользователя
            new_user = User(
                phone=user_data["phone"],
                email=user_data["email"],
                name=user_data["name"],
                hashed_password=get_password_hash(user_data["password"]),
                role=user_data["role"],
                is_active=True
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            print(f"✅ Создан пользователь: {new_user.name} ({new_user.role.value})")
            print(f"   Телефон: {new_user.phone}")
            print(f"   Email: {new_user.email}")
            print(f"   Пароль: {user_data['password']}")
            print()
            created_count += 1

        print("=" * 70)
        print(f"✅ Создано пользователей: {created_count}")
        print(f"⚠ Пропущено (уже существуют): {skipped_count}")
        print("=" * 70)
        print()
        print("📋 ДАННЫЕ ДЛЯ ВХОДА:")
        print("-" * 70)
        print()
        print("🧑 КЛИЕНТ:")
        print("   URL:      http://localhost:5173/login")
        print("   Телефон:  +998901111111")
        print("   Пароль:   password123")
        print()
        print("🏢 ВЛАДЕЛЕЦ САЛОНА:")
        print("   URL:      http://localhost:5173/login")
        print("   Телефон:  +998902222222")
        print("   Пароль:   password123")
        print()
        print("👨‍💼 АДМИНИСТРАТОР:")
        print("   URL:      http://localhost:5173/login")
        print("   Телефон:  +998903333333")
        print("   Пароль:   password123")
        print()
        print("=" * 70)

    except Exception as e:
        print(f"❌ Ошибка при создании пользователей: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_demo_users()
