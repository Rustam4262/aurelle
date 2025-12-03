"""
API для загрузки файлов (аватары мастеров, логотипы салонов)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pathlib import Path
import uuid
import shutil
from typing import Optional
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.master import Master
from app.models.salon import Salon
from app.api.deps import get_current_user

router = APIRouter()

# Директория для загрузки файлов
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Разрешенные типы файлов
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def save_upload_file(upload_file: UploadFile, subfolder: str) -> str:
    """Сохранить загруженный файл и вернуть его путь"""

    # Проверка типа файла
    if upload_file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )

    # Генерация уникального имени файла
    file_extension = upload_file.filename.split(".")[-1] if upload_file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"

    # Создание подпапки
    upload_subfolder = UPLOAD_DIR / subfolder
    upload_subfolder.mkdir(exist_ok=True)

    # Путь для сохранения
    file_path = upload_subfolder / unique_filename

    # Сохранение файла
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    # Возвращаем относительный путь
    return f"/uploads/{subfolder}/{unique_filename}"


@router.post("/master-avatar/{master_id}")
async def upload_master_avatar(
    master_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Загрузить аватар мастера"""

    # Получить мастера
    master = db.query(Master).filter(Master.id == master_id).first()

    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master not found"
        )

    # Проверить права доступа (владелец салона)
    if current_user.role != UserRole.SALON_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only salon owners can upload master avatars"
        )

    # Проверить, что мастер принадлежит салону владельца
    salon = db.query(Salon).filter(
        Salon.id == master.salon_id,
        Salon.owner_id == current_user.id
    ).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload avatars for masters in your salons"
        )

    # Сохранить файл
    try:
        file_path = save_upload_file(file, "masters")

        # Обновить аватар мастера
        master.avatar_url = file_path
        db.commit()

        return {
            "message": "Avatar uploaded successfully",
            "avatar_url": file_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )


@router.post("/salon-logo/{salon_id}")
async def upload_salon_logo(
    salon_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Загрузить логотип салона"""

    # Получить салон
    salon = db.query(Salon).filter(Salon.id == salon_id).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    # Проверить права доступа (владелец салона)
    if current_user.role != UserRole.SALON_OWNER or salon.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload logos for your own salons"
        )

    # Сохранить файл
    try:
        file_path = save_upload_file(file, "salons")

        # Обновить логотип салона
        salon.logo_url = file_path
        db.commit()

        return {
            "message": "Logo uploaded successfully",
            "logo_url": file_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )


@router.post("/salon-facade/{salon_id}")
async def upload_salon_facade(
    salon_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Загрузить фото фасада салона"""

    # Получить салон
    salon = db.query(Salon).filter(Salon.id == salon_id).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    # Проверить права доступа (владелец салона)
    if current_user.role != UserRole.SALON_OWNER or salon.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload facade photos for your own salons"
        )

    # Сохранить файл
    try:
        file_path = save_upload_file(file, "salons")

        # Обновить фото фасада салона
        salon.external_photo_url = file_path
        db.commit()

        return {
            "message": "Facade photo uploaded successfully",
            "external_photo_url": file_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )
