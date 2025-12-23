from pydantic import BaseModel, Field, constr, confloat, field_validator
from typing import Optional, List
from datetime import datetime


class SalonBase(BaseModel):
    name: constr(min_length=3, max_length=200) = Field(..., description="Название салона")
    description: Optional[str] = None
    address: constr(min_length=10, max_length=300) = Field(..., description="Адрес салона")
    phone: str
    latitude: Optional[confloat(ge=-90, le=90)] = Field(None, description="Широта")
    longitude: Optional[confloat(ge=-180, le=180)] = Field(None, description="Долгота")
    external_photo_url: Optional[str] = Field(None, description="URL фото фасада")


class SalonCreate(SalonBase):
    pass


class SalonUpdate(BaseModel):
    name: Optional[constr(min_length=3, max_length=200)] = None
    description: Optional[str] = None
    address: Optional[constr(min_length=10, max_length=300)] = None
    phone: Optional[str] = None
    latitude: Optional[confloat(ge=-90, le=90)] = None
    longitude: Optional[confloat(ge=-180, le=180)] = None
    logo_url: Optional[str] = None
    external_photo_url: Optional[str] = None


class SalonRejectRequest(BaseModel):
    """Запрос на отклонение салона"""
    reason: constr(min_length=10, max_length=500) = Field(..., description="Причина отклонения")


class SalonResponse(SalonBase):
    id: int
    owner_id: int
    rating: float = 0.0
    reviews_count: int = 0
    logo_url: Optional[str] = None
    external_photo_url: Optional[str] = None
    is_verified: bool = False
    is_active: bool
    rejection_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    created_at: datetime

    @field_validator('rating', mode='before')
    @classmethod
    def default_rating(cls, v):
        return v if v is not None else 0.0

    @field_validator('reviews_count', mode='before')
    @classmethod
    def default_reviews_count(cls, v):
        return v if v is not None else 0

    @field_validator('is_verified', mode='before')
    @classmethod
    def default_is_verified(cls, v):
        return v if v is not None else False

    class Config:
        from_attributes = True


# Схема для отображения на карте
class SalonMapResponse(BaseModel):
    id: int
    name: str
    address: str
    latitude: float
    longitude: float
    rating: float
    reviews_count: int
    external_photo_url: Optional[str] = None
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True
