from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    salon_id = Column(Integer, ForeignKey("salons.id"), nullable=False)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    duration_minutes = Column(Integer, nullable=False)  # Длительность услуги

    # Категория (маникюр, педикюр, стрижка, окрашивание и т.д.)
    category = Column(String(100), nullable=True, index=True)

    is_active = Column(Boolean, default=True)
    is_home_service = Column(Boolean, default=False, nullable=False)  # Услуга с выездом на дом

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    salon = relationship("Salon", back_populates="services")
    service_masters = relationship("ServiceMaster", back_populates="service", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="service")


class ServiceMaster(Base):
    """Связь услуги и мастера (многие ко многим)"""
    __tablename__ = "service_masters"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    master_id = Column(Integer, ForeignKey("masters.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    service = relationship("Service", back_populates="service_masters")
    master = relationship("Master", back_populates="service_masters")
