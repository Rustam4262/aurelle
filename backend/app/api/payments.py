from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import datetime, timezone
import hashlib
import hmac

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus as PaymentStatusModel, PaymentMethod as PaymentMethodModel
from app.models.payment import PaymeTransaction, ClickTransaction
from app.schemas.payment import (
    PaymentCreate, PaymentResponse, PaymentStatusUpdate, PaymentRefund,
    PaymeRequest, PaymeResponse, PaymeError,
    ClickRequest, ClickResponse,
    UzumPaymentRequest, UzumCallbackRequest, UzumCallbackResponse
)
from app.core.config import settings

router = APIRouter()


# Вспомогательные функции
def calculate_commission(amount: float, payment_method: PaymentMethodModel) -> float:
    """Рассчитать комиссию платежной системы"""
    commission_rates = {
        PaymentMethodModel.PAYME: 0.02,  # 2%
        PaymentMethodModel.CLICK: 0.02,  # 2%
        PaymentMethodModel.UZUM: 0.025,  # 2.5%
        PaymentMethodModel.CASH: 0.0,    # 0%
        PaymentMethodModel.CARD: 0.015,  # 1.5%
    }
    rate = commission_rates.get(payment_method, 0.02)
    return round(amount * rate, 2)


def verify_payme_signature(request_data: dict) -> bool:
    """Проверить подпись Payme"""
    # TODO: Реализовать проверку подписи Payme
    # Требуется PAYME_SECRET_KEY из настроек
    return True


def verify_click_signature(request: ClickRequest) -> bool:
    """Проверить подпись Click"""
    # TODO: Реализовать проверку подписи Click
    # sign_string = MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
    return True


# Основные endpoints
@router.post("/create", response_model=PaymentResponse)
def create_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать новый платеж"""

    # Проверить существование бронирования
    booking = db.query(Booking).filter(Booking.id == payment_data.booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено"
        )

    # Проверить права доступа
    if booking.client_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для создания платежа"
        )

    # Проверить, что бронирование не оплачено
    existing_payment = db.query(Payment).filter(
        and_(
            Payment.booking_id == payment_data.booking_id,
            Payment.status.in_([PaymentStatusModel.COMPLETED, PaymentStatusModel.PROCESSING])
        )
    ).first()

    if existing_payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Бронирование уже оплачено или в процессе оплаты"
        )

    # Рассчитать комиссию
    commission = calculate_commission(payment_data.amount, payment_data.payment_method)
    net_amount = payment_data.amount - commission

    # Создать платеж
    payment = Payment(
        booking_id=payment_data.booking_id,
        amount=payment_data.amount,
        currency=payment_data.currency,
        payment_method=payment_data.payment_method,
        status=PaymentStatusModel.PENDING,
        commission_amount=commission,
        net_amount=net_amount
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить информацию о платеже"""

    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платеж не найден"
        )

    # Проверить права доступа
    booking = payment.booking
    if booking.client_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.SALON_OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для просмотра платежа"
        )

    return payment


@router.get("/booking/{booking_id}", response_model=List[PaymentResponse])
def get_booking_payments(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить все платежи по бронированию"""

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено"
        )

    # Проверить права доступа
    if booking.client_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.SALON_OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для просмотра платежей"
        )

    payments = db.query(Payment).filter(Payment.booking_id == booking_id).all()
    return payments


@router.post("/{payment_id}/refund", response_model=PaymentResponse)
def refund_payment(
    payment_id: int,
    refund_data: PaymentRefund,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Возврат средств"""

    # Только админ или владелец салона может делать возврат
    if current_user.role not in [UserRole.ADMIN, UserRole.SALON_OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для возврата средств"
        )

    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платеж не найден"
        )

    # Проверить, что платеж завершен
    if payment.status != PaymentStatusModel.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Можно вернуть только завершенные платежи"
        )

    # Обновить статус
    payment.status = PaymentStatusModel.REFUNDED
    payment.refunded_at = datetime.now(timezone.utc)
    payment.error_message = refund_data.reason

    # Обновить статус бронирования
    booking = payment.booking
    booking.status = BookingStatus.CANCELLED

    db.commit()
    db.refresh(payment)

    return payment


