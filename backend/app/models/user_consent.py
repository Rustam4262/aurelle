from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.database import Base


class ConsentType(str, enum.Enum):
    """Типы согласий пользователя"""
    TERMS_OF_SERVICE = "terms_of_service"  # Согласие с пользовательским соглашением
    PRIVACY_POLICY = "privacy_policy"  # Согласие с политикой конфиденциальности
    DATA_PROCESSING = "data_processing"  # Согласие на обработку персональных данных
    MARKETING_EMAILS = "marketing_emails"  # Согласие на маркетинговые email
    MARKETING_SMS = "marketing_sms"  # Согласие на SMS-рассылки
    MARKETING_PUSH = "marketing_push"  # Согласие на push-уведомления
    COOKIES_FUNCTIONAL = "cookies_functional"  # Согласие на функциональные cookies
    COOKIES_ANALYTICS = "cookies_analytics"  # Согласие на аналитические cookies
    COOKIES_MARKETING = "cookies_marketing"  # Согласие на маркетинговые cookies
    GEOLOCATION = "geolocation"  # Согласие на использование геолокации
    THIRD_PARTY_SHARING = "third_party_sharing"  # Согласие на передачу данных третьим лицам


class ConsentStatus(str, enum.Enum):
    """Статус согласия"""
    GRANTED = "granted"  # Согласие дано
    REVOKED = "revoked"  # Согласие отозвано
    EXPIRED = "expired"  # Согласие истекло (требуется повторное)


class UserConsent(Base):
    """
    Модель для отслеживания согласий пользователей

    Соответствует требованиям:
    - Закон РУз "О персональных данных" № ЗРУ-547
    - GDPR Article 7 (для граждан ЕС)
    - Best practices по защите данных
    """
    __tablename__ = "user_consents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Тип и статус согласия
    consent_type = Column(Enum(ConsentType), nullable=False, index=True)
    status = Column(Enum(ConsentStatus), default=ConsentStatus.GRANTED, nullable=False)

    # Версия документа (для ToS и Privacy Policy)
    document_version = Column(String(50), nullable=True)

    # Временные метки
    granted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Контекст получения согласия (для аудита)
    ip_address = Column(String(45), nullable=True)  # IPv4 или IPv6
    user_agent = Column(String(500), nullable=True)
    consent_method = Column(String(50), nullable=True)  # "web", "mobile", "api"
    consent_text = Column(Text, nullable=True)  # Текст согласия на момент подтверждения

    # Relationships
    user = relationship("User", back_populates="consents")

    def __repr__(self):
        return f"<UserConsent(user_id={self.user_id}, type={self.consent_type}, status={self.status})>"

    def is_active(self) -> bool:
        """Проверить, активно ли согласие"""
        if self.status != ConsentStatus.GRANTED:
            return False

        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False

        return True

    def revoke(self):
        """Отозвать согласие"""
        self.status = ConsentStatus.REVOKED
        self.revoked_at = datetime.now(timezone.utc)

    @classmethod
    def get_required_consents(cls) -> list[ConsentType]:
        """
        Получить список обязательных согласий для использования платформы

        Эти согласия должны быть даны при регистрации
        """
        return [
            ConsentType.TERMS_OF_SERVICE,
            ConsentType.PRIVACY_POLICY,
            ConsentType.DATA_PROCESSING,
        ]

    @classmethod
    def get_optional_consents(cls) -> list[ConsentType]:
        """
        Получить список опциональных согласий

        Пользователь может использовать платформу без них
        """
        return [
            ConsentType.MARKETING_EMAILS,
            ConsentType.MARKETING_SMS,
            ConsentType.MARKETING_PUSH,
            ConsentType.COOKIES_FUNCTIONAL,
            ConsentType.COOKIES_ANALYTICS,
            ConsentType.COOKIES_MARKETING,
            ConsentType.GEOLOCATION,
            ConsentType.THIRD_PARTY_SHARING,
        ]


class ConsentHistory(Base):
    """
    История изменений согласий (для полного аудита)

    Хранит все изменения для соблюдения требований регуляторов
    """
    __tablename__ = "consent_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_type = Column(Enum(ConsentType), nullable=False)

    # Действие
    action = Column(String(50), nullable=False)  # "granted", "revoked", "updated"

    # Контекст
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    document_version = Column(String(50), nullable=True)

    # Метаданные
    notes = Column(Text, nullable=True)  # Дополнительная информация

    # Relationships
    user = relationship("User", back_populates="consent_history")

    def __repr__(self):
        return f"<ConsentHistory(user_id={self.user_id}, type={self.consent_type}, action={self.action})>"
