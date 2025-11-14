# Архитектура Beauty Salon Marketplace

## Обзор системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         ПОЛЬЗОВАТЕЛИ                            │
├─────────────────┬─────────────────────┬─────────────────────────┤
│   Клиенты (B)   │   Салоны (A)        │   Администраторы       │
│   - Поиск       │   - Управление      │   - Модерация          │
│   - Запись      │   - Услуги          │   - Аналитика          │
│   - Отзывы      │   - Записи          │   - Контроль           │
└────────┬────────┴──────────┬──────────┴────────────┬────────────┘
         │                   │                        │
         └───────────────────┴────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   FRONTEND (PWA)  │
                    │   React + Vite    │
                    │   TypeScript      │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │   REST API (JWT)  │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │   BACKEND         │
                    │   FastAPI         │
                    │   Python 3.11     │
                    └────┬──────┬───────┘
                         │      │
              ┌──────────┘      └─────────┐
              │                            │
     ┌────────▼─────────┐        ┌────────▼─────────┐
     │   PostgreSQL     │        │   Redis          │
     │   - Users        │        │   - Cache        │
     │   - Salons       │        │   - Sessions     │
     │   - Bookings     │        │   - Celery Queue │
     │   - Reviews      │        └──────────────────┘
     └──────────────────┘
              │
     ┌────────▼─────────┐
     │   Alembic        │
     │   Migrations     │
     └──────────────────┘
```

---

## Слои приложения

### 1. Frontend Layer (React)

```
frontend/
├── src/
│   ├── pages/
│   │   ├── LandingPage         → Главная страница
│   │   ├── LoginPage           → Вход
│   │   ├── RegisterPage        → Регистрация
│   │   ├── client/             → Кабинет клиента
│   │   ├── salon/              → Кабинет салона
│   │   └── admin/              → Админ-панель
│   ├── api/
│   │   ├── client.ts           → Axios instance
│   │   ├── auth.ts             → Авторизация
│   │   ├── salons.ts           → Салоны
│   │   └── bookings.ts         → Записи
│   └── store/
│       └── authStore.ts        → Zustand state
```

**Технологии:**
- React 18 (UI)
- TypeScript (типизация)
- React Router (навигация)
- Zustand (state)
- Axios (HTTP)
- Tailwind CSS (стили)

---

### 2. Backend Layer (FastAPI)

```
backend/
├── app/
│   ├── api/                    → Роуты
│   │   ├── deps.py             → Dependencies (auth, db)
│   │   ├── auth.py             → POST /register, /login
│   │   ├── users.py            → GET /me, /{id}
│   │   ├── salons.py           → CRUD салонов
│   │   ├── services.py         → CRUD услуг
│   │   ├── bookings.py         → CRUD записей
│   │   └── reviews.py          → CRUD отзывов
│   ├── core/
│   │   ├── config.py           → Настройки (Pydantic)
│   │   ├── security.py         → JWT, bcrypt
│   │   └── database.py         → SQLAlchemy engine
│   ├── models/                 → ORM модели
│   └── schemas/                → Pydantic схемы
```

**Технологии:**
- FastAPI (асинхронный фреймворк)
- SQLAlchemy (ORM)
- Pydantic (валидация)
- Jose (JWT)
- Passlib (хеширование паролей)

---

### 3. Database Layer (PostgreSQL)

**Основные таблицы:**

```sql
users
  ├─ id (PK)
  ├─ phone (unique)
  ├─ email
  ├─ name
  ├─ hashed_password
  ├─ role (enum: admin, salon_owner, master, client)
  └─ is_active

salons
  ├─ id (PK)
  ├─ owner_id (FK → users)
  ├─ name
  ├─ address
  ├─ latitude, longitude
  ├─ rating
  ├─ reviews_count
  └─ is_verified

masters
  ├─ id (PK)
  ├─ salon_id (FK → salons)
  ├─ name
  ├─ specialization
  └─ rating

services
  ├─ id (PK)
  ├─ salon_id (FK → salons)
  ├─ title
  ├─ price
  ├─ duration_minutes
  └─ category

bookings
  ├─ id (PK)
  ├─ client_id (FK → users)
  ├─ salon_id (FK → salons)
  ├─ master_id (FK → masters)
  ├─ service_id (FK → services)
  ├─ start_at, end_at
  ├─ status (enum)
  └─ payment_status

reviews
  ├─ id (PK)
  ├─ booking_id (FK → bookings, unique)
  ├─ client_id (FK → users)
  ├─ salon_id (FK → salons)
  ├─ master_id (FK → masters)
  ├─ rating (1-5)
  └─ comment
```

---

## Потоки данных

### Регистрация пользователя

```
1. Frontend: POST /api/auth/register
   ↓
2. Backend: валидация → hash пароля → сохранение в БД
   ↓
3. Backend: генерация JWT токена
   ↓
4. Frontend: сохранение токена в localStorage
   ↓
5. Redirect в кабинет (по role)
```

### Создание записи (booking)

```
1. Client: выбирает салон → услугу → мастера → время
   ↓