# Payme webhook
@router.post("/payme/callback", response_model=PaymeResponse)
def payme_callback(
    request: PaymeRequest,
    db: Session = Depends(get_db)
):
    """Webhook для Payme"""

    try:
        method = request.method
        params = request.params

        if method == "CheckPerformTransaction":
            # Проверить возможность выполнения транзакции
            booking_id = params.account.booking_id if params.account else None
            if not booking_id:
                return PaymeResponse(error=PaymeError(code=-31050, message="Booking ID not provided"))

            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                return PaymeResponse(error=PaymeError(code=-31050, message="Booking not found"))

            return PaymeResponse(result={"allow": True})

        elif method == "CreateTransaction":
            # Создать транзакцию
            payme_trans_id = params.id
            amount = params.amount / 100  # Payme передает в тиинах
            booking_id = params.account.booking_id if params.account else None

            # Найти или создать платеж
            payment = db.query(Payment).filter(Payment.booking_id == booking_id).first()
            if not payment:
                return PaymeResponse(error=PaymeError(code=-31050, message="Payment not found"))

            # Создать Payme транзакцию
            payme_transaction = PaymeTransaction(
                payment_id=payment.id,
                payme_transaction_id=payme_trans_id,
                payme_time=params.time,
                create_time=params.time,
                amount=amount,
                state=1  # Created
            )
            db.add(payme_transaction)

            payment.status = PaymentStatusModel.PROCESSING
            payment.transaction_id = payme_trans_id

            db.commit()

            return PaymeResponse(result={
                "create_time": params.time,
                "transaction": str(payme_transaction.id),
                "state": 1
            })

        elif method == "PerformTransaction":
            # Выполнить транзакцию
            payme_trans_id = params.id
            payme_transaction = db.query(PaymeTransaction).filter(
                PaymeTransaction.payme_transaction_id == payme_trans_id
            ).first()

            if not payme_transaction:
                return PaymeResponse(error=PaymeError(code=-31003, message="Transaction not found"))

            payme_transaction.state = 2  # Completed
            payme_transaction.perform_time = params.time

            payment = db.query(Payment).filter(Payment.id == payme_transaction.payment_id).first()
            payment.status = PaymentStatusModel.COMPLETED
            payment.paid_at = datetime.now(timezone.utc)

            # Обновить статус бронирования
            booking = payment.booking
            booking.status = BookingStatus.CONFIRMED

            db.commit()

            return PaymeResponse(result={
                "transaction": str(payme_transaction.id),
                "perform_time": params.time,
                "state": 2
            })

        elif method == "CancelTransaction":
            # Отменить транзакцию
            payme_trans_id = params.id
            payme_transaction = db.query(PaymeTransaction).filter(
                PaymeTransaction.payme_transaction_id == payme_trans_id
            ).first()

            if not payme_transaction:
                return PaymeResponse(error=PaymeError(code=-31003, message="Transaction not found"))

            payme_transaction.state = -1  # Cancelled
            payme_transaction.cancel_time = params.time
            payme_transaction.reason = params.reason

            payment = db.query(Payment).filter(Payment.id == payme_transaction.payment_id).first()
            payment.status = PaymentStatusModel.CANCELLED

            db.commit()

            return PaymeResponse(result={
                "transaction": str(payme_transaction.id),
                "cancel_time": params.time,
                "state": -1
            })

        elif method == "CheckTransaction":
            # Проверить статус транзакции
            payme_trans_id = params.id
            payme_transaction = db.query(PaymeTransaction).filter(
                PaymeTransaction.payme_transaction_id == payme_trans_id
            ).first()

            if not payme_transaction:
                return PaymeResponse(error=PaymeError(code=-31003, message="Transaction not found"))

            return PaymeResponse(result={
                "create_time": payme_transaction.create_time,
                "perform_time": payme_transaction.perform_time,
                "cancel_time": payme_transaction.cancel_time,
                "transaction": str(payme_transaction.id),
                "state": payme_transaction.state,
                "reason": payme_transaction.reason
            })

        else:
            return PaymeResponse(error=PaymeError(code=-32601, message="Method not found"))

    except Exception as e:
        return PaymeResponse(error=PaymeError(code=-31008, message=str(e)))


