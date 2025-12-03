from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReviewBase(BaseModel):
    rating: float
    comment: Optional[str] = None


class ReviewCreate(ReviewBase):
    booking_id: int


class ReviewResponse(ReviewBase):
    id: int
    booking_id: int
    client_id: int
    salon_id: int
    master_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewClientInfo(BaseModel):
    """Информация о клиенте для отзыва"""
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class ReviewDetailedResponse(ReviewResponse):
    """Детальная информация об отзыве с данными клиента"""
    client: Optional[ReviewClientInfo] = None

    class Config:
        from_attributes = True