2. Frontend: POST /api/bookings
   ↓
3. Backend:
   - Проверка доступности времени
   - Создание booking (status: pending)
   - Обновление time_slot (is_booked: true)
   ↓
4. Backend → Redis: добавить задачу напоминания (Celery)
   ↓
5. Salon: получает уведомление
   ↓
6. Salon: подтверждает → PATCH /api/bookings/{id} (status: confirmed)
   ↓
7. Client: получает уведомление
```

### Оставление отзыва

```
1. Booking завершён (status: completed)
   ↓
2. Client: POST /api/reviews
   ↓
3. Backend:
   - Создание review
   - Пересчёт рейтинга салона
   - Пересчёт рейтинга мастера
   ↓
4. Salon: видит новый отзыв
```

---

## Безопасность

### Аутентификация и авторизация

```
JWT Token → Bearer header
    ↓
FastAPI Dependency (get_current_user)
    ↓
Проверка токена → извлечение user_id
    ↓
Загрузка user из БД
    ↓
Проверка is_active
    ↓
Проверка роли (require_role decorator)
```

**Защищённые роуты:**

| Роут                  | Client | Salon | Admin |
|-----------------------|--------|-------|-------|
| GET /salons           | ✅     | ✅    | ✅    |
| POST /salons          | ❌     | ✅    | ✅    |
| GET /bookings         | ✅ (свои) | ✅ (свои) | ✅ |
| POST /bookings        | ✅     | ❌    | ✅    |
| PATCH /bookings/{id}  | ✅ (отмена) | ✅ (подтверждение) | ✅ |
| POST /reviews         | ✅     | ❌    | ❌    |

---

## Масштабирование

### Горизонтальное масштабирование

```
                ┌──────────────┐
                │   NGINX      │
                │ Load Balancer│
                └──────┬───────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │ Backend │   │ Backend │   │ Backend │
   │   #1    │   │   #2    │   │   #3    │
   └────┬────┘   └────┬────┘   └────┬────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
              ┌────────▼─────────┐
              │   PostgreSQL     │
              │   (Primary)      │
              └────────┬─────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
   ┌─────▼──────┐             ┌─────▼──────┐
   │ Replica #1 │             │ Replica #2 │
   │ (Read-only)│             │ (Read-only)│
   └────────────┘             └────────────┘
```

### Кеширование (Redis)

```
GET /salons?city=Tashkent
   ↓
Check Redis cache
   ├─ HIT → return cached data
   └─ MISS → query DB → cache result (TTL: 5min)
```

### Celery (фоновые задачи)

```
Celery Worker → Redis Queue
    ↓
Tasks:
  - Отправка напоминаний (T-24h, T-2h)
  - Обновление рейтингов
  - Генерация отчётов
  - Обработка платежей
```

---

## Интеграции (будущее)

### Платежи

```
Client → Создаёт booking
   ↓
Backend → POST Payme/Click API (создать платёж)
   ↓
Client → Redirect на платёжную форму
   ↓
Payme/Click → Callback POST /api/payments/callback
   ↓
Backend → Обновить booking.payment_status = "paid"
   ↓
Salon → Получает уведомление
```

### Уведомления

```
Celery Task (T-24h до визита)
   ↓
Backend → SMS API / Telegram Bot / Email SMTP
   ↓
Client → Получает напоминание
```

### Геолокация

```
Frontend → Запрос разрешения на геолокацию
   ↓
Browser Geolocation API → {latitude, longitude}
   ↓
GET /salons?latitude=41.31&longitude=69.27&radius_km=5
   ↓
Backend → Haversine formula (расчёт расстояния)
   ↓
Return салоны в радиусе 5 км
```

---

## Деплой архитектура (Production)

```
┌─────────────────────────────────────────────────┐
│               CLOUD (DigitalOcean/AWS)          │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  NGINX (SSL/TLS, reverse proxy)          │  │
│  │  - /api → Backend                        │  │
│  │  - / → Frontend (static)                 │  │
│  └───────────────────┬───────────────────────┘  │
│                      │                          │
│  ┌───────────────────▼───────────────────────┐  │
│  │  Docker Containers                       │  │
│  │  - backend (FastAPI + Celery worker)     │  │
│  │  - postgres (primary)                    │  │
│  │  - redis                                 │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Object Storage (S3)                     │  │
│  │  - Логотипы салонов                      │  │
│  │  - Фото портфолио мастеров               │  │
│  │  - Фото отзывов                          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Backup & Monitoring                     │  │
│  │  - Automated DB backups                  │  │
│  │  - Prometheus + Grafana                  │  │
│  │  - Sentry (error tracking)               │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Заключение

Архитектура построена на принципах:
- **Модульность** - каждый слой независим
- **Масштабируемость** - легко добавить реплики
- **Безопасность** - JWT + роли + валидация
- **Производительность** - кеширование + индексы БД
- **Расширяемость** - легко добавить новые фичи

**Проект готов к MVP и дальнейшему развитию.**
