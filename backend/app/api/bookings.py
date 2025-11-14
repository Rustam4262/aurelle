from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.service import Service
from app.models.master import Master
from app.models.salon import Salon
from app.models.user import User, UserRole
from app.schemas.booking import BookingCreate, BookingResponse, BookingUpdate
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новую бронь"""

    # Проверка существования услуги
    service = db.query(Service).filter(Service.id == booking_data.service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )

    # Проверка существования мастера
    master = db.query(Master).filter(Master.id == booking_data.master_id).first()
    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master not found"
        )

    # Вычисление end_at
    end_at = booking_data.start_at + timedelta(minutes=service.duration_minutes)

    # Проверка доступности времени
    conflicting_booking = db.query(Booking).filter(
        Booking.master_id == booking_data.master_id,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        Booking.start_at < end_at,
        Booking.end_at > booking_data.start_at
    ).first()

    if conflicting_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot is not available"
        )

    # Создание брони
    new_booking = Booking(
        client_id=current_user.id,
        salon_id=service.salon_id,
        master_id=booking_data.master_id,
        service_id=booking_data.service_id,
        start_at=booking_data.start_at,
        end_at=end_at,
        price=service.price,
        client_notes=booking_data.client_notes
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    return BookingResponse.model_validate(new_booking)


@router.get("/", response_model=List[BookingResponse])
def get_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[BookingStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Получить список броней для текущего пользователя"""

    query = db.query(Booking)

    # Фильтр по роли
    if current_user.role == UserRole.CLIENT:
        query = query.filter(Booking.client_id == current_user.id)
    elif current_user.role == UserRole.SALON_OWNER:
        # Получить брони для салонов владельца
        salon_ids = [salon.id for salon in current_user.owned_salons]
        query = query.filter(Booking.salon_id.in_(salon_ids))

    # Фильтр по статусу
    if status_filter:
        query = query.filter(Booking.status == status_filter)

    bookings = query.order_by(Booking.start_at.desc()).offset(skip).limit(limit).all()

    return [BookingResponse.model_validate(booking) for booking in bookings]


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить бронь по ID"""

    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    # Проверка доступа
    salon = db.query(Salon).filter(Salon.id == booking.salon_id).first()
    if (booking.client_id != current_user.id and
        salon.owner_id != current_user.id and
        current_user.role != UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return BookingResponse.model_validate(booking)


@router.patch("/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить статус брони"""

    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    # Проверка прав доступа
    salon = db.query(Salon).filter(Salon.id == booking.salon_id).first()
    is_client = booking.client_id == current_user.id
    is_salon_owner = salon.owner_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN

    if not (is_client or is_salon_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Обновление полей
    if booking_data.status:
        booking.status = booking_data.status

    if booking_data.salon_notes and is_salon_owner:
        booking.salon_notes = booking_data.salon_notes

    db.commit()
    db.refresh(booking)

    return BookingResponse.model_validate(booking)


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отменить бронь"""

    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    # Проверка доступа
    salon = db.query(Salon).filter(Salon.id == booking.salon_id).first()
    is_client = booking.client_id == current_user.id
    is_salon_owner = salon.owner_id == current_user.id

    if not (is_client or is_salon_owner or current_user.role == UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Установка статуса отмены
    if is_client:
        booking.status = BookingStatus.CANCELLED_BY_CLIENT
    else:
        booking.status = BookingStatus.CANCELLED_BY_SALON

    db.commit()

    return None
