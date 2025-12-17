# ⚡ Quick Start Guide - aurelle.uz

Быстрый старт для разработчиков платформы aurelle.uz

## 🚀 Для разработки (Development)

### 1. Клонирование репозитория

```bash
git clone https://github.com/ваш-username/aurelle.git
cd aurelle
```

### 2. Настройка окружения

```bash
# Копирование примера .env
cp backend/.env.example .env

# Редактирование (опционально для dev)
nano .env
```

### 3. Запуск через скрипт

```bash
# Использование готового скрипта
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

**Или вручную:**

```bash
# Запуск Docker Compose
docker-compose up -d

# Применение миграций
docker-compose exec backend alembic upgrade head

# Инициализация БД
docker-compose exec backend python init_db.py
```

### 4. Проверка

Откройте в браузере:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Flower (Celery)**: http://localhost:5555

### 5. Тестовые данные

```bash
# Создание тестового пользователя
docker-compose exec backend python -c "
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password

db = SessionLocal()
user = User(
    email='admin@aurelle.uz',
    name='Admin User',
    hashed_password=hash_password('admin123'),
    role=UserRole.ADMIN
)
db.add(user)
db.commit()
print('✅ Test user created: admin@aurelle.uz / admin123')
"
```

---

## 🏭 Для продакшена (Production)

### 1. Подготовка сервера

```bash
# Подключение к серверу
ssh user@ваш_сервер

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com | sh
```

### 2. Клонирование и настройка

```bash
# Клонирование в /var/www
cd /var/www
git clone https://github.com/ваш-username/aurelle.git
cd aurelle

# Создание .env с production настройками
cp backend/.env.example .env
nano .env  # ОБЯЗАТЕЛЬНО измените все пароли и ключи!
```

### 3. Запуск

```bash
# Использование готового скрипта
chmod +x scripts/start-prod.sh
./scripts/start-prod.sh
```

**Или вручную:**

```bash
# Сборка и запуск
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps
```

### 4. SSL сертификат

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d aurelle.uz -d www.aurelle.uz
```

### 5. Настройка бэкапов

```bash
# Добавление в crontab
crontab -e

# Ежедневный бэкап в 3:00
0 3 * * * /var/www/aurelle/scripts/backup.sh >> /var/log/aurelle_backup.log 2>&1
```

---

## 🛠️ Полезные команды

### Docker

```bash
# Просмотр логов
docker-compose logs -f [service_name]

# Перезапуск сервиса
docker-compose restart [service_name]

# Остановка всех сервисов
docker-compose down

# Очистка (удаление volumes)
docker-compose down -v
```

### База данных

```bash
# Создание миграции
docker-compose exec backend alembic revision --autogenerate -m "описание"

# Применение миграций
docker-compose exec backend alembic upgrade head

# Откат миграции
docker-compose exec backend alembic downgrade -1

# Подключение к БД
docker-compose exec postgres psql -U beauty_user -d beauty_salon_db
```

### Celery

```bash
# Просмотр активных задач
docker-compose exec celery_worker celery -A app.core.celery_app inspect active

# Просмотр статистики
docker-compose exec celery_worker celery -A app.core.celery_app inspect stats

# Очистка очереди
docker-compose exec celery_worker celery -A app.core.celery_app purge
```

### Бэкапы

```bash
# Создание бэкапа
./scripts/backup.sh

# Восстановление
./scripts/restore.sh backups/aurelle_db_20241215_030000.sql.gz
```

---

## 📂 Структура проекта

```
aurelle/
├── backend/                    # Backend (FastAPI)
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   ├── core/              # Core (config, db, security)
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   ├── tasks/             # Celery tasks
│   │   ├── templates/         # Email templates
│   │   └── websocket/         # WebSocket handlers
│   ├── alembic/               # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                   # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── api/               # API client
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks (WebSocket, etc)
│   │   ├── pages/             # Page components
│   │   ├── services/          # Services (WebSocket, etc)
│   │   ├── store/             # State management
│   │   └── types/             # TypeScript types
│   ├── package.json
│   └── Dockerfile.prod
│
├── scripts/                    # Utility scripts
│   ├── start-dev.sh           # Development startup
│   ├── start-prod.sh          # Production startup
│   ├── backup.sh              # Database backup
│   └── restore.sh             # Database restore
│
├── deploy/                     # Deployment configs
│   └── nginx/                 # Nginx configs
│
├── docker-compose.yml          # Development compose
├── docker-compose.prod.yml     # Production compose
├── DEPLOYMENT.md               # Полное руководство по деплою
├── QUICKSTART.md               # Этот файл
└── README.md                   # Общая документация
```

---

## 🔑 Ключевые функции

### ✅ Реализовано

- **WebSocket** - Real-time чат и уведомления
- **Email уведомления** - SMTP интеграция с Jinja2 шаблонами
- **SMS уведомления** - Eskiz.uz, SMS.ru, Twilio
- **Celery** - Фоновые задачи и периодические напоминания
- **Yandex Maps** - Интеграция карт для поиска салонов
- **Production Docker** - Полная настройка для продакшена
- **Документация** - Детальное руководство по развертыванию

### 🔧 Интеграции

- **Payment**: Payme, Click, Uzum
- **Maps**: Yandex Maps API
- **Monitoring**: Sentry, Flower
- **Email**: SMTP, SendGrid, Mailgun
- **SMS**: Eskiz.uz, SMS.ru, Twilio

---

## 📚 Дополнительная документация

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Полное руководство по развертыванию
- **[README.md](README.md)** - Общая документация проекта
- **[Backend README](backend/README.md)** - Backend документация
- **[Frontend README](frontend/README.md)** - Frontend документация

---

## 🆘 Помощь

### Проблемы при запуске?

1. Проверьте Docker:
   ```bash
   docker --version
   docker-compose --version
   ```

2. Проверьте логи:
   ```bash
   docker-compose logs -f
   ```

3. Очистите и пересоберите:
   ```bash
   docker-compose down -v
   docker-compose up --build -d
   ```

### Нужна помощь?

- Проверьте [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting) для решения частых проблем
- Откройте issue на GitHub
- Проверьте документацию конкретного сервиса

---

**Готово! Начните разработку прямо сейчас! 🚀**
