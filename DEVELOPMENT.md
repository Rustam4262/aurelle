# Development Guide - Beauty Salon Marketplace

Гайд для разработчиков: команды, утилиты, tips & tricks.

---

## Быстрые команды

### Docker

```bash
# Запуск всех сервисов
docker-compose up

# Запуск в фоне
docker-compose up -d

# Пересборка (после изменений в Dockerfile/requirements.txt)
docker-compose up --build

# Остановка
docker-compose down

# Остановка + удаление volumes (БД будет очищена!)
docker-compose down -v

# Просмотр логов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend

# Рестарт одного сервиса
docker-compose restart backend

# Exec в контейнер
docker-compose exec backend bash
docker-compose exec postgres psql -U beauty_user -d beauty_salon_db
```

### Backend (локально без Docker)

```bash
cd backend

# Создать venv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt

# Запустить сервер
uvicorn app.main:app --reload --port 8000

# Открыть Swagger docs
open http://localhost:8000/docs

# Миграции (см. раздел Alembic ниже)
alembic upgrade head
alembic revision --autogenerate -m "add new table"
```

### Frontend (локально без Docker)

```bash
cd frontend

# Установить зависимости
npm install

# Запустить dev-сервер
npm run dev

# Собрать production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint

# Открыть в браузере
open http://localhost:5173
```

---

## Alembic (миграции БД)

### Базовые команды

```bash
cd backend

# Создать новую миграцию (автогенерация)
alembic revision --autogenerate -m "описание изменений"

# Применить все миграции
alembic upgrade head

# Откатить последнюю миграцию
alembic downgrade -1

# Откатить все миграции
alembic downgrade base

# Показать текущую версию БД
alembic current

# История миграций
alembic history

# Применить конкретную миграцию
alembic upgrade <revision_id>
```

### Примеры

```bash
# Добавили новую модель Master
alembic revision --autogenerate -m "add masters table"
alembic upgrade head

# Добавили поле в существующую таблицу
alembic revision --autogenerate -m "add logo_url to salons"
alembic upgrade head

# Откат изменений
alembic downgrade -1
```

---

## База данных

### Подключение к PostgreSQL

#### Через Docker

```bash
# Из контейнера
docker-compose exec postgres psql -U beauty_user -d beauty_salon_db

# С хоста (если порт прокинут)
psql -h localhost -p 5432 -U beauty_user -d beauty_salon_db
```

#### Полезные SQL команды

```sql
-- Список таблиц
\dt

-- Структура таблицы
\d users

-- Посмотреть всех пользователей
SELECT * FROM users;

-- Сделать пользователя админом
UPDATE users SET role = 'admin' WHERE id = 1;

-- Посмотреть записи
SELECT b.id, u.name as client, s.name as salon, b.status, b.start_at
FROM bookings b
JOIN users u ON b.client_id = u.id
JOIN salons s ON b.salon_id = s.id;

-- Статистика по салонам
SELECT s.name, COUNT(b.id) as bookings_count, AVG(r.rating) as avg_rating
FROM salons s
LEFT JOIN bookings b ON s.id = b.salon_id
LEFT JOIN reviews r ON s.id = r.salon_id
GROUP BY s.id, s.name;

-- Выход
\q
```

### Бэкап и восстановление

```bash
# Бэкап
docker-compose exec postgres pg_dump -U beauty_user beauty_salon_db > backup.sql

# Восстановление
docker-compose exec -T postgres psql -U beauty_user -d beauty_salon_db < backup.sql
```

---

## Redis

### Подключение к Redis

```bash
# Из контейнера
docker-compose exec redis redis-cli

# С хоста
redis-cli -h localhost -p 6379
```

### Полезные команды Redis

```redis
# Посмотреть все ключи
KEYS *

# Получить значение
GET key_name

# Установить значение
SET key_name "value"

# Удалить ключ
DEL key_name

# Очистить всю БД (осторожно!)
FLUSHDB

# Информация о Redis
INFO

# Выход
exit
```

---

## API тестирование

### С помощью curl

```bash
# Регистрация
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "+998901234567", "name": "Test User", "password": "123456", "role": "client"}'

# Логин
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+998901234567", "password": "123456"}' | jq -r '.access_token')

# Использовать токен
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### С помощью HTTPie (более читаемо)

```bash
# Установка
pip install httpie

# Регистрация
http POST localhost:8000/api/auth/register \
  phone="+998901234567" name="Test User" password="123456" role="client"

# Логин
http POST localhost:8000/api/auth/login \
  phone="+998901234567" password="123456"

# С токеном
http GET localhost:8000/api/users/me \
  "Authorization: Bearer $TOKEN"
```

### Postman / Insomnia

1. Импортировать OpenAPI spec: `http://localhost:8000/openapi.json`
2. Создать environment переменную `access_token`
3. Настроить Authorization: Bearer Token → `{{access_token}}`

---

## Debugging

### Backend (Python)

