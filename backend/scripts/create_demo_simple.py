"""
Простое создание минимальных демо-данных
"""

import requests

BASE_URL = "http://localhost:8000/api"


# 1. Логин существующего владельца или создание нового
print("1. Попытка входа...")
login_response = requests.post(
    f"{BASE_URL}/auth/login",
    json={
        "phone": "+998901111111",
        "password": "123456"
    }
)

if login_response.status_code == 200:
    owner_token = login_response.json()["access_token"]
    print(f"   Вход успешен!")
else:
    print("   Пользователь не найден, создаём нового...")
    register_response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "phone": "+998909999999",
            "email": "newsalon@example.com",
            "name": "New Salon Owner",
            "password": "123456",
            "role": "salon_owner"
        }
    )
    if register_response.status_code == 200:
        owner_token = register_response.json()["access_token"]
        print("   Владелец создан: newsalon@example.com / 123456")
    else:
        print(f"   Ошибка: {register_response.text}")
        exit(1)

print()

# 2. Проверяем, есть ли уже салоны
print("2. Проверка существующих салонов...")
salons_response = requests.get(
    f"{BASE_URL}/salons",
    headers={"Authorization": f"Bearer {owner_token}"}
)

if salons_response.status_code == 200:
    salons = salons_response.json()
    print(f"   Найдено салонов: {len(salons)}")

    if len(salons) > 0:
        salon_id = salons[0]["id"]
        print(f"   Используем существующий салон: {salons[0]['name']} (ID: {salon_id})")
    else:
        print("   Создаём новый салон...")
        salon_response = requests.post(
            f"{BASE_URL}/salons",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "name": "Beauty Studio Premium",
                "description": "Лучший салон красоты в городе!",
                "address": "ул. Амира Темура, 15, Ташкент",
                "phone": "+998901111111",
                "latitude": 41.3123,
                "longitude": 69.2787
            }
        )

        if salon_response.status_code == 201:
            salon_id = salon_response.json()["id"]
            print(f"   Салон создан! ID: {salon_id}")
        else:
            print(f"   Ошибка: {salon_response.text}")
            exit(1)
else:
    print(f"   Ошибка при получении салонов: {salons_response.text}")
    exit(1)

print()

# 3. Создаём мастеров если их ещё нет
print("3. Создание мастеров...")
masters_response = requests.get(
    f"{BASE_URL}/masters",
    params={"salon_id": salon_id},
    headers={"Authorization": f"Bearer {owner_token}"}
)

if masters_response.status_code == 200:
    existing_masters = masters_response.json()
    print(f"   Существует мастеров: {len(existing_masters)}")

    if len(existing_masters) < 3:
        print("   Добавляем мастеров...")
        masters_to_create = [
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

        for master_data in masters_to_create:
            master_response = requests.post(
                f"{BASE_URL}/masters",
                headers={"Authorization": f"Bearer {owner_token}"},
                json=master_data
            )

            if master_response.status_code == 201:
                master = master_response.json()
                print(f"   + {master['name']}")

print()

# 4. Создаём услуги если их ещё нет
print("4. Создание услуг...")
services_response = requests.get(
    f"{BASE_URL}/services",
    params={"salon_id": salon_id},
    headers={"Authorization": f"Bearer {owner_token}"}
)

if services_response.status_code == 200:
    existing_services = services_response.json()
    print(f"   Существует услуг: {len(existing_services)}")

    if len(existing_services) < 6:
        print("   Добавляем услуги...")
        services_to_create = [
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

        for service_data in services_to_create:
            service_response = requests.post(
                f"{BASE_URL}/services",
                headers={"Authorization": f"Bearer {owner_token}"},
                json=service_data
            )

            if service_response.status_code == 201:
                service = service_response.json()
                print(f"   + {service['title']} - {service['price']:,} сум")

print()

# 5. Создаём клиента
print("5. Создание клиента...")
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
    print("   Клиент создан: client@example.com / 123456")
elif "already exists" in client_response.text:
    print("   Клиент уже существует: client@example.com / 123456")
else:
    print(f"   Ошибка: {client_response.text}")

print()
print("=" * 60)
print("Демо-данные готовы!")
print()
print("Теперь можно тестировать:")
print("  1. Открой http://localhost:5173")
print("  2. Войди как клиент: client@example.com / 123456")
print("  3. Найди салон 'Beauty Studio Premium'")
print("  4. Запишись на услугу!")
print()
print("Или войди как владелец: salon@example.com / 123456")
print("=" * 60)
