"""
API endpoints для управления расписанием мастеров
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime, time, timedelta, timezone
from app.core.database import get_db
from app.models.master import Master
from app.models.master_schedule import MasterSchedule, DayOfWeek
from app.models.master_day_off import MasterDayOff
from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from app.schemas.master_schedule import (
    MasterScheduleCreate,
    MasterScheduleUpdate,
    MasterScheduleResponse,
    MasterDayOffCreate,
    MasterDayOffResponse
)
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/masters/{master_id}/schedules", response_model=MasterScheduleResponse)
def create_master_schedule(
    master_id: int,
    schedule: MasterScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать расписание для мастера"""
    # Проверяем существование мастера
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    # Проверяем права доступа
    if current_user.role == UserRole.SALON_OWNER:
        # Владелец салона может управлять только мастерами своего салона
        if master.salon.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    # Проверяем, нет ли уже расписания на этот день
    existing = db.query(MasterSchedule).filter(
        MasterSchedule.master_id == master_id,
        MasterSchedule.day_of_week == schedule.day_of_week
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Расписание для {schedule.day_of_week.name} уже существует"
        )

    # Создаем расписание
    db_schedule = MasterSchedule(
        master_id=master_id,
        **schedule.model_dump()
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)

    return db_schedule


@router.get("/masters/{master_id}/schedules", response_model=List[MasterScheduleResponse])
def get_master_schedules(
    master_id: int,
    db: Session = Depends(get_db)
):
    """Получить расписание мастера на неделю"""
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    schedules = db.query(MasterSchedule).filter(
        MasterSchedule.master_id == master_id,
        MasterSchedule.is_active == True
    ).order_by(MasterSchedule.day_of_week).all()

    return schedules


