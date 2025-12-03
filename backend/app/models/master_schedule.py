from sqlalchemy import Column, Integer, ForeignKey, Time, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class DayOfWeek(int, enum.Enum):
    """День недели"""
    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6


class MasterSchedule(Base):
    """Расписание работы мастера (повторяющееся еженедельно)"""
    __tablename__ = "master_schedules"

    id = Column(Integer, primary_key=True, index=True)
    master_id = Column(Integer, ForeignKey("masters.id"), nullable=False, index=True)
    day_of_week = Column(SQLEnum(DayOfWeek), nullable=False)  # 0 = Понедельник, 6 = Воскресенье

    # Рабочие часы
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Перерыв (опционально)
    break_start = Column(Time, nullable=True)
    break_end = Column(Time, nullable=True)

    is_active = Column(Boolean, default=True)

    # Relationships
    master = relationship("Master", back_populates="schedules")

    def __repr__(self):
        return f"<MasterSchedule master_id={self.master_id} day={self.day_of_week} {self.start_time}-{self.end_time}>"
