# ========================================
# MVP MODELS - ONLY THESE ARE IMPORTED
# ========================================
from app.models.user import User
from app.models.salon import Salon
from app.models.master import Master
from app.models.master_schedule import MasterSchedule, DayOfWeek
from app.models.master_day_off import MasterDayOff
from app.models.service import Service, ServiceMaster
from app.models.booking import Booking
# from app.models.review import Review  # DISABLED FOR MVP
from app.models.work_shift import WorkShift
from app.models.time_slot import TimeSlot
# from app.models.chat import ChatMessage  # DISABLED FOR MVP
# from app.models.promo_code import PromoCode  # DISABLED FOR MVP
# from app.models.notification import Notification  # DISABLED FOR MVP
# from app.models.audit_log import AuditLog, LoginLog  # DISABLED FOR MVP
# from app.models.favorite import Favorite  # DISABLED FOR MVP
# from app.models.payment import Payment, PaymentStatus, PaymentMethod, PaymeTransaction, ClickTransaction  # DISABLED FOR MVP

__all__ = [
    "User",
    "Salon",
    "Master",
    "MasterSchedule",
    "DayOfWeek",
    "MasterDayOff",
    "Service",
    "ServiceMaster",
    "Booking",
    # "Review",  # DISABLED FOR MVP
    "WorkShift",
    "TimeSlot",
    # "ChatMessage",  # DISABLED FOR MVP
    # "PromoCode",  # DISABLED FOR MVP
    # "Notification",  # DISABLED FOR MVP
    # "AuditLog",  # DISABLED FOR MVP
    # "LoginLog",  # DISABLED FOR MVP
    # "Favorite",  # DISABLED FOR MVP
    # "Payment",  # DISABLED FOR MVP
    # "PaymentStatus",  # DISABLED FOR MVP
    # "PaymentMethod",  # DISABLED FOR MVP
    # "PaymeTransaction",  # DISABLED FOR MVP
    # "ClickTransaction",  # DISABLED FOR MVP
]
