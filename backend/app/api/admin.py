"""
Admin API endpoints для управления платформой
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.booking import Booking, BookingStatus
from app.models.master import Master
from app.models.service import Service
from app.models.review import Review
from app.schemas.salon import SalonResponse, SalonRejectRequest
from app.schemas.user import UserResponse, UserRoleChangeRequest, PasswordResetResponse
from app.schemas.booking import BookingResponse
from app.schemas.common import PaginatedResponse
from app.models.audit_log import AuditLog
from app.core.security import get_password_hash
import secrets
import string

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


@router.get("/salons", response_model=PaginatedResponse[SalonResponse])
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

    # Получаем total ДО применения offset/limit
    total = query.count()

    # Применяем пагинацию
    salons = query.order_by(Salon.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "items": salons,
        "total": total,
        "skip": skip,
        "limit": limit
    }


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


@router.post("/salons/{salon_id}/approve")
def approve_salon(
    salon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Одобрить салон для показа в поиске"""

    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    # Валидация: уже одобрен
    if salon.is_verified and salon.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Salon is already approved"
        )

    # Approve: is_verified=TRUE, is_active=TRUE
    salon.is_verified = True
    salon.is_active = True
    salon.approved_at = datetime.now()
    salon.approved_by = current_user.id
    salon.rejection_reason = None  # Очищаем причину отклонения

    # Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="SALON_APPROVE",
        entity_type="salon",
        entity_id=salon_id,
        details=json.dumps({"approved_by": current_user.id, "salon_name": salon.name})
    )
    db.add(audit_log)

    db.commit()
    db.refresh(salon)

    return {
        "success": True,
        "salon_id": salon.id,
        "is_verified": salon.is_verified,
        "is_active": salon.is_active,
        "approved_at": salon.approved_at,
        "message": f"Салон '{salon.name}' одобрен"
    }


@router.post("/salons/{salon_id}/reject")
def reject_salon(
    salon_id: int,
    reject_data: SalonRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Отклонить салон с указанием причины"""

    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    # Валидация: нельзя reject уже approved салон (MVP)
    if salon.is_verified and salon.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reject an approved salon. Deactivate it first."
        )

    # Reject: is_verified=FALSE, is_active=FALSE
    salon.is_verified = False
    salon.is_active = False
    salon.rejection_reason = reject_data.reason
    salon.approved_at = None
    salon.approved_by = None

    # Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="SALON_REJECT",
        entity_type="salon",
        entity_id=salon_id,
        details=json.dumps({"reason": reject_data.reason, "salon_name": salon.name})
    )
    db.add(audit_log)

    db.commit()
    db.refresh(salon)

    return {
        "success": True,
        "salon_id": salon.id,
        "is_verified": salon.is_verified,
        "is_active": salon.is_active,
        "rejection_reason": salon.rejection_reason,
        "message": f"Салон '{salon.name}' отклонён"
    }


@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    role_data: UserRoleChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Изменить роль пользователя (только для админа)"""

    # Найти целевого пользователя
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Запрет: снять последнего ADMIN
    if target_user.role == UserRole.ADMIN and role_data.role != UserRole.ADMIN:
        # Проверяем, сколько админов осталось
        admins_count = db.query(User).filter(
            User.role == UserRole.ADMIN,
            User.is_active == True
        ).count()

        if admins_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot remove the last admin. System must have at least one active admin."
            )

    # Сохраняем старую роль для audit log
    old_role = target_user.role

    # Меняем роль
    target_user.role = role_data.role

    # Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="USER_ROLE_CHANGED",
        entity_type="user",
        entity_id=user_id,
        details=json.dumps({
            "from": old_role.value,
            "to": role_data.role.value,
            "changed_by": current_user.id,
            "target_user_name": target_user.name
        })
    )
    db.add(audit_log)

    db.commit()
    db.refresh(target_user)

    return {
        "success": True,
        "user_id": target_user.id,
        "old_role": old_role.value,
        "new_role": target_user.role.value,
        "message": f"Роль пользователя '{target_user.name}' изменена с '{old_role.value}' на '{target_user.role.value}'"
    }


@router.get("/users", response_model=PaginatedResponse[UserResponse])
def get_all_users_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    role: Optional[UserRole] = None,
    query_search: Optional[str] = Query(None, alias="query"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """Получить список всех пользователей с поиском и пагинацией"""

    query = db.query(User)

    # Фильтр по роли
    if role:
        query = query.filter(User.role == role)

    # Поиск по имени, телефону, email
    if query_search:
        search_term = f"%{query_search}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.phone.ilike(search_term),
                User.email.ilike(search_term)
            )
        )

    # Получаем total ДО применения offset/limit
    total = query.count()

    # Применяем пагинацию
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "items": users,
        "total": total,
        "skip": skip,
        "limit": limit
    }


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


@router.get("/bookings", response_model=PaginatedResponse[BookingResponse])
def get_all_bookings_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    status_filter: Optional[BookingStatus] = None,
    salon_id: Optional[int] = None,
    master_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """Получить список всех бронирований с фильтрами"""

    query = db.query(Booking)

    # Фильтры
    if status_filter:
        query = query.filter(Booking.status == status_filter)

    if salon_id:
        query = query.filter(Booking.salon_id == salon_id)

    if master_id:
        query = query.filter(Booking.master_id == master_id)

    # Получаем total ДО применения offset/limit
    total = query.count()

    # Применяем пагинацию
    bookings = query.order_by(Booking.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "items": bookings,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/users/{user_id}/reset-password", response_model=PasswordResetResponse)
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Сбросить пароль пользователя и выдать временный (только для админа)"""

    # Найти целевого пользователя
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Генерация временного пароля (8 символов: буквы + цифры)
    alphabet = string.ascii_letters + string.digits
    temporary_password = ''.join(secrets.choice(alphabet) for _ in range(8))

    # Хешируем и сохраняем новый пароль
    target_user.hashed_password = get_password_hash(temporary_password)

    # Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="PASSWORD_RESET",
        entity_type="user",
        entity_id=user_id,
        details=json.dumps({
            "reset_by": current_user.id,
            "target_user_name": target_user.name,
            "target_user_phone": target_user.phone
        })
    )
    db.add(audit_log)

    db.commit()
    db.refresh(target_user)

    return {
        "success": True,
        "user_id": target_user.id,
        "temporary_password": temporary_password,
        "message": f"Пароль для пользователя '{target_user.name}' ({target_user.phone}) сброшен. Временный пароль: {temporary_password}"
    }
