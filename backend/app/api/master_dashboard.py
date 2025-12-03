"""
API endpoints для кабинета мастера
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, time, timedelta
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.master import Master
from app.models.booking import Booking, BookingStatus
from app.models.master_schedule import MasterSchedule, DayOfWeek
from app.models.master_day_off import MasterDayOff
from app.schemas.booking import BookingDetailedResponse
from app.schemas.master_schedule import (
    MasterScheduleCreate,
    MasterScheduleUpdate,
    MasterScheduleResponse,
    MasterDayOffCreate,
    MasterDayOffResponse
)
from app.api.deps import get_current_user

router = APIRouter()


def get_current_master(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Master:
    """Получить профиль мастера текущего пользователя"""
    if current_user.role != UserRole.MASTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only masters can access this endpoint."
        )

    master = db.query(Master).filter(Master.user_id == current_user.id).first()
    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master profile not found for this user"
        )

    return master


@router.get("/me", response_model=dict)
def get_master_info(
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db)
):
    """Получить информацию о текущем мастере"""
    from app.models.service import Service, ServiceMaster
    from app.models.salon import Salon

    salon = db.query(Salon).filter(Salon.id == master.salon_id).first()

    # Получить услуги мастера
    service_masters = db.query(ServiceMaster).filter(ServiceMaster.master_id == master.id).all()
    service_ids = [sm.service_id for sm in service_masters]
    services = db.query(Service).filter(Service.id.in_(service_ids)).all() if service_ids else []

    return {
        "id": master.id,
        "name": master.name,
        "phone": master.phone,
        "description": master.description,
        "specialization": master.specialization,
        "experience_years": master.experience_years,
        "rating": master.rating,
        "reviews_count": master.reviews_count,
        "avatar_url": master.avatar_url,
        "is_active": master.is_active,
        "salon": {
            "id": salon.id,
            "name": salon.name,
            "address": salon.address,
            "phone": salon.phone
        } if salon else None,
        "services": [
            {
                "id": s.id,
                "title": s.title,
                "price": s.price,
                "duration_minutes": s.duration_minutes,
                "category": s.category
            } for s in services
        ]
    }


# ==================== BOOKINGS ====================

@router.get("/bookings", response_model=List[BookingDetailedResponse])
def get_master_bookings(
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status_filter: Optional[BookingStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """Получить записи мастера"""
    from app.models.service import Service
    from app.models.salon import Salon

    query = db.query(Booking).filter(Booking.master_id == master.id)

    # Фильтры
    if date_from:
        query = query.filter(Booking.start_at >= datetime.combine(date_from, time.min))
    if date_to:
        query = query.filter(Booking.start_at <= datetime.combine(date_to, time.max))
    if status_filter:
        query = query.filter(Booking.status == status_filter)

    bookings = query.order_by(Booking.start_at.desc()).offset(skip).limit(limit).all()

    # Формируем детальные ответы
    detailed_bookings = []
    for booking in bookings:
        booking_dict = BookingDetailedResponse.model_validate(booking).model_dump()

        # Добавляем информацию об услуге
        service = db.query(Service).filter(Service.id == booking.service_id).first()
        if service:
            booking_dict['service'] = {
                'id': service.id,
                'title': service.title,
                'duration_minutes': service.duration_minutes,
                'category': service.category
            }

        # Добавляем информацию о мастере
        booking_dict['master'] = {
            'id': master.id,
            'name': master.name,
            'specialization': master.specialization,
            'avatar_url': master.avatar_url
        }

        # Добавляем информацию о салоне
        salon = db.query(Salon).filter(Salon.id == booking.salon_id).first()
        if salon:
            booking_dict['salon'] = {
                'id': salon.id,
                'name': salon.name,
                'address': salon.address,
                'phone': salon.phone
            }

        detailed_bookings.append(BookingDetailedResponse(**booking_dict))

    return detailed_bookings


@router.get("/calendar")
def get_master_calendar(
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db),
    date_from: date = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(..., description="End date (YYYY-MM-DD)")
):
    """
    Получить данные календаря мастера
    Возвращает занятые слоты и рабочее расписание
    """
    from app.models.service import Service

    # Получить все записи в диапазоне
    bookings = db.query(Booking).filter(
        Booking.master_id == master.id,
        Booking.start_at >= datetime.combine(date_from, time.min),
        Booking.start_at <= datetime.combine(date_to, time.max),
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
    ).all()

    # Получить расписание мастера
    schedules = db.query(MasterSchedule).filter(
        MasterSchedule.master_id == master.id,
        MasterSchedule.is_active == True
    ).all()

    # Получить выходные дни
    day_offs = db.query(MasterDayOff).filter(
        MasterDayOff.master_id == master.id,
        MasterDayOff.date >= date_from,
        MasterDayOff.date <= date_to
    ).all()

    # Формируем ответ
    bookings_data = []
    for booking in bookings:
        service = db.query(Service).filter(Service.id == booking.service_id).first()
        bookings_data.append({
            "id": booking.id,
            "start_at": booking.start_at.isoformat(),
            "end_at": booking.end_at.isoformat(),
            "status": booking.status.value,
            "service_title": service.title if service else "Unknown",
            "client_id": booking.client_id,
            "client_notes": booking.client_notes,
            "price": booking.price
        })

    schedules_data = [
        {
            "day_of_week": schedule.day_of_week.value,
            "start_time": schedule.start_time.isoformat(),
            "end_time": schedule.end_time.isoformat(),
            "break_start": schedule.break_start.isoformat() if schedule.break_start else None,
            "break_end": schedule.break_end.isoformat() if schedule.break_end else None
        }
        for schedule in schedules
    ]

    day_offs_data = [
        {
            "date": day_off.date.isoformat(),
            "reason": day_off.reason
        }
        for day_off in day_offs
    ]

    return {
        "bookings": bookings_data,
        "schedules": schedules_data,
        "day_offs": day_offs_data
    }


# ==================== SCHEDULE ====================

@router.get("/schedule", response_model=List[MasterScheduleResponse])
def get_master_schedule(
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db)
):
    """Получить расписание работы мастера"""
    schedules = db.query(MasterSchedule).filter(
        MasterSchedule.master_id == master.id
    ).all()
    return schedules


@router.post("/schedule", response_model=MasterScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_master_schedule(
    schedule_data: MasterScheduleCreate,
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db)
):
    """Создать расписание для определенного дня недели"""
    # Проверить, нет ли уже расписания для этого дня
    existing = db.query(MasterSchedule).filter(
        MasterSchedule.master_id == master.id,
        MasterSchedule.day_of_week == schedule_data.day_of_week
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Schedule for {schedule_data.day_of_week.name} already exists. Use PUT to update."
        )

    # Валидация времени
    if schedule_data.start_time >= schedule_data.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time"
        )

    if schedule_data.break_start and schedule_data.break_end:
        if schedule_data.break_start >= schedule_data.break_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Break start time must be before break end time"
            )

    new_schedule = MasterSchedule(
        master_id=master.id,
        **schedule_data.model_dump()
    )

    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)

    return new_schedule


@router.put("/schedule/{schedule_id}", response_model=MasterScheduleResponse)
def update_master_schedule(
    schedule_id: int,
    schedule_data: MasterScheduleUpdate,
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db)
):
    """Обновить расписание"""
    schedule = db.query(MasterSchedule).filter(
        MasterSchedule.id == schedule_id,
        MasterSchedule.master_id == master.id
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # Обновить поля
    update_data = schedule_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)

    return schedule


@router.delete("/schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_master_schedule(
    schedule_id: int,
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db)
):
    """Удалить расписание"""
    schedule = db.query(MasterSchedule).filter(
        MasterSchedule.id == schedule_id,
        MasterSchedule.master_id == master.id
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    db.delete(schedule)
    db.commit()

    return None


# ==================== DAY OFFS ====================

@router.get("/day-offs", response_model=List[MasterDayOffResponse])
def get_master_day_offs(
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None
):
    """Получить выходные дни мастера"""
    query = db.query(MasterDayOff).filter(MasterDayOff.master_id == master.id)

    if date_from:
        query = query.filter(MasterDayOff.date >= date_from)
    if date_to:
        query = query.filter(MasterDayOff.date <= date_to)

    day_offs = query.order_by(MasterDayOff.date).all()
    return day_offs


@router.post("/day-offs", response_model=MasterDayOffResponse, status_code=status.HTTP_201_CREATED)
def create_master_day_off(
    day_off_data: MasterDayOffCreate,
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db)
):
    """Добавить выходной день"""
    from datetime import date as date_type

    # Преобразовать строку в дату
    day_off_date = date_type.fromisoformat(day_off_data.date)

    # Проверить, нет ли уже выходного на эту дату
    existing = db.query(MasterDayOff).filter(
        MasterDayOff.master_id == master.id,
        MasterDayOff.date == day_off_date
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Day off for this date already exists"
        )

    new_day_off = MasterDayOff(
        master_id=master.id,
        date=day_off_date,
        reason=day_off_data.reason
    )

    db.add(new_day_off)
    db.commit()
    db.refresh(new_day_off)

    return new_day_off


@router.delete("/day-offs/{day_off_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_master_day_off(
    day_off_id: int,
    master: Master = Depends(get_current_master),
    db: Session = Depends(get_db)
):
    """Удалить выходной день"""
    day_off = db.query(MasterDayOff).filter(
        MasterDayOff.id == day_off_id,
        MasterDayOff.master_id == master.id
    ).first()

    if not day_off:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Day off not found"
        )

    db.delete(day_off)
    db.commit()

    return None
