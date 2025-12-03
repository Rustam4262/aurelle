"""
Скрипт инициализации базы данных с тестовыми данными
Запуск: python init_db.py
"""
import sys
from datetime import datetime, timedelta, timezone
from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.master import Master
from app.models.service import Service, ServiceMaster
from app.models.booking import Booking, BookingStatus, PaymentStatus
from app.models.review import Review
from app.core.security import get_password_hash

def create_tables():
    """Создать все таблицы"""
    print("📋 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully\n")

def init_data():
    """Инициализация базы данных с тестовыми данными"""
    db = SessionLocal()

    try:
        print("="*70)
        print("  BEAUTY SALON MARKETPLACE - DATABASE INITIALIZATION")
        print("="*70)
        print()

        create_tables()

        # 1. Пользователи
        print("👥 Creating users...")

        admin = User(
            phone="+998901234567",
            email="admin@beautysalon.uz",
            name="Администратор Системы",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN
        )
        db.add(admin)

        owners = [
            User(phone="+998911234567", email="salon1@beautysalon.uz", name="Нигора Каримова",
                 hashed_password=get_password_hash("salon123"), role=UserRole.SALON_OWNER),
            User(phone="+998921234567", email="salon2@beautysalon.uz", name="Дилором Рахимова",
                 hashed_password=get_password_hash("salon123"), role=UserRole.SALON_OWNER),
            User(phone="+998931234567", email="salon3@beautysalon.uz", name="Гульнара Юсупова",
                 hashed_password=get_password_hash("salon123"), role=UserRole.SALON_OWNER),
        ]
        for owner in owners:
            db.add(owner)

        clients = [
            User(phone="+998951234567", email="client1@example.uz", name="Малика Ахмедова",
                 hashed_password=get_password_hash("client123"), role=UserRole.CLIENT),
            User(phone="+998952234567", email="client2@example.uz", name="Шахноза Усманова",
                 hashed_password=get_password_hash("client123"), role=UserRole.CLIENT),
            User(phone="+998953234567", email="client3@example.uz", name="Дилафруз Наимова",
                 hashed_password=get_password_hash("client123"), role=UserRole.CLIENT),
        ]
        for client in clients:
            db.add(client)

        db.commit()
        for owner in owners:
            db.refresh(owner)
        for client in clients:
            db.refresh(client)

        print(f"   ✓ Admin: 1")
        print(f"   ✓ Salon Owners: {len(owners)}")
        print(f"   ✓ Clients: {len(clients)}\n")

        # 2. Салоны
        print("🏢 Creating salons...")

        salons = [
            Salon(owner_id=owners[0].id, name="Гулбахор - Салон Красоты",
                  description="Премиальный салон красоты в центре Ташкента",
                  address="г. Ташкент, ул. Амира Темура 15", phone="+998712345678",
                  latitude=41.311151, longitude=69.279737, rating=4.8, reviews_count=142, is_verified=True),
            Salon(owner_id=owners[1].id, name="Шахзода - Beauty Studio",
                  description="Современная студия красоты с европейским уровнем сервиса",
                  address="г. Ташкент, ул. Мустакиллик 45", phone="+998712456789",
                  latitude=41.299496, longitude=69.240074, rating=4.9, reviews_count=89, is_verified=True),
            Salon(owner_id=owners[2].id, name="Жасмин - Салон",
                  description="Уютный салон с домашней атмосферой и лучшими мастерами",
                  address="г. Ташкент, ул. Бунёдкор 12", phone="+998712567890",
                  latitude=41.325817, longitude=69.228537, rating=4.6, reviews_count=67, is_verified=True),
        ]
        for salon in salons:
            db.add(salon)

        db.commit()
        for salon in salons:
            db.refresh(salon)

        print(f"   ✓ Salons created: {len(salons)}\n")

        # 3. Мастера
        print("💇 Creating masters...")

        masters = [
            Master(salon_id=salons[0].id, name="Нилуфар Абдуллаева", specialization="Стилист-парикмахер",
                   experience_years=8, rating=4.9),
            Master(salon_id=salons[0].id, name="Севара Хасанова", specialization="Мастер маникюра",
                   experience_years=5, rating=4.8),
            Master(salon_id=salons[1].id, name="Дилноза Турсунова", specialization="Топ-стилист",
                   experience_years=10, rating=5.0),
            Master(salon_id=salons[2].id, name="Лола Саидова", specialization="Универсальный мастер",
                   experience_years=4, rating=4.6),
        ]
        for master in masters:
            db.add(master)

        db.commit()
        for master in masters:
            db.refresh(master)

        print(f"   ✓ Masters created: {len(masters)}\n")

        # 4. Услуги
        print("✂️ Creating services...")

        services = [
            Service(salon_id=salons[0].id, title="Женская стрижка", description="Модельная стрижка от топ-стилиста",
                    price=150000, duration_minutes=60, category="Стрижки"),
            Service(salon_id=salons[0].id, title="Маникюр с покрытием", description="Аппаратный маникюр + гель-лак",
                    price=120000, duration_minutes=90, category="Маникюр"),
            Service(salon_id=salons[1].id, title="Свадебная прическа", description="Роскошная укладка для невесты",
                    price=500000, duration_minutes=150, category="Укладки"),
            Service(salon_id=salons[2].id, title="Мужская стрижка", description="Классическая мужская стрижка",
                    price=80000, duration_minutes=40, category="Стрижки"),
        ]
        for service in services:
            db.add(service)

        db.commit()
        for service in services:
            db.refresh(service)

        print(f"   ✓ Services created: {len(services)}\n")

        # 5. Связи услуги-мастера
        print("🔗 Linking services with masters...")

        links = [
            ServiceMaster(service_id=services[0].id, master_id=masters[0].id),
            ServiceMaster(service_id=services[1].id, master_id=masters[1].id),
            ServiceMaster(service_id=services[2].id, master_id=masters[2].id),
            ServiceMaster(service_id=services[3].id, master_id=masters[3].id),
        ]
        for link in links:
            db.add(link)

        db.commit()
        print(f"   ✓ Service-Master links: {len(links)}\n")

        # 6. Бронирования
        print("📅 Creating bookings...")

        now = datetime.now(timezone.utc)
        bookings = []

        # Прошлые завершенные
        for i in range(3):
            booking = Booking(
                client_id=clients[i].id,
                salon_id=salons[i].id,
                master_id=masters[i].id,
                service_id=services[i].id,
                start_at=now - timedelta(days=7+i, hours=10),
                end_at=now - timedelta(days=7+i, hours=11),
                status=BookingStatus.COMPLETED,
                payment_status=PaymentStatus.PAID,
                price=services[i].price
            )
            bookings.append(booking)
            db.add(booking)

        # Будущие подтвержденные
        for i in range(3):
            booking = Booking(
                client_id=clients[i].id,
                salon_id=salons[i].id,
                master_id=masters[i].id,
                service_id=services[i].id,
                start_at=now + timedelta(days=i+1, hours=14),
                end_at=now + timedelta(days=i+1, hours=15),
                status=BookingStatus.CONFIRMED,
                payment_status=PaymentStatus.PENDING,
                price=services[i].price
            )
            bookings.append(booking)
            db.add(booking)

        db.commit()
        for booking in bookings:
            db.refresh(booking)

        print(f"   ✓ Bookings created: {len(bookings)}\n")

        # 7. Отзывы
        print("⭐ Creating reviews...")

        reviews = [
            Review(client_id=clients[0].id, salon_id=salons[0].id, master_id=bookings[0].master_id, booking_id=bookings[0].id,
                   rating=5, comment="Zo'r salon! Natijadan juda mamnunman! Мастер очень профессиональная!"),
            Review(client_id=clients[1].id, salon_id=salons[1].id, master_id=bookings[1].master_id, booking_id=bookings[1].id,
                   rating=5, comment="Ajoyib xizmat! Барча нарса жуда яхши! Рекомендую всем!"),
        ]
        for review in reviews:
            db.add(review)

        db.commit()
        print(f"   ✓ Reviews created: {len(reviews)}\n")

        print("="*70)
        print("  ✅ DATABASE INITIALIZATION COMPLETED SUCCESSFULLY!")
        print("="*70)
        print()
        print("📝 LOGIN CREDENTIALS:")
        print("-"*70)
        print("\n🔑 ADMIN:")
        print("   Email: admin@beautysalon.uz | Phone: +998901234567 | Password: admin123")
        print("\n🏢 SALON OWNERS:")
        print("   salon1@beautysalon.uz | +998911234567 | salon123")
        print("   salon2@beautysalon.uz | +998921234567 | salon123")
        print("   salon3@beautysalon.uz | +998931234567 | salon123")
        print("\n👤 CLIENTS:")
        print("   client1@example.uz | +998951234567 | client123")
        print("   client2@example.uz | +998952234567 | client123")
        print("   client3@example.uz | +998953234567 | client123")
        print()
        print("="*70)
        print(f"📊 STATISTICS:")
        print(f"   Total Users: {1 + len(owners) + len(clients)}")
        print(f"   Salons: {len(salons)}")
        print(f"   Masters: {len(masters)}")
        print(f"   Services: {len(services)}")
        print(f"   Bookings: {len(bookings)}")
        print(f"   Reviews: {len(reviews)}")
        print("="*70)
        print()

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    init_data()
