from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from app.core.database import get_db
from app.models.favorite import Favorite
from app.models.salon import Salon
from app.models.user import User
from app.schemas.favorite import FavoriteCreate, FavoriteResponse
from app.schemas.salon import SalonResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
def add_to_favorites(
    favorite_data: FavoriteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Добавить салон в избранное"""

    # Проверка существования салона
    salon = db.query(Salon).filter(Salon.id == favorite_data.salon_id).first()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    # Создание записи в избранном
    new_favorite = Favorite(
        user_id=current_user.id,
        salon_id=favorite_data.salon_id
    )

    try:
        db.add(new_favorite)
        db.commit()
        db.refresh(new_favorite)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Salon is already in favorites"
        )

    return FavoriteResponse.model_validate(new_favorite)


@router.get("/", response_model=List[SalonResponse])
def get_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список избранных салонов"""

    favorites = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()

    salon_ids = [fav.salon_id for fav in favorites]
    salons = db.query(Salon).filter(Salon.id.in_(salon_ids)).all()

    return [SalonResponse.model_validate(salon) for salon in salons]


@router.delete("/{salon_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_favorites(
    salon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить салон из избранного"""

    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.salon_id == salon_id
    ).first()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )

    db.delete(favorite)
    db.commit()

    return None


@router.get("/check/{salon_id}", response_model=dict)
def check_favorite(
    salon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Проверить, находится ли салон в избранном"""

    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.salon_id == salon_id
    ).first()

    return {"is_favorite": favorite is not None}
