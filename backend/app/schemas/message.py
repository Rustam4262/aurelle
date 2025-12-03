"""
Pydantic схемы для сообщений
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.message import MessageType


class MessageBase(BaseModel):
    """Базовая схема сообщения"""
    recipient_id: int = Field(..., description="ID получателя")
    content: str = Field(..., min_length=1, max_length=5000, description="Текст сообщения")
    message_type: MessageType = Field(default=MessageType.TEXT, description="Тип сообщения")
    booking_id: Optional[int] = Field(None, description="ID записи (опционально)")
    salon_id: Optional[int] = Field(None, description="ID салона (опционально)")
    attachment_url: Optional[str] = Field(None, description="URL вложения")


class MessageCreate(MessageBase):
    """Схема создания сообщения"""
    pass


class MessageResponse(MessageBase):
    """Схема ответа с сообщением"""
    id: int
    sender_id: int
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Информация об отправителе и получателе
    sender_name: Optional[str] = None
    sender_phone: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """Схема списка сообщений"""
    messages: list[MessageResponse]
    total: int
    unread_count: int


class ConversationPreview(BaseModel):
    """Превью диалога"""
    user_id: int
    user_name: str
    user_phone: Optional[str] = None
    user_role: str
    last_message: str
    last_message_time: datetime
    unread_count: int
    salon_id: Optional[int] = None
    salon_name: Optional[str] = None


class MarkAsReadRequest(BaseModel):
    """Запрос на отметку сообщений как прочитанных"""
    message_ids: list[int] = Field(..., description="Список ID сообщений")
