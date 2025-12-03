from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class BookingStatus(str, enum.Enum):
    """Статусы брони"""
    PENDING = "pending"              # Ожидает подтверждения
    CONFIRMED = "confirmed"          # Подтверждена
    CANCELLED_BY_CLIENT = "cancelled_by_client"
    CANCELLED_BY_SALON = "cancelled_by_salon"
    COMPLETED = "completed"          # Услуга выполнена
    NO_SHOW = "no_show"             # Клиент не пришёл


class PaymentStatus(str, enum.Enum):
    """Статусы оплаты"""
    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"
    FAILED = "failed"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    salon_id = Column(Integer, ForeignKey("salons.id"), nullable=False)
    master_id = Column(Integer, ForeignKey("masters.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)

    # Время
    start_at = Column(DateTime(timezone=True), nullable=False, index=True)
    end_at = Column(DateTime(timezone=True), nullable=False)

    # Статус
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False)

    # Цена
    price = Column(Float, nullable=False)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    payment_method = Column(String(50), nullable=True)  # online, cash, card

    # Примечания
    client_notes = Column(Text, nullable=True)
    salon_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    client = relationship("User", back_populates="bookings", foreign_keys=[client_id])
    salon = relationship("Salon", back_populates="bookings")
    master = relationship("Master", back_populates="bookings")
    service = relationship("Service", back_populates="bookings")
    review = relationship("Review", back_populates="booking", uselist=False)
    payments = relationship("Payment", back_populates="booking")
