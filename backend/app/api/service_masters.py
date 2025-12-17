from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.service import ServiceMaster, Service
from app.models.master import Master
from app.models.salon import Salon
from app.api.deps import get_current_user
from pydantic import BaseModel

router = APIRouter()


class ServiceMasterCreate(BaseModel):
    service_id: int
    master_id: int


class ServiceMasterResponse(BaseModel):
    id: int
    service_id: int
    master_id: int

    class Config:
        from_attributes = True


class MasterWithServices(BaseModel):
    id: int
    name: str  # FIXED: name should be str, not int
    service_ids: List[int]

    class Config:
        from_attributes = True


@router.post("/", response_model=ServiceMasterResponse, status_code=status.HTTP_201_CREATED)
def create_service_master_link(
    data: ServiceMasterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать связь услуги и мастера"""

    # Проверка прав доступа
    if current_user.role not in [UserRole.SALON_OWNER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Проверка существования услуги
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )

    # Проверка существования мастера
    master = db.query(Master).filter(Master.id == data.master_id).first()
    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master not found"
        )

    # Проверка, что услуга и мастер принадлежат одному салону
    if service.salon_id != master.salon_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service and master must belong to the same salon"
        )

    # Проверка прав владельца салона
    if current_user.role == UserRole.SALON_OWNER:
        salon = db.query(Salon).filter(Salon.id == service.salon_id).first()
        if not salon or salon.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

    # Проверка, что связь не существует
    existing = db.query(ServiceMaster).filter(
        ServiceMaster.service_id == data.service_id,
        ServiceMaster.master_id == data.master_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link already exists"
        )

    # Создание связи
    service_master = ServiceMaster(
        service_id=data.service_id,
        master_id=data.master_id
    )

    db.add(service_master)
    db.commit()
    db.refresh(service_master)

    return ServiceMasterResponse.model_validate(service_master)


@router.delete("/{service_master_id}")
def delete_service_master_link(
    service_master_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить связь услуги и мастера"""

    # Проверка прав доступа
    if current_user.role not in [UserRole.SALON_OWNER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Поиск связи
    service_master = db.query(ServiceMaster).filter(
        ServiceMaster.id == service_master_id
    ).first()

    if not service_master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )

    # Проверка прав владельца салона
    if current_user.role == UserRole.SALON_OWNER:
        service = db.query(Service).filter(Service.id == service_master.service_id).first()
        salon = db.query(Salon).filter(Salon.id == service.salon_id).first()
        if not salon or salon.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

    db.delete(service_master)
    db.commit()

    return {"message": "Link deleted successfully"}


@router.get("/service/{service_id}/masters")
def get_masters_by_service(
    service_id: int,
    db: Session = Depends(get_db)
):
    """Получить список мастеров, предоставляющих услугу (MVP: returns full master objects)"""

    links = db.query(ServiceMaster).filter(
        ServiceMaster.service_id == service_id
    ).all()

    master_ids = [link.master_id for link in links]

    if not master_ids:
        return {"items": []}

    masters = db.query(Master).filter(Master.id.in_(master_ids), Master.is_active == True).all()

    # MVP FIX: Return minimal fields like /api/masters endpoint
    return {
        "items": [
            {
                "id": m.id,
                "salon_id": m.salon_id,
                "name": m.name,
                "phone": m.phone,
                "specialization": m.specialization,
                "is_active": m.is_active,
            }
            for m in masters
        ]
    }


@router.get("/master/{master_id}/services", response_model=List[int])
def get_services_by_master(
    master_id: int,
    db: Session = Depends(get_db)
):
    """Получить список ID услуг, которые предоставляет мастер"""

    links = db.query(ServiceMaster).filter(
        ServiceMaster.master_id == master_id
    ).all()

    return [link.service_id for link in links]


@router.post("/service/{service_id}/masters/bulk")
def update_service_masters(
    service_id: int,
    master_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить список мастеров для услуги (заменить все существующие связи)"""

    # Проверка прав доступа
    if current_user.role not in [UserRole.SALON_OWNER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Проверка существования услуги
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )

    # Проверка прав владельца салона
    if current_user.role == UserRole.SALON_OWNER:
        salon = db.query(Salon).filter(Salon.id == service.salon_id).first()
        if not salon or salon.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

    # Удаление всех существующих связей
    db.query(ServiceMaster).filter(
        ServiceMaster.service_id == service_id
    ).delete()

    # Создание новых связей
    for master_id in master_ids:
        # Проверка существования мастера и принадлежности к салону
        master = db.query(Master).filter(Master.id == master_id).first()
        if not master:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Master with id {master_id} not found"
            )

        if master.salon_id != service.salon_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Master {master_id} does not belong to the same salon"
            )

        service_master = ServiceMaster(
            service_id=service_id,
            master_id=master_id
        )
        db.add(service_master)

    db.commit()

    return {"message": "Service masters updated successfully", "master_ids": master_ids}
