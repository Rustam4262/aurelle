from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.service import Service
from app.models.salon import Salon
from app.models.user import User, UserRole
from app.schemas.service import ServiceCreate, ServiceResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    service_data: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новую услугу"""

    # Проверка существования салона
    salon = db.query(Salon).filter(Salon.id == service_data.salon_id).first()
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

    new_service = Service(**service_data.model_dump())
    db.add(new_service)
    db.commit()
    db.refresh(new_service)

    return ServiceResponse.model_validate(new_service)


@router.get("/", response_model=List[ServiceResponse])
def get_services(
    db: Session = Depends(get_db),
    salon_id: Optional[int] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Получить список услуг с фильтрами"""

    query = db.query(Service).filter(Service.is_active == True)

    if salon_id:
        query = query.filter(Service.salon_id == salon_id)

    if category:
        query = query.filter(Service.category == category)

    if min_price:
        query = query.filter(Service.price >= min_price)

    if max_price:
        query = query.filter(Service.price <= max_price)

    services = query.offset(skip).limit(limit).all()

    return [ServiceResponse.model_validate(service) for service in services]


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(service_id: int, db: Session = Depends(get_db)):
    """Получить услугу по ID"""

    service = db.query(Service).filter(Service.id == service_id).first()

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )

    return ServiceResponse.model_validate(service)


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить услугу"""

    service = db.query(Service).filter(Service.id == service_id).first()

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )

    # Проверка прав
    salon = db.query(Salon).filter(Salon.id == service.salon_id).first()
    if salon.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    db.delete(service)
    db.commit()

    return None
