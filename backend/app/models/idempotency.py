from sqlalchemy import Column, Integer, String, DateTime, Text, Index
from datetime import datetime, timezone, timedelta
from app.core.database import Base


class IdempotencyKey(Base):
    """
    Модель для хранения idempotency keys

    Idempotency keys предотвращают дублирование операций при повторных запросах.
    Особенно важно для платежей и бронирований.
    """
    __tablename__ = "idempotency_keys"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    request_path = Column(String(500), nullable=False)
    request_method = Column(String(10), nullable=False)
    request_body_hash = Column(String(64), nullable=True)  # SHA256 hash тела запроса
    response_status = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Composite index для быстрого поиска
    __table_args__ = (
        Index('ix_idempotency_key_path_method', 'key', 'request_path', 'request_method'),
    )

    def __repr__(self):
        return f"<IdempotencyKey(key={self.key}, path={self.request_path})>"

    @classmethod
    def create_expiry_time(cls, hours: int = 24) -> datetime:
        """Создать время истечения (по умолчанию 24 часа)"""
        return datetime.now(timezone.utc) + timedelta(hours=hours)

    def is_expired(self) -> bool:
        """Проверить, истек ли ключ"""
        return datetime.now(timezone.utc) > self.expires_at
