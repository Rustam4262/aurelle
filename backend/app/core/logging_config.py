"""
Централизованная система логирования
"""
import sys
from loguru import logger
from app.core.config import settings


def setup_logging():
    """Настройка логирования приложения"""
    
    # Удаляем стандартный handler
    logger.remove()
    
    # Добавляем handler для консоли с цветным выводом
    logger.add(
        sys.stdout,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=settings.LOG_LEVEL
    )
    
    # Добавляем handler для файла с ротацией
    logger.add(
        "logs/app_{time:YYYY-MM-DD}.log",
        rotation="00:00",  # Новый файл каждый день в полночь
        retention="30 days",  # Хранить логи 30 дней
        compression="zip",  # Сжимать старые логи
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level=settings.LOG_LEVEL
    )
    
    # Отдельный файл для ошибок
    logger.add(
        "logs/errors_{time:YYYY-MM-DD}.log",
        rotation="00:00",
        retention="90 days",  # Ошибки храним дольше
        compression="zip",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="ERROR"
    )
    
    logger.info("Logging system initialized")
    
    return logger
