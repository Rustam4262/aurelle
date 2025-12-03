from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.models.audit_log import LoginLog
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse, PasswordChange
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

    # Генерация токена
    access_token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role.value})

    return Token(
        access_token=access_token,
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

    # Генерация токена
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


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
    db.commit()

    return {"message": "Password changed successfully"}
