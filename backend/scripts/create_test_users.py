"""
Скрипт для создания тестовых пользователей всех ролей
"""
import sys
from pathlib import Path

# Добавляем путь к приложению
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def create_test_users():
    """Создает тестовых пользователей для всех ролей"""

    # Создаем таблицы если их нет
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Проверяем существующих пользователей
        existing_phones = ['+998901111111', '+998902222222', '+998903333333']

        for phone in existing_phones:
            user = db.query(User).filter(User.phone == phone).first()
            if user:
                print(f"❌ Пользователь {phone} уже существует, пропускаем...")
                db.delete(user)
                db.commit()

        # Создаем клиента
        client = User(
            phone='+998901111111',
            name='Тестовый Клиент',
            hashed_password=get_password_hash('password123'),
            role=UserRole.CLIENT,
            is_active=True
        )
        db.add(client)

        # Создаем владельца салона
        salon_owner = User(
            phone='+998902222222',
            name='Владелец Салона',
            hashed_password=get_password_hash('password123'),
            role=UserRole.SALON_OWNER,
            is_active=True
        )
        db.add(salon_owner)

        # Создаем администратора
        admin = User(
            phone='+998903333333',
            name='Администратор',
            hashed_password=get_password_hash('password123'),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)

        db.commit()

        print("✅ Тестовые пользователи успешно созданы!")
        print("\n" + "="*60)
        print("ДАННЫЕ ДЛЯ ВХОДА:")
        print("="*60)
        print("\n🧑 КЛИЕНТ:")
        print(f"   Телефон: +998901111111")
        print(f"   Пароль:  password123")
        print(f"   Имя:     {client.name}")

        print("\n🏢 ВЛАДЕЛЕЦ САЛОНА:")
        print(f"   Телефон: +998902222222")
        print(f"   Пароль:  password123")
        print(f"   Имя:     {salon_owner.name}")

        print("\n👨‍💼 АДМИНИСТРАТОР:")
        print(f"   Телефон: +998903333333")
        print(f"   Пароль:  password123")
        print(f"   Имя:     {admin.name}")

        print("\n" + "="*60)
        print("Используйте эти данные для входа на http://localhost:5173")
        print("="*60 + "\n")

    except Exception as e:
        print(f"❌ Ошибка при создании пользователей: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()
