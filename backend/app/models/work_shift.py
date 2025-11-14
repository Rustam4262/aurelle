from sqlalchemy import Column, Integer, Date, Time, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class WorkShift(Base):
    """Рабочие смены мастеров"""
    __tablename__ = "work_shifts"

    id = Column(Integer, primary_key=True, index=True)
    master_id = Column(Integer, ForeignKey("masters.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    master = relationship("Master", back_populates="work_shifts")
