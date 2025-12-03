from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ChatMessageCreate(BaseModel):
    receiver_id: int
    salon_id: Optional[int] = None
    message: str


class ChatMessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    salon_id: Optional[int]
    message: str
    is_read: int
    created_at: datetime
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None

    class Config:
        from_attributes = True


class ChatConversation(BaseModel):
    user_id: int
    user_name: str
    salon_id: Optional[int]
    salon_name: Optional[str]
    last_message: str
    last_message_time: datetime
    unread_count: int
