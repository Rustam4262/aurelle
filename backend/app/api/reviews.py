from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.config import settings
from app.models.review import Review
from app.models.booking import Booking, BookingStatus
from app.models.salon import Salon
from app.models.master import Master
from app.models.user import User
from app.models.notification import Notification
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewDetailedResponse
from app.api.deps import get_current_user
from app.tasks.email_tasks import send_new_review_email
from app.websocket.notifications import send_notification_to_user, send_new_review_notification
import asyncio

router = APIRouter()


@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать отзыв на услугу"""

    # Проверка существования брони
    booking = db.query(Booking).filter(Booking.id == review_data.booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    # Проверка прав (только клиент может оставить отзыв)
    if booking.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review your own bookings"
        )

    # Проверка статуса брони (должна быть завершена)
    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking must be completed to leave a review"
        )

    # Проверка на дубликат
    existing_review = db.query(Review).filter(Review.booking_id == review_data.booking_id).first()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review already exists for this booking"
        )

    # Создание отзыва
    new_review = Review(
        booking_id=review_data.booking_id,
        client_id=current_user.id,
        salon_id=booking.salon_id,
        master_id=booking.master_id,
        rating=review_data.rating,
        comment=review_data.comment
    )

    db.add(new_review)

    # Обновление рейтинга салона
    salon = db.query(Salon).filter(Salon.id == booking.salon_id).first()
    salon_reviews = db.query(Review).filter(Review.salon_id == salon.id).all()
    total_rating = sum([r.rating for r in salon_reviews]) + review_data.rating
    salon.rating = total_rating / (len(salon_reviews) + 1)
    salon.reviews_count = len(salon_reviews) + 1

    # Обновление рейтинга мастера
    master = db.query(Master).filter(Master.id == booking.master_id).first()
    master_reviews = db.query(Review).filter(Review.master_id == master.id).all()
    total_master_rating = sum([r.rating for r in master_reviews]) + review_data.rating
    master.rating = total_master_rating / (len(master_reviews) + 1)
    master.reviews_count = len(master_reviews) + 1

    db.commit()
    db.refresh(new_review)

    # Отправить уведомление владельцу салона о новом отзыве
    if salon and salon.owner_id:
        # Подготовить данные для email
        review_email_data = {
            "salon_owner_name": salon.owner.name if salon.owner else "Владелец",
            "salon_name": salon.name,
            "rating": review_data.rating,
            "comment": review_data.comment or "",
            "client_name": current_user.name,
            "service_name": booking.service.name if booking.service else "",
            "master_name": master.name if master else "",
            "review_date": new_review.created_at.strftime("%d.%m.%Y %H:%M")
        }

        # Отправить email владельцу салона
        if settings.EMAIL_ENABLED and salon.owner and salon.owner.email:
            send_new_review_email.delay(salon.owner.email, review_email_data)

        # Создать уведомление в БД
        notification = Notification(
            user_id=salon.owner_id,
            type="review",
            title=f"Новый отзыв ({review_data.rating}⭐)",
            message=f"Новый отзыв на салон {salon.name}: {review_data.rating} звезд"
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Отправить WebSocket уведомления
        try:
            asyncio.create_task(
                send_new_review_notification(
                    salon.owner_id,
                    new_review.id,
                    salon.id,
                    review_data.rating
                )
            )
            asyncio.create_task(
                send_notification_to_user(salon.owner_id, notification, db)
            )
        except:
            pass  # WebSocket notification is optional

    return ReviewResponse.model_validate(new_review)


@router.get("/", response_model=List[ReviewResponse])
def get_reviews(
    db: Session = Depends(get_db),
    salon_id: Optional[int] = None,
    master_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Получить список отзывов"""

    query = db.query(Review)

    if salon_id:
        query = query.filter(Review.salon_id == salon_id)

    if master_id:
        query = query.filter(Review.master_id == master_id)

    reviews = query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()

    return [ReviewResponse.model_validate(review) for review in reviews]


@router.get("/{review_id}", response_model=ReviewResponse)
def get_review(review_id: int, db: Session = Depends(get_db)):
    """Получить отзыв по ID"""

    review = db.query(Review).filter(Review.id == review_id).first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    return ReviewResponse.model_validate(review)


@router.get("/detailed/all", response_model=List[ReviewDetailedResponse])
def get_reviews_detailed(
    db: Session = Depends(get_db),
    salon_id: Optional[int] = None,
    master_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Получить список отзывов с детальной информацией о клиентах"""

    query = db.query(Review)

    if salon_id:
        query = query.filter(Review.salon_id == salon_id)

    if master_id:
        query = query.filter(Review.master_id == master_id)

    reviews = query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()

    # Формируем детальные ответы с вложенными объектами
    detailed_reviews = []
    for review in reviews:
        review_dict = ReviewDetailedResponse.model_validate(review).model_dump()

        # Добавляем информацию о клиенте
        client = db.query(User).filter(User.id == review.client_id).first()
        if client:
            review_dict['client'] = {
                'id': client.id,
                'name': client.name,
                'email': client.email
            }

        detailed_reviews.append(ReviewDetailedResponse(**review_dict))

    return detailed_reviews
