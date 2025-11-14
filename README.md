# Beauty Salon Marketplace

Маркетплейс для онлайн-записи в салоны красоты. Трёхсторонняя платформа для **клиентов**, **салонов** и **администраторов**.

## Основные возможности

### Для клиентов (B)
- Поиск салонов по геолокации, рейтингу, услугам
- Онлайн-запись на услуги
- История записей
- Отзывы и рейтинги

### Для салонов (A)
- Личный кабинет салона
- Управление услугами и прайс-листом
- Управление мастерами
- Календарь записей
- Аналитика

### Для администраторов
- Модерация салонов
- Управление пользователями
- Модерация отзывов
- Общая статистика

---

## Технологический стек

### Backend
- **FastAPI** - современный Python фреймворк
- **PostgreSQL** - база данных
- **SQLAlchemy** - ORM
- **Alembic** - миграции БД
- **Redis** - кеширование и очереди
- **Celery** - фоновые задачи (напоминания)
- **JWT** - аутентификация

### Frontend
- **React** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик
- **Tailwind CSS** - стилизация
- **React Router** - роутинг
- **Zustand** - state management
- **Axios** - HTTP клиент

### DevOps
- **Docker** & **Docker Compose** - контейнеризация
- **Nginx** (опционально) - reverse proxy

---

## Быстрый старт

### Требования

- Docker & Docker Compose
- Node.js 18+ (для локальной разработки frontend)
- Python 3.11+ (для локальной разработки backend)

### 1. Клонирование и настройка окружения

```bash
cd beauty_salon

# Создать .env из примера
cp .env.example .env

# Отредактировать .env (при необходимости)
# Главное: DATABASE_URL, SECRET_KEY
```

### 2. Запуск через Docker Compose

```bash
# Собрать и запустить все сервисы
docker-compose up --build

# В отдельном терминале: выполнить миграции БД
docker-compose exec backend alembic upgrade head
```

Сервисы будут доступны:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Создание первого пользователя

Откройте http://localhost:5173 и зарегистрируйтесь:

1. **Клиент**: `/register`
2. **Владелец салона**: `/register?type=salon`

Для создания **админа** используйте API или БД напрямую.

---

## Локальная разработка (без Docker)

### Backend

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt

# Запустить PostgreSQL и Redis отдельно (или через Docker)
docker-compose up postgres redis

# Выполнить миграции
alembic upgrade head

# Запустить сервер
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Установить зависимости
npm install

# Запустить dev-сервер
npm run dev
```

---

## Структура проекта

```
beauty_salon/
├── backend/
│   ├── alembic/              # Миграции БД
│   ├── app/
│   │   ├── api/              # API роуты
│   │   │   ├── auth.py
│   │   │   ├── salons.py
│   │   │   ├── bookings.py
│   │   │   ├── services.py
│   │   │   └── reviews.py
│   │   ├── core/             # Конфигурация, безопасность, БД
│   │   ├── models/           # SQLAlchemy модели
│   │   ├── schemas/          # Pydantic схемы
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/              # API клиент (axios)
│   │   ├── pages/
│   │   │   ├── client/       # Страницы клиента
│   │   │   ├── salon/        # Страницы салона
│   │   │   └── admin/        # Страницы админа
│   │   ├── store/            # Zustand stores
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход

### Пользователи
- `GET /api/users/me` - Текущий пользователь
- `GET /api/users/{id}` - Пользователь по ID

### Салоны
- `POST /api/salons` - Создать салон
- `GET /api/salons` - Список салонов (с фильтрами)
- `GET /api/salons/{id}` - Салон по ID
- `PATCH /api/salons/{id}` - Обновить салон
- `DELETE /api/salons/{id}` - Удалить салон (admin)

### Услуги
- `POST /api/services` - Создать услугу
- `GET /api/services` - Список услуг (с фильтрами)
- `GET /api/services/{id}` - Услуга по ID
- `DELETE /api/services/{id}` - Удалить услугу

