"""
WebSocket endpoints для real-time уведомлений

Функции:
- Push notifications в реальном времени
- Обновления статусов браней
- Новые отзывы
- Системные уведомления
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.websocket.manager import get_connection_manager
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_current_user_ws(
    websocket: WebSocket,
    token: str,
    db: Session
) -> Optional[User]:
    """Получить текущего пользователя из WebSocket token"""
    try:
        payload = decode_access_token(token)
        if payload is None:
            await websocket.close(code=1008, reason="Invalid token")
            return None

        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()

        if not user or not user.is_active:
            await websocket.close(code=1008, reason="User not found or inactive")
            return None

        return user
    except Exception as e:
        logger.error(f"Error getting user from WebSocket token: {e}")
        await websocket.close(code=1011, reason="Authentication error")
        return None


@router.websocket("/ws/notifications")
async def notifications_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint для уведомлений

    Query params:
        token: JWT access token

    Message format (server -> client):
        {
            "type": "notification",
            "id": 1,
            "title": "Новое бронирование",
            "message": "У вас новое бронирование на 15:00",
            "notification_type": "confirmation",
            "booking_id": 123,
            "created_at": "2024-01-01T12:00:00",
            "is_read": false
        }

        {
            "type": "booking_update",
            "booking_id": 123,
            "status": "confirmed",
            "updated_at": "2024-01-01T12:00:00"
        }

        {
            "type": "new_review",
            "review_id": 456,
            "salon_id": 789,
            "rating": 5,
            "created_at": "2024-01-01T12:00:00"
        }

        {
            "type": "unread_count",
            "count": 5
        }

    Message format (client -> server):
        {
            "type": "mark_read",
            "notification_id": 123
        }

        {
            "type": "ping"
        }
    """
    # Аутентификация
    current_user = await get_current_user_ws(websocket, token, db)
    if not current_user:
        return

    # Подключение
    manager = get_connection_manager()
    await manager.connect(websocket, current_user.id)

    # Отправить подтверждение
    await manager.send_to_websocket({
        "type": "connected",
        "user_id": current_user.id,
        "message": "Connected to notifications"
    }, websocket)

    # Отправить количество непрочитанных
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    await manager.send_to_websocket({
        "type": "unread_count",
        "count": unread_count
    }, websocket)

    try:
        while True:
            # Получить сообщение от клиента
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "mark_read":
                # Отметить уведомление как прочитанное
                notification_id = data.get("notification_id")
                if notification_id:
                    notification = db.query(Notification).filter(
                        Notification.id == notification_id,
                        Notification.user_id == current_user.id
                    ).first()

                    if notification:
                        notification.is_read = True
                        db.commit()

                        # Отправить новое количество непрочитанных
                        new_unread_count = db.query(Notification).filter(
                            Notification.user_id == current_user.id,
                            Notification.is_read == False
                        ).count()

                        await manager.send_to_websocket({
                            "type": "unread_count",
                            "count": new_unread_count
                        }, websocket)

            elif message_type == "ping":
                # Keep-alive ping
                await manager.send_to_websocket({"type": "pong"}, websocket)

            else:
                logger.warning(f"Unknown message type: {message_type}")

    except WebSocketDisconnect:
        logger.info(f"User {current_user.id} disconnected from notifications")
    except Exception as e:
        logger.error(f"Error in notifications WebSocket for user {current_user.id}: {e}")
    finally:
        manager.disconnect(websocket)


async def send_notification_to_user(
    user_id: int,
    notification: Notification,
    db: Session
):
    """
    Отправить уведомление пользователю через WebSocket

    Args:
        user_id: ID пользователя
        notification: Объект уведомления
        db: Database session
    """
    manager = get_connection_manager()

    # Проверить, онлайн ли пользователь
    if not manager.is_user_online(user_id):
        logger.info(f"User {user_id} is offline, notification will be sent when they connect")
        return

    # Отправить уведомление
    notification_payload = {
        "type": "notification",
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "notification_type": notification.type,
        "booking_id": notification.booking_id,
        "created_at": notification.created_at.isoformat(),
        "is_read": notification.is_read
    }

    await manager.send_personal_message(notification_payload, user_id)

    # Обновить количество непрочитанных
    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()

    await manager.send_personal_message({
        "type": "unread_count",
        "count": unread_count
    }, user_id)


async def send_booking_update(
    user_id: int,
    booking_id: int,
    status: str
):
    """
    Отправить обновление статуса брони

    Args:
        user_id: ID пользователя
        booking_id: ID брони
        status: Новый статус
    """
    manager = get_connection_manager()

    if not manager.is_user_online(user_id):
        return

    from datetime import datetime, timezone

    update_payload = {
        "type": "booking_update",
        "booking_id": booking_id,
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await manager.send_personal_message(update_payload, user_id)


async def send_new_review_notification(
    salon_owner_id: int,
    review_id: int,
    salon_id: int,
    rating: int
):
    """
    Отправить уведомление о новом отзыве

    Args:
        salon_owner_id: ID владельца салона
        review_id: ID отзыва
        salon_id: ID салона
        rating: Рейтинг
    """
    manager = get_connection_manager()

    if not manager.is_user_online(salon_owner_id):
        return

    from datetime import datetime, timezone

    review_payload = {
        "type": "new_review",
        "review_id": review_id,
        "salon_id": salon_id,
        "rating": rating,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await manager.send_personal_message(review_payload, salon_owner_id)
