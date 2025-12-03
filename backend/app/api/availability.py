"""
API для проверки доступности временных слотов
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta, time
from app.core.database import get_db
from app.models.booking import Booking, BookingStatus
from pydantic import BaseModel

router = APIRouter()


class TimeSlot(BaseModel):
    """Временной слот"""
    time: str  # HH:MM формат
    available: bool
    booking_id: int | None = None


class AvailabilityResponse(BaseModel):
    """Ответ с доступными слотами"""
    date: str
    master_id: int
    service_duration: int
    slots: List[TimeSlot]


@router.get("/available-slots", response_model=AvailabilityResponse)
def get_available_slots(
    master_id: int = Query(..., description="ID мастера"),
    date: str = Query(..., description="Дата в формате YYYY-MM-DD"),
    service_duration: int = Query(..., description="Длительность услуги в минутах"),
    db: Session = Depends(get_db)
):
    """
    Получить доступные временные слоты для мастера на конкретную дату

    Использует расписание мастера из БД (MasterSchedule)
    Учитывает выходные дни (MasterDayOff)
    Шаг: 30 минут
    """
    from app.models.master import Master
    from app.models.master_schedule import MasterSchedule
    from app.models.master_day_off import MasterDayOff

    # Парсим дату
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("Invalid date format. Use YYYY-MM-DD")

    # Проверяем, существует ли мастер
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise ValueError("Master not found")

    # Проверяем, не выходной ли это день
    day_off = db.query(MasterDayOff).filter(
        MasterDayOff.master_id == master_id,
        MasterDayOff.date == target_date
    ).first()

    if day_off:
        # Выходной день - нет доступных слотов
        return AvailabilityResponse(
            date=date,
            master_id=master_id,
            service_duration=service_duration,
            slots=[]
        )

    # Получаем расписание мастера для этого дня недели
    from app.models.master_schedule import DayOfWeek

    day_of_week_int = target_date.weekday()  # 0 = Monday, 6 = Sunday
    day_of_week_enum = DayOfWeek(day_of_week_int)  # Convert to enum

    schedule = db.query(MasterSchedule).filter(
        MasterSchedule.master_id == master_id,
        MasterSchedule.day_of_week == day_of_week_enum,
        MasterSchedule.is_active == True
    ).first()

    if not schedule:
        # Нет расписания для этого дня - используем дефолтное 9:00-20:00
        work_start = time(9, 0)
        work_end = time(20, 0)
        break_start = None
        break_end = None
    else:
        work_start = schedule.start_time
        work_end = schedule.end_time
        break_start = schedule.break_start
        break_end = schedule.break_end

    # Генерируем все возможные слоты (каждые 30 минут)
    slots = []
    current_time = datetime.combine(target_date, work_start)
    end_time = datetime.combine(target_date, work_end)

    while current_time < end_time:
        slot_start = current_time
        slot_end = current_time + timedelta(minutes=service_duration)

        # Проверяем, не выходит ли слот за рабочее время
        if slot_end.time() > work_end:
            break

        # Проверяем, не попадает ли слот в перерыв
        in_break = False
        if break_start and break_end:
            if (slot_start.time() < break_end and slot_end.time() > break_start):
                in_break = True

        # Проверяем, нет ли конфликтующих бронирований
        conflicting_booking = db.query(Booking).filter(
            Booking.master_id == master_id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            Booking.start_at < slot_end,
            Booking.end_at > slot_start
        ).first()

        # Слот доступен, если нет конфликта и не в перерыве
        is_available = (conflicting_booking is None) and (not in_break)

        slots.append(TimeSlot(
            time=current_time.strftime("%H:%M"),
            available=is_available,
            booking_id=conflicting_booking.id if conflicting_booking else None
        ))

        # Следующий слот (каждые 30 минут)
        current_time += timedelta(minutes=30)

    return AvailabilityResponse(
        date=date,
        master_id=master_id,
        service_duration=service_duration,
        slots=slots
    )
