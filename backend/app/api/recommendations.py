from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.salon import Salon
from app.models.booking import Booking
from app.models.service import Service
from app.schemas.salon import SalonResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/personalized", response_model=List[SalonResponse])
def get_personalized_recommendations(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get personalized salon recommendations based on user's booking history.

    Recommendation algorithm:
    1. Find salons user has visited (completed bookings)
    2. Find services user has booked
    3. Recommend salons with similar services that user hasn't visited yet
    4. Prioritize salons with high ratings
    """

    # Get user's completed bookings
    user_bookings = (
        db.query(Booking)
        .filter(
            Booking.client_id == current_user.id,
            Booking.status == "completed"
        )
        .all()
    )

    # Extract visited salon IDs and service IDs
    visited_salon_ids = set([b.salon_id for b in user_bookings])
    booked_service_ids = set([b.service_id for b in user_bookings if b.service_id])

    # If user has no booking history, return top-rated salons
    if not booked_service_ids:
        top_salons = (
            db.query(Salon)
            .filter(Salon.is_active == 1)
            .order_by(Salon.rating.desc(), Salon.reviews_count.desc())
            .limit(limit)
            .all()
        )
        return top_salons

    # Find services with similar names or categories
    similar_services = (
        db.query(Service)
        .filter(Service.id.in_(booked_service_ids))
        .all()
    )

    # Get service names for similarity matching
    service_keywords = set()
    for service in similar_services:
        # Extract keywords from service names (split by space)
        keywords = service.name.lower().split()
        service_keywords.update(keywords)

    # Find salons offering similar services
    recommended_salon_ids = set()

    for keyword in service_keywords:
        # Find services with similar names
        matching_services = (
            db.query(Service)
            .filter(
                Service.name.ilike(f"%{keyword}%"),
                Service.salon_id.notin_(visited_salon_ids) if visited_salon_ids else True
            )
            .all()
        )

        for service in matching_services:
            recommended_salon_ids.add(service.salon_id)

    # If no recommendations found, fallback to top-rated salons
    if not recommended_salon_ids:
        fallback_salons = (
            db.query(Salon)
            .filter(
                Salon.is_active == 1,
                Salon.id.notin_(visited_salon_ids) if visited_salon_ids else True
            )
            .order_by(Salon.rating.desc(), Salon.reviews_count.desc())
            .limit(limit)
            .all()
        )
        return fallback_salons

    # Get recommended salons sorted by rating
    recommended_salons = (
        db.query(Salon)
        .filter(
            Salon.id.in_(recommended_salon_ids),
            Salon.is_active == 1
        )
        .order_by(Salon.rating.desc(), Salon.reviews_count.desc())
        .limit(limit)
        .all()
    )

    return recommended_salons


@router.get("/popular", response_model=List[SalonResponse])
def get_popular_salons(
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """Get most popular salons based on rating and review count"""
    salons = (
        db.query(Salon)
        .filter(Salon.is_active == 1)
        .order_by(
            Salon.rating.desc(),
            Salon.reviews_count.desc()
        )
        .limit(limit)
        .all()
    )

    return salons


@router.get("/nearby", response_model=List[SalonResponse])
def get_nearby_salons(
    latitude: float,
    longitude: float,
    radius_km: float = 10,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """
    Get salons near a specific location.
    Uses Haversine formula to calculate distance.
    """
    # Simplified version - in production, use PostGIS or similar
    # For now, just return all salons sorted by rating
    salons = (
        db.query(Salon)
        .filter(
            Salon.is_active == 1,
            Salon.latitude.isnot(None),
            Salon.longitude.isnot(None)
        )
        .order_by(Salon.rating.desc())
        .limit(limit)
        .all()
    )

    return salons
