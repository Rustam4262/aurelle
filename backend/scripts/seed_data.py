"""
Скрипт для создания демо-данных в БД
Запуск: python seed_data.py
"""

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.master import Master
from app.models.service import Service, ServiceMaster
from app.core.security import get_password_hash


def seed_database():
    db = SessionLocal()

    try:
        # Проверяем, есть ли уже данные
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"⚠️  В БД уже есть {existing_users} пользователей. Пропускаем seed.")
            return

        print("🌱 Начинаем заполнение БД демо-данными...")

        # 1. Создаём админа
        admin = User(
            phone="+998900000000",
            email="admin@beautysalon.uz",
            name="Администратор",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN
        )
        db.add(admin)
        print("✅ Создан админ: admin@beautysalon.uz / admin123")

        # 2. Создаём владельцев салонов
        owner1 = User(
            phone="+998901111111",
            email="studio1@example.com",
            name="Анна Иванова",
            hashed_password=get_password_hash("123456"),
            role=UserRole.SALON_OWNER
        )
        owner2 = User(
            phone="+998902222222",
            email="studio2@example.com",
            name="Мария Петрова",
            hashed_password=get_password_hash("123456"),
            role=UserRole.SALON_OWNER
        )
        db.add_all([owner1, owner2])
        db.flush()  # Получить ID

        print("✅ Создано 2 владельца салонов")

        # 3. Создаём клиентов
        clients = []
        for i in range(1, 6):
            client = User(
                phone=f"+99890333333{i}",
                email=f"client{i}@example.com",
                name=f"Клиент {i}",
                hashed_password=get_password_hash("123456"),
                role=UserRole.CLIENT
            )
            clients.append(client)
        db.add_all(clients)
        db.flush()

        print("✅ Создано 5 клиентов")

        # 4. Создаём салоны
        salon1 = Salon(
            owner_id=owner1.id,
            name="Beauty Studio Premium",
            description="Лучший салон красоты в городе! Профессиональные мастера с опытом более 10 лет.",
            address="ул. Амира Темура, 15, Ташкент",
            phone="+998901111111",
            latitude=41.3123,
            longitude=69.2787,
            rating=4.8,
            reviews_count=127,
            is_verified=True,
            is_active=True
        )

        salon2 = Salon(
            owner_id=owner2.id,
            name="Glamour Salon",
            description="Современный салон с индивидуальным подходом к каждому клиенту.",
            address="пр. Мустакиллик, 42, Ташкент",
            phone="+998902222222",
            latitude=41.3156,
            longitude=69.2645,
            rating=4.6,
            reviews_count=89,
            is_verified=True,
            is_active=True
        )

        salon3 = Salon(
            owner_id=owner1.id,
            name="Nail Art Studio",
            description="Специализируемся на маникюре и педикюре. Используем только премиум материалы.",
            address="ул. Бобура, 7, Ташкент",
            phone="+998901111112",
            latitude=41.3045,
            longitude=69.2812,
            rating=4.9,
            reviews_count=234,
            is_verified=True,
            is_active=True
        )

        db.add_all([salon1, salon2, salon3])
        db.flush()

        print("✅ Создано 3 салона")

        # 5. Создаём мастеров
        masters_data = [
            # Salon 1
            {"salon_id": salon1.id, "name": "Елена Смирнова", "specialization": "Парикмахер-стилист", "experience_years": 12, "rating": 4.9},
            {"salon_id": salon1.id, "name": "Ольга Николаева", "specialization": "Nail-мастер", "experience_years": 8, "rating": 4.8},
            {"salon_id": salon1.id, "name": "Виктория Козлова", "specialization": "Визажист", "experience_years": 6, "rating": 4.7},

            # Salon 2
            {"salon_id": salon2.id, "name": "Наталья Волкова", "specialization": "Парикмахер-колорист", "experience_years": 10, "rating": 4.8},
            {"salon_id": salon2.id, "name": "Юлия Морозова", "specialization": "Мастер по бровям", "experience_years": 5, "rating": 4.6},

            # Salon 3
            {"salon_id": salon3.id, "name": "Алиса Соколова", "specialization": "Топ nail-мастер", "experience_years": 15, "rating": 5.0},
            {"salon_id": salon3.id, "name": "Ксения Новикова", "specialization": "Nail-мастер", "experience_years": 7, "rating": 4.8},
        ]

        masters = []
        for m_data in masters_data:
            master = Master(**m_data, reviews_count=int(m_data["rating"] * 20))
            masters.append(master)

        db.add_all(masters)
        db.flush()

        print(f"✅ Создано {len(masters)} мастеров")

        # 6. Создаём услуги
        services_data = [
            # Salon 1
            {"salon_id": salon1.id, "title": "Стрижка женская", "price": 150000, "duration_minutes": 60, "category": "haircut"},
            {"salon_id": salon1.id, "title": "Окрашивание волос", "price": 350000, "duration_minutes": 120, "category": "coloring"},
            {"salon_id": salon1.id, "title": "Укладка волос", "price": 100000, "duration_minutes": 45, "category": "styling"},
            {"salon_id": salon1.id, "title": "Маникюр с покрытием", "price": 120000, "duration_minutes": 90, "category": "manicure"},
            {"salon_id": salon1.id, "title": "Педикюр", "price": 150000, "duration_minutes": 90, "category": "pedicure"},
            {"salon_id": salon1.id, "title": "Вечерний макияж", "price": 200000, "duration_minutes": 60, "category": "makeup"},

            # Salon 2
            {"salon_id": salon2.id, "title": "Стрижка + окрашивание", "price": 450000, "duration_minutes": 180, "category": "combo"},
            {"salon_id": salon2.id, "title": "Балаяж", "price": 500000, "duration_minutes": 180, "category": "coloring"},
            {"salon_id": salon2.id, "title": "Коррекция бровей", "price": 50000, "duration_minutes": 30, "category": "brows"},
            {"salon_id": salon2.id, "title": "Окрашивание бровей", "price": 30000, "duration_minutes": 20, "category": "brows"},

            # Salon 3
            {"salon_id": salon3.id, "title": "Маникюр классический", "price": 80000, "duration_minutes": 60, "category": "manicure"},
            {"salon_id": salon3.id, "title": "Маникюр с дизайном", "price": 150000, "duration_minutes": 120, "category": "manicure"},
            {"salon_id": salon3.id, "title": "Педикюр аппаратный", "price": 180000, "duration_minutes": 90, "category": "pedicure"},
            {"salon_id": salon3.id, "title": "Наращивание ногтей", "price": 200000, "duration_minutes": 150, "category": "nails"},
            {"salon_id": salon3.id, "title": "Укрепление ногтей", "price": 100000, "duration_minutes": 60, "category": "nails"},
        ]

        services = []
        for s_data in services_data:
            service = Service(**s_data)
            services.append(service)

        db.add_all(services)
        db.flush()

        print(f"✅ Создано {len(services)} услуг")

        # 7. Связываем услуги с мастерами
        service_master_links = []

        # Salon 1 - распределяем услуги по мастерам
        salon1_services = [s for s in services if s.salon_id == salon1.id]
        salon1_masters = [m for m in masters if m.salon_id == salon1.id]

        for i, service in enumerate(salon1_services):
            master_idx = i % len(salon1_masters)
            link = ServiceMaster(service_id=service.id, master_id=salon1_masters[master_idx].id)
            service_master_links.append(link)

        # Salon 2
        salon2_services = [s for s in services if s.salon_id == salon2.id]
        salon2_masters = [m for m in masters if m.salon_id == salon2.id]

        for i, service in enumerate(salon2_services):
            master_idx = i % len(salon2_masters)
            link = ServiceMaster(service_id=service.id, master_id=salon2_masters[master_idx].id)
            service_master_links.append(link)

        # Salon 3
        salon3_services = [s for s in services if s.salon_id == salon3.id]
        salon3_masters = [m for m in masters if m.salon_id == salon3.id]

        for i, service in enumerate(salon3_services):
            # Каждую услугу могут делать оба мастера
            for master in salon3_masters:
                link = ServiceMaster(service_id=service.id, master_id=master.id)
                service_master_links.append(link)

        db.add_all(service_master_links)

        print(f"✅ Создано {len(service_master_links)} связей услуга-мастер")

        # Сохраняем всё
        db.commit()

        print("\n🎉 Демо-данные успешно созданы!")
        print("\n📊 Статистика:")
        print(f"   • Пользователей: {db.query(User).count()}")
        print(f"   • Салонов: {db.query(Salon).count()}")
        print(f"   • Мастеров: {db.query(Master).count()}")
        print(f"   • Услуг: {db.query(Service).count()}")
        print("\n🔑 Тестовые аккаунты:")
        print("   Админ: admin@beautysalon.uz / admin123")
        print("   Салон 1: studio1@example.com / 123456")
        print("   Салон 2: studio2@example.com / 123456")
        print("   Клиент: client1@example.com / 123456")
        print("\n✨ Готово! Открывай http://localhost:5173 и регистрируйся!")

    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка при создании данных: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
