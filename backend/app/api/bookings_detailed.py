"""
Расширенные endpoints для бронирований с детальной информацией
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.service import Service
from app.models.master import Master
from app.models.salon import Salon
from app.models.user import User, UserRole
from app.schemas.booking import BookingDetailedResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/my-bookings", response_model=List[BookingDetailedResponse])
def get_my_bookings_detailed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status_filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Получить детальный список моих бронирований с информацией о салоне, услуге и мастере"""

    # Convert string status to enum if provided
    status_enum = None
    if status_filter:
        try:
            status_enum = BookingStatus(status_filter)
        except ValueError:
            pass

    query = db.query(Booking)

    # Фильтр по роли
    if current_user.role == UserRole.CLIENT:
        query = query.filter(Booking.client_id == current_user.id)
    elif current_user.role == UserRole.SALON_OWNER:
        # Получить брони для салонов владельца
        salon_ids = [salon.id for salon in current_user.owned_salons]
        if not salon_ids:
            # Владелец салона без салонов - вернуть пустой список
            return []
        query = query.filter(Booking.salon_id.in_(salon_ids))

    # Фильтр по статусу
    if status_enum:
        query = query.filter(Booking.status == status_enum)

    bookings = query.order_by(Booking.start_at.desc()).offset(skip).limit(limit).all()

    # Формируем детальные ответы с вложенными объектами
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
        master = db.query(Master).filter(Master.id == booking.master_id).first()
        if master:
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
