"""
Создание демо-данных через API
Запуск: python create_demo_via_api.py
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"


def create_demo_data():
    print("Начинаем создание демо-данных через API...\n")

    # 1. Регистрация владельца салона
    print("1. Регистрация владельца салона...")
    owner_response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "phone": "+998901111111",
            "email": "salon@example.com",
            "name": "Beauty Studio Premium",
            "password": "123456",
            "role": "salon_owner"
        }
    )

    if owner_response.status_code != 200:
        print(f"   Ошибка: {owner_response.text}")
        return

    owner_data = owner_response.json()
    owner_token = owner_data["access_token"]
    print(f"   Владелец создан: salon@example.com / 123456")
    print(f"   Token: {owner_token[:50]}...\n")

    # 2. Создание салона
    print("2. Создание салона...")
    salon_response = requests.post(
        f"{BASE_URL}/salons",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "name": "Beauty Studio Premium",
            "description": "Лучший салон красоты в городе! Профессиональные мастера с опытом более 10 лет.",
            "address": "ул. Амира Темура, 15, Ташкент",
            "phone": "+998901111111",
            "latitude": 41.3123,
            "longitude": 69.2787
        }
    )

    if salon_response.status_code != 201:
        print(f"   Ошибка: {salon_response.text}")
        return

    salon_data = salon_response.json()
    salon_id = salon_data["id"]
    print(f"   Салон создан: {salon_data['name']} (ID: {salon_id})\n")

    # 3. Создание мастеров
    print("3. Создание мастеров...")
    masters = [
        {
            "salon_id": salon_id,
            "name": "Елена Смирнова",
            "description": "Парикмахер-стилист с опытом 12 лет",
            "specialization": "Стрижки, окрашивание, укладки",
            "experience_years": 12
        },
        {
            "salon_id": salon_id,
            "name": "Ольга Николаева",
            "description": "Nail-мастер высшей категории",
            "specialization": "Маникюр, педикюр, дизайн ногтей",
            "experience_years": 8
        },
        {
            "salon_id": salon_id,
            "name": "Виктория Козлова",
            "description": "Профессиональный визажист",
            "specialization": "Макияж, брови, ресницы",
            "experience_years": 6
        }
    ]

    master_ids = []
    for master_data in masters:
        master_response = requests.post(
            f"{BASE_URL}/masters",
            headers={"Authorization": f"Bearer {owner_token}"},
            json=master_data
        )

        if master_response.status_code == 201:
            master = master_response.json()
            master_ids.append(master["id"])
            print(f"   {master['name']} - {master['specialization']}")
        else:
            print(f"   Ошибка создания мастера: {master_response.text}")

    print()

    # 4. Создание услуг
    print("4. Создание услуг...")
    services = [
        {
            "salon_id": salon_id,
            "title": "Стрижка женская",
            "description": "Профессиональная стрижка от топ-мастера",
            "price": 150000,
            "duration_minutes": 60,
            "category": "haircut"
        },
        {
            "salon_id": salon_id,
            "title": "Окрашивание волос",
            "description": "Профессиональное окрашивание с использованием премиум красителей",
            "price": 350000,
            "duration_minutes": 120,
            "category": "coloring"
        },
        {
            "salon_id": salon_id,
            "title": "Укладка волос",
            "description": "Праздничная или повседневная укладка",
            "price": 100000,
            "duration_minutes": 45,
            "category": "styling"
        },
        {
            "salon_id": salon_id,
            "title": "Маникюр с покрытием",
            "description": "Маникюр с гель-лаком, любой дизайн",
            "price": 120000,
            "duration_minutes": 90,
            "category": "manicure"
        },
        {
            "salon_id": salon_id,
            "title": "Педикюр",
            "description": "Аппаратный педикюр с покрытием",
            "price": 150000,
            "duration_minutes": 90,
            "category": "pedicure"
        },
        {
            "salon_id": salon_id,
            "title": "Вечерний макияж",
            "description": "Профессиональный макияж для особых случаев",
            "price": 200000,
            "duration_minutes": 60,
            "category": "makeup"
        }
    ]

    for service_data in services:
        service_response = requests.post(
            f"{BASE_URL}/services",
            headers={"Authorization": f"Bearer {owner_token}"},
            json=service_data
        )

        if service_response.status_code == 201:
            service = service_response.json()
            print(f"   {service['title']} - {service['price']:,} сум ({service['duration_minutes']} мин)")
        else:
            print(f"   Ошибка создания услуги: {service_response.text}")

    print()

    # 5. Регистрация клиента
    print("5. Регистрация клиента...")
    client_response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "phone": "+998905555555",
            "email": "client@example.com",
            "name": "Анна Клиентова",
            "password": "123456",
            "role": "client"
        }
    )

    if client_response.status_code == 200:
        client_data = client_response.json()
        print(f"   Клиент создан: client@example.com / 123456\n")
    else:
        print(f"   Ошибка: {client_response.text}\n")

    # Итоги
    print("=" * 60)
    print("Демо-данные успешно созданы!\n")
    print("Что создано:")
    print(f"   - Владелец салона: salon@example.com / 123456")
    print(f"   - Салон: Beauty Studio Premium (ID: {salon_id})")
    print(f"   - Мастера: {len(master_ids)} человек")
    print(f"   - Услуги: {len(services)} шт")
    print(f"   - Клиент: client@example.com / 123456\n")
    print("Готово! Теперь:")
    print("   1. Открой http://localhost:5173")
    print("   2. Войди как клиент (client@example.com / 123456)")
    print("   3. Найди салон 'Beauty Studio Premium'")
    print("   4. Запишись на услугу!")
    print("\n   Или войди как владелец (salon@example.com / 123456)")
    print("   и управляй салоном через панель администратора!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        create_demo_data()
    except requests.exceptions.ConnectionError:
        print("\n❌ Ошибка подключения!")
        print("   Убедись, что backend запущен на http://localhost:8000")
        print("   Запусти: cd backend && ./venv/Scripts/uvicorn app.main:app --reload")
    except Exception as e:
        print(f"\n❌ Неожиданная ошибка: {e}")