# Click webhook
@router.post("/click/callback", response_model=ClickResponse)
def click_callback(
    request: ClickRequest,
    db: Session = Depends(get_db)
):
    """Webhook для Click"""

    try:
        # Проверить подпись (TODO: реализовать проверку)
        # if not verify_click_signature(request):
        #     return ClickResponse(
        #         click_trans_id=request.click_trans_id,
        #         merchant_trans_id=request.merchant_trans_id,
        #         error=-1,
        #         error_note="Invalid signature"
        #     )

        booking_id = int(request.merchant_trans_id)

        if request.action == 0:
            # Prepare - проверить возможность оплаты
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                return ClickResponse(
                    click_trans_id=request.click_trans_id,
                    merchant_trans_id=request.merchant_trans_id,
                    error=-5,
                    error_note="Booking not found"
                )

            payment = db.query(Payment).filter(Payment.booking_id == booking_id).first()
            if not payment:
                return ClickResponse(
                    click_trans_id=request.click_trans_id,
                    merchant_trans_id=request.merchant_trans_id,
                    error=-5,
                    error_note="Payment not found"
                )

            # Создать Click транзакцию
            click_transaction = ClickTransaction(
                payment_id=payment.id,
                click_trans_id=request.click_trans_id,
                click_paydoc_id=request.click_paydoc_id,
                merchant_trans_id=request.merchant_trans_id,
                amount=request.amount,
                action=request.action,
                error=0,
                sign_time=datetime.fromisoformat(request.sign_time)
            )
            db.add(click_transaction)
            db.commit()

            return ClickResponse(
                click_trans_id=request.click_trans_id,
                merchant_trans_id=request.merchant_trans_id,
                merchant_confirm_id=click_transaction.id,
                error=0,
                error_note="Success"
            )

        elif request.action == 1:
            # Complete - выполнить оплату
            click_transaction = db.query(ClickTransaction).filter(
                ClickTransaction.click_trans_id == request.click_trans_id
            ).first()

            if not click_transaction:
                return ClickResponse(
                    click_trans_id=request.click_trans_id,
                    merchant_trans_id=request.merchant_trans_id,
                    error=-6,
                    error_note="Transaction not found"
                )

            click_transaction.action = 1
            click_transaction.error = 0

            payment = db.query(Payment).filter(Payment.id == click_transaction.payment_id).first()
            payment.status = PaymentStatusModel.COMPLETED
            payment.paid_at = datetime.now(timezone.utc)
            payment.transaction_id = request.click_trans_id

            # Обновить статус бронирования
            booking = payment.booking
            booking.status = BookingStatus.CONFIRMED

            db.commit()

            return ClickResponse(
                click_trans_id=request.click_trans_id,
                merchant_trans_id=request.merchant_trans_id,
                merchant_confirm_id=click_transaction.id,
                error=0,
                error_note="Success"
            )

        else:
            return ClickResponse(
                click_trans_id=request.click_trans_id,
                merchant_trans_id=request.merchant_trans_id,
                error=-3,
                error_note="Invalid action"
            )

    except Exception as e:
        return ClickResponse(
            click_trans_id=request.click_trans_id,
            merchant_trans_id=request.merchant_trans_id,
            error=-9,
            error_note=str(e)
        )


# Uzum webhook (базовая реализация)
@router.post("/uzum/init")
def uzum_init_payment(
    request: UzumPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Инициализация платежа через Uzum"""
    # TODO: Реализовать интеграцию с Uzum API
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Uzum integration is not yet implemented"
    )


@router.post("/uzum/callback", response_model=UzumCallbackResponse)
def uzum_callback(
    request: UzumCallbackRequest,
    db: Session = Depends(get_db)
):
    """Webhook для Uzum"""
    # TODO: Реализовать обработку callback от Uzum
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Uzum integration is not yet implemented"
    )
