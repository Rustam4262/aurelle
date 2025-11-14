# API Examples - Beauty Salon Marketplace

Примеры запросов к API с использованием `curl`.

---

## Аутентификация

### Регистрация клиента

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+998901234567",
    "email": "client@example.com",
    "name": "Анна Иванова",
    "password": "secure123",
    "role": "client"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "phone": "+998901234567",
    "email": "client@example.com",
    "name": "Анна Иванова",
    "role": "client",
    "is_active": true,
    "created_at": "2025-01-14T12:00:00Z"
  }
}
```

### Регистрация владельца салона

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+998909876543",
    "email": "salon@example.com",
    "name": "Beauty Studio",
    "password": "secure123",
    "role": "salon_owner"
  }'
```

### Вход

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+998901234567",
    "password": "secure123"
  }'
```

---

## Пользователи

### Получить текущего пользователя

```bash
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Получить пользователя по ID

```bash
curl -X GET http://localhost:8000/api/users/5 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Салоны

### Создать салон

```bash
curl -X POST http://localhost:8000/api/salons \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beauty Studio Premium",
    "description": "Лучший салон красоты в городе с опытными мастерами",
    "address": "ул. Амира Темура, 15, Ташкент",
    "phone": "+998909876543",
    "latitude": 41.3123,
    "longitude": 69.2787
  }'
```

**Response:**
```json
{
  "id": 1,
  "owner_id": 2,
  "name": "Beauty Studio Premium",
  "description": "Лучший салон красоты в городе...",
  "address": "ул. Амира Темура, 15, Ташкент",
  "phone": "+998909876543",
  "latitude": 41.3123,
  "longitude": 69.2787,
  "rating": 0.0,
  "reviews_count": 0,
  "logo_url": null,
  "is_verified": false,
  "is_active": true,
  "created_at": "2025-01-14T12:30:00Z"
}
```

### Получить список салонов

```bash
# Базовый запрос
curl -X GET "http://localhost:8000/api/salons"

# С пагинацией
curl -X GET "http://localhost:8000/api/salons?skip=0&limit=10"

# Поиск по названию
curl -X GET "http://localhost:8000/api/salons?search=Beauty"

# Фильтр по рейтингу
curl -X GET "http://localhost:8000/api/salons?min_rating=4.0"

# Поиск в радиусе (геолокация)
curl -X GET "http://localhost:8000/api/salons?latitude=41.3123&longitude=69.2787&radius_km=5"
```

### Получить салон по ID

```bash
curl -X GET http://localhost:8000/api/salons/1
```

### Обновить салон

```bash
curl -X PATCH http://localhost:8000/api/salons/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Обновлённое описание салона",
    "logo_url": "https://example.com/logo.jpg"
  }'
```

### Удалить салон (только админ)

```bash
curl -X DELETE http://localhost:8000/api/salons/1 \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## Услуги

### Создать услугу

```bash
curl -X POST http://localhost:8000/api/services \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": 1,
    "title": "Маникюр классический",
    "description": "Классический маникюр с покрытием гель-лаком",
    "price": 150000,
    "duration_minutes": 60,
    "category": "manicure"
  }'
```

### Получить список услуг

```bash
# Все услуги
curl -X GET "http://localhost:8000/api/services"

# Услуги конкретного салона
curl -X GET "http://localhost:8000/api/services?salon_id=1"

# Фильтр по категории
curl -X GET "http://localhost:8000/api/services?category=manicure"

# Фильтр по цене
curl -X GET "http://localhost:8000/api/services?min_price=100000&max_price=200000"
```

### Получить услугу по ID

```bash
curl -X GET http://localhost:8000/api/services/1
```

### Удалить услугу

```bash
curl -X DELETE http://localhost:8000/api/services/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Записи (Bookings)

### Создать запись

```bash
curl -X POST http://localhost:8000/api/bookings \
  -H "Authorization: Bearer CLIENT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": 1,
    "master_id": 1,
    "start_at": "2025-01-20T14:00:00Z",
    "client_notes": "Прошу подготовить тёмный лак"
  }'
```

**Response:**
```json
{
  "id": 1,
  "client_id": 1,
  "salon_id": 1,
  "master_id": 1,
  "service_id": 1,
  "start_at": "2025-01-20T14:00:00Z",
  "end_at": "2025-01-20T15:00:00Z",
  "status": "pending",
  "price": 150000,
  "payment_status": "pending",
  "payment_method": null,
  "client_notes": "Прошу подготовить тёмный лак",
  "salon_notes": null,
  "created_at": "2025-01-14T13:00:00Z"
}
```

### Получить список записей

```bash
# Для клиента - свои записи
curl -X GET http://localhost:8000/api/bookings \
  -H "Authorization: Bearer CLIENT_ACCESS_TOKEN"

