"""
API endpoints для системы сообщений (чата)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.message import Message, MessageType
from app.models.salon import Salon
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageListResponse,
    ConversationPreview,
    MarkAsReadRequest
)
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Отправить сообщение

    - Клиент может писать владельцу салона
    - Владелец салона может писать клиентам
    - Мастер может писать клиентам (если привязан к салону)
    """
    # Проверяем существование получателя
    recipient = db.query(User).filter(User.id == message_data.recipient_id).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Получатель не найден"
        )

    # Создаём сообщение
    message = Message(
        sender_id=current_user.id,
        recipient_id=message_data.recipient_id,
        content=message_data.content,
        message_type=message_data.message_type,
        booking_id=message_data.booking_id,
        salon_id=message_data.salon_id,
        attachment_url=message_data.attachment_url,
        is_read=False
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    # Формируем ответ с дополнительной информацией
    response = MessageResponse.model_validate(message)
    response.sender_name = current_user.name
    response.sender_phone = current_user.phone
    response.recipient_name = recipient.name
    response.recipient_phone = recipient.phone

    return response


@router.get("/messages/conversations", response_model=List[ConversationPreview])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Получить список диалогов с превью последнего сообщения

    Возвращает список пользователей, с которыми есть переписка,
    с информацией о последнем сообщении и количестве непрочитанных
    """
    # Подзапрос для последних сообщений каждого диалога
    subquery = (
        db.query(
            Message.id,
            func.max(Message.created_at).label("last_time")
        )
        .filter(
            or_(
                Message.sender_id == current_user.id,
                Message.recipient_id == current_user.id
            )
        )
        .group_by(
            func.least(Message.sender_id, Message.recipient_id),
            func.greatest(Message.sender_id, Message.recipient_id)
        )
        .subquery()
    )

    # Получаем последние сообщения
    messages = (
        db.query(Message)
        .join(subquery, Message.created_at == subquery.c.last_time)
        .order_by(desc(Message.created_at))
        .limit(limit)
        .all()
    )

    conversations = []
    for msg in messages:
        # Определяем собеседника
        other_user_id = msg.recipient_id if msg.sender_id == current_user.id else msg.sender_id
        other_user = db.query(User).filter(User.id == other_user_id).first()

        if not other_user:
            continue

        # Подсчитываем непрочитанные сообщения от этого пользователя
        unread_count = db.query(func.count(Message.id)).filter(
            and_(
                Message.sender_id == other_user_id,
                Message.recipient_id == current_user.id,
                Message.is_read == False
            )
        ).scalar() or 0

        # Получаем информацию о салоне, если есть
        salon_name = None
        if msg.salon_id:
            salon = db.query(Salon).filter(Salon.id == msg.salon_id).first()
            if salon:
                salon_name = salon.name

        conversations.append(
            ConversationPreview(
                user_id=other_user.id,
                user_name=other_user.name,
                user_phone=other_user.phone,
                user_role=other_user.role.value,
                last_message=msg.content[:100],  # Первые 100 символов
                last_message_time=msg.created_at,
                unread_count=unread_count,
                salon_id=msg.salon_id,
                salon_name=salon_name
            )
        )

    return conversations


@router.get("/messages/with/{user_id}", response_model=MessageListResponse)
def get_messages_with_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Получить все сообщения с конкретным пользователем

    Возвращает историю переписки, отсортированную от новых к старым
    """
    # Проверяем существование пользователя
    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    # Получаем сообщения между двумя пользователями
    messages_query = db.query(Message).filter(
        or_(
            and_(
                Message.sender_id == current_user.id,
                Message.recipient_id == user_id
            ),
            and_(
                Message.sender_id == user_id,
                Message.recipient_id == current_user.id
            )
        )
    ).order_by(desc(Message.created_at))

    total = messages_query.count()
    messages = messages_query.offset(skip).limit(limit).all()

    # Подсчитываем непрочитанные сообщения
    unread_count = db.query(func.count(Message.id)).filter(
        and_(
            Message.sender_id == user_id,
            Message.recipient_id == current_user.id,
            Message.is_read == False
        )
    ).scalar() or 0

    # Формируем ответы с дополнительной информацией
    message_responses = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        recipient = db.query(User).filter(User.id == msg.recipient_id).first()

        response = MessageResponse.model_validate(msg)
        if sender:
            response.sender_name = sender.name
            response.sender_phone = sender.phone
        if recipient:
            response.recipient_name = recipient.name
            response.recipient_phone = recipient.phone

        message_responses.append(response)

    return MessageListResponse(
        messages=message_responses,
        total=total,
        unread_count=unread_count
    )


@router.post("/messages/mark-read")
def mark_messages_as_read(
    request: MarkAsReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Отметить сообщения как прочитанные

    Пользователь может отметить только те сообщения, которые адресованы ему
    """
    # Находим сообщения
    messages = db.query(Message).filter(
        and_(
            Message.id.in_(request.message_ids),
            Message.recipient_id == current_user.id,
            Message.is_read == False
        )
    ).all()

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сообщения не найдены или уже прочитаны"
        )

    # Отмечаем как прочитанные
    for message in messages:
        message.is_read = True
        message.read_at = datetime.utcnow()

    db.commit()

    return {
        "status": "success",
        "marked_count": len(messages)
    }


@router.get("/messages/unread/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить общее количество непрочитанных сообщений
    """
    count = db.query(func.count(Message.id)).filter(
        and_(
            Message.recipient_id == current_user.id,
            Message.is_read == False
        )
    ).scalar() or 0

    return {"unread_count": count}


@router.delete("/messages/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Удалить сообщение (только свое)
    """
    message = db.query(Message).filter(Message.id == message_id).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сообщение не найдено"
        )

    # Проверяем, что это сообщение отправлено текущим пользователем
    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы можете удалять только свои сообщения"
        )

    db.delete(message)
    db.commit()

    return {"status": "success", "message": "Сообщение удалено"}
