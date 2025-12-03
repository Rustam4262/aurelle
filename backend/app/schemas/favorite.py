from pydantic import BaseModel
from datetime import datetime


class FavoriteCreate(BaseModel):
    salon_id: int


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    salon_id: int
    created_at: datetime

    class Config:
        from_attributes = True
