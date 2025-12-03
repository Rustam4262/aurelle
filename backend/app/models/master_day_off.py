from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.core.database import Base


class MasterDayOff(Base):
    """Выходные дни мастера (исключения из расписания)"""
    __tablename__ = "master_day_offs"

    id = Column(Integer, primary_key=True, index=True)
    master_id = Column(Integer, ForeignKey("masters.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    reason = Column(String(200), nullable=True)

    # Relationships
    master = relationship("Master", back_populates="day_offs")

    def __repr__(self):
        return f"<MasterDayOff master_id={self.master_id} date={self.date}>"
