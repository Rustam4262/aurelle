from pydantic import BaseModel, Field, computed_field
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


# Nested models for detailed response
class BookingServiceInfo(BaseModel):
    id: int
    title: str
    duration_minutes: int
    category: Optional[str] = None

    class Config:
        from_attributes = True


class BookingMasterInfo(BaseModel):
    id: int
    name: str
    specialization: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class BookingSalonInfo(BaseModel):
    id: int
    name: str
    address: str
    phone: str

    class Config:
        from_attributes = True


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


class BookingDetailedResponse(BookingResponse):
    """Детальная информация о бронировании с вложенными объектами"""
    service: Optional[BookingServiceInfo] = None
    master: Optional[BookingMasterInfo] = None
    salon: Optional[BookingSalonInfo] = None

    class Config:
        from_attributes = True
