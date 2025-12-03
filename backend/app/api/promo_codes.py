from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.promo_code import PromoCode
from app.schemas.promo_code import (
    PromoCodeCreate,
    PromoCodeResponse,
    PromoCodeValidation,
    PromoCodeValidationResult,
)

router = APIRouter(prefix="/promo-codes", tags=["promo_codes"])


@router.post("", response_model=PromoCodeResponse)
def create_promo_code(
    promo_data: PromoCodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALON_OWNER])),
):
    """Create a new promo code (Admin or Salon Owner only)"""
    # Check if code already exists
    existing = db.query(PromoCode).filter(PromoCode.code == promo_data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Промокод уже существует")

    # Validate discount type
    if promo_data.discount_type not in ["percentage", "fixed"]:
        raise HTTPException(
            status_code=400, detail="Тип скидки должен быть 'percentage' или 'fixed'"
        )

    # Validate percentage range
    if promo_data.discount_type == "percentage" and (
        promo_data.discount_value < 0 or promo_data.discount_value > 100
    ):
        raise HTTPException(status_code=400, detail="Процент скидки должен быть от 0 до 100")

    promo_code = PromoCode(
        code=promo_data.code.upper(),
        salon_id=promo_data.salon_id,
        discount_type=promo_data.discount_type,
        discount_value=promo_data.discount_value,
        min_booking_amount=promo_data.min_booking_amount,
        valid_from=promo_data.valid_from or datetime.utcnow(),
        valid_until=promo_data.valid_until,
        usage_limit=promo_data.usage_limit,
    )

    db.add(promo_code)
    db.commit()
    db.refresh(promo_code)

    return promo_code


@router.post("/validate", response_model=PromoCodeValidationResult)
def validate_promo_code(
    validation: PromoCodeValidation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate a promo code and calculate discount"""
    promo = (
        db.query(PromoCode)
        .filter(PromoCode.code == validation.code.upper(), PromoCode.is_active == 1)
        .first()
    )

    if not promo:
        return PromoCodeValidationResult(
            valid=False, message="Промокод не найден или неактивен"
        )

    # Check dates
    now = datetime.utcnow()
    if promo.valid_from > now:
        return PromoCodeValidationResult(
            valid=False,
            message=f"Промокод станет активен {promo.valid_from.strftime('%d.%m.%Y')}",
        )

    if promo.valid_until and promo.valid_until < now:
        return PromoCodeValidationResult(
            valid=False, message="Промокод истек"
        )

    # Check usage limit
    if promo.usage_limit and promo.times_used >= promo.usage_limit:
        return PromoCodeValidationResult(
            valid=False, message="Достигнут лимит использования промокода"
        )

    # Check salon restriction
    if promo.salon_id and validation.salon_id != promo.salon_id:
        return PromoCodeValidationResult(
            valid=False, message="Промокод не действителен для этого салона"
        )

    # Check minimum amount
    if validation.booking_amount < promo.min_booking_amount:
        return PromoCodeValidationResult(
            valid=False,
            message=f"Минимальная сумма заказа: {promo.min_booking_amount}",
        )

    # Calculate discount
    if promo.discount_type == "percentage":
        discount_amount = validation.booking_amount * (promo.discount_value / 100)
    else:  # fixed
        discount_amount = promo.discount_value

    final_amount = max(0, validation.booking_amount - discount_amount)

    return PromoCodeValidationResult(
        valid=True,
        discount_type=promo.discount_type,
        discount_value=promo.discount_value,
        discount_amount=discount_amount,
        final_amount=final_amount,
        message="Промокод применен успешно!",
    )


@router.post("/apply/{code}")
def apply_promo_code(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply promo code (increment usage count)"""
    promo = (
        db.query(PromoCode)
        .filter(PromoCode.code == code.upper(), PromoCode.is_active == 1)
        .first()
    )

    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")

    # Check usage limit
    if promo.usage_limit and promo.times_used >= promo.usage_limit:
        raise HTTPException(status_code=400, detail="Достигнут лимит использования промокода")

    promo.times_used += 1
    db.commit()

    return {"message": "Промокод применен", "times_used": promo.times_used}


@router.get("", response_model=List[PromoCodeResponse])
def get_promo_codes(
    salon_id: int = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALON_OWNER])),
):
    """Get all promo codes (Admin or Salon Owner only)"""
    query = db.query(PromoCode)

    if active_only:
        query = query.filter(PromoCode.is_active == 1)

    if salon_id:
        query = query.filter(
            (PromoCode.salon_id == salon_id) | (PromoCode.salon_id == None)
        )

    return query.order_by(PromoCode.created_at.desc()).all()


@router.delete("/{promo_id}")
def delete_promo_code(
    promo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALON_OWNER])),
):
    """Deactivate a promo code"""
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()

    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")

    promo.is_active = 0
    db.commit()

    return {"message": "Промокод деактивирован"}
