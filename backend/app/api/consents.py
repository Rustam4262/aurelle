from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.user_consent import UserConsent, ConsentHistory, ConsentType, ConsentStatus
from app.schemas.consent import (
    ConsentCreate,
    ConsentUpdate,
    ConsentResponse,
    ConsentStatusCheck,
    ConsentHistoryResponse,
    ConsentPreferences
)

router = APIRouter()


@router.post("/", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
def create_consent(
    consent_data: ConsentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Создать новое согласие

    Используется когда пользователь дает новое согласие
    (например, включает маркетинговые email в настройках)
    """

    # Проверить, не существует ли уже активное согласие
    existing = db.query(UserConsent).filter(
        and_(
            UserConsent.user_id == current_user.id,
            UserConsent.consent_type == consent_data.consent_type,
            UserConsent.status == ConsentStatus.GRANTED
        )
    ).first()

    if existing and existing.is_active():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Active consent already exists for {consent_data.consent_type}"
        )

    # Получить IP и User-Agent из запроса, если не переданы
    ip_address = consent_data.ip_address or (request.client.host if request.client else None)
    user_agent = consent_data.user_agent or request.headers.get("user-agent")

    # Создать согласие
    consent = UserConsent(
        user_id=current_user.id,
        consent_type=consent_data.consent_type,
        status=ConsentStatus.GRANTED,
        document_version=consent_data.document_version,
        granted_at=datetime.now(timezone.utc),
        ip_address=ip_address,
        user_agent=user_agent,
        consent_method=consent_data.consent_method
    )

    db.add(consent)

    # Записать в историю
    history = ConsentHistory(
        user_id=current_user.id,
        consent_type=consent_data.consent_type,
        action="granted",
        timestamp=datetime.now(timezone.utc),
        ip_address=ip_address,
        user_agent=user_agent,
        document_version=consent_data.document_version
    )
    db.add(history)

    db.commit()
    db.refresh(consent)

    # Добавить вычисляемое поле is_active
    consent_dict = consent.__dict__.copy()
    consent_dict['is_active'] = consent.is_active()

    return ConsentResponse(**consent_dict)


@router.get("/", response_model=List[ConsentResponse])
def get_user_consents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получить все согласия текущего пользователя

    Для отображения в личном кабинете
    """
    consents = db.query(UserConsent).filter(
        UserConsent.user_id == current_user.id
    ).all()

    # Добавить is_active для каждого
    result = []
    for consent in consents:
        consent_dict = consent.__dict__.copy()
        consent_dict['is_active'] = consent.is_active()
        result.append(ConsentResponse(**consent_dict))

    return result


@router.get("/status", response_model=ConsentStatusCheck)
def check_consent_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Проверить статус всех согласий пользователя

    Показывает:
    - Есть ли все обязательные согласия
    - Какие опциональные согласия активны
    - Что отсутствует
    """

    # Получить все активные согласия
    active_consents = db.query(UserConsent).filter(
        and_(
            UserConsent.user_id == current_user.id,
            UserConsent.status == ConsentStatus.GRANTED
        )
    ).all()

    active_types = [c.consent_type for c in active_consents if c.is_active()]

    # Проверить обязательные
    required = UserConsent.get_required_consents()
    missing_required = [ct for ct in required if ct not in active_types]
    has_required = len(missing_required) == 0

    # Проверить опциональные
    optional = UserConsent.get_optional_consents()
    optional_status = {ct: (ct in active_types) for ct in optional}

    return ConsentStatusCheck(
        user_id=current_user.id,
        has_required_consents=has_required,
        active_consents=active_types,
        missing_required_consents=missing_required,
        optional_consents=optional_status
    )


@router.put("/{consent_type}", response_model=ConsentResponse)
def update_consent(
    consent_type: ConsentType,
    consent_update: ConsentUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Обновить согласие (обычно для отзыва)

    Используется когда пользователь отзывает согласие
    """

    # Найти активное согласие
    consent = db.query(UserConsent).filter(
        and_(
            UserConsent.user_id == current_user.id,
            UserConsent.consent_type == consent_type,
            UserConsent.status == ConsentStatus.GRANTED
        )
    ).first()

    if not consent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active consent found for {consent_type}"
        )

    # Проверить, что не пытаются отозвать обязательное согласие
    if consent_type in UserConsent.get_required_consents() and consent_update.status == ConsentStatus.REVOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot revoke required consent: {consent_type}. You must delete your account instead."
        )

    # Обновить статус
    old_status = consent.status
    consent.status = consent_update.status

    if consent_update.status == ConsentStatus.REVOKED:
        consent.revoked_at = datetime.now(timezone.utc)

    # Записать в историю
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    history = ConsentHistory(
        user_id=current_user.id,
        consent_type=consent_type,
        action=f"updated: {old_status} -> {consent_update.status}",
        timestamp=datetime.now(timezone.utc),
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(history)

    db.commit()
    db.refresh(consent)

    consent_dict = consent.__dict__.copy()
    consent_dict['is_active'] = consent.is_active()

    return ConsentResponse(**consent_dict)


@router.delete("/{consent_type}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_consent(
    consent_type: ConsentType,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Отозвать согласие (алиас для PUT с status=REVOKED)

    Более понятный endpoint для пользователей
    """

    # Использовать ту же логику, что и update
    update_data = ConsentUpdate(status=ConsentStatus.REVOKED)
    update_consent(consent_type, update_data, request, current_user, db)

    return None


@router.get("/history", response_model=List[ConsentHistoryResponse])
def get_consent_history(
    consent_type: ConsentType = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получить историю изменений согласий

    Опционально можно фильтровать по типу согласия
    """

    query = db.query(ConsentHistory).filter(
        ConsentHistory.user_id == current_user.id
    )

    if consent_type:
        query = query.filter(ConsentHistory.consent_type == consent_type)

    history = query.order_by(ConsentHistory.timestamp.desc()).all()

    return [ConsentHistoryResponse.model_validate(h) for h in history]


@router.post("/preferences", response_model=dict)
def update_consent_preferences(
    preferences: ConsentPreferences,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Массовое обновление настроек согласий

    Удобный endpoint для страницы настроек в личном кабинете
    """

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    # Маппинг preferences на consent types
    preference_mapping = {
        'marketing_emails': ConsentType.MARKETING_EMAILS,
        'marketing_sms': ConsentType.MARKETING_SMS,
        'marketing_push': ConsentType.MARKETING_PUSH,
        'cookies_functional': ConsentType.COOKIES_FUNCTIONAL,
        'cookies_analytics': ConsentType.COOKIES_ANALYTICS,
        'cookies_marketing': ConsentType.COOKIES_MARKETING,
        'geolocation': ConsentType.GEOLOCATION,
        'third_party_sharing': ConsentType.THIRD_PARTY_SHARING,
    }

    updated = []
    errors = []

    for pref_name, consent_type in preference_mapping.items():
        should_be_active = getattr(preferences, pref_name)

        # Найти существующее согласие
        existing = db.query(UserConsent).filter(
            and_(
                UserConsent.user_id == current_user.id,
                UserConsent.consent_type == consent_type
            )
        ).first()

        try:
            if should_be_active:
                # Нужно активировать
                if not existing or not existing.is_active():
                    # Создать новое согласие
                    consent = UserConsent(
                        user_id=current_user.id,
                        consent_type=consent_type,
                        status=ConsentStatus.GRANTED,
                        granted_at=datetime.now(timezone.utc),
                        ip_address=ip_address,
                        user_agent=user_agent,
                        consent_method="web"
                    )
                    db.add(consent)

                    # История
                    history = ConsentHistory(
                        user_id=current_user.id,
                        consent_type=consent_type,
                        action="granted",
                        timestamp=datetime.now(timezone.utc),
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    db.add(history)

                    updated.append(f"{consent_type}: granted")

            else:
                # Нужно отозвать
                if existing and existing.is_active():
                    existing.status = ConsentStatus.REVOKED
                    existing.revoked_at = datetime.now(timezone.utc)

                    # История
                    history = ConsentHistory(
                        user_id=current_user.id,
                        consent_type=consent_type,
                        action="revoked",
                        timestamp=datetime.now(timezone.utc),
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    db.add(history)

                    updated.append(f"{consent_type}: revoked")

        except Exception as e:
            errors.append(f"{consent_type}: {str(e)}")

    db.commit()

    return {
        "message": "Preferences updated",
        "updated": updated,
        "errors": errors if errors else None
    }


@router.get("/export", response_model=dict)
def export_user_consents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Экспорт всех данных о согласиях пользователя

    Для выполнения права на доступ к данным (GDPR Article 15)
    """

    consents = db.query(UserConsent).filter(
        UserConsent.user_id == current_user.id
    ).all()

    history = db.query(ConsentHistory).filter(
        ConsentHistory.user_id == current_user.id
    ).order_by(ConsentHistory.timestamp.desc()).all()

    return {
        "user_id": current_user.id,
        "export_timestamp": datetime.now(timezone.utc).isoformat(),
        "consents": [
            {
                "type": c.consent_type,
                "status": c.status,
                "granted_at": c.granted_at.isoformat(),
                "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None,
                "is_active": c.is_active(),
                "document_version": c.document_version
            }
            for c in consents
        ],
        "history": [
            {
                "type": h.consent_type,
                "action": h.action,
                "timestamp": h.timestamp.isoformat(),
                "ip_address": h.ip_address,
                "document_version": h.document_version
            }
            for h in history
        ]
    }
