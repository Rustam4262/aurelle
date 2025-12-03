from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NotificationCreate(BaseModel):
    user_id: int
    booking_id: Optional[int] = None
    type: str
    title: str
    message: str
    scheduled_for: Optional[datetime] = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    booking_id: Optional[int]
    type: str
    title: str
    message: str
    is_read: int
    sent_at: datetime
    scheduled_for: Optional[datetime]

    class Config:
        from_attributes = True
