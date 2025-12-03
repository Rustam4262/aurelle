#!/usr/bin/env python3
"""Исправление пользователей с простыми паролями"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def main():
    print("=" * 80)
    print("  СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ С ПРОСТЫМИ ПАРОЛЯМИ")
    print("=" * 80)
    print()

    db = SessionLocal()

    # ПРОСТЫЕ пароли для всех
    users = [
        {
            "phone": "+998932611804",
            "email": "admin@beauty.uz",
            "name": "Администратор",
            "password": "123456",
            "role": UserRole.ADMIN
        },
        {
            "phone": "+998901234567",
            "email": "client@test.uz",
            "name": "Клиент 1",
            "password": "123456",
            "role": UserRole.CLIENT
        },
        {
            "phone": "+998909876543",
            "email": "owner@test.uz",
            "name": "Владелец Салона",
            "password": "123456",
            "role": UserRole.SALON_OWNER
        },
        {
            "phone": "+998907777777",
            "email": "client2@test.uz",
            "name": "Клиент 2",
            "password": "123456",
            "role": UserRole.CLIENT
        },
    ]

    try:
        # Удаляем всех администраторов кроме нашего
        all_admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
        for admin in all_admins:
            if admin.phone != "+998932611804":
                db.delete(admin)
                print(f"✓ Удален старый администратор: {admin.phone}")

        db.commit()
        print()

        for user_data in users:
            existing = db.query(User).filter(User.phone == user_data["phone"]).first()

            if existing:
                # Обновляем
                existing.email = user_data["email"]
                existing.name = user_data["name"]
                existing.hashed_password = get_password_hash(user_data["password"])
                existing.role = user_data["role"]
                existing.is_active = True
                print(f"✓ Обновлен: {user_data['phone']} ({user_data['role'].value})")
            else:
                # Создаем
                new_user = User(
                    phone=user_data["phone"],
                    email=user_data["email"],
                    name=user_data["name"],
                    hashed_password=get_password_hash(user_data["password"]),
                    role=user_data["role"],
                    is_active=True
                )
                db.add(new_user)
                print(f"✓ Создан: {user_data['phone']} ({user_data['role'].value})")

        db.commit()

        print()
        print("=" * 80)
        print("  ✅ ГОТОВО! ВСЕ ПОЛЬЗОВАТЕЛИ СОЗДАНЫ!")
        print("=" * 80)
        print()
        print("🔐 ИСПОЛЬЗУЙТЕ ЭТИ ДАННЫЕ ДЛЯ ВХОДА:")
        print()
        print("=" * 80)
        print("  👨‍💼 АДМИНИСТРАТОР (ВАШ КАБИНЕТ)")
        print("=" * 80)
        print("  Телефон:  +998932611804")
        print("  Пароль:   123456")
        print("  Dashboard: http://localhost:5173/admin/dashboard")
        print()
        print("=" * 80)
        print("  🧑 КЛИЕНТ #1")
        print("=" * 80)
        print("  Телефон:  +998901234567")
        print("  Пароль:   123456")
        print("  Dashboard: http://localhost:5173/client/dashboard")
        print()
        print("=" * 80)
        print("  🧑 КЛИЕНТ #2")
        print("=" * 80)
        print("  Телефон:  +998907777777")
        print("  Пароль:   123456")
        print("  Dashboard: http://localhost:5173/client/dashboard")
        print()
        print("=" * 80)
        print("  🏢 ВЛАДЕЛЕЦ САЛОНА")
        print("=" * 80)
        print("  Телефон:  +998909876543")
        print("  Пароль:   123456")
        print("  Dashboard: http://localhost:5173/salon/dashboard")
        print()
        print("=" * 80)
        print()
        print("⚠️  ВАЖНО:")
        print("   - Пароль для ВСЕХ: 123456")
        print("   - Обязательно используйте + в начале номера")
        print("   - Только +998932611804 является администратором")
        print()
        print("=" * 80)
        print()
        print("📝 СЛЕДУЮЩИЕ ШАГИ:")
        print("   1. Откройте: http://localhost:5173/login")
        print("   2. Введите телефон: +998932611804")
        print("   3. Введите пароль: 123456")
        print("   4. Нажмите 'Войти'")
        print()
        print("=" * 80)

        return 0

    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        return 1
    finally:
        db.close()

if __name__ == "__main__":
    sys.exit(main())
