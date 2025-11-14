from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ServiceBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    category: Optional[str] = None


class ServiceCreate(ServiceBase):
    salon_id: int


class ServiceResponse(ServiceBase):
    id: int
    salon_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
