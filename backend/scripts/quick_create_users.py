#!/usr/bin/env python3
"""Быстрое создание пользователей"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def main():
    print("Создание пользователей...")
    db = SessionLocal()

    users = [
        {
            "phone": "+998932611804",
            "email": "admin@beauty-salon.uz",
            "name": "Администратор Платформы",
            "password": "Admin2024!",
            "role": UserRole.ADMIN
        },
        {
            "phone": "+998901234567",
            "email": "client@test.uz",
            "name": "Тестовый Клиент",
            "password": "Client123",
            "role": UserRole.CLIENT
        },
        {
            "phone": "+998909876543",
            "email": "owner@test.uz",
            "name": "Владелец Салона",
            "password": "Owner123",
            "role": UserRole.SALON_OWNER
        },
        {
            "phone": "+998907777777",
            "email": "client2@test.uz",
            "name": "Второй Клиент",
            "password": "Client123",
            "role": UserRole.CLIENT
        },
    ]

    try:
        for user_data in users:
            existing = db.query(User).filter(User.phone == user_data["phone"]).first()

            if existing:
                existing.email = user_data["email"]
                existing.name = user_data["name"]
                existing.hashed_password = get_password_hash(user_data["password"])
                existing.role = user_data["role"]
                existing.is_active = True
                print(f"✓ Обновлен: {user_data['phone']}")
            else:
                new_user = User(
                    phone=user_data["phone"],
                    email=user_data["email"],
                    name=user_data["name"],
                    hashed_password=get_password_hash(user_data["password"]),
                    role=user_data["role"],
                    is_active=True
                )
                db.add(new_user)
                print(f"✓ Создан: {user_data['phone']}")

        db.commit()
        print("\n✅ ГОТОВО! Все пользователи созданы.")
        print("\n📋 ЛОГИНЫ:")
        print("Администратор: +998932611804 / Admin2024!")
        print("Клиент 1: +998901234567 / Client123")
        print("Клиент 2: +998907777777 / Client123")
        print("Владелец салона: +998909876543 / Owner123")

    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        db.rollback()
        return 1
    finally:
        db.close()

    return 0

if __name__ == "__main__":
    sys.exit(main())
