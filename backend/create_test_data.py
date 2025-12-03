"""
Скрипт для создания тестовых данных
"""
import sys
sys.path.insert(0, '/app')

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.master import Master
from app.models.service import Service
from app.models.master_schedule import MasterSchedule, DayOfWeek
from datetime import time

def create_test_data():
    db = SessionLocal()

    try:
        # Очистка существующих данных
        print("Очистка существующих данных...")
        db.query(MasterSchedule).delete()
        db.query(Service).delete()
        db.query(Master).delete()
        db.query(Salon).delete()
        db.query(User).delete()
        db.commit()

        # Создание пользователей
        print("\nСоздание пользователей...")

        # 1. Администратор платформы
        admin = User(
            phone="+998901234567",
            email="admin@beauty.uz",
            name="Администратор Платформы",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)

        # 2-3. Владельцы салонов
        owner1 = User(
            phone="+998901234568",
            email="salon1@beauty.uz",
            name="Гулнора Каримова",
            hashed_password=get_password_hash("owner123"),
            role=UserRole.SALON_OWNER,
            is_active=True
        )
        db.add(owner1)

        owner2 = User(
            phone="+998901234569",
            email="salon2@beauty.uz",
            name="Шахло Рахимова",
            hashed_password=get_password_hash("owner123"),
            role=UserRole.SALON_OWNER,
            is_active=True
        )
        db.add(owner2)

        # 4-6. Мастера
        master1_user = User(
            phone="+998901234570",
            email="master1@beauty.uz",
            name="Дилноза Ахмедова",
            hashed_password=get_password_hash("master123"),
            role=UserRole.MASTER,
            is_active=True
        )
        db.add(master1_user)

        master2_user = User(
            phone="+998901234571",
            email="master2@beauty.uz",
            name="Нигора Усманова",
            hashed_password=get_password_hash("master123"),
            role=UserRole.MASTER,
            is_active=True
        )
        db.add(master2_user)

        master3_user = User(
            phone="+998901234572",
            email="master3@beauty.uz",
            name="Малика Турсунова",
            hashed_password=get_password_hash("master123"),
            role=UserRole.MASTER,
            is_active=True
        )
        db.add(master3_user)

        # 7-8. Клиенты
        client1 = User(
            phone="+998901234573",
            email="client1@beauty.uz",
            name="Азиза Нуриева",
            hashed_password=get_password_hash("client123"),
            role=UserRole.CLIENT,
            is_active=True
        )
        db.add(client1)

        client2 = User(
            phone="+998901234574",
            email="client2@beauty.uz",
            name="Рустам Розиев",
            hashed_password=get_password_hash("client123"),
            role=UserRole.CLIENT,
            is_active=True
        )
        db.add(client2)

        db.commit()
        print("✓ Пользователи созданы")

        # Создание салонов
        print("\nСоздание салонов...")

        salon1 = Salon(
            name="Beauty Studio Elegance",
            description="Премиум салон красоты в центре Ташкента",
            address="Ташкент, ул. Мустакиллик, 1",
            latitude=41.311151,
            longitude=69.279737,
            phone="+998712345678",
            owner_id=owner1.id,
            rating=4.8,
            is_active=True
        )
        db.add(salon1)

        salon2 = Salon(
            name="Glamour Salon",
            description="Современный салон красоты с лучшими мастерами",
            address="Ташкент, Юнусабадский район, ул. Амира Темура, 15",
            latitude=41.338151,
            longitude=69.289737,
            phone="+998712345679",
            owner_id=owner2.id,
            rating=4.9,
            is_active=True
        )
        db.add(salon2)

        db.commit()
        print("✓ Салоны созданы")

        # Создание мастеров
        print("\nСоздание профилей мастеров...")

        master1 = Master(
            name="Дилноза Ахмедова",
            specialization="Парикмахер-стилист",
            experience_years=7,
            description="Специалист по сложным окрашиваниям и стрижкам",
            salon_id=salon1.id,
            user_id=master1_user.id,
            rating=4.9
        )
        db.add(master1)

        master2 = Master(
            name="Нигора Усманова",
            specialization="Мастер маникюра и педикюра",
            experience_years=5,
            description="Эксперт по дизайну ногтей и уходу",
            salon_id=salon1.id,
            user_id=master2_user.id,
            rating=4.8
        )
        db.add(master2)

        master3 = Master(
            name="Малика Турсунова",
            specialization="Косметолог-эстетист",
            experience_years=10,
            description="Специалист по уходу за кожей лица и омоложению",
            salon_id=salon2.id,
            user_id=master3_user.id,
            rating=5.0
        )
        db.add(master3)

        db.commit()
        print("✓ Мастера созданы")

        # Создание услуг
        print("\nСоздание услуг...")

        services_data = [
            # Салон 1 - Мастер 1 (Парикмахер)
            {"title": "Женская стрижка", "price": 80000, "duration_minutes": 60, "salon_id": salon1.id, "master_id": master1.id},
            {"title": "Мужская стрижка", "price": 50000, "duration_minutes": 45, "salon_id": salon1.id, "master_id": master1.id},
            {"title": "Окрашивание волос", "price": 250000, "duration_minutes": 180, "salon_id": salon1.id, "master_id": master1.id},
            {"title": "Укладка волос", "price": 60000, "duration_minutes": 45, "salon_id": salon1.id, "master_id": master1.id},

            # Салон 1 - Мастер 2 (Маникюр)
            {"title": "Классический маникюр", "price": 70000, "duration_minutes": 60, "salon_id": salon1.id, "master_id": master2.id},
            {"title": "Аппаратный маникюр", "price": 90000, "duration_minutes": 75, "salon_id": salon1.id, "master_id": master2.id},
            {"title": "Педикюр", "price": 80000, "duration_minutes": 90, "salon_id": salon1.id, "master_id": master2.id},
            {"title": "Наращивание ногтей", "price": 150000, "duration_minutes": 120, "salon_id": salon1.id, "master_id": master2.id},

            # Салон 2 - Мастер 3 (Косметолог)
            {"title": "Чистка лица", "price": 200000, "duration_minutes": 90, "salon_id": salon2.id, "master_id": master3.id},
            {"title": "Массаж лица", "price": 150000, "duration_minutes": 60, "salon_id": salon2.id, "master_id": master3.id},
            {"title": "Пилинг лица", "price": 180000, "duration_minutes": 75, "salon_id": salon2.id, "master_id": master3.id},
            {"title": "Мезотерапия", "price": 300000, "duration_minutes": 90, "salon_id": salon2.id, "master_id": master3.id},
        ]

        from app.models.service import ServiceMaster

        for service_data in services_data:
            master_id = service_data.pop('master_id')
            service = Service(**service_data, is_active=True)
            db.add(service)
            db.flush()  # Получаем ID услуги

            # Создаем связь между услугой и мастером
            service_master = ServiceMaster(service_id=service.id, master_id=master_id)
            db.add(service_master)

        db.commit()
        print("✓ Услуги созданы")

        # Создание расписания для мастеров
        print("\nСоздание расписания...")

        # Расписание для мастера 1 (Пн-Пт: 9:00-18:00, перерыв 13:00-14:00)
        for day in [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]:
            schedule = MasterSchedule(
                master_id=master1.id,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(18, 0),
                break_start=time(13, 0),
                break_end=time(14, 0),
                is_active=True
            )
            db.add(schedule)

        # Расписание для мастера 2 (Вт-Сб: 10:00-19:00, перерыв 14:00-15:00)
        for day in [DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY]:
            schedule = MasterSchedule(
                master_id=master2.id,
                day_of_week=day,
                start_time=time(10, 0),
                end_time=time(19, 0),
                break_start=time(14, 0),
                break_end=time(15, 0),
                is_active=True
            )
            db.add(schedule)

        # Расписание для мастера 3 (Пн-Сб: 9:00-20:00, перерыв 13:00-14:00)
        for day in [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY]:
            schedule = MasterSchedule(
                master_id=master3.id,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(20, 0),
                break_start=time(13, 0),
                break_end=time(14, 0),
                is_active=True
            )
            db.add(schedule)

        db.commit()
        print("✓ Расписание создано")

        print("\n" + "="*60)
        print("✅ ВСЕ ТЕСТОВЫЕ ДАННЫЕ УСПЕШНО СОЗДАНЫ!")
        print("="*60)

        # Вывод учетных данных
        print("\n" + "="*60)
        print("УЧЕТНЫЕ ДАННЫЕ ДЛЯ ВХОДА")
        print("="*60)

        print("\n1. 👨‍💼 АДМИНИСТРАТОР ПЛАТФОРМЫ")
        print("   Email: admin@beauty.uz")
        print("   Пароль: admin123")

        print("\n2. 🏢 ВЛАДЕЛЕЦ САЛОНА #1 (Beauty Studio Elegance)")
        print("   Email: salon1@beauty.uz")
        print("   Пароль: owner123")

        print("\n3. 🏢 ВЛАДЕЛЕЦ САЛОНА #2 (Glamour Salon)")
        print("   Email: salon2@beauty.uz")
        print("   Пароль: owner123")

        print("\n4. 💇‍♀️ МАСТЕР #1 (Парикмахер в Elegance)")
        print("   Email: master1@beauty.uz")
        print("   Пароль: master123")

        print("\n5. 💅 МАСТЕР #2 (Маникюр в Elegance)")
        print("   Email: master2@beauty.uz")
        print("   Пароль: master123")

        print("\n6. 🧖‍♀️ МАСТЕР #3 (Косметолог в Glamour)")
        print("   Email: master3@beauty.uz")
        print("   Пароль: master123")

        print("\n7. 👤 КЛИЕНТ #1")
        print("   Email: client1@beauty.uz")
        print("   Пароль: client123")

        print("\n8. 👤 КЛИЕНТ #2")
        print("   Email: client2@beauty.uz")
        print("   Пароль: client123")

        print("\n" + "="*60)
        print("📊 СТАТИСТИКА:")
        print("="*60)
        print(f"✓ Пользователей: {db.query(User).count()}")
        print(f"✓ Салонов: {db.query(Salon).count()}")
        print(f"✓ Мастеров: {db.query(Master).count()}")
        print(f"✓ Услуг: {db.query(Service).count()}")
        print(f"✓ Расписаний: {db.query(MasterSchedule).count()}")
        print("="*60)

    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()
