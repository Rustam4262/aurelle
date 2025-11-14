from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MasterBase(BaseModel):
    name: str
    phone: Optional[str] = None
    description: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: int = 0


class MasterCreate(MasterBase):
    salon_id: int


class MasterResponse(MasterBase):
    id: int
    salon_id: int
    rating: float
    reviews_count: int
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
