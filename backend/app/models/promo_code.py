from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    salon_id = Column(Integer, ForeignKey("salons.id"), nullable=True)  # None = valid for all salons
    discount_type = Column(String, nullable=False)  # 'percentage' or 'fixed'
    discount_value = Column(Float, nullable=False)  # 10 for 10% or 100 for $100
    min_booking_amount = Column(Float, default=0)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    usage_limit = Column(Integer, nullable=True)  # None = unlimited
    times_used = Column(Integer, default=0)
    is_active = Column(Integer, default=1)  # 1 = active, 0 = inactive
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    salon = relationship("Salon", foreign_keys=[salon_id])
