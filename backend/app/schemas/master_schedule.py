from pydantic import BaseModel, Field
from typing import Optional
from datetime import time
from app.models.master_schedule import DayOfWeek


class MasterScheduleBase(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    break_start: Optional[time] = None
    break_end: Optional[time] = None
    is_active: bool = True


class MasterScheduleCreate(MasterScheduleBase):
    pass


class MasterScheduleUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_start: Optional[time] = None
    break_end: Optional[time] = None
    is_active: Optional[bool] = None


class MasterScheduleResponse(MasterScheduleBase):
    id: int
    master_id: int

    class Config:
        from_attributes = True


class MasterDayOffBase(BaseModel):
    date: str  # ISO format date YYYY-MM-DD
    reason: Optional[str] = None


class MasterDayOffCreate(MasterDayOffBase):
    pass


class MasterDayOffResponse(MasterDayOffBase):
    id: int
    master_id: int

    class Config:
        from_attributes = True
