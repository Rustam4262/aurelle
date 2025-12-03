from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ServiceBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    category: Optional[str] = None
    is_home_service: bool = False


class ServiceCreate(ServiceBase):
    salon_id: int


class ServiceResponse(ServiceBase):
    id: int
    salon_id: int
    is_active: bool
    is_home_service: bool
    created_at: datetime

    class Config:
        from_attributes = True
