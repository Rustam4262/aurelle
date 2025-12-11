"""
Soft Delete Mixin для моделей

Вместо физического удаления записей из БД, помечаем их как удаленные.
Критично для:
- Соблюдение требований регуляторов (хранение данных о транзакциях)
- Восстановление случайно удаленных данных
- Аудит и расследование инцидентов
"""
from sqlalchemy import Column, DateTime, Boolean
from sqlalchemy.orm import declared_attr
from datetime import datetime, timezone


class SoftDeleteMixin:
    """
    Mixin для мягкого удаления записей

    Добавляет поля:
    - is_deleted: флаг удаления
    - deleted_at: когда удалено
    """

    @declared_attr
    def is_deleted(cls):
        return Column(Boolean, default=False, nullable=False, index=True)

    @declared_attr
    def deleted_at(cls):
        return Column(DateTime(timezone=True), nullable=True)

    def soft_delete(self):
        """Мягко удалить запись"""
        self.is_deleted = True
        self.deleted_at = datetime.now(timezone.utc)

    def restore(self):
        """Восстановить удаленную запись"""
        self.is_deleted = False
        self.deleted_at = None

    @classmethod
    def active_only(cls):
        """Фильтр для получения только активных записей"""
        return cls.is_deleted == False

    @classmethod
    def deleted_only(cls):
        """Фильтр для получения только удаленных записей"""
        return cls.is_deleted == True
