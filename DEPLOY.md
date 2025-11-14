# 🚀 Production Deployment Guide

Гайд по развёртыванию Beauty Salon Marketplace на production сервере.

---

## 📋 Требования

### Сервер (VPS/Dedicated)

- **OS**: Ubuntu 20.04+ / Debian 11+
- **RAM**: минимум 2GB (рекомендуется 4GB)
- **CPU**: 2+ cores
- **Disk**: минимум 20GB SSD
- **Network**: публичный IP адрес
- **Domain**: (опционально) beautysalon.uz

### Установленное ПО

- Docker & Docker Compose
- Nginx (для reverse proxy)
- Git
- Certbot (для SSL)

---

## 🔧 Пошаговая установка

### Шаг 1: Подключение к серверу

```bash
ssh root@your-server-ip
```

### Шаг 2: Обновление системы

```bash
apt update && apt upgrade -y
apt install -y git curl wget nano
```

### Шаг 3: Установка Docker

```bash
# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Добавить текущего пользователя в группу docker
usermod -aG docker $USER

# Установить Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Проверка
docker --version
docker-compose --version
```

### Шаг 4: Клонирование проекта

```bash
# Создать директорию для проектов
mkdir -p /opt/apps
cd /opt/apps

# Клонировать репозиторий
git clone https://github.com/your-username/beauty_salon.git
cd beauty_salon
```

### Шаг 5: Настройка окружения

```bash
# Скопировать и отредактировать .env
cp .env.example .env
nano .env
```

**Важно! Измени следующие параметры:**

```env
# Production database
DATABASE_URL=postgresql://beauty_user:STRONG_PASSWORD_HERE@postgres:5432/beauty_salon_db

# ОБЯЗАТЕЛЬНО! Смени secret key на случайную строку
SECRET_KEY=GENERATE_RANDOM_STRING_HERE_32_CHARS_MIN

# Если используешь домен
CORS_ORIGINS=https://beautysalon.uz,https://www.beautysalon.uz

# Платежи (когда будут готовы)
PAYME_MERCHANT_ID=your_merchant_id
CLICK_MERCHANT_ID=your_merchant_id

# SMS provider
SMS_PROVIDER_API_KEY=your_api_key
```

**Генерация SECRET_KEY:**

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Шаг 6: Настройка Docker Compose для production

Создай `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: beauty_db
    restart: always
    environment:
      POSTGRES_USER: beauty_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: beauty_salon_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - beauty_network

  redis:
    image: redis:7-alpine
    container_name: beauty_redis
    restart: always
    networks:
      - beauty_network

  backend:
    build: ./backend
    container_name: beauty_backend
    restart: always
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    networks:
      - beauty_network

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: ${VITE_API_URL}
    container_name: beauty_frontend
    restart: always
    command: npm run preview -- --host --port 5173
    depends_on:
      - backend
    networks:
      - beauty_network

  nginx:
    image: nginx:alpine
    container_name: beauty_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    networks:
      - beauty_network

volumes:
  postgres_data:

networks:
  beauty_network:
    driver: bridge
```

### Шаг 7: Nginx конфигурация

Создай `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:5173;
    }

    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name beautysalon.uz www.beautysalon.uz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name beautysalon.uz www.beautysalon.uz;

        # SSL certificates (после получения от Let's Encrypt)
        ssl_certificate /etc/letsencrypt/live/beautysalon.uz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/beautysalon.uz/privkey.pem;

        # SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Backend API
        location /api {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API Docs
        location /docs {
            proxy_pass http://backend;
            proxy_set_header Host $host;
        }

        location /openapi.json {
            proxy_pass http://backend;
            proxy_set_header Host $host;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # File upload limit
        client_max_body_size 10M;

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }
}
```

### Шаг 8: Запуск приложения

```bash
# Сборка и запуск
docker-compose -f docker-compose.prod.yml up -d --build

# Применить миграции
docker-compose exec backend alembic upgrade head

# Проверка логов
docker-compose logs -f
```

### Шаг 9: SSL сертификат (Let's Encrypt)

```bash
# Установить Certbot
apt install -y certbot

# Получить сертификат (временно останови nginx)
docker-compose stop nginx

certbot certonly --standalone \
  -d beautysalon.uz \
  -d www.beautysalon.uz \
  --email admin@beautysalon.uz \
  --agree-tos \
  --no-eff-email

# Перезапустить nginx
docker-compose start nginx

# Автообновление сертификата (cron)
echo "0 3 * * * certbot renew --quiet && docker-compose restart nginx" | crontab -
```