# Для салона - записи своих салонов
curl -X GET http://localhost:8000/api/bookings \
  -H "Authorization: Bearer SALON_ACCESS_TOKEN"

# Фильтр по статусу
curl -X GET "http://localhost:8000/api/bookings?status_filter=confirmed" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Получить запись по ID

```bash
curl -X GET http://localhost:8000/api/bookings/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Обновить статус записи

**Салон подтверждает запись:**

```bash
curl -X PATCH http://localhost:8000/api/bookings/1 \
  -H "Authorization: Bearer SALON_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "salon_notes": "Запись подтверждена, ждём вас!"
  }'
```

**Клиент отменяет запись:**

```bash
curl -X PATCH http://localhost:8000/api/bookings/1 \
  -H "Authorization: Bearer CLIENT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled_by_client"
  }'
```

### Отменить запись (DELETE)

```bash
curl -X DELETE http://localhost:8000/api/bookings/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Отзывы

### Создать отзыв

```bash
curl -X POST http://localhost:8000/api/reviews \
  -H "Authorization: Bearer CLIENT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "rating": 5.0,
    "comment": "Отличный салон! Мастер очень внимательная, результат превосходный!"
  }'
```

**Response:**
```json
{
  "id": 1,
  "booking_id": 1,
  "client_id": 1,
  "salon_id": 1,
  "master_id": 1,
  "rating": 5.0,
  "comment": "Отличный салон! Мастер очень внимательная...",
  "created_at": "2025-01-21T16:00:00Z"
}
```

### Получить отзывы салона

```bash
curl -X GET "http://localhost:8000/api/reviews?salon_id=1"
```

### Получить отзывы мастера

```bash
curl -X GET "http://localhost:8000/api/reviews?master_id=1"
```

### Получить отзыв по ID

```bash
curl -X GET http://localhost:8000/api/reviews/1
```

---

## Комплексные сценарии

### Полный флоу клиента

```bash
# 1. Регистрация
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "+998901234567", "name": "Анна", "password": "123456", "role": "client"}'

# Получаем access_token

# 2. Поиск салонов
curl -X GET "http://localhost:8000/api/salons?min_rating=4"

# 3. Просмотр услуг салона
curl -X GET "http://localhost:8000/api/services?salon_id=1"

# 4. Создание записи
curl -X POST http://localhost:8000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"service_id": 1, "master_id": 1, "start_at": "2025-01-20T14:00:00Z"}'

# 5. Просмотр своих записей
curl -X GET http://localhost:8000/api/bookings \
  -H "Authorization: Bearer $TOKEN"

# 6. После визита - оставить отзыв
curl -X POST http://localhost:8000/api/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"booking_id": 1, "rating": 5, "comment": "Отлично!"}'
```

### Полный флоу владельца салона

```bash
# 1. Регистрация
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "+998909876543", "name": "Beauty Studio", "password": "123456", "role": "salon_owner"}'

# Получаем access_token

# 2. Создание салона
curl -X POST http://localhost:8000/api/salons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Beauty Studio", "address": "ул. Темура, 15", "phone": "+998909876543"}'

# 3. Добавление услуг
curl -X POST http://localhost:8000/api/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"salon_id": 1, "title": "Маникюр", "price": 150000, "duration_minutes": 60, "category": "manicure"}'

curl -X POST http://localhost:8000/api/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"salon_id": 1, "title": "Педикюр", "price": 180000, "duration_minutes": 90, "category": "pedicure"}'

# 4. Просмотр записей
curl -X GET http://localhost:8000/api/bookings \
  -H "Authorization: Bearer $TOKEN"

# 5. Подтверждение записи
curl -X PATCH http://localhost:8000/api/bookings/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed", "salon_notes": "Ждём вас!"}'

# 6. Просмотр отзывов
curl -X GET "http://localhost:8000/api/reviews?salon_id=1"
```

---

## Коды ответов

| Код | Значение                  | Пример                              |
|-----|---------------------------|-------------------------------------|
| 200 | OK                        | Успешный GET/PATCH                  |
| 201 | Created                   | Успешный POST (создание)            |
| 204 | No Content                | Успешный DELETE                     |
| 400 | Bad Request               | Неверные данные                     |
| 401 | Unauthorized              | Неверный/отсутствующий токен        |
| 403 | Forbidden                 | Недостаточно прав                   |
| 404 | Not Found                 | Ресурс не найден                    |
| 422 | Unprocessable Entity      | Ошибка валидации Pydantic           |
| 500 | Internal Server Error     | Ошибка сервера                      |

---

## Тестирование через Postman

1. Импортировать коллекцию из `http://localhost:8000/openapi.json`
2. Создать environment с переменными:
   - `base_url`: `http://localhost:8000/api`
   - `access_token`: (получить после логина)

3. Настроить Authorization для всех запросов:
   - Type: `Bearer Token`
   - Token: `{{access_token}}`

---

**Полная интерактивная документация доступна:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
