from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.booking import BookingStatus, PaymentStatus


class BookingBase(BaseModel):
    service_id: int
    master_id: int
    start_at: datetime
    client_notes: Optional[str] = None


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    status: Optional[BookingStatus] = None
    salon_notes: Optional[str] = None


class BookingResponse(BookingBase):
    id: int
    client_id: int
    salon_id: int
    end_at: datetime
    status: BookingStatus
    price: float
    payment_status: PaymentStatus
    payment_method: Optional[str] = None
    salon_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
