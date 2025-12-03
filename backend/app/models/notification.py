from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    type = Column(String, nullable=False)  # 'reminder', 'confirmation', 'cancellation', 'info'
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Integer, default=0)  # 0 = unread, 1 = read
    sent_at = Column(DateTime, default=datetime.utcnow)
    scheduled_for = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    booking = relationship("Booking", foreign_keys=[booking_id])
