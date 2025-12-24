# 🚀 Инструкция по деплою на сервер 89.39.94.194

## 📋 Подготовка

### На вашей локальной машине:

1. **Создайте .env файл для production:**
```bash
cp .env.production.template .env
nano .env  # Заполните все значения
```

**Обязательно заполните:**
- `SECRET_KEY` - сгенерируйте: `openssl rand -hex 32`
- `DATABASE_URL` - нужен пароль от базы данных `aurelleu_aurelle_user`
- `CORS_ORIGINS` - укажите домены/IP

2. **Узнайте пароль от базы данных:**
   - Спросите у администратора сервера
   - Или проверьте в панели управления хостингом

---

## 🔧 Деплой на сервер

### Шаг 1: Подключитесь к серверу

```bash
ssh root@89.39.94.194
# Пароль: w2@nT*6D
```

### Шаг 2: Подготовка сервера

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить Docker (если не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установить Docker Compose (если не установлен)
apt install docker-compose -y
# или для новой версии:
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Создать директорию для проекта
mkdir -p /var/www/beauty_salon
cd /var/www/beauty_salon
```

### Шаг 3: Загрузить проект на сервер

**Вариант А: Через Git (если репозиторий есть)**
```bash
git clone <ваш-репозиторий> .
```

**Вариант Б: Через SCP (с локальной машины)**
```bash
# На вашей локальной машине:
scp -r . root@89.39.94.194:/var/www/beauty_salon/
```

**Вариант В: Через rsync (рекомендуется)**
```bash
# На вашей локальной машине:
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'venv' \
  . root@89.39.94.194:/var/www/beauty_salon/
```

### Шаг 4: Настроить переменные окружения

```bash
cd /var/www/beauty_salon

# Создать .env файл
nano .env
```

**Содержимое .env:**
```env
# БАЗА ДАННЫХ
# ВАЖНО: Замените ВАШ_ПАРОЛЬ_БД на реальный пароль!
DATABASE_URL=postgresql://aurelleu_aurelle_user:ВАШ_ПАРОЛЬ_БД@localhost:5432/aurelleu_aurelle_db

# SECRET_KEY (сгенерируйте новый!)
SECRET_KEY=ваш-сгенерированный-ключ-минимум-32-символа
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# REDIS
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ORIGINS=http://89.39.94.194,https://aurelle.uz

# ENVIRONMENT
ENVIRONMENT=production
LOG_LEVEL=INFO

# ALLOWED HOSTS
ALLOWED_HOSTS=89.39.94.194,aurelle.uz,api.aurelle.uz

# YANDEX MAPS
YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0
VITE_YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0

# API URL для фронтенда
VITE_API_URL=http://89.39.94.194/api
```

**Сохраните файл:** `Ctrl+O`, `Enter`, `Ctrl+X`

### Шаг 5: Запустить деплой

```bash
cd /var/www/beauty_salon

# Сделать скрипт исполняемым
chmod +x deploy/production/deploy.sh

# Запустить деплой
./deploy/production/deploy.sh
```

Или вручную:

```bash
# Собрать и запустить контейнеры
docker-compose -f deploy/production/docker-compose.prod-external-db.yml up -d --build

# Подождать 15 секунд
sleep 15

# Выполнить миграции
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend alembic upgrade head

# Проверить статус
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps
```

### Шаг 6: Инициализировать базу данных (первый раз)

```bash
# Создать начальные данные (опционально)
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend python init_db.py
```

---

## ✅ Проверка работы

### Проверить что все работает:

```bash
# Статус контейнеров
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps

# Логи backend
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs backend

# Логи frontend
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs frontend

# Логи nginx
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs nginx

# Проверить health endpoint
curl http://localhost:8000/health

# Проверить API
curl http://localhost/api/salons
```

### Открыть в браузере:

- **Frontend:** http://89.39.94.194
- **API:** http://89.39.94.194/api
- **API Docs:** http://89.39.94.194/api/docs

---

## 🔧 Полезные команды

### Перезапустить сервисы:
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml restart
```

### Остановить все:
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml down
```

### Посмотреть логи:
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs -f
```

### Войти в контейнер backend:
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend sh
```

### Обновить код:
```bash
# 1. Загрузить новый код (через git/scp/rsync)
# 2. Пересобрать и перезапустить
docker-compose -f deploy/production/docker-compose.prod-external-db.yml up -d --build
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend alembic upgrade head
```

---

## ⚠️ Важные замечания

1. **Пароль от базы данных** - обязательно нужен для подключения
2. **SECRET_KEY** - должен быть уникальным и секретным (минимум 32 символа)
3. **Порты** - убедитесь что порты 80 и 443 открыты в файрволе
4. **База данных** - должна быть доступна из контейнеров (localhost или IP)

---

## 🐛 Решение проблем

### Backend не запускается:
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs backend
# Проверьте DATABASE_URL и SECRET_KEY
```

### Ошибка подключения к БД:
- Проверьте пароль в DATABASE_URL
- Убедитесь что PostgreSQL слушает на нужном порту
- Проверьте что БД существует

### Frontend не работает:
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs frontend
# Проверьте VITE_API_URL в .env
```

### Nginx ошибки:
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec nginx nginx -t
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs nginx
```

---

## 📞 Поддержка

Если что-то не работает:
1. Проверьте логи всех сервисов
2. Проверьте .env файл
3. Убедитесь что база данных доступна
4. Проверьте что порты открыты

