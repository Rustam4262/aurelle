from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Master(Base):
    __tablename__ = "masters"

    id = Column(Integer, primary_key=True, index=True)
    salon_id = Column(Integer, ForeignKey("salons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True, index=True)  # Связь с пользователем
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)

    # Навыки и специализация
    specialization = Column(Text, nullable=True)  # JSON array
    experience_years = Column(Integer, default=0)

    # Рейтинг
    rating = Column(Float, default=0.0)
    reviews_count = Column(Integer, default=0)

    # Фото портфолио
    avatar_url = Column(String(500), nullable=True)
    portfolio = Column(Text, nullable=True)  # JSON array of URLs

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    salon = relationship("Salon", back_populates="masters")
    user = relationship("User", back_populates="master_profile", foreign_keys=[user_id])
    service_masters = relationship("ServiceMaster", back_populates="master", cascade="all, delete-orphan")
    work_shifts = relationship("WorkShift", back_populates="master", cascade="all, delete-orphan")
    time_slots = relationship("TimeSlot", back_populates="master", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="master")
    schedules = relationship("MasterSchedule", back_populates="master", cascade="all, delete-orphan")
    day_offs = relationship("MasterDayOff", back_populates="master", cascade="all, delete-orphan")
