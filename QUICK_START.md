# Быстрый старт Beauty Salon Marketplace

## Шаг 1: Запуск проекта

```bash
# 1. Запустить все сервисы
docker-compose up --build

# 2. В новом терминале: запустить миграции
docker-compose exec backend alembic upgrade head
```

## Шаг 2: Открыть приложение

- **Frontend**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs

## Шаг 3: Создать тестовых пользователей

### Клиент (B - заказывает услуги)

1. Открыть http://localhost:5173/register
2. Заполнить:
   - Имя: `Анна`
   - Телефон: `+998901234567`
   - Email: `anna@example.com`
   - Пароль: `123456`
3. Войти в личный кабинет `/client/dashboard`

### Владелец салона (A - принимает заказы)

1. Открыть http://localhost:5173/register?type=salon
2. Заполнить:
   - Название салона: `Beauty Studio`
   - Телефон: `+998909876543`
   - Email: `studio@example.com`
   - Пароль: `123456`
3. Войти в кабинет салона `/salon/dashboard`

### Админ

Используйте API `/api/auth/register` с `role: "admin"`:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+998901111111",
    "email": "admin@example.com",
    "name": "Admin",
    "password": "123456",
    "role": "admin"
  }'
```

## Шаг 4: Проверить функционал

### Для салона:
1. Войти как владелец салона
2. Создать салон через API:

```bash
# Получить токен после логина, затем:
curl -X POST http://localhost:8000/api/salons \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beauty Studio",
    "address": "ул. Амира Темура, 15",
    "phone": "+998909876543",
    "description": "Лучший салон красоты в городе",
    "latitude": 41.3123,
    "longitude": 69.2787
  }'
```

3. Добавить услуги через `/salon/services`

### Для клиента:
1. Войти как клиент
2. Открыть `/client/salons`
3. Найти салон
4. Создать запись

## Остановка проекта

```bash
docker-compose down
```

## Полная очистка (включая БД)

```bash
docker-compose down -v
```

---

## Типичные проблемы

### Порты заняты
Если порты 5173, 8000, 5432 или 6379 заняты, измените их в `docker-compose.yml`.

### Frontend не подключается к Backend
Убедитесь, что в `frontend/vite.config.ts` proxy настроен на `http://backend:8000`.

### Ошибка миграций
```bash
# Пересоздать БД
docker-compose down -v
docker-compose up -d postgres redis
docker-compose exec backend alembic upgrade head
```

---

**Готово! Приложение работает.**