### Шаг 10: Создание первого админа

```bash
# Через API
curl -X POST https://beautysalon.uz/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+998901111111",
    "email": "admin@beautysalon.uz",
    "name": "Admin",
    "password": "STRONG_PASSWORD",
    "role": "admin"
  }'

# Или через БД
docker-compose exec postgres psql -U beauty_user -d beauty_salon_db
UPDATE users SET role = 'admin' WHERE id = 1;
```

---

## 🔐 Безопасность

### Firewall (UFW)

```bash
# Установить UFW
apt install -y ufw

# Разрешить SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Включить
ufw enable
ufw status
```

### Fail2Ban (защита от брутфорса)

```bash
apt install -y fail2ban

# Создать конфиг
nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
```

```bash
systemctl enable fail2ban
systemctl start fail2ban
```

### Регулярные бэкапы БД

```bash
# Создать скрипт бэкапа
nano /opt/backup_db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U beauty_user beauty_salon_db | \
  gzip > "$BACKUP_DIR/beauty_db_$DATE.sql.gz"

# Удалить старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

```bash
chmod +x /opt/backup_db.sh

# Добавить в cron (каждый день в 2:00)
echo "0 2 * * * /opt/backup_db.sh" | crontab -
```

---

## 📊 Мониторинг

### Docker logs

```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Последние 100 строк
docker-compose logs --tail=100 backend
```

### Мониторинг ресурсов

```bash
# CPU/RAM использование
docker stats

# Место на диске
df -h

# Запущенные контейнеры
docker ps
```

### Logrotate (ротация логов)

```bash
nano /etc/logrotate.d/docker
```

```
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
```

---

## 🔄 Обновление приложения

```bash
cd /opt/apps/beauty_salon

# Остановить сервисы
docker-compose down

# Получить последние изменения
git pull origin main

# Пересобрать и запустить
docker-compose -f docker-compose.prod.yml up -d --build

# Применить миграции
docker-compose exec backend alembic upgrade head

# Проверить логи
docker-compose logs -f
```

---

## 🆘 Troubleshooting

### Проблема: Backend не отвечает

```bash
# Проверить логи
docker-compose logs backend

# Перезапустить
docker-compose restart backend
```

### Проблема: База данных недоступна

```bash
# Проверить статус
docker-compose exec postgres pg_isready -U beauty_user

# Восстановить из бэкапа
gunzip < /opt/backups/beauty_db_20250114.sql.gz | \
  docker-compose exec -T postgres psql -U beauty_user -d beauty_salon_db
```

### Проблема: Недостаточно места на диске

```bash
# Очистить неиспользуемые образы
docker system prune -a

# Очистить логи
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

---

## 📈 Масштабирование

### Вертикальное (больше ресурсов)

1. Увеличить RAM/CPU сервера
2. Увеличить workers в backend:

```yaml
backend:
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 8
```

### Горизонтальное (больше серверов)

1. Вынести PostgreSQL на отдельный сервер (managed DB)
2. Несколько backend инстансов за load balancer
3. CDN для статики (Cloudflare)
4. Redis cluster для кеша

---

## ✅ Production Checklist

```
[ ] .env настроен с production значениями
[ ] SECRET_KEY заменён на случайный
[ ] CORS_ORIGINS обновлены для домена
[ ] SSL сертификат получен и настроен
[ ] Firewall (UFW) включён
[ ] Fail2Ban настроен
[ ] Автоматические бэкапы БД настроены
[ ] Logrotate настроен
[ ] Мониторинг запущен
[ ] Первый админ создан
[ ] Тестовые салоны созданы
[ ] DNS настроен (A record → server IP)
[ ] Email/SMS уведомления настроены (опционально)
```

---

## 🌐 DNS настройка

### На Cloudflare / другом DNS провайдере:

```
Type: A
Name: beautysalon.uz
Content: YOUR_SERVER_IP
Proxy: Enabled (если используешь Cloudflare CDN)

Type: A
Name: www
Content: YOUR_SERVER_IP
Proxy: Enabled
```

---

## 💰 Стоимость хостинга (примерно)

- **DigitalOcean Droplet** (4GB RAM, 2 CPU): $24/месяц
- **AWS EC2 t3.medium**: ~$30/месяц
- **Hetzner VPS** (4GB RAM): €8/месяц
- **Domain** (.uz): ~$15/год
- **SSL**: бесплатно (Let's Encrypt)

**Итого:** ~$10-30/месяц для старта

---

**Production готов!** 🚀

Теперь твоё приложение доступно по адресу: https://beautysalon.uz
