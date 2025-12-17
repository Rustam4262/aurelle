"""
WebSocket infrastructure for real-time features

Supports:
- Real-time chat
- Real-time notifications
- Real-time booking updates
"""
from .manager import ConnectionManager, get_connection_manager

__all__ = ["ConnectionManager", "get_connection_manager"]
