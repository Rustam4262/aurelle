from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.models.salon import Salon
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatConversation

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/messages", response_model=ChatMessageResponse)
def send_message(
    message_data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to another user (salon owner or client)"""
    # Verify receiver exists
    receiver = db.query(User).filter(User.id == message_data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    # Create message
    message = ChatMessage(
        sender_id=current_user.id,
        receiver_id=message_data.receiver_id,
        salon_id=message_data.salon_id,
        message=message_data.message
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    # Add sender and receiver names to response
    response = ChatMessageResponse.model_validate(message)
    response.sender_name = current_user.name
    response.receiver_name = receiver.name

    return response


@router.get("/messages/{user_id}", response_model=List[ChatMessageResponse])
def get_messages(
    user_id: int,
    salon_id: int = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all messages between current user and another user"""
    query = db.query(ChatMessage).filter(
        or_(
            and_(
                ChatMessage.sender_id == current_user.id,
                ChatMessage.receiver_id == user_id
            ),
            and_(
                ChatMessage.sender_id == user_id,
                ChatMessage.receiver_id == current_user.id
            )
        )
    )

    if salon_id:
        query = query.filter(ChatMessage.salon_id == salon_id)

    messages = query.order_by(ChatMessage.created_at.asc()).limit(limit).all()

    # Get user names
    users = db.query(User).filter(User.id.in_([current_user.id, user_id])).all()
    user_names = {u.id: u.name for u in users}

    # Build response with names
    result = []
    for msg in messages:
        response = ChatMessageResponse.model_validate(msg)
        response.sender_name = user_names.get(msg.sender_id)
        response.receiver_name = user_names.get(msg.receiver_id)
        result.append(response)

    # Mark messages as read
    db.query(ChatMessage).filter(
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.sender_id == user_id,
        ChatMessage.is_read == 0
    ).update({"is_read": 1})
    db.commit()

    return result


@router.get("/conversations", response_model=List[ChatConversation])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all chat conversations for current user"""
    # Get all users current user has chatted with
    sent_to = db.query(ChatMessage.receiver_id).filter(
        ChatMessage.sender_id == current_user.id
    ).distinct()

    received_from = db.query(ChatMessage.sender_id).filter(
        ChatMessage.receiver_id == current_user.id
    ).distinct()

    # Combine and get unique user IDs
    all_user_ids = set([u[0] for u in sent_to.all()] + [u[0] for u in received_from.all()])

    conversations = []

    for user_id in all_user_ids:
        # Get last message
        last_message = db.query(ChatMessage).filter(
            or_(
                and_(
                    ChatMessage.sender_id == current_user.id,
                    ChatMessage.receiver_id == user_id
                ),
                and_(
                    ChatMessage.sender_id == user_id,
                    ChatMessage.receiver_id == current_user.id
                )
            )
        ).order_by(ChatMessage.created_at.desc()).first()

        if not last_message:
            continue

        # Get unread count
        unread_count = db.query(ChatMessage).filter(
            ChatMessage.sender_id == user_id,
            ChatMessage.receiver_id == current_user.id,
            ChatMessage.is_read == 0
        ).count()

        # Get user info
        user = db.query(User).filter(User.id == user_id).first()

        # Get salon info if available
        salon = None
        salon_name = None
        if last_message.salon_id:
            salon = db.query(Salon).filter(Salon.id == last_message.salon_id).first()
            salon_name = salon.name if salon else None

        conversations.append(
            ChatConversation(
                user_id=user_id,
                user_name=user.name if user else "Unknown",
                salon_id=last_message.salon_id,
                salon_name=salon_name,
                last_message=last_message.message,
                last_message_time=last_message.created_at,
                unread_count=unread_count
            )
        )

    # Sort by last message time
    conversations.sort(key=lambda x: x.last_message_time, reverse=True)

    return conversations


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get total unread message count"""
    count = db.query(ChatMessage).filter(
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.is_read == 0
    ).count()

    return {"unread_count": count}
