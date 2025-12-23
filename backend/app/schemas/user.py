from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    phone: str
    email: Optional[EmailStr] = None
    name: str


class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.CLIENT


class UserLogin(BaseModel):
    phone: Optional[str] = None  # MVP: Accept phone OR email
    email: Optional[str] = None  # MVP: Accept phone OR email
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str  # Добавлен refresh token для rotation
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserRoleChangeRequest(BaseModel):
    """Запрос на смену роли пользователя (только для админа)"""
    role: UserRole = Field(..., description="Новая роль пользователя")


class PasswordResetRequest(BaseModel):
    """Запрос на сброс пароля (только для админа)"""
    user_id: int = Field(..., description="ID пользователя для сброса пароля")


class PasswordResetResponse(BaseModel):
    """Ответ со сгенерированным временным паролем"""
    success: bool
    user_id: int
    temporary_password: str
    message: str
