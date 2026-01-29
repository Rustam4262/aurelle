# AURELLE - Руководство по деплою на сервер

## Подготовка к деплою

### 1. Требования к серверу

- **ОС**: Ubuntu 20.04/22.04 или Debian 11/12
- **Node.js**: версия 18.x или выше
- **PostgreSQL**: версия 14 или выше
- **RAM**: минимум 2GB (рекомендуется 4GB)
- **Диск**: минимум 10GB свободного места
- **Домен**: с настроенным SSL сертификатом (Let's Encrypt)

### 2. Установка зависимостей на сервере

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Установка Nginx
sudo apt install -y nginx

# Установка Certbot для SSL
sudo apt install -y certbot python3-certbot-nginx

# Установка PM2 (менеджер процессов)
sudo npm install -g pm2
```

### 3. Настройка PostgreSQL

```bash
# Подключение к PostgreSQL
sudo -u postgres psql

# Создание базы данных и пользователя
CREATE DATABASE aurelle;
CREATE USER aurelle_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE aurelle TO aurelle_user;
ALTER DATABASE aurelle OWNER TO aurelle_user;

# Выход
\q
```

### 4. Настройка Nginx

Создайте конфигурацию Nginx:

```bash
sudo nano /etc/nginx/sites-available/aurelle
```

Добавьте следующий конфиг (замените `your-domain.com` на ваш домен):

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client max body size (for uploads)
    client_max_body_size 50M;

    # Proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/aurelle /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Получение SSL сертификата

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 6. Клонирование и настройка проекта

```bash
# Создание директории для проекта
sudo mkdir -p /var/www/aurelle
sudo chown -R $USER:$USER /var/www/aurelle
cd /var/www/aurelle

# Клонирование проекта (замените на ваш репозиторий)
git clone https://github.com/your-username/aurelle.git .

# Установка зависимостей
npm install

# Сборка проекта
npm run build
```

### 7. Настройка переменных окружения

Создайте файл `.env` для продакшена:

```bash
nano .env
```

Добавьте следующие переменные:

```env
# Database (замените на ваши данные)
DATABASE_URL=postgresql://aurelle_user:your_secure_password_here@localhost:5432/aurelle

# Session Secret (сгенерируйте случайную строку минимум 64 символа)
SESSION_SECRET=your-very-long-random-secret-key-min-64-chars-change-this-to-random-string

# Production settings
NODE_ENV=production
PORT=5000

# OAuth Providers

# Google OAuth (обновите Redirect URI на https://your-domain.com/api/auth/google/callback)
GOOGLE_CLIENT_ID=60089668488-9gvr0ahqda3neh2p3dsdvbofd39piguj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Yandex OAuth (обновите Redirect URI на https://your-domain.com/api/auth/yandex/callback)
YANDEX_CLIENT_ID=3b79a753092d49bb977ce1ec5b3017ec
YANDEX_CLIENT_SECRET=3086c3c9bf844b5298f801005307e4d4

# GitHub OAuth (если используете)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Phone Authentication (если используете Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SERVICE_SID=
```

**ВАЖНО**: Сгенерируйте новый SESSION_SECRET для продакшена:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 8. Инициализация базы данных

```bash
# Push схемы в базу данных
npm run db:push

# Опционально: загрузка тестовых данных
# npm run db:seed
```

### 9. Обновление OAuth Redirect URIs

#### Google OAuth Console:

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. Credentials → OAuth 2.0 Client IDs
4. Добавьте в Authorized redirect URIs:
   ```
   https://your-domain.com/api/auth/google/callback
   ```

#### Yandex OAuth:

1. Перейдите на [Яндекс OAuth](https://oauth.yandex.ru/)
2. Откройте ваше приложение
3. Добавьте в Redirect URI:
   ```
   https://your-domain.com/api/auth/yandex/callback
   ```

#### GitHub OAuth (если используете):

1. Перейдите в [GitHub Developer Settings](https://github.com/settings/developers)
2. Откройте ваше OAuth App
3. Обновите Authorization callback URL:
   ```
   https://your-domain.com/api/auth/github/callback
   ```

### 10. Запуск приложения с PM2

```bash
# Запуск приложения
pm2 start npm --name "aurelle" -- start

# Автозапуск при перезагрузке сервера
pm2 startup
pm2 save

# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs aurelle

# Перезапуск приложения
pm2 restart aurelle

# Остановка приложения
pm2 stop aurelle
```

### 11. Мониторинг и логи

```bash
# Просмотр логов в реальном времени
pm2 logs aurelle --lines 100

# Мониторинг ресурсов
pm2 monit

# Информация о процессе
pm2 info aurelle

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Обновление приложения

### Автоматическое обновление через Git

```bash
cd /var/www/aurelle

# Получение последних изменений
git pull origin main

# Установка новых зависимостей
npm install

# Пересборка проекта
npm run build

# Обновление схемы БД (если нужно)
npm run db:push

# Перезапуск приложения
pm2 restart aurelle

# Очистка кэша PM2 (если нужно)
pm2 flush
```

### Скрипт автоматического деплоя

Создайте файл `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest changes
echo "�� Pulling latest changes from git..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build application
echo "🔨 Building application..."
npm run build

# Update database schema
echo "🗄️  Updating database schema..."
npm run db:push

# Restart application
echo "♻️  Restarting application..."
pm2 restart aurelle

echo "✅ Deployment completed successfully!"
```

Сделайте скрипт исполняемым:

```bash
chmod +x deploy.sh
```

Запуск деплоя:

```bash
./deploy.sh
```

## Резервное копирование

### Автоматический бэкап базы данных

Создайте скрипт бэкапа `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/aurelle"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/aurelle_backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U aurelle_user -h localhost aurelle > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Настройте cron для автоматического бэкапа (каждый день в 2:00):

```bash
crontab -e
```

Добавьте строку:

```
0 2 * * * /var/www/aurelle/backup.sh >> /var/log/aurelle_backup.log 2>&1
```

## Безопасность

### 1. Firewall (UFW)

```bash
# Разрешить SSH
sudo ufw allow ssh

# Разрешить HTTP и HTTPS
sudo ufw allow 'Nginx Full'

# Включить firewall
sudo ufw enable

# Проверить статус
sudo ufw status
```

### 2. Регулярные обновления

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Обновление Node.js зависимостей
npm audit fix
```

### 3. Ограничение доступа к базе данных

Отредактируйте `/etc/postgresql/*/main/pg_hba.conf`:

```
# Разрешить подключение только с localhost
local   all             aurelle_user                            md5
host    aurelle         aurelle_user     127.0.0.1/32          md5
```

Перезапустите PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Troubleshooting

### Проблема: Приложение не запускается

```bash
# Проверить логи PM2
pm2 logs aurelle --err

# Проверить переменные окружения
pm2 env aurelle

# Проверить порты
sudo netstat -tulpn | grep :5000
```

### Проблема: OAuth не работает

1. Проверьте Redirect URIs в консоли провайдера
2. Убедитесь что используется HTTPS
3. Проверьте Client ID и Secret в `.env`
4. Посмотрите логи: `pm2 logs aurelle`

### Проблема: База данных недоступна

```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Проверить подключение
psql -U aurelle_user -d aurelle -h localhost

# Проверить логи
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Проблема: Высокая нагрузка на сервер

```bash
# Мониторинг ресурсов
htop
pm2 monit

# Проверить логи Nginx
sudo tail -f /var/log/nginx/access.log

# Перезапустить приложение
pm2 restart aurelle
```

## Производительность

### Настройка PM2 для кластера

Для использования всех ядер процессора:

```bash
pm2 delete aurelle
pm2 start npm --name "aurelle" -i max -- start
pm2 save
```

### Кэширование статики в Nginx

Статика уже настроена на кэширование в конфиге Nginx выше.

## Контакты и поддержка

- GitHub Issues: [ссылка на ваш репозиторий]
- Email: your-email@example.com

---

**Удачного деплоя!** 🚀
