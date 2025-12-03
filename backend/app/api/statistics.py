from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from typing import Dict, Any
from app.core.database import get_db
from app.models.user import User
from app.models.salon import Salon
from app.models.booking import Booking, BookingStatus
from app.models.service import Service
from app.models.master import Master
from app.models.review import Review
from app.api.deps import get_current_user
from app.models.user import UserRole

router = APIRouter()



@router.get("/salon/{salon_id}", response_model=Dict[str, Any])
def get_salon_statistics(
    salon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить статистику салона"""

    # Проверка существования салона
    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    # Проверка прав доступа (FIXED: use enum instead of string)
    if current_user.role not in [UserRole.ADMIN, UserRole.SALON_OWNER] or (
        current_user.role == UserRole.SALON_OWNER and salon.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Текущая дата
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Общая статистика
    total_bookings = db.query(Booking).filter(Booking.salon_id == salon_id).count()
    total_services = db.query(Service).filter(Service.salon_id == salon_id).count()
    total_masters = db.query(Master).filter(Master.salon_id == salon_id).count()
    total_reviews = db.query(Review).filter(Review.salon_id == salon_id).count()

    # Записи сегодня (FIXED: use start_at instead of booking_date)
    bookings_today = db.query(Booking).filter(
        and_(
            Booking.salon_id == salon_id,
            func.date(Booking.start_at) == today
        )
    ).count()

    # Записи за неделю (FIXED: use start_at instead of booking_date)
    bookings_week = db.query(Booking).filter(
        and_(
            Booking.salon_id == salon_id,
            func.date(Booking.start_at) >= week_ago
        )
    ).count()

    # Записи за месяц (FIXED: use start_at instead of booking_date)
    bookings_month = db.query(Booking).filter(
        and_(
            Booking.salon_id == salon_id,
            func.date(Booking.start_at) >= month_ago
        )
    ).count()

    # Записи по статусам
    bookings_pending = db.query(Booking).filter(
        and_(
            Booking.salon_id == salon_id,
            Booking.status == BookingStatus.PENDING
        )
    ).count()

    bookings_confirmed = db.query(Booking).filter(
        and_(
            Booking.salon_id == salon_id,
            Booking.status == BookingStatus.CONFIRMED
        )
    ).count()

    bookings_completed = db.query(Booking).filter(
        and_(
            Booking.salon_id == salon_id,
            Booking.status == BookingStatus.COMPLETED
        )
    ).count()

    bookings_cancelled = db.query(Booking).filter(
        and_(
            Booking.salon_id == salon_id,
            or_(
                Booking.status == BookingStatus.CANCELLED_BY_CLIENT,
                Booking.status == BookingStatus.CANCELLED_BY_SALON
            )
        )
    ).count()

    # Расчет выручки (только завершенные записи)
    completed_bookings = db.query(Booking).filter(
        and_(
            Booking.salon_id == salon_id,
            Booking.status == BookingStatus.COMPLETED
        )
    ).all()

    total_revenue = 0
    for booking in completed_bookings:
        service = db.query(Service).filter(Service.id == booking.service_id).first()
        if service:
            total_revenue += service.price

    # Выручка за месяц (FIXED: use start_at instead of booking_date)
    completed_bookings_month = db.query(Booking).filter(
        and_(
            Booking.salon_id == salon_id,
            Booking.status == BookingStatus.COMPLETED,
            func.date(Booking.start_at) >= month_ago
        )
    ).all()

    revenue_month = 0
    for booking in completed_bookings_month:
        service = db.query(Service).filter(Service.id == booking.service_id).first()
        if service:
            revenue_month += service.price

    # Топ мастеров по количеству записей
    top_masters = db.query(
        Master.id,
        Master.name,
        func.count(Booking.id).label('booking_count')
    ).join(
        Booking, Booking.master_id == Master.id
    ).filter(
        Master.salon_id == salon_id
    ).group_by(
        Master.id, Master.name
    ).order_by(
        func.count(Booking.id).desc()
    ).limit(5).all()

    top_masters_list = [
        {
            "master_id": m.id,
            "master_name": m.name,
            "booking_count": m.booking_count
        }
        for m in top_masters
    ]

    # Топ услуг по количеству записей
    top_services = db.query(
        Service.id,
        Service.name,
        func.count(Booking.id).label('booking_count')
    ).join(
        Booking, Booking.service_id == Service.id
    ).filter(
        Service.salon_id == salon_id
    ).group_by(
        Service.id, Service.name
    ).order_by(
        func.count(Booking.id).desc()
    ).limit(5).all()

    top_services_list = [
        {
            "service_id": s.id,
            "service_name": s.name,
            "booking_count": s.booking_count
        }
        for s in top_services
    ]

    return {
        "salon_id": salon_id,
        "salon_name": salon.name,
        "salon_rating": salon.rating,
        "total": {
            "bookings": total_bookings,
            "services": total_services,
            "masters": total_masters,
            "reviews": total_reviews
        },
        "bookings": {
            "today": bookings_today,
            "week": bookings_week,
            "month": bookings_month,
            "by_status": {
                "pending": bookings_pending,
                "confirmed": bookings_confirmed,
                "completed": bookings_completed,
                "cancelled": bookings_cancelled
            }
        },
        "revenue": {
            "total": total_revenue,
            "month": revenue_month
        },
        "top_masters": top_masters_list,
        "top_services": top_services_list
    }
