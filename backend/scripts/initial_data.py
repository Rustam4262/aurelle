"""
Скрипт для инициализации базы данных тестовыми пользователями
Использовать после применения миграций: alembic upgrade head
"""
import sys
from pathlib import Path

# Добавляем backend в path для импортов
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash


def create_initial_users():
    """
    Создает тестовых пользователей для всех ролей
    """
    print("=" * 80)
    print("  ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ")
    print("=" * 80)
    print()

    db = SessionLocal()

    # Список тестовых пользователей
    test_users = [
        {
            "phone": "+998901111111",
            "email": "admin@beauty-salon.com",
            "name": "Администратор Системы",
            "password": "123456",
            "role": UserRole.ADMIN
        },
        {
            "phone": "+998932611804",
            "email": "client@beauty-salon.com",
            "name": "Тестовый Клиент",
            "password": "123456",
            "role": UserRole.CLIENT
        },
        {
            "phone": "+998909999999",
            "email": "owner@beauty-salon.com",
            "name": "Владелец Салона",
            "password": "123456",
            "role": UserRole.SALON_OWNER
        },
    ]

    try:
        created_count = 0
        updated_count = 0

        for user_data in test_users:
            # Проверяем существует ли пользователь
            existing_user = db.query(User).filter(User.phone == user_data["phone"]).first()

            if existing_user:
                # Обновляем существующего пользователя
                existing_user.email = user_data["email"]
                existing_user.name = user_data["name"]
                existing_user.hashed_password = get_password_hash(user_data["password"])
                existing_user.role = user_data["role"]
                existing_user.is_active = True
                updated_count += 1
                print(f"⚠ Обновлен: {user_data['name']} ({user_data['role'].value})")
            else:
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
                created_count += 1
                print(f"✓ Создан: {user_data['name']} ({user_data['role'].value})")

            print(f"  Телефон: {user_data['phone']}")
            print(f"  Email:   {user_data['email']}")
            print(f"  Пароль:  {user_data['password']}")
            print()

        db.commit()

        print("=" * 80)
        print(f"✓ ГОТОВО!")
        print(f"  Создано: {created_count}")
        print(f"  Обновлено: {updated_count}")
        print("=" * 80)
        print()
        print("🔐 ДАННЫЕ ДЛЯ ВХОДА:")
        print()
        print("👨‍💼 АДМИНИСТРАТОР:")
        print("   Телефон: +998901111111")
        print("   Пароль:  123456")
        print("   URL:     http://localhost:5173/login")
        print()
        print("🧑 КЛИЕНТ:")
        print("   Телефон: +998932611804")
        print("   Пароль:  123456")
        print("   URL:     http://localhost:5173/login")
        print()
        print("🏢 ВЛАДЕЛЕЦ САЛОНА:")
        print("   Телефон: +998909999999")
        print("   Пароль:  123456")
        print("   URL:     http://localhost:5173/login")
        print()
        print("=" * 80)
        print()
        print("📝 СЛЕДУЮЩИЕ ШАГИ:")
        print("   1. Запустите backend:  uvicorn app.main:app --reload")
        print("   2. Запустите frontend: npm run dev")
        print("   3. Откройте браузер:   http://localhost:5173")
        print("   4. Войдите используя данные выше")
        print()
        print("=" * 80)

    except Exception as e:
        print(f"\n✗ ОШИБКА: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

    return True


if __name__ == "__main__":
    success = create_initial_users()
    sys.exit(0 if success else 1)