@router.put("/schedules/{schedule_id}", response_model=MasterScheduleResponse)
def update_master_schedule(
    schedule_id: int,
    schedule_update: MasterScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить расписание мастера"""
    db_schedule = db.query(MasterSchedule).filter(MasterSchedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Расписание не найдено")

    master = db_schedule.master

    # Проверяем права доступа
    if current_user.role == UserRole.SALON_OWNER:
        if master.salon.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    # Обновляем поля
    for field, value in schedule_update.model_dump(exclude_unset=True).items():
        setattr(db_schedule, field, value)

    db.commit()
    db.refresh(db_schedule)

    return db_schedule


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_master_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить расписание мастера"""
    db_schedule = db.query(MasterSchedule).filter(MasterSchedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Расписание не найдено")

    master = db_schedule.master

    # Проверяем права доступа
    if current_user.role == UserRole.SALON_OWNER:
        if master.salon.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    db.delete(db_schedule)
    db.commit()


# Day Off Management

@router.post("/masters/{master_id}/day-offs", response_model=MasterDayOffResponse)
def create_day_off(
    master_id: int,
    day_off: MasterDayOffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать выходной день для мастера"""
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    # Проверяем права доступа
    if current_user.role == UserRole.SALON_OWNER:
        if master.salon.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    # Проверяем, нет ли уже выходного на эту дату
    day_off_date = datetime.strptime(day_off.date, "%Y-%m-%d").date()
    existing = db.query(MasterDayOff).filter(
        MasterDayOff.master_id == master_id,
        MasterDayOff.date == day_off_date
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Выходной на эту дату уже существует")

    db_day_off = MasterDayOff(
        master_id=master_id,
        date=day_off_date,
        reason=day_off.reason
    )
    db.add(db_day_off)
    db.commit()
    db.refresh(db_day_off)

    return db_day_off


@router.get("/masters/{master_id}/day-offs", response_model=List[MasterDayOffResponse])
def get_master_day_offs(
    master_id: int,
    from_date: str = None,
    to_date: str = None,
    db: Session = Depends(get_db)
):
    """Получить выходные дни мастера"""
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    query = db.query(MasterDayOff).filter(MasterDayOff.master_id == master_id)

    if from_date:
        query = query.filter(MasterDayOff.date >= datetime.strptime(from_date, "%Y-%m-%d").date())
    if to_date:
        query = query.filter(MasterDayOff.date <= datetime.strptime(to_date, "%Y-%m-%d").date())

    day_offs = query.order_by(MasterDayOff.date).all()
    return day_offs


@router.delete("/day-offs/{day_off_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_day_off(
    day_off_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить выходной день"""
    db_day_off = db.query(MasterDayOff).filter(MasterDayOff.id == day_off_id).first()
    if not db_day_off:
        raise HTTPException(status_code=404, detail="Выходной день не найден")

    master = db_day_off.master

    # Проверяем права доступа
    if current_user.role == UserRole.SALON_OWNER:
        if master.salon.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    db.delete(db_day_off)
    db.commit()


# Available Slots

@router.get("/masters/{master_id}/available-slots")
def get_available_slots(
    master_id: int,
    date_str: str,  # YYYY-MM-DD
    service_id: int,
    db: Session = Depends(get_db)
):
    """
    Получить доступные временные слоты для мастера на определенную дату
    """
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    # Парсим дату
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты. Используйте YYYY-MM-DD")

    # Проверяем, не выходной ли это день
    day_off = db.query(MasterDayOff).filter(
        MasterDayOff.master_id == master_id,
        MasterDayOff.date == target_date
    ).first()

    if day_off:
        return {
            "date": date_str,
            "master_id": master_id,
            "available_slots": [],
            "reason": f"Выходной день: {day_off.reason or 'Не указано'}"
        }

    # Получаем расписание на этот день недели
    day_of_week = DayOfWeek(target_date.weekday())
    schedule = db.query(MasterSchedule).filter(
        MasterSchedule.master_id == master_id,
        MasterSchedule.day_of_week == day_of_week,
        MasterSchedule.is_active == True
    ).first()

    if not schedule:
        return {
            "date": date_str,
            "master_id": master_id,
            "available_slots": [],
            "reason": "Мастер не работает в этот день недели"
        }

    # Получаем все бронирования на эту дату
    bookings = db.query(Booking).filter(
        Booking.master_id == master_id,
        Booking.start_at >= datetime.combine(target_date, time.min, tzinfo=timezone.utc),
        Booking.start_at < datetime.combine(target_date + timedelta(days=1), time.min, tzinfo=timezone.utc),
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
    ).all()

    # Генерируем временные слоты (каждые 30 минут)
    slot_duration = timedelta(minutes=30)
    slots = []

    current_time = datetime.combine(target_date, schedule.start_time, tzinfo=timezone.utc)
    end_time = datetime.combine(target_date, schedule.end_time, tzinfo=timezone.utc)

    while current_time < end_time:
        slot_end = current_time + slot_duration

        # Проверяем, не попадает ли слот в перерыв
        if schedule.break_start and schedule.break_end:
            break_start = datetime.combine(target_date, schedule.break_start, tzinfo=timezone.utc)
            break_end = datetime.combine(target_date, schedule.break_end, tzinfo=timezone.utc)

            if current_time >= break_start and current_time < break_end:
                current_time = slot_end
                continue

        # Проверяем, не занят ли этот слот бронированием
        is_occupied = False
        for booking in bookings:
            # Используем end_at из модели Booking (уже содержит время окончания)
            booking_end = booking.end_at
            # Слот занят, если он пересекается с бронированием
            if (current_time < booking_end and slot_end > booking.start_at):
                is_occupied = True
                break

        slots.append({
            "start_time": current_time.strftime("%H:%M"),
            "end_time": slot_end.strftime("%H:%M"),
            "available": not is_occupied
        })

        current_time = slot_end

    return {
        "date": date_str,
        "master_id": master_id,
        "master_name": master.name,
        "available_slots": slots
    }


@router.get("/masters/{master_id}/bookings")
def get_master_bookings(
    master_id: int,
    from_date: str = None,
    to_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить бронирования мастера за период (для календаря мастера)
    """
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    # Проверяем права доступа
    if current_user.role == UserRole.SALON_OWNER:
        if master.salon.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    elif current_user.role == UserRole.MASTER:
        if master.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    query = db.query(Booking).filter(Booking.master_id == master_id)

    if from_date:
        query = query.filter(Booking.start_at >= datetime.strptime(from_date, "%Y-%m-%d"))
    if to_date:
        query = query.filter(Booking.start_at < datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1))

    bookings = query.order_by(Booking.start_at).all()

    result = []
    for booking in bookings:
        # Вычисляем длительность из start_at и end_at
        duration_minutes = int((booking.end_at - booking.start_at).total_seconds() / 60)

        result.append({
            "id": booking.id,
            "start_at": booking.start_at.isoformat(),
            "duration_minutes": duration_minutes,
            "status": booking.status.value,
            "client_name": booking.client.full_name if booking.client else "Неизвестно",
            "client_phone": booking.client.phone if booking.client else None,
            "service_title": booking.service.title if booking.service else "Не указано",
            "total_price": booking.price
        })

    return result