```python
# Добавить breakpoint
import pdb; pdb.set_trace()

# Или (Python 3.7+)
breakpoint()

# Логирование
import logging
logger = logging.getLogger(__name__)
logger.info("Debug message")
logger.error("Error message")
```

### Frontend (TypeScript)

```typescript
// Console log
console.log("Debug:", variable)

// Breakpoint в Chrome DevTools
debugger;

// React DevTools (browser extension)
// Network tab для просмотра API запросов
```

### Docker logs в реальном времени

```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Последние 100 строк
docker-compose logs --tail=100 backend
```

---

## Линтинг и форматирование

### Backend (Python)

```bash
cd backend

# Black (форматирование)
pip install black
black app/

# Flake8 (линтинг)
pip install flake8
flake8 app/

# isort (сортировка импортов)
pip install isort
isort app/
```

### Frontend (TypeScript)

```bash
cd frontend

# ESLint
npm run lint

# Prettier (форматирование)
npm install --save-dev prettier
npx prettier --write "src/**/*.{ts,tsx}"
```

---

## Тесты (TODO)

### Backend

```bash
cd backend

# Установить pytest
pip install pytest pytest-asyncio

# Запустить тесты
pytest

# С покрытием
pytest --cov=app tests/
```

### Frontend

```bash
cd frontend

# Установить vitest
npm install --save-dev vitest

# Запустить тесты
npm run test

# Watch mode
npm run test:watch
```

---

## Полезные скрипты

### Сброс БД и создание тестовых данных

```bash
# backend/scripts/reset_db.sh
docker-compose down -v
docker-compose up -d postgres redis
sleep 5
docker-compose exec backend alembic upgrade head
docker-compose exec backend python scripts/seed_data.py
```

### Создание seed данных

```python
# backend/scripts/seed_data.py
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()

# Создать админа
admin = User(
    phone="+998900000000",
    name="Admin",
    hashed_password=get_password_hash("admin123"),
    role="admin"
)
db.add(admin)

# Создать тестовый салон, услуги и т.д.
# ...

db.commit()
print("Seed data created!")
```

---

## Environment Variables

### Backend (.env)

```env
# Development
DATABASE_URL=postgresql://beauty_user:beauty_pass@localhost:5432/beauty_salon_db
SECRET_KEY=dev-secret-key
REDIS_URL=redis://localhost:6379/0

# Production
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/beauty_db
SECRET_KEY=super-secret-production-key-xyz
REDIS_URL=redis://prod-redis:6379/0
```

### Frontend (.env)

```env
# Development
VITE_API_URL=http://localhost:8000/api

# Production
VITE_API_URL=https://api.beautysalon.uz/api
```

---

## Git workflow

### Создание новой фичи

```bash
# Создать ветку
git checkout -b feature/masters-calendar

# Работа над фичей
git add .
git commit -m "feat: add masters calendar endpoint"

# Push
git push origin feature/masters-calendar

# Создать Pull Request на GitHub/GitLab
```

### Commit message convention

```
feat: новая фича
fix: исправление бага
docs: обновление документации
style: форматирование кода
refactor: рефакторинг
test: добавление тестов
chore: обновление зависимостей, конфиги
```

---

## Production деплой

### На VPS (Ubuntu)

```bash
# 1. Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. Клонировать проект
git clone https://github.com/your-repo/beauty_salon.git
cd beauty_salon

# 3. Настроить .env для production
nano .env

# 4. Запустить
docker-compose up -d --build

# 5. Миграции
docker-compose exec backend alembic upgrade head

# 6. Создать админа
docker-compose exec backend python scripts/create_admin.py
```

### С Nginx

```nginx
# /etc/nginx/sites-available/beautysalon

server {
    listen 80;
    server_name beautysalon.uz www.beautysalon.uz;

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

```bash
# Включить сайт
sudo ln -s /etc/nginx/sites-available/beautysalon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d beautysalon.uz -d www.beautysalon.uz
```

---

## Troubleshooting

### Проблема: Backend не запускается

```bash
# Проверить логи
docker-compose logs backend

# Проверить БД
docker-compose exec postgres psql -U beauty_user -d beauty_salon_db

# Пересоздать контейнеры
docker-compose down
docker-compose up --build
```

### Проблема: Frontend не видит Backend

```bash
# Проверить proxy в vite.config.ts
# Должно быть: target: 'http://backend:8000'

# Или использовать VITE_API_URL в .env
VITE_API_URL=http://localhost:8000/api
```

### Проблема: Миграции не применяются

```bash
# Проверить alembic/env.py (импортированы ли все модели)
# Удалить alembic/versions/*.py и создать заново
rm alembic/versions/*.py
alembic revision --autogenerate -m "initial migration"
alembic upgrade head
```

---

## Полезные ресурсы

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev/
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org/
- **Alembic Docs**: https://alembic.sqlalchemy.org/
- **Docker Docs**: https://docs.docker.com/

---

**Happy coding!** 🚀
