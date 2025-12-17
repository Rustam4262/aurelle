"""
WebSocket endpoints для real-time чата

Функции:
- Отправка сообщений в реальном времени
- Получение сообщений
- Typing indicators
- Online/offline status
- Read receipts
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import json
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.chat_message import ChatMessage
from app.models.user import User
from app.websocket.manager import get_connection_manager
from app.core.security import decode_access_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_current_user_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Получить текущего пользователя из WebSocket token

    Args:
        websocket: WebSocket connection
        token: JWT access token
        db: Database session

    Returns:
        User объект или None
    """
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


@router.websocket("/ws/chat")
async def chat_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint для чата

    Query params:
        token: JWT access token

    Message format (client -> server):
        {
            "type": "message",
            "receiver_id": 123,
            "message": "Hello!",
            "salon_id": 456  # optional
        }

        {
            "type": "typing",
            "receiver_id": 123,
            "is_typing": true
        }

        {
            "type": "read",
            "message_id": 789
        }

    Message format (server -> client):
        {
            "type": "message",
            "id": 1,
            "sender_id": 123,
            "sender_name": "John Doe",
            "message": "Hello!",
            "created_at": "2024-01-01T12:00:00",
            "is_read": false
        }

        {
            "type": "typing",
            "user_id": 123,
            "user_name": "John Doe",
            "is_typing": true
        }

        {
            "type": "status",
            "user_id": 123,
            "is_online": true
        }

        {
            "type": "read_receipt",
            "message_id": 789,
            "read_by": 123,
            "read_at": "2024-01-01T12:05:00"
        }
    """
    # Аутентификация пользователя
    current_user = await get_current_user_ws(websocket, token, db)
    if not current_user:
        return

    # Подключение к менеджеру
    manager = get_connection_manager()
    await manager.connect(websocket, current_user.id)

    # Отправить подтверждение подключения
    await manager.send_to_websocket({
        "type": "connected",
        "user_id": current_user.id,
        "message": "Connected to chat"
    }, websocket)

    # Отправить статус онлайн всем, кто писал с этим пользователем
    # (можно расширить для отправки всем контактам)
    await notify_online_status(current_user.id, True, manager)

    try:
        while True:
            # Получить сообщение от клиента
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "message":
                # Отправка сообщения
                await handle_chat_message(data, current_user, db, manager)

            elif message_type == "typing":
                # Typing indicator
                await handle_typing_indicator(data, current_user, manager)

            elif message_type == "read":
                # Read receipt
                await handle_read_receipt(data, current_user, db, manager)

            elif message_type == "ping":
                # Keep-alive ping
                await manager.send_to_websocket({"type": "pong"}, websocket)

            else:
                logger.warning(f"Unknown message type: {message_type}")

    except WebSocketDisconnect:
        logger.info(f"User {current_user.id} disconnected from chat")
    except Exception as e:
        logger.error(f"Error in chat WebSocket for user {current_user.id}: {e}")
    finally:
        # Отключение
        manager.disconnect(websocket)

        # Отправить статус офлайн
        await notify_online_status(current_user.id, False, manager)


async def handle_chat_message(
    data: dict,
    sender: User,
    db: Session,
    manager
):
    """
    Обработать отправку сообщения

    Args:
        data: Данные сообщения
        sender: Отправитель
        db: Database session
        manager: ConnectionManager
    """
    receiver_id = data.get("receiver_id")
    message_text = data.get("message")
    salon_id = data.get("salon_id")

    if not receiver_id or not message_text:
        logger.warning("Invalid message data")
        return

    # Создать сообщение в БД
    chat_message = ChatMessage(
        sender_id=sender.id,
        receiver_id=receiver_id,
        message=message_text,
        salon_id=salon_id,
        is_read=False
    )

    db.add(chat_message)
    db.commit()
    db.refresh(chat_message)

    # Отправить получателю
    message_payload = {
        "type": "message",
        "id": chat_message.id,
        "sender_id": sender.id,
        "sender_name": sender.name,
        "message": message_text,
        "created_at": chat_message.created_at.isoformat(),
        "is_read": False,
        "salon_id": salon_id
    }

    await manager.send_personal_message(message_payload, receiver_id)

    # Отправить подтверждение отправителю
    confirmation = {
        "type": "message_sent",
        "id": chat_message.id,
        "receiver_id": receiver_id,
        "created_at": chat_message.created_at.isoformat()
    }

    await manager.send_personal_message(confirmation, sender.id)


async def handle_typing_indicator(
    data: dict,
    sender: User,
    manager
):
    """
    Обработать индикатор печати

    Args:
        data: Данные
        sender: Пользователь
        manager: ConnectionManager
    """
    receiver_id = data.get("receiver_id")
    is_typing = data.get("is_typing", False)

    if not receiver_id:
        return

    # Отправить typing indicator получателю
    typing_payload = {
        "type": "typing",
        "user_id": sender.id,
        "user_name": sender.name,
        "is_typing": is_typing
    }

    await manager.send_personal_message(typing_payload, receiver_id)


async def handle_read_receipt(
    data: dict,
    reader: User,
    db: Session,
    manager
):
    """
    Обработать отметку о прочтении

    Args:
        data: Данные
        reader: Пользователь, который прочитал
        db: Database session
        manager: ConnectionManager
    """
    message_id = data.get("message_id")

    if not message_id:
        return

    # Обновить сообщение в БД
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_id,
        ChatMessage.receiver_id == reader.id
    ).first()

    if message and not message.is_read:
        message.is_read = True
        db.commit()

        # Отправить read receipt отправителю
        receipt_payload = {
            "type": "read_receipt",
            "message_id": message_id,
            "read_by": reader.id,
            "read_at": datetime.now(timezone.utc).isoformat()
        }

        await manager.send_personal_message(receipt_payload, message.sender_id)


async def notify_online_status(user_id: int, is_online: bool, manager):
    """
    Уведомить об изменении онлайн статуса

    Args:
        user_id: ID пользователя
        is_online: Онлайн или офлайн
        manager: ConnectionManager
    """
    # В будущем можно расширить для отправки всем контактам
    # Пока просто логируем
    logger.info(f"User {user_id} is now {'online' if is_online else 'offline'}")

    # Можно отправить broadcast или только тем, кто в чате с этим пользователем
    # Для простоты пока пропускаем
    pass
