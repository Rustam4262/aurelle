"""
Скрипт для проверки пользователя по номеру телефона
"""
import sys
from pathlib import Path

# Добавляем путь к приложению
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User

def check_user(phone: str):
    """Проверяет пользователя по номеру телефона"""
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.phone == phone).first()

        if user:
            print("✅ ПОЛЬЗОВАТЕЛЬ НАЙДЕН!")
            print("\n" + "="*60)
            print(f"ID:       {user.id}")
            print(f"Телефон:  {user.phone}")
            print(f"Имя:      {user.name}")
            print(f"Email:    {user.email or 'Не указан'}")
            print(f"Роль:     {user.role.value}")
            print(f"Активен:  {'Да' if user.is_active else 'Нет'}")
            print(f"Создан:   {user.created_at}")
            print("="*60)
            print("\nДля входа используйте:")
            print(f"  Телефон: {user.phone}")
            print(f"  Пароль:  (ваш пароль при регистрации)")
            print("\nЕсли забыли пароль - используйте функцию восстановления")
        else:
            print(f"❌ Пользователь с номером {phone} НЕ НАЙДЕН")
            print("\nВарианты:")
            print("1. Зарегистрируйтесь: http://localhost:5173/register")
            print("2. Проверьте правильность номера телефона")

        # Показываем всех пользователей
        print("\n" + "="*60)
        print("ВСЕ ПОЛЬЗОВАТЕЛИ В БАЗЕ:")
        print("="*60)
        all_users = db.query(User).all()
        if all_users:
            for u in all_users:
                print(f"ID: {u.id:3} | Телефон: {u.phone:15} | Имя: {u.name:20} | Роль: {u.role.value}")
        else:
            print("База данных пуста - пользователи не созданы!")
        print("="*60)

    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        phone = sys.argv[1]
    else:
        phone = "+998932611804"  # Номер по умолчанию

    print(f"\nПроверка пользователя: {phone}\n")
    check_user(phone)
