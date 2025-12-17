"""
WebSocket Connection Manager

Управляет WebSocket соединениями для real-time функций:
- Чат между пользователями
- Уведомления
- Обновления статусов броней
"""
from typing import Dict, List
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Менеджер WebSocket соединений

    Поддерживает:
    - Несколько соединений на пользователя (разные устройства/вкладки)
    - Отправка сообщений конкретному пользователю
    - Broadcast сообщений всем подключенным
    - Комнаты для группового чата
    """

    def __init__(self):
        # user_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}

        # room_id -> List[WebSocket]
        self.rooms: Dict[str, List[WebSocket]] = {}

        # WebSocket -> user_id (для обратного lookup)
        self.websocket_to_user: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """
        Подключить WebSocket для пользователя

        Args:
            websocket: WebSocket connection
            user_id: ID пользователя
        """
        await websocket.accept()

        # Добавить в список соединений пользователя
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []

        self.active_connections[user_id].append(websocket)
        self.websocket_to_user[websocket] = user_id

        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket):
        """
        Отключить WebSocket

        Args:
            websocket: WebSocket connection to disconnect
        """
        # Найти user_id
        user_id = self.websocket_to_user.get(websocket)

        if user_id and user_id in self.active_connections:
            # Удалить из списка соединений пользователя
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

            # Если это было последнее соединение, удалить пользователя
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

            # Удалить из обратного lookup
            del self.websocket_to_user[websocket]

            logger.info(f"User {user_id} disconnected")

        # Удалить из всех комнат
        for room_id, connections in self.rooms.items():
            if websocket in connections:
                connections.remove(websocket)

    async def send_personal_message(self, message: dict, user_id: int):
        """
        Отправить сообщение конкретному пользователю

        Args:
            message: Словарь с данными сообщения
            user_id: ID пользователя-получателя
        """
        if user_id in self.active_connections:
            # Отправить на все устройства пользователя
            dead_connections = []

            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    dead_connections.append(connection)

            # Удалить мертвые соединения
            for dead_conn in dead_connections:
                self.disconnect(dead_conn)

    async def send_to_websocket(self, message: dict, websocket: WebSocket):
        """
        Отправить сообщение на конкретный WebSocket

        Args:
            message: Словарь с данными
            websocket: WebSocket connection
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending to websocket: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        """
        Broadcast сообщение всем подключенным пользователям

        Args:
            message: Словарь с данными для broadcast
        """
        dead_connections = []

        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {e}")
                    dead_connections.append(connection)

        # Удалить мертвые соединения
        for dead_conn in dead_connections:
            self.disconnect(dead_conn)

    def join_room(self, websocket: WebSocket, room_id: str):
        """
        Добавить WebSocket в комнату

        Args:
            websocket: WebSocket connection
            room_id: ID комнаты (например, "salon_123")
        """
        if room_id not in self.rooms:
            self.rooms[room_id] = []

        if websocket not in self.rooms[room_id]:
            self.rooms[room_id].append(websocket)
            logger.info(f"WebSocket joined room {room_id}")

    def leave_room(self, websocket: WebSocket, room_id: str):
        """
        Удалить WebSocket из комнаты

        Args:
            websocket: WebSocket connection
            room_id: ID комнаты
        """
        if room_id in self.rooms and websocket in self.rooms[room_id]:
            self.rooms[room_id].remove(websocket)
            logger.info(f"WebSocket left room {room_id}")

    async def send_to_room(self, message: dict, room_id: str):
        """
        Отправить сообщение всем в комнате

        Args:
            message: Словарь с данными
            room_id: ID комнаты
        """
        if room_id not in self.rooms:
            return

        dead_connections = []

        for connection in self.rooms[room_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to room {room_id}: {e}")
                dead_connections.append(connection)

        # Удалить мертвые соединения
        for dead_conn in dead_connections:
            self.disconnect(dead_conn)

    def get_active_users_count(self) -> int:
        """Получить количество активных пользователей"""
        return len(self.active_connections)

    def is_user_online(self, user_id: int) -> bool:
        """Проверить, онлайн ли пользователь"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Singleton instance
_manager = None


def get_connection_manager() -> ConnectionManager:
    """
    Получить singleton instance менеджера соединений

    Returns:
        ConnectionManager instance
    """
    global _manager
    if _manager is None:
        _manager = ConnectionManager()
    return _manager
