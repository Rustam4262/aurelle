from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class PaymentStatus(str, Enum):
    """Статусы платежей"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    """Методы оплаты"""
    PAYME = "payme"
    CLICK = "click"
    UZUM = "uzum"
    CASH = "cash"
    CARD = "card"


class PaymentCreate(BaseModel):
    """Схема создания платежа"""
    booking_id: int
    amount: float = Field(..., gt=0, description="Сумма платежа")
    payment_method: PaymentMethod
    currency: str = "UZS"


class PaymentResponse(BaseModel):
    """Схема ответа с данными платежа"""
    id: int
    booking_id: int
    amount: float
    currency: str
    payment_method: PaymentMethod
    status: PaymentStatus
    transaction_id: Optional[str] = None
    commission_amount: float
    net_amount: float
    paid_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentStatusUpdate(BaseModel):
    """Схема обновления статуса платежа"""
    status: PaymentStatus
    transaction_id: Optional[str] = None
    error_message: Optional[str] = None


class PaymentRefund(BaseModel):
    """Схема возврата средств"""
    reason: str = Field(..., min_length=10, description="Причина возврата")


# Payme схемы
class PaymeAccount(BaseModel):
    """Payme account параметры"""
    booking_id: int


class PaymeParams(BaseModel):
    """Payme метод параметры"""
    id: str
    time: int
    amount: Optional[int] = None
    account: Optional[PaymeAccount] = None
    reason: Optional[int] = None


class PaymeRequest(BaseModel):
    """Payme webhook request"""
    method: str
    params: PaymeParams


class PaymeError(BaseModel):
    """Payme error response"""
    code: int
    message: str
    data: Optional[str] = None


class PaymeResponse(BaseModel):
    """Payme response"""
    result: Optional[dict] = None
    error: Optional[PaymeError] = None


# Click схемы
class ClickRequest(BaseModel):
    """Click webhook request"""
    click_trans_id: str
    merchant_trans_id: str
    amount: float
    action: int  # 0 - prepare, 1 - complete
    error: int
    error_note: str
    sign_time: str
    sign_string: str
    click_paydoc_id: Optional[str] = None


class ClickResponse(BaseModel):
    """Click response"""
    click_trans_id: str
    merchant_trans_id: str
    merchant_confirm_id: Optional[int] = None
    error: int
    error_note: str


# Uzum схемы (базовая структура)
class UzumPaymentRequest(BaseModel):
    """Uzum payment initialization"""
    booking_id: int
    amount: float
    return_url: str


class UzumCallbackRequest(BaseModel):
    """Uzum webhook callback"""
    transaction_id: str
    status: str
    amount: float
    merchant_trans_id: str


class UzumCallbackResponse(BaseModel):
    """Uzum callback response"""
    status: str
    message: str
