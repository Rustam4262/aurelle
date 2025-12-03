from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PaymentStatus(str, enum.Enum):
    """Статусы платежей"""
    PENDING = "pending"  # Ожидает оплаты
    PROCESSING = "processing"  # В обработке
    COMPLETED = "completed"  # Завершен
    FAILED = "failed"  # Ошибка
    REFUNDED = "refunded"  # Возврат
    CANCELLED = "cancelled"  # Отменен


class PaymentMethod(str, enum.Enum):
    """Методы оплаты"""
    PAYME = "payme"
    CLICK = "click"
    UZUM = "uzum"
    CASH = "cash"  # Наличные (в салоне)
    CARD = "card"  # Карта (в салоне)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)

    # Платежная информация
    amount = Column(Float, nullable=False)  # Сумма платежа
    currency = Column(String(3), default="UZS")  # Валюта
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)

    # Информация от платежной системы
    transaction_id = Column(String(200), unique=True, nullable=True, index=True)  # ID транзакции из платежной системы
    provider_data = Column(Text, nullable=True)  # JSON с данными от провайдера

    # Метаданные
    paid_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    # Комиссия
    commission_amount = Column(Float, default=0.0)  # Комиссия платежной системы
    net_amount = Column(Float, nullable=False)  # Сумма после комиссии

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    booking = relationship("Booking", back_populates="payments")


class PaymeTransaction(Base):
    """История транзакций Payme"""
    __tablename__ = "payme_transactions"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)

    # Данные Payme
    payme_transaction_id = Column(String(50), unique=True, nullable=False, index=True)
    payme_time = Column(Integer, nullable=False)  # Unix timestamp
    create_time = Column(Integer, nullable=False)
    perform_time = Column(Integer, nullable=True)
    cancel_time = Column(Integer, nullable=True)

    amount = Column(Float, nullable=False)
    state = Column(Integer, nullable=False)  # Payme state: 1, 2, 3, 4, -1, -2
    reason = Column(Integer, nullable=True)  # Cancel reason

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ClickTransaction(Base):
    """История транзакций Click"""
    __tablename__ = "click_transactions"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)

    # Данные Click
    click_trans_id = Column(String(50), unique=True, nullable=False, index=True)
    click_paydoc_id = Column(String(50), nullable=True)
    merchant_trans_id = Column(String(50), nullable=False)

    amount = Column(Float, nullable=False)
    action = Column(Integer, nullable=False)  # 0 - prepare, 1 - complete
    error = Column(Integer, nullable=False)  # 0 - success
    error_note = Column(String(255), nullable=True)

    sign_time = Column(DateTime(timezone=True), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
