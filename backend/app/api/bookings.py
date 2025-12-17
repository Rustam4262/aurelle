from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.service import Service, ServiceMaster
from app.models.master import Master
from app.models.salon import Salon
from app.models.user import User, UserRole
from app.models.notification import Notification
from app.schemas.booking import BookingCreate, BookingResponse, BookingUpdate
from app.api.deps import get_current_user
from app.tasks.email_tasks import send_booking_confirmation_email, send_booking_cancellation_email
from app.tasks.sms_tasks import send_booking_confirmation_sms
from app.websocket.notifications import send_notification_to_user, send_booking_update
import asyncio

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

    # Проверка, что мастер назначен на эту услугу
    service_master_link = db.query(ServiceMaster).filter(
        ServiceMaster.service_id == booking_data.service_id,
        ServiceMaster.master_id == booking_data.master_id
    ).first()

    if not service_master_link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This master is not assigned to the selected service"
        )

    # Проверка, что мастер активен
    if not master.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Master is not currently available"
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

    # Подготовить данные для уведомлений
    salon = db.query(Salon).filter(Salon.id == service.salon_id).first()
    booking_data_dict = {
        "id": new_booking.id,
        "date": new_booking.start_at.strftime("%d.%m.%Y"),
        "time": new_booking.start_at.strftime("%H:%M"),
        "salon_name": salon.name if salon else "Салон",
        "salon_address": salon.address if salon else "",
        "salon_phone": salon.phone if salon else "",
        "service_name": service.title,  # FIXED: Service uses 'title' not 'name'
        "master_name": master.name,
        "price": new_booking.price
    }

    # Отправить email клиенту (async task)
    if settings.EMAIL_ENABLED and current_user.email:
        send_booking_confirmation_email.delay(current_user.email, booking_data_dict)

    # Отправить SMS клиенту (async task)
    if settings.SMS_ENABLED and current_user.phone:
        send_booking_confirmation_sms.delay(current_user.phone, booking_data_dict)

    # Создать уведомление для клиента
    client_notification = Notification(
        user_id=current_user.id,
        booking_id=new_booking.id,
        type="confirmation",
        title="Бронирование подтверждено",
        message=f"Ваша запись на {booking_data_dict['date']} в {booking_data_dict['time']} подтверждена"
    )
    db.add(client_notification)

    # Создать уведомление для владельца салона
    if salon and salon.owner_id:
        owner_notification = Notification(
            user_id=salon.owner_id,
            booking_id=new_booking.id,
            type="info",
            title="Новое бронирование",
            message=f"Новая запись на {booking_data_dict['date']} в {booking_data_dict['time']}"
        )
        db.add(owner_notification)
        db.commit()
        db.refresh(owner_notification)

        # Отправить WebSocket уведомление владельцу
        try:
            asyncio.create_task(
                send_notification_to_user(salon.owner_id, owner_notification, db)
            )
        except:
            pass  # WebSocket notification is optional

    db.commit()
    db.refresh(client_notification)

    # Отправить WebSocket уведомление клиенту
    try:
        asyncio.create_task(
            send_notification_to_user(current_user.id, client_notification, db)
        )
    except:
        pass  # WebSocket notification is optional

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
        if not salon_ids:
            # Владелец салона без салонов - вернуть пустой список
            return []
        query = query.filter(Booking.salon_id.in_(salon_ids))
    # TODO: Добавить поддержку роли MASTER после добавления поля user_id в модель Master
    # elif current_user.role == UserRole.MASTER:
    #     master = db.query(Master).filter(Master.user_id == current_user.id).first()
    #     if not master:
    #         return []
    #     query = query.filter(Booking.master_id == master.id)

    # Фильтр по статусу
    if status_filter:
        query = query.filter(Booking.status == status_filter)

    bookings = query.order_by(Booking.start_at.desc()).offset(skip).limit(limit).all()

    return [BookingResponse.model_validate(booking) for booking in bookings]


@router.get("/my-bookings", response_model=List[BookingResponse])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[BookingStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """MVP FIX: Alias for GET / endpoint - returns user's bookings"""
    return get_bookings(db, current_user, status_filter, skip, limit)


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
    old_status = booking.status
    if booking_data.status:
        booking.status = booking_data.status

    if booking_data.salon_notes and is_salon_owner:
        booking.salon_notes = booking_data.salon_notes

    db.commit()
    db.refresh(booking)

    # Если статус изменился, отправить уведомления
    if booking_data.status and booking_data.status != old_status:
        # Создать уведомление для клиента
        status_messages = {
            BookingStatus.CONFIRMED: "подтверждено",
            BookingStatus.COMPLETED: "завершено",
            BookingStatus.CANCELLED_BY_SALON: "отменено салоном",
            BookingStatus.NO_SHOW: "отмечено как неявка",
        }

        if booking_data.status in status_messages:
            notification = Notification(
                user_id=booking.client_id,
                booking_id=booking.id,
                type="status_update",
                title="Изменение статуса бронирования",
                message=f"Ваше бронирование #{booking.id} {status_messages[booking_data.status]}"
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)

            # Отправить WebSocket уведомление
            try:
                asyncio.create_task(
                    send_booking_update(booking.client_id, booking.id, booking_data.status.value)
                )
                asyncio.create_task(
                    send_notification_to_user(booking.client_id, notification, db)
                )
            except:
                pass  # WebSocket notification is optional

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
        cancelled_by = "клиентом"
    else:
        booking.status = BookingStatus.CANCELLED_BY_SALON
        cancelled_by = "салоном"

    db.commit()
    db.refresh(booking)

    # Подготовить данные для уведомлений
    booking_data_dict = {
        "id": booking.id,
        "date": booking.start_at.strftime("%d.%m.%Y"),
        "time": booking.start_at.strftime("%H:%M"),
        "salon_name": salon.name if salon else "Салон",
        "service_name": booking.service.name if booking.service else "Услуга",
        "master_name": booking.master.name if booking.master else "Мастер",
        "cancelled_by": cancelled_by
    }

    # Отправить email клиенту об отмене
    if settings.EMAIL_ENABLED and booking.client.email:
        send_booking_cancellation_email.delay(booking.client.email, booking_data_dict)

    # Создать уведомление
    notification = Notification(
        user_id=booking.client_id,
        booking_id=booking.id,
        type="cancellation",
        title="Бронирование отменено",
        message=f"Ваше бронирование #{booking.id} на {booking_data_dict['date']} отменено {cancelled_by}"
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Отправить WebSocket уведомление
    try:
        asyncio.create_task(
            send_booking_update(booking.client_id, booking.id, booking.status.value)
        )
        asyncio.create_task(
            send_notification_to_user(booking.client_id, notification, db)
        )
    except:
        pass  # WebSocket notification is optional

    return None
