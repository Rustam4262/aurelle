from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PromoCodeCreate(BaseModel):
    code: str
    salon_id: Optional[int] = None
    discount_type: str  # 'percentage' or 'fixed'
    discount_value: float
    min_booking_amount: float = 0
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    usage_limit: Optional[int] = None


class PromoCodeResponse(BaseModel):
    id: int
    code: str
    salon_id: Optional[int]
    discount_type: str
    discount_value: float
    min_booking_amount: float
    valid_from: datetime
    valid_until: Optional[datetime]
    usage_limit: Optional[int]
    times_used: int
    is_active: int
    created_at: datetime

    class Config:
        from_attributes = True


class PromoCodeValidation(BaseModel):
    code: str
    booking_amount: float
    salon_id: Optional[int] = None


class PromoCodeValidationResult(BaseModel):
    valid: bool
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_amount: Optional[float] = None
    final_amount: Optional[float] = None
    message: str
