from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_token_pair
from app.models.user import User, UserRole
from app.models.audit_log import LoginLog
from app.models.refresh_token import RefreshToken
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse, PasswordChange, RefreshTokenRequest
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Регистрация нового пользователя"""

    # ЗАЩИТА: Запрет регистрации администраторов через публичное API
    if user_data.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot register as admin through public API"
        )

    # Проверка на существование
    existing_user = db.query(User).filter(User.phone == user_data.phone).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this phone already exists"
        )

    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

    # Создание пользователя
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        phone=user_data.phone,
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password,
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Генерация пары токенов (access + refresh)
    access_token, refresh_token, refresh_expires_at = create_token_pair(new_user.id)

    # Сохранить refresh token в БД
    refresh_token_record = RefreshToken(
        user_id=new_user.id,
        token=refresh_token,
        expires_at=refresh_expires_at
    )
    db.add(refresh_token_record)
    db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Вход пользователя"""

    user = db.query(User).filter(User.phone == credentials.phone).first()

    # Получаем данные для логирования
    request_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)

    if not user:
        # Логируем неудачную попытку - пользователь не найден
        login_log = LoginLog(
            user_id=None,
            phone=credentials.phone,
            success=0,
            failure_reason="user_not_found",
            request_ip=request_ip,
            user_agent=user_agent
        )
        db.add(login_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone or password"
        )

    if not verify_password(credentials.password, user.hashed_password):
        # Логируем неудачную попытку - неверный пароль
        login_log = LoginLog(
            user_id=user.id,
            phone=credentials.phone,
            success=0,
            failure_reason="incorrect_password",
            request_ip=request_ip,
            user_agent=user_agent
        )
        db.add(login_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone or password"
        )

    if not user.is_active:
        # Логируем неудачную попытку - аккаунт неактивен
        login_log = LoginLog(
            user_id=user.id,
            phone=credentials.phone,
            success=0,
            failure_reason="account_inactive",
            request_ip=request_ip,
            user_agent=user_agent
        )
        db.add(login_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Логируем успешный вход
    login_log = LoginLog(
        user_id=user.id,
        phone=credentials.phone,
        success=1,
        failure_reason=None,
        request_ip=request_ip,
        user_agent=user_agent
    )
    db.add(login_log)
    db.commit()

    # Генерация пары токенов (access + refresh)
    access_token, refresh_token, refresh_expires_at = create_token_pair(user.id)

    # Сохранить refresh token в БД
    refresh_token_record = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=refresh_expires_at
    )
    db.add(refresh_token_record)
    db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=Token)
def refresh_access_token(
    refresh_request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Обновление access токена с помощью refresh токена

    🔐 ВАЖНО: Реализует Token Rotation для безопасности!
    При каждом refresh старый refresh токен отзывается и выдается новая пара токенов.
    """

    # Найти refresh токен в БД
    refresh_token_record = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_request.refresh_token
    ).first()

    # Проверить существование токена
    if not refresh_token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Проверить, что токен не отозван
    if refresh_token_record.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )

    # Проверить срок действия
    if datetime.now(timezone.utc) > refresh_token_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )

    # Получить пользователя
    user = db.query(User).filter(User.id == refresh_token_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # 🔄 TOKEN ROTATION: Отозвать старый refresh токен
    refresh_token_record.revoked = True
    refresh_token_record.revoked_at = datetime.now(timezone.utc)

    # Создать новую пару токенов
    new_access_token, new_refresh_token, new_refresh_expires_at = create_token_pair(user.id)

    # Сохранить новый refresh токен в БД
    new_refresh_token_record = RefreshToken(
        user_id=user.id,
        token=new_refresh_token,
        expires_at=new_refresh_expires_at
    )
    db.add(new_refresh_token_record)
    db.commit()

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/logout")
def logout(
    refresh_request: RefreshTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Выход пользователя - отзыв refresh токена
    """

    # Найти и отозвать refresh токен
    refresh_token_record = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_request.refresh_token,
        RefreshToken.user_id == current_user.id
    ).first()

    if refresh_token_record and not refresh_token_record.revoked:
        refresh_token_record.revoked = True
        refresh_token_record.revoked_at = datetime.now(timezone.utc)
        db.commit()

    return {"message": "Logged out successfully"}


@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Смена пароля текущего пользователя"""

    # Проверка текущего пароля
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Проверка длины нового пароля
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )

    # Обновление пароля
    current_user.hashed_password = get_password_hash(password_data.new_password)

    # 🔐 БЕЗОПАСНОСТЬ: Отозвать все refresh токены при смене пароля
    active_tokens = db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked == False
    ).all()

    for token in active_tokens:
        token.revoked = True
        token.revoked_at = datetime.now(timezone.utc)

    db.commit()

    return {"message": "Password changed successfully. All sessions have been terminated."}
