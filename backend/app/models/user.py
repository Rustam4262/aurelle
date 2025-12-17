from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.soft_delete import SoftDeleteMixin
import enum


class UserRole(str, enum.Enum):
    """Роли пользователей"""
    ADMIN = "admin"
    SALON_OWNER = "salon_owner"
    MASTER = "master"
    CLIENT = "client"


class User(SoftDeleteMixin, Base):
    """
    Модель пользователя с soft delete

    is_deleted используется вместо физического удаления для:
    - Соблюдения требований о хранении данных
    - Возможности восстановления
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owned_salons = relationship("Salon", back_populates="owner", foreign_keys="Salon.owner_id")
    bookings = relationship("Booking", back_populates="client", foreign_keys="Booking.client_id")
    # reviews = relationship("Review", back_populates="client")  # DISABLED FOR MVP - reviews feature not needed
    master_profile = relationship("Master", back_populates="user", foreign_keys="Master.user_id", uselist=False)
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    # consents = relationship("UserConsent", back_populates="user", cascade="all, delete-orphan")  # DISABLED FOR MVP
    # consent_history = relationship("ConsentHistory", back_populates="user", cascade="all, delete-orphan")  # DISABLED FOR MVP
