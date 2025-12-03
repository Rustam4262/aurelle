from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    salon_id = Column(Integer, ForeignKey("salons.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="favorites")
    salon = relationship("Salon", backref="favorited_by")

    # Unique constraint to prevent duplicates
    __table_args__ = (
        UniqueConstraint('user_id', 'salon_id', name='unique_user_salon_favorite'),
    )
