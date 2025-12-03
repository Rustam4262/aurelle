"""
Скрипт для настройки пользователей системы Beauty Salon
Создаёт единственного администратора и тестовых пользователей для всех ролей
"""
import sys
from pathlib import Path

# Добавляем backend в path для импортов
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash


def setup_all_users():
    """
    Создаёт/обновляет всех пользователей системы
    - Один администратор (владелец платформы)
    - Тестовые пользователи для других ролей
    """
    print("=" * 80)
    print("  НАСТРОЙКА ПОЛЬЗОВАТЕЛЕЙ BEAUTY SALON")
    print("=" * 80)
    print()

    db = SessionLocal()

    # Определяем всех пользователей системы
    users_config = [
        {
            "phone": "+998932611804",
            "email": "admin@beauty-salon.uz",
            "name": "Администратор Платформы",
            "password": "Admin2024!",
            "role": UserRole.ADMIN,
            "description": "👨‍💼 АДМИНИСТРАТОР ПЛАТФОРМЫ (ВАШ АККАУНТ)"
        },
        {
            "phone": "+998901234567",
            "email": "client@test.uz",
            "name": "Тестовый Клиент",
            "password": "Client123",
            "role": UserRole.CLIENT,
            "description": "🧑 ТЕСТОВЫЙ КЛИЕНТ"
        },
        {
            "phone": "+998909876543",
            "email": "owner@test.uz",
            "name": "Владелец Салона",
            "password": "Owner123",
            "role": UserRole.SALON_OWNER,
            "description": "🏢 ВЛАДЕЛЕЦ САЛОНА"
        },
        {
            "phone": "+998907777777",
            "email": "client2@test.uz",
            "name": "Второй Клиент",
            "password": "Client123",
            "role": UserRole.CLIENT,
            "description": "🧑 ВТОРОЙ ТЕСТОВЫЙ КЛИЕНТ"
        },
    ]

    try:
        # Сначала проверяем, нет ли других администраторов
        all_admins = db.query(User).filter(User.role == UserRole.ADMIN).all()

        if all_admins:
            print("⚠ ВНИМАНИЕ: Найдены существующие администраторы:")
            for admin in all_admins:
                print(f"   - {admin.phone} ({admin.name})")
            print()

            # Деактивируем всех администраторов кроме нашего
            for admin in all_admins:
                if admin.phone != "+998932611804":
                    admin.is_active = False
                    print(f"✓ Деактивирован старый администратор: {admin.phone}")
            print()

        created_count = 0
        updated_count = 0

        print("📋 ОБРАБОТКА ПОЛЬЗОВАТЕЛЕЙ:")
        print()

        for user_data in users_config:
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
                print(f"⚠ Обновлён: {user_data['name']}")
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
                print(f"✓ Создан: {user_data['name']}")

            print(f"   Роль:    {user_data['role'].value}")
            print(f"   Телефон: {user_data['phone']}")
            print(f"   Email:   {user_data['email']}")
            print()

        db.commit()

        # Выводим итоговую информацию
        print("=" * 80)
        print(f"✓ ГОТОВО!")
        print(f"  Создано новых:  {created_count}")
        print(f"  Обновлено:      {updated_count}")
        print("=" * 80)
        print()
        print("🔐 ДАННЫЕ ДЛЯ ВХОДА В СИСТЕМУ:")
        print()

        for user_data in users_config:
            print(user_data["description"])
            print(f"   Телефон: {user_data['phone']}")
            print(f"   Пароль:  {user_data['password']}")
            print(f"   Email:   {user_data['email']}")
            print()

        print("=" * 80)
        print()
        print("🌐 URL ДЛЯ ДОСТУПА:")
        print(f"   Frontend: http://localhost:5173")
        print(f"   Backend:  http://localhost:8000")
        print(f"   API Docs: http://localhost:8000/docs")
        print()
        print("=" * 80)
        print()
        print("📝 СЛЕДУЮЩИЕ ШАГИ:")
        print("   1. Убедитесь что Docker запущен:  docker-compose up")
        print("   2. Откройте браузер:              http://localhost:5173")
        print("   3. Войдите как администратор используя данные выше")
        print("   4. Проверьте функциональность всех ролей")
        print()
        print("=" * 80)
        print()
        print("⚠ ВАЖНО:")
        print("   - Только +998932611804 является администратором")
        print("   - Все другие старые администраторы деактивированы")
        print("   - Пароли сохраняются в зашифрованном виде (bcrypt)")
        print("   - JWT токены автоматически сохраняются в localStorage")
        print("   - После входа вам не нужно регистрироваться повторно")
        print()
        print("=" * 80)

        return True

    except Exception as e:
        print(f"\n✗ ОШИБКА: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = setup_all_users()
    sys.exit(0 if success else 1)
