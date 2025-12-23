"""
Общие схемы для API responses
"""
from pydantic import BaseModel
from typing import Generic, TypeVar, List

T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    """Стандартный ответ для paginated списков"""
    items: List[T]
    total: int
    skip: int
    limit: int

    class Config:
        from_attributes = True
