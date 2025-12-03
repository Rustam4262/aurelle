from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class AuditLog(Base):
    """Журнал аудита действий пользователей"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Действие
    action = Column(String(100), nullable=False, index=True)  # user.register, booking.create, etc
    entity_type = Column(String(50), nullable=True, index=True)  # user, booking, salon, service
    entity_id = Column(Integer, nullable=True)

    # HTTP Request данные
    request_method = Column(String(10), nullable=True)  # GET, POST, PUT, DELETE
    request_path = Column(String(500), nullable=True)
    request_ip = Column(String(45), nullable=True)  # IPv4 или IPv6
    user_agent = Column(Text, nullable=True)

    # Ответ
    status_code = Column(Integer, nullable=True)

    # Дополнительные данные (JSON)
    details = Column(Text, nullable=True)  # Можно хранить JSON строкой

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)


class LoginLog(Base):
    """Журнал входов в систему"""
    __tablename__ = "login_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    phone = Column(String(20), nullable=False)  # Телефон для попытки входа

    # Результат
    success = Column(Integer, nullable=False, default=0)  # 0 = fail, 1 = success
    failure_reason = Column(String(200), nullable=True)  # "incorrect_password", "user_not_found", etc

    # Данные запроса
    request_ip = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
