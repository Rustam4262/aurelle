from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models.user_consent import ConsentType, ConsentStatus


class ConsentCreate(BaseModel):
    """Создание нового согласия"""
    consent_type: ConsentType
    document_version: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    consent_method: Optional[str] = "web"


class ConsentUpdate(BaseModel):
    """Обновление согласия (обычно отзыв)"""
    status: ConsentStatus


class ConsentResponse(BaseModel):
    """Ответ с информацией о согласии"""
    id: int
    user_id: int
    consent_type: ConsentType
    status: ConsentStatus
    document_version: Optional[str]
    granted_at: datetime
    revoked_at: Optional[datetime]
    expires_at: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True


class ConsentBulkCreate(BaseModel):
    """Массовое создание согласий (при регистрации)"""
    consents: List[ConsentCreate]


class ConsentStatusCheck(BaseModel):
    """Проверка статуса согласий пользователя"""
    user_id: int
    has_required_consents: bool
    active_consents: List[ConsentType]
    missing_required_consents: List[ConsentType]
    optional_consents: dict[ConsentType, bool]  # True if granted


class ConsentHistoryResponse(BaseModel):
    """История изменений согласия"""
    id: int
    user_id: int
    consent_type: ConsentType
    action: str
    timestamp: datetime
    ip_address: Optional[str]
    document_version: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


class ConsentPreferences(BaseModel):
    """
    Настройки согласий пользователя

    Используется в личном кабинете для управления
    """
    marketing_emails: bool = False
    marketing_sms: bool = False
    marketing_push: bool = False
    cookies_functional: bool = True
    cookies_analytics: bool = False
    cookies_marketing: bool = False
    geolocation: bool = False
    third_party_sharing: bool = False


class ConsentDocumentInfo(BaseModel):
    """Информация о документе (ToS/Privacy Policy)"""
    document_type: str  # "terms_of_service" или "privacy_policy"
    version: str
    effective_date: datetime
    url: str
    language: str = "ru"


class RegistrationConsents(BaseModel):
    """
    Согласия при регистрации

    Обязательные согласия для создания аккаунта
    """
    accept_terms: bool = Field(..., description="Согласие с пользовательским соглашением")
    accept_privacy: bool = Field(..., description="Согласие с политикой конфиденциальности")
    accept_data_processing: bool = Field(..., description="Согласие на обработку персональных данных")

    # Опциональные
    marketing_emails: bool = Field(False, description="Согласие на маркетинговые email")
    marketing_sms: bool = Field(False, description="Согласие на SMS-рассылки")

    # Версии документов (должны быть актуальными)
    terms_version: str = Field(..., description="Версия ToS, с которой согласились")
    privacy_version: str = Field(..., description="Версия Privacy Policy, с которой согласились")
