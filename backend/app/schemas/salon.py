from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SalonBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    phone: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SalonCreate(SalonBase):
    pass


class SalonUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    logo_url: Optional[str] = None


class SalonResponse(SalonBase):
    id: int
    owner_id: int
    rating: float
    reviews_count: int
    logo_url: Optional[str] = None
    is_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
