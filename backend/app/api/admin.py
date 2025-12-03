"""
Admin API endpoints для управления платформой
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.booking import Booking, BookingStatus
from app.models.master import Master
from app.models.service import Service
from app.models.review import Review
from app.schemas.salon import SalonResponse

router = APIRouter(prefix="/admin")


@router.get("/stats/platform")
def get_platform_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Получить общую статистику платформы"""

    # Общие счетчики
    total_salons = db.query(Salon).count()
    total_users = db.query(User).count()
    total_bookings = db.query(Booking).count()
    total_masters = db.query(Master).count()
    total_services = db.query(Service).count()

    # Активные салоны
    active_salons = db.query(Salon).filter(Salon.is_active == True).count()

    # Новые за последние 7 дней
    week_ago = datetime.now() - timedelta(days=7)
    new_salons_week = db.query(Salon).filter(Salon.created_at >= week_ago).count()
    new_users_week = db.query(User).filter(User.created_at >= week_ago).count()
    new_bookings_week = db.query(Booking).filter(Booking.created_at >= week_ago).count()

    # Выручка (только completed записи)
    total_revenue = db.query(func.sum(Booking.price)).filter(
        Booking.status == BookingStatus.COMPLETED
    ).scalar() or 0

    # Средний рейтинг платформы
    avg_rating = db.query(func.avg(Salon.rating)).scalar() or 0

    return {
        "totals": {
            "salons": total_salons,
            "users": total_users,
            "bookings": total_bookings,
            "masters": total_masters,
            "services": total_services
        },
        "active": {
            "salons": active_salons,
        },
        "new_this_week": {
            "salons": new_salons_week,
            "users": new_users_week,
            "bookings": new_bookings_week
        },
        "revenue": {
            "total": float(total_revenue)
        },
        "ratings": {
            "average": float(avg_rating)
        }
    }


@router.get("/salons", response_model=List[SalonResponse])
def get_all_salons_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Получить список всех салонов (для администратора)"""

    query = db.query(Salon)

    # Поиск по названию или адресу
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Salon.name.ilike(search_term)) |
            (Salon.address.ilike(search_term))
        )

    # Фильтр по активности
    if is_active is not None:
        query = query.filter(Salon.is_active == is_active)

    salons = query.order_by(Salon.created_at.desc()).offset(skip).limit(limit).all()

    return salons


@router.post("/salons/{salon_id}/toggle-active")
def toggle_salon_active(
    salon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Активировать/деактивировать салон"""

    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    salon.is_active = not salon.is_active
    db.commit()
    db.refresh(salon)

    return {
        "success": True,
        "salon_id": salon.id,
        "is_active": salon.is_active,
        "message": f"Салон {'активирован' if salon.is_active else 'деактивирован'}"
    }


@router.delete("/salons/{salon_id}")
def delete_salon_admin(
    salon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Удалить салон (только для админа)"""

    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    # Удаляем салон (каскадные связи позаботятся об остальном)
    db.delete(salon)
    db.commit()

    return {
        "success": True,
        "message": f"Салон '{salon.name}' успешно удален"
    }


@router.get("/users")
def get_all_users_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    role: Optional[UserRole] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """Получить список всех пользователей"""

    query = db.query(User)

    # Фильтр по роли
    if role:
        query = query.filter(User.role == role)

    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at
        }
        for user in users
    ]


@router.post("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Активировать/деактивировать пользователя"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Нельзя деактивировать самого себя
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself"
        )

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "user_id": user.id,
        "is_active": user.is_active,
        "message": f"Пользователь {'активирован' if user.is_active else 'деактивирован'}"
    }


@router.get("/bookings")
def get_all_bookings_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    status_filter: Optional[BookingStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """Получить список всех бронирований"""

    query = db.query(Booking)

    if status_filter:
        query = query.filter(Booking.status == status_filter)

    bookings = query.order_by(Booking.created_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": booking.id,
            "client_id": booking.client_id,
            "salon_id": booking.salon_id,
            "master_id": booking.master_id,
            "service_id": booking.service_id,
            "start_at": booking.start_at,
            "end_at": booking.end_at,
            "status": booking.status,
            "price": booking.price,
            "created_at": booking.created_at
        }
        for booking in bookings
    ]
