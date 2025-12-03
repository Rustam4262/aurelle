"""
Модель сообщений для чата между клиентами и салонами/мастерами
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class MessageType(str, enum.Enum):
    """Тип сообщения"""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"


class Message(Base):
    """Модель сообщения в чате"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    # Отправитель и получатель
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Контекст (опционально: связь с записью или салоном)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    salon_id = Column(Integer, ForeignKey("salons.id"), nullable=True)

    # Содержимое сообщения
    message_type = Column(Enum(MessageType), default=MessageType.TEXT, nullable=False)
    content = Column(Text, nullable=False)

    # Вложения
    attachment_url = Column(String, nullable=True)

    # Статус прочтения
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)

    # Временные метки
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Связи
    sender = relationship("User", foreign_keys=[sender_id], backref="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], backref="received_messages")
    booking = relationship("Booking", backref="messages")
    salon = relationship("Salon", backref="messages")

    def __repr__(self):
        return f"<Message {self.id}: {self.sender_id} -> {self.recipient_id}>"
