FROM python:3.11-slim-bookworm

# Установка переменных окружения
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    postgresql-client \
    netcat-traditional \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копирование и установка Python зависимостей (кешируется)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Создание директорий для логов и загрузок
RUN mkdir -p /app/logs /app/uploads && \
    chmod -R 755 /app/logs /app/uploads

# Копирование приложения
COPY . .

# Создание непривилегированного пользователя
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Используем скрипт для ожидания БД
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
