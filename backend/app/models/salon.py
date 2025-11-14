from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Salon(Base):
    __tablename__ = "salons"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    address = Column(String(300), nullable=False)
    phone = Column(String(20), nullable=False)

    # Геолокация
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Рейтинг
    rating = Column(Float, default=0.0)
    reviews_count = Column(Integer, default=0)

    # Фото
    logo_url = Column(String(500), nullable=True)
    photos = Column(Text, nullable=True)  # JSON array of URLs

    # Статус
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_salons", foreign_keys=[owner_id])
    masters = relationship("Master", back_populates="salon", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="salon", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="salon")
