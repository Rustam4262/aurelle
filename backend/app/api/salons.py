from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.models.salon import Salon
from app.models.user import User, UserRole
from app.schemas.salon import SalonCreate, SalonResponse, SalonUpdate
from app.api.deps import get_current_user, require_role
from math import radians, cos, sin, asin, sqrt

router = APIRouter()


def haversine(lon1, lat1, lon2, lat2):
    """Рассчитать расстояние между двумя точками (в км)"""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    km = 6371 * c
    return km


@router.post("/", response_model=SalonResponse, status_code=status.HTTP_201_CREATED)
def create_salon(
    salon_data: SalonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SALON_OWNER, UserRole.ADMIN]))
):
    """Создать новый салон"""

    new_salon = Salon(
        owner_id=current_user.id,
        **salon_data.model_dump()
    )

    db.add(new_salon)
    db.commit()
    db.refresh(new_salon)

    return SalonResponse.model_validate(new_salon)


@router.get("/", response_model=List[SalonResponse])
def get_salons(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    city: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = Query(None, ge=0, le=50),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    search: Optional[str] = None
):
    """Получить список салонов с фильтрами"""

    query = db.query(Salon).filter(Salon.is_active == True)

    # Поиск по названию
    if search:
        query = query.filter(Salon.name.ilike(f"%{search}%"))

    # Фильтр по рейтингу
    if min_rating:
        query = query.filter(Salon.rating >= min_rating)

    salons = query.offset(skip).limit(limit).all()

    # Фильтр по радиусу (если указаны координаты)
    if latitude and longitude and radius_km:
        filtered_salons = []
        for salon in salons:
            if salon.latitude and salon.longitude:
                distance = haversine(longitude, latitude, salon.longitude, salon.latitude)
                if distance <= radius_km:
                    filtered_salons.append(salon)
        salons = filtered_salons

    return [SalonResponse.model_validate(salon) for salon in salons]


@router.get("/{salon_id}", response_model=SalonResponse)
def get_salon(salon_id: int, db: Session = Depends(get_db)):
    """Получить салон по ID"""

    salon = db.query(Salon).filter(Salon.id == salon_id).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    return SalonResponse.model_validate(salon)


@router.patch("/{salon_id}", response_model=SalonResponse)
def update_salon(
    salon_id: int,
    salon_data: SalonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить салон"""

    salon = db.query(Salon).filter(Salon.id == salon_id).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    # Проверка прав доступа
    if salon.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Обновление полей
    for field, value in salon_data.model_dump(exclude_unset=True).items():
        setattr(salon, field, value)

    db.commit()
    db.refresh(salon)

    return SalonResponse.model_validate(salon)


@router.delete("/{salon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salon(
    salon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Удалить салон (только админ)"""

    salon = db.query(Salon).filter(Salon.id == salon_id).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found"
        )

    db.delete(salon)
    db.commit()

    return None
