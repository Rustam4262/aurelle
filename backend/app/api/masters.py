from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.master import Master
from app.models.salon import Salon
from app.models.user import User, UserRole
from app.schemas.master import MasterCreate, MasterResponse, MasterUpdate
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=MasterResponse, status_code=status.HTTP_201_CREATED)
def create_master(
    master_data: MasterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать нового мастера"""

    # Проверка существования салона
    salon = db.query(Salon).filter(Salon.id == master_data.salon_id).first()
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

    new_master = Master(**master_data.model_dump())
    db.add(new_master)
    db.commit()
    db.refresh(new_master)

    return MasterResponse.model_validate(new_master)


@router.get("/", response_model=List[MasterResponse])
def get_masters(
    db: Session = Depends(get_db),
    salon_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Получить список мастеров"""

    query = db.query(Master).filter(Master.is_active == True)

    if salon_id:
        query = query.filter(Master.salon_id == salon_id)

    masters = query.offset(skip).limit(limit).all()

    return [MasterResponse.model_validate(master) for master in masters]


@router.get("/{master_id}", response_model=MasterResponse)
def get_master(master_id: int, db: Session = Depends(get_db)):
    """Получить мастера по ID"""

    master = db.query(Master).filter(Master.id == master_id).first()

    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master not found"
        )

    return MasterResponse.model_validate(master)


@router.patch("/{master_id}", response_model=MasterResponse)
def update_master(
    master_id: int,
    master_data: MasterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить мастера"""

    master = db.query(Master).filter(Master.id == master_id).first()

    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master not found"
        )

    # Проверка прав
    salon = db.query(Salon).filter(Salon.id == master.salon_id).first()
    if salon.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Обновление полей
    for field, value in master_data.model_dump(exclude_unset=True).items():
        setattr(master, field, value)

    db.commit()
    db.refresh(master)

    return MasterResponse.model_validate(master)


@router.delete("/{master_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_master(
    master_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить мастера"""

    master = db.query(Master).filter(Master.id == master_id).first()

    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master not found"
        )

    # Проверка прав
    salon = db.query(Salon).filter(Salon.id == master.salon_id).first()
    if salon.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    db.delete(master)
    db.commit()

    return None
