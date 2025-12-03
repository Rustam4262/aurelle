"""
Скрипт для обновления координат салонов
Добавляет координаты для существующих салонов в Москве
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import engine
from sqlalchemy import text

# Координаты для разных районов Москвы
salon_locations = [
    {"name": "Центр", "lat": 55.755826, "lng": 37.617300},
    {"name": "Арбат", "lat": 55.750446, "lng": 37.593434},
    {"name": "Тверская", "lat": 55.764738, "lng": 37.604867},
    {"name": "Таганка", "lat": 55.742146, "lng": 37.654118},
    {"name": "ВДНХ", "lat": 55.828903, "lng": 37.631214},
    {"name": "Сокольники", "lat": 55.791667, "lng": 37.671944},
    {"name": "Кузнецкий мост", "lat": 55.760833, "lng": 37.625000},
    {"name": "Площадь Революции", "lat": 55.756389, "lng": 37.622778},
]

with engine.connect() as conn:
    # Получаем все салоны
    result = conn.execute(text("SELECT id, name, address FROM salons"))
    salons = result.fetchall()

    print(f"Найдено салонов: {len(salons)}")

    # Обновляем координаты для каждого салона
    for i, salon in enumerate(salons):
        location = salon_locations[i % len(salon_locations)]

        # Небольшое смещение для разнообразия
        lat_offset = (i * 0.003) - 0.01
        lng_offset = (i * 0.003) - 0.01

        lat = location["lat"] + lat_offset
        lng = location["lng"] + lng_offset

        conn.execute(
            text("UPDATE salons SET latitude = :lat, longitude = :lng WHERE id = :id"),
            {"lat": lat, "lng": lng, "id": salon[0]}
        )

        print(f"✓ Обновлен салон '{salon[1]}' - координаты: {lat:.6f}, {lng:.6f}")

    conn.commit()
    print(f"\n✅ Успешно обновлено {len(salons)} салонов!")