### Записи (Bookings)
- `POST /api/bookings` - Создать запись
- `GET /api/bookings` - Список записей
- `GET /api/bookings/{id}` - Запись по ID
- `PATCH /api/bookings/{id}` - Обновить статус
- `DELETE /api/bookings/{id}` - Отменить запись

### Отзывы
- `POST /api/reviews` - Создать отзыв
- `GET /api/reviews` - Список отзывов
- `GET /api/reviews/{id}` - Отзыв по ID

**Документация Swagger**: http://localhost:8000/docs

---

## База данных

### Основные таблицы

- **users** - Пользователи (клиенты, владельцы салонов, админы)
- **salons** - Салоны красоты
- **masters** - Мастера
- **services** - Услуги
- **service_masters** - Связь услуг и мастеров
- **bookings** - Записи клиентов
- **reviews** - Отзывы
- **work_shifts** - Рабочие смены мастеров
- **time_slots** - Временные слоты

### Миграции

```bash
# Создать новую миграцию
alembic revision --autogenerate -m "описание изменений"

# Применить миграции
alembic upgrade head

# Откатить последнюю миграцию
alembic downgrade -1
```

---

## Роли и права доступа

### 1. **Client** (Клиент)
- Регистрация/логин
- Поиск салонов
- Создание записей
- Просмотр своих записей
- Оставление отзывов

### 2. **Salon Owner** (Владелец салона)
- Создание салонов
- Управление услугами
- Управление мастерами
- Просмотр записей своих салонов
- Подтверждение/отмена записей

### 3. **Admin** (Администратор)
- Полный доступ
- Модерация салонов
- Модерация отзывов
- Управление пользователями
- Аналитика

---

## Roadmap (MVP → Full Product)

### MVP (текущая версия) ✅
- [x] Регистрация и аутентификация
- [x] Трёхрольная система (client, salon, admin)
- [x] CRUD салонов и услуг
- [x] Создание записей
- [x] Отзывы и рейтинги
- [x] Базовые дашборды

### Фаза 2 (ближайшие спринты)
- [ ] Календарь мастеров (доступные слоты)
- [ ] Управление мастерами
- [ ] Загрузка фото (портфолио, логотипы)
- [ ] Поиск по геолокации (карта)
- [ ] Напоминания (email/SMS/Telegram)
- [ ] Фильтры (категории, цена, рейтинг)

### Фаза 3 (продвинутые фичи)
- [ ] Онлайн-платежи (Payme/Click/Stripe)
- [ ] Политика отмен и депозиты
- [ ] Промокоды и акции
- [ ] Реферальная программа
- [ ] Мобильное приложение (React Native)
- [ ] Аналитика для салонов
- [ ] Чат клиент ↔ салон

---

## Переменные окружения (.env)

```env
# Database
DATABASE_URL=postgresql://beauty_user:beauty_pass@localhost:5432/beauty_salon_db

# JWT
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis
REDIS_URL=redis://localhost:6379/0

# SMS / Notifications (опционально)
SMS_PROVIDER_API_KEY=
TELEGRAM_BOT_TOKEN=

# Payment (опционально)
PAYME_MERCHANT_ID=
CLICK_MERCHANT_ID=

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Деплой (Production)

### 1. На VPS (Ubuntu/Debian)

```bash
# Установить Docker и Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Клонировать репозиторий
git clone <repo-url> beauty_salon
cd beauty_salon

# Настроить .env для production
nano .env

# Запустить
docker-compose up -d --build

# Применить миграции
docker-compose exec backend alembic upgrade head
```

### 2. С Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
    }
}
```

---

## Тестирование

```bash
# Backend (pytest, будет добавлено позже)
cd backend
pytest

# Frontend (vitest, будет добавлено позже)
cd frontend
npm run test
```

---

## Поддержка и контакты

- **GitHub Issues**: <repo-url>/issues
- **Email**: support@beautysalon.uz (пример)

---

## Лицензия

MIT License (или на ваш выбор)

---

**Создано с ❤️ для женщин, салонов и красоты**
