# 🚀 Руководство по развертыванию aurelle.uz

Это полное руководство по развертыванию платформы aurelle.uz в production.

## 📋 Содержание

1. [Требования](#требования)
2. [Подготовка сервера](#подготовка-сервера)
3. [Настройка домена](#настройка-домена)
4. [Развертывание с Docker](#развертывание-с-docker)
5. [Настройка SSL (HTTPS)](#настройка-ssl-https)
6. [Переменные окружения](#переменные-окружения)
7. [Мониторинг и логи](#мониторинг-и-логи)
8. [Бэкапы](#бэкапы)
9. [Обновление](#обновление)
10. [Troubleshooting](#troubleshooting)

---

## 🖥️ Требования

### Минимальные требования к серверу:
- **OS:** Ubuntu 22.04 LTS (рекомендуется) или CentOS 8+
- **CPU:** 4 ядра (минимум 2)
- **RAM:** 8 GB (минимум 4 GB)
- **Disk:** 50 GB SSD
- **Сеть:** Статический IP адрес

### Необходимое ПО:
- Docker 24.0+
- Docker Compose 2.20+
- Git
- Nginx (опционально, если не используете Docker)

---

## 🔧 Подготовка сервера

### 1. Подключение к серверу

```bash
ssh root@ваш_ip_адрес
# или
ssh user@ваш_ip_адрес
```

### 2. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Установка Docker и Docker Compose

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление текущего пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker-compose --version
```

### 4. Настройка firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Проверка статуса
sudo ufw status
```

### 5. Установка дополнительных инструментов

```bash
sudo apt install -y git curl wget nano htop net-tools
```

---

## 🌐 Настройка домена

### 1. DNS записи

В панели управления вашего регистратора доменов добавьте следующие записи:

```
Тип    Имя          Значение              TTL
A      @            ваш_ip_адрес          3600
A      www          ваш_ip_адрес          3600
A      api          ваш_ip_адрес          3600
CNAME  www          aurelle.uz            3600
```

### 2. Проверка DNS

```bash
# Проверка A записи
dig aurelle.uz +short

# Проверка CNAME
dig www.aurelle.uz +short

# Или используйте ping
ping aurelle.uz
```

**Важно:** DNS изменения могут занять до 24-48 часов для полного распространения.

---

## 🐳 Развертывание с Docker

### 1. Клонирование репозитория

```bash
# Создание директории для проекта
mkdir -p /var/www
cd /var/www

# Клонирование из GitHub
git clone https://github.com/ваш-username/aurelle.git
cd aurelle

# Или, если репозиторий приватный
git clone https://ваш_токен@github.com/ваш-username/aurelle.git
```

### 2. Создание .env файла

```bash
# Копирование примера
cp backend/.env.example .env

# Редактирование переменных окружения
nano .env
```

**Важно:** Обязательно измените следующие переменные:
- `SECRET_KEY` - должен быть минимум 32 символа
- `POSTGRES_PASSWORD` - надежный пароль для БД
- `REDIS_PASSWORD` - надежный пароль для Redis
- `SMTP_*` - настройки вашего SMTP сервера
- `SMS_*` - настройки SMS провайдера

### 3. Генерация секретных ключей

```bash
# Генерация SECRET_KEY (Python)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Или используйте OpenSSL
openssl rand -base64 32
```

### 4. Сборка и запуск контейнеров

```bash
# Сборка образов
docker-compose -f docker-compose.prod.yml build

# Запуск в фоновом режиме
docker-compose -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps
```

### 5. Проверка логов

```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f celery_worker
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### 6. Инициализация базы данных

```bash
# Миграции выполняются автоматически при старте backend
# Но вы можете запустить их вручную:

docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
docker-compose -f docker-compose.prod.yml exec backend python init_db.py
```

---

## 🔒 Настройка SSL (HTTPS)

### Вариант 1: Let's Encrypt с Certbot (Рекомендуется)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d aurelle.uz -d www.aurelle.uz -d api.aurelle.uz

# Автоматическое обновление (добавляется автоматически)
sudo certbot renew --dry-run
```

### Вариант 2: Ручная настройка SSL

1. Поместите SSL сертификаты в `deploy/nginx/ssl/`:
   ```
   deploy/nginx/ssl/
   ├── aurelle.uz.crt
   ├── aurelle.uz.key
   └── ca-bundle.crt
   ```

2. Обновите nginx конфигурацию в `deploy/nginx/conf.d/aurelle.conf`

3. Перезапустите nginx:
   ```bash
   docker-compose -f docker-compose.prod.yml restart nginx
   ```

---

## ⚙️ Переменные окружения

### Полный список переменных для `.env`:

```bash
# ==========================================
# DATABASE
# ==========================================
POSTGRES_USER=beauty_user
POSTGRES_PASSWORD=ИЗМЕНИТЕ_ЭТО_НА_НАДЕЖНЫЙ_ПАРОЛЬ
POSTGRES_DB=beauty_salon_db
POSTGRES_PORT=5432

# ==========================================
# REDIS
# ==========================================
REDIS_PASSWORD=ИЗМЕНИТЕ_ЭТО_НА_НАДЕЖНЫЙ_ПАРОЛЬ
REDIS_PORT=6379

# ==========================================
# BACKEND
# ==========================================
ENVIRONMENT=production
SECRET_KEY=СГЕНЕРИРУЙТЕ_СЛУЧАЙНЫЙ_КЛЮЧ_МИНИМУМ_32_СИМВОЛА
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# CORS (ваш домен)
CORS_ORIGINS=https://aurelle.uz,https://www.aurelle.uz,https://api.aurelle.uz

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60

# ==========================================
# EMAIL / SMTP
# ==========================================
# Используйте Gmail, SendGrid, Mailgun или свой SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ваш_email@gmail.com
SMTP_PASSWORD=ваш_app_password
FROM_EMAIL=noreply@aurelle.uz
FROM_NAME=aurelle.uz
EMAIL_ENABLED=true

# ==========================================
# SMS
# ==========================================
# Рекомендуется Eskiz.uz для Узбекистана
SMS_PROVIDER=eskiz
SMS_API_KEY=ваш_eskiz_api_key
SMS_API_URL=https://notify.eskiz.uz/api
SMS_SENDER_NAME=aurelle.uz
SMS_ENABLED=true

# Для Twilio (если используете)
# TWILIO_ACCOUNT_SID=ваш_twilio_sid
# TWILIO_AUTH_TOKEN=ваш_twilio_token
# TWILIO_PHONE_NUMBER=+998XXXXXXXXX

# ==========================================
# YANDEX MAPS
# ==========================================
YANDEX_MAPS_API_KEY=ваш_yandex_maps_api_key

# ==========================================
# SENTRY (Опционально)
# ==========================================
SENTRY_DSN=ваш_sentry_dsn
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# ==========================================
# PAYMENT SYSTEMS
# ==========================================
# Payme
PAYME_MERCHANT_ID=ваш_payme_merchant_id
PAYME_SECRET_KEY=ваш_payme_secret_key

# Click
CLICK_SERVICE_ID=ваш_click_service_id
CLICK_SECRET_KEY=ваш_click_secret_key

# Uzum
UZUM_MERCHANT_ID=ваш_uzum_merchant_id
UZUM_SECRET_KEY=ваш_uzum_secret_key

# ==========================================
# CELERY / FLOWER
# ==========================================
FLOWER_USER=admin
FLOWER_PASSWORD=ИЗМЕНИТЕ_ЭТО_НА_НАДЕЖНЫЙ_ПАРОЛЬ

# ==========================================
# FRONTEND
# ==========================================
VITE_API_URL=https://api.aurelle.uz
VITE_YANDEX_MAPS_API_KEY=${YANDEX_MAPS_API_KEY}
```

---

## 📊 Мониторинг и логи

### 1. Docker контейнеры

```bash
# Статус всех контейнеров
docker-compose -f docker-compose.prod.yml ps

# Использование ресурсов
docker stats

# Логи
docker-compose -f docker-compose.prod.yml logs -f [service_name]
```

### 2. Flower - мониторинг Celery

Откройте в браузере: `http://ваш_ip:5555`

Логин: `admin` (или значение `FLOWER_USER`)
Пароль: `admin` (или значение `FLOWER_PASSWORD`)

**Важно:** В production рекомендуется закрыть порт 5555 в firewall и использовать Nginx reverse proxy с SSL.

### 3. Системные логи

```bash
# Nginx логи
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/error.log

# Backend логи
docker-compose -f docker-compose.prod.yml logs -f backend

# Celery логи
docker-compose -f docker-compose.prod.yml logs -f celery_worker
docker-compose -f docker-compose.prod.yml logs -f celery_beat
```

### 4. Настройка Sentry (рекомендуется)

1. Зарегистрируйтесь на [sentry.io](https://sentry.io)
2. Создайте новый проект
3. Скопируйте DSN и добавьте в `.env`:
   ```
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```
4. Перезапустите backend:
   ```bash
   docker-compose -f docker-compose.prod.yml restart backend
   ```

---

## 💾 Бэкапы

### 1. Автоматический бэкап PostgreSQL

Создайте скрипт `/var/www/aurelle/scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/www/aurelle/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="aurelle_db_${TIMESTAMP}.sql.gz"

# Создание директории для бэкапов
mkdir -p ${BACKUP_DIR}

# Экспорт базы данных
docker-compose -f /var/www/aurelle/docker-compose.prod.yml exec -T postgres \
    pg_dump -U beauty_user beauty_salon_db | gzip > ${BACKUP_DIR}/${BACKUP_FILE}

# Удаление старых бэкапов (старше 30 дней)
find ${BACKUP_DIR} -name "aurelle_db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

Сделайте скрипт исполняемым:
```bash
chmod +x /var/www/aurelle/scripts/backup.sh
```

### 2. Настройка cron для автоматических бэкапов

```bash
# Редактирование crontab
crontab -e

# Добавьте строку для ежедневного бэкапа в 3:00
0 3 * * * /var/www/aurelle/scripts/backup.sh >> /var/log/aurelle_backup.log 2>&1
```

### 3. Восстановление из бэкапа

```bash
# Распаковка и восстановление
gunzip -c /var/www/aurelle/backups/aurelle_db_20241215_030000.sql.gz | \
    docker-compose -f docker-compose.prod.yml exec -T postgres \
    psql -U beauty_user -d beauty_salon_db
```

---

## 🔄 Обновление

### 1. Обновление кода

```bash
cd /var/www/aurelle

# Получить последние изменения
git pull origin main

# Пересобрать и перезапустить контейнеры
docker-compose -f docker-compose.prod.yml up -d --build

# Применить миграции (если есть)
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### 2. Откат к предыдущей версии

```bash
# Посмотреть коммиты
git log --oneline

# Откат к конкретному коммиту
git checkout <commit_hash>

# Пересобрать контейнеры
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Zero-downtime deployment (без простоя)

Для обновления без остановки сервиса используйте rolling update:

```bash
# Сборка новых образов
docker-compose -f docker-compose.prod.yml build

# Постепенное обновление сервисов
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend
docker-compose -f docker-compose.prod.yml up -d --no-deps --build frontend
docker-compose -f docker-compose.prod.yml up -d --no-deps --build celery_worker
```

---

## 🔍 Troubleshooting

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs [service_name]

# Проверить статус
docker-compose -f docker-compose.prod.yml ps

# Перезапустить конкретный сервис
docker-compose -f docker-compose.prod.yml restart [service_name]
```

### Проблема: База данных недоступна

```bash
# Проверить статус PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U beauty_user

# Подключиться к базе данных
docker-compose -f docker-compose.prod.yml exec postgres psql -U beauty_user -d beauty_salon_db

# Проверить логи
docker-compose -f docker-compose.prod.yml logs postgres
```

### Проблема: Email не отправляются

```bash
# Проверить логи Celery worker
docker-compose -f docker-compose.prod.yml logs celery_worker

# Проверить настройки SMTP в .env
docker-compose -f docker-compose.prod.yml exec backend env | grep SMTP

# Проверить подключение к SMTP
docker-compose -f docker-compose.prod.yml exec backend python -c "
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
print('SMTP connection successful')
"
```

### Проблема: WebSocket не работает

```bash
# Проверить конфигурацию Nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Проверить что WebSocket endpoints доступны
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
    http://localhost:8000/api/ws/notifications
```

### Проблема: Высокое использование памяти

```bash
# Проверить использование ресурсов
docker stats

# Очистить неиспользуемые образы и контейнеры
docker system prune -a

# Перезапустить контейнеры с ограничениями
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи всех сервисов
2. Убедитесь, что все переменные окружения настроены правильно
3. Проверьте доступность портов и firewall
4. Обратитесь к документации конкретного сервиса

---

## ✅ Чеклист перед запуском в production

- [ ] Все переменные окружения настроены
- [ ] SECRET_KEY изменен на случайное значение
- [ ] Пароли БД и Redis изменены
- [ ] SMTP настроен и протестирован
- [ ] SMS провайдер настроен
- [ ] SSL сертификат установлен
- [ ] Firewall настроен
- [ ] DNS записи добавлены и работают
- [ ] Бэкапы настроены
- [ ] Мониторинг (Sentry) настроен
- [ ] Логи проверены на наличие ошибок
- [ ] Функциональное тестирование выполнено

---

**Готово! Ваша платформа aurelle.uz готова к работе! 🎉**
