# 🚀 AURELLE - Production Deployment Guide

Руководство по развертыванию проекта AURELLE на продакшн сервере **89.39.94.194**

---

## 📋 Предварительные требования

### Доступ к серверу

- **IP**: 89.39.94.194
- **SSH ключ**: Должен быть настроен для доступа
- **Пользователь**: root (или пользователь с sudo)

### На сервере должны быть установлены:

- ✅ Node.js 20.x
- ✅ PostgreSQL 14+
- ✅ Nginx
- ✅ PM2 (для управления процессами)
- ✅ Git

---

## 🔐 Шаг 1: Настройка GitHub Secrets

Перед деплоем необходимо настроить секреты в GitHub:

### Перейдите в Settings → Secrets and variables → Actions

Добавьте следующие секреты:

#### Секреты для Production сервера:

```bash
# SSH Connection
PRODUCTION_SSH_HOST=89.39.94.194
PRODUCTION_SSH_USER=root  # или ваш пользователь
PRODUCTION_SSH_KEY=<ваш_приватный_SSH_ключ>

# Database
PRODUCTION_DB_HOST=localhost
PRODUCTION_DB_PORT=5432
PRODUCTION_DB_NAME=aurelle_production
PRODUCTION_DB_USER=aurelle_user
PRODUCTION_DB_PASSWORD=<сгенерируйте_сложный_пароль>

# Application
PRODUCTION_PORT=5000
PRODUCTION_SESSION_SECRET=<сгенерируйте_минимум_32_символа>
PRODUCTION_DOMAIN=aurelle.uz  # или ваш домен

# Optional: Sentry (для мониторинга ошибок)
SENTRY_AUTH_TOKEN=<если_используете_sentry>
SENTRY_ORG=<ваша_организация>
SENTRY_PROJECT=aurelle
VITE_SENTRY_DSN=<ваш_dsn>

# Optional: Telegram (для уведомлений)
TELEGRAM_BOT_TOKEN=<токен_бота>
TELEGRAM_CHAT_ID=<id_чата>
```

### Генерация секретов:

```bash
# SESSION_SECRET (32+ символов)
openssl rand -base64 32

# DB_PASSWORD (сложный пароль)
openssl rand -base64 24
```

---

## 🖥️ Шаг 2: Подготовка сервера

### 2.1 Подключитесь к серверу:

```bash
ssh root@89.39.94.194
```

### 2.2 Установите необходимые пакеты:

```bash
# Обновите систему
apt update && apt upgrade -y

# Установите Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверьте версию
node --version  # Должна быть 20.x
npm --version

# Установите PM2 глобально
npm install -g pm2

# Установите PostgreSQL
apt install -y postgresql postgresql-contrib

# Установите Nginx
apt install -y nginx

# Установите Git
apt install -y git
```

### 2.3 Настройте PostgreSQL:

```bash
# Переключитесь на пользователя postgres
sudo -u postgres psql

# В psql консоли:
CREATE DATABASE aurelle_production;
CREATE USER aurelle_user WITH PASSWORD 'ваш_сложный_пароль';
GRANT ALL PRIVILEGES ON DATABASE aurelle_production TO aurelle_user;
\c aurelle_production
GRANT ALL ON SCHEMA public TO aurelle_user;
\q

# Проверьте подключение
psql -h localhost -U aurelle_user -d aurelle_production -c "SELECT version();"
```

### 2.4 Создайте директорию для приложения:

```bash
# Создайте директорию
mkdir -p /var/www/aurelle
cd /var/www/aurelle

# Установите права
chown -R $USER:$USER /var/www/aurelle
```

### 2.5 Настройте Nginx:

Создайте конфигурацию `/etc/nginx/sites-available/aurelle`:

```nginx
server {
    listen 80;
    server_name aurelle.uz www.aurelle.uz 89.39.94.194;

    # Редирект на HTTPS (после установки SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы
    location /assets {
        alias /var/www/aurelle/current/dist/public/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Загруженные файлы
    location /uploads {
        alias /var/www/aurelle/current/server/uploads;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Максимальный размер загружаемых файлов
    client_max_body_size 10M;
}
```

Активируйте конфигурацию:

```bash
# Создайте символическую ссылку
ln -s /etc/nginx/sites-available/aurelle /etc/nginx/sites-enabled/

# Проверьте конфигурацию
nginx -t

# Перезапустите Nginx
systemctl restart nginx
```

---

## 🚀 Шаг 3: Деплой через GitHub Actions

### Метод 1: Автоматический деплой при push в main

```bash
# Убедитесь, что все изменения закоммичены
git add .
git commit -m "Prepare for production deployment"

# Запушьте в main ветку
git push origin main
```

GitHub Actions автоматически:

1. ✅ Соберёт проект
2. ✅ Запустит проверки
3. ⏸️ **Попросит подтверждение** (manual approval gate)
4. ✅ Задеплоит на сервер
5. ✅ Запустит через PM2
6. ✅ Выполнит health checks

### Метод 2: Ручной деплой через GitHub Actions

1. Перейдите: https://github.com/Rustam4262/aurelle/actions
2. Выберите **"Deploy to Production"**
3. Нажмите **"Run workflow"**
4. Выберите ветку: **main**
5. Укажите причину деплоя (опционально)
6. Нажмите **"Run workflow"**

### Подтверждение деплоя:

После сборки вы получите уведомление:

1. Перейдите в Actions → Deploy to Production → Running workflow
2. Нажмите **"Review deployments"**
3. Выберите **production**
4. Нажмите **"Approve and deploy"**

---

## 🛠️ Шаг 4: Ручной деплой (если GitHub Actions не работает)

### 4.1 Клонируйте репозиторий на сервере:

```bash
ssh root@89.39.94.194

cd /var/www/aurelle

# Клонируйте проект
git clone https://github.com/Rustam4262/aurelle.git current
cd current
```

### 4.2 Установите зависимости:

```bash
npm ci --production
```

### 4.3 Создайте .env файл:

```bash
cat > .env <<EOF
# Production Environment Variables

# Database
DATABASE_URL=postgresql://aurelle_user:ваш_пароль@localhost:5432/aurelle_production

# Server
NODE_ENV=production
PORT=5000

# Session
SESSION_SECRET=ваш_session_secret_минимум_32_символа

# Optional: OAuth (если используете)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=

# Optional: Sentry (мониторинг ошибок)
VITE_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

# Optional: Email (для уведомлений)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
EOF

# Защитите файл
chmod 600 .env
```

### 4.4 Выполните миграции базы данных:

```bash
# Примените схему
npm run db:push

# Или выполните SQL скрипт
psql -h localhost -U aurelle_user -d aurelle_production < scripts/setup-database-complete.sql
```

### 4.5 Соберите проект:

```bash
npm run build
```

### 4.6 Запустите через PM2:

```bash
# Запустите приложение
pm2 start npm --name "aurelle-production" -- start

# Сохраните конфигурацию PM2
pm2 save

# Настройте автозапуск при перезагрузке
pm2 startup
# Выполните команду, которую выдаст pm2 startup

# Проверьте статус
pm2 status
pm2 logs aurelle-production
```

---

## 🔍 Шаг 5: Проверка развёртывания

### 5.1 Проверьте статус PM2:

```bash
pm2 status
```

Должен быть статус: **online**

### 5.2 Проверьте логи:

```bash
# Последние логи
pm2 logs aurelle-production --lines 50

# Логи в реальном времени
pm2 logs aurelle-production
```

### 5.3 Проверьте HTTP доступность:

```bash
# На сервере
curl http://localhost:5000

# С вашего компьютера
curl http://89.39.94.194
```

### 5.4 Откройте в браузере:

```
http://89.39.94.194
```

Должна открыться главная страница AURELLE.

---

## 🔒 Шаг 6: Настройка SSL (HTTPS)

### 6.1 Установите Certbot:

```bash
apt install -y certbot python3-certbot-nginx
```

### 6.2 Получите сертификат:

```bash
# Для домена
certbot --nginx -d aurelle.uz -d www.aurelle.uz

# Для IP (не рекомендуется для production)
# SSL сертификаты не выдаются для IP адресов
# Используйте домен!
```

### 6.3 Обновите Nginx конфигурацию:

Certbot автоматически обновит `/etc/nginx/sites-available/aurelle`.

Проверьте и перезапустите:

```bash
nginx -t
systemctl reload nginx
```

### 6.4 Настройте автообновление:

```bash
# Тест автообновления
certbot renew --dry-run

# Добавьте в cron
crontab -e

# Добавьте строку:
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## 📊 Мониторинг и обслуживание

### PM2 команды:

```bash
# Статус
pm2 status

# Логи
pm2 logs aurelle-production

# Перезапуск
pm2 restart aurelle-production

# Остановка
pm2 stop aurelle-production

# Удаление
pm2 delete aurelle-production

# Мониторинг CPU/Memory
pm2 monit
```

### Обновление приложения:

```bash
cd /var/www/aurelle/current

# Получите последние изменения
git pull origin main

# Установите зависимости (если обновились)
npm ci --production

# Соберите проект
npm run build

# Выполните миграции (если есть)
npm run db:push

# Перезапустите приложение (zero-downtime)
pm2 reload aurelle-production
```

### Бэкапы базы данных:

```bash
# Создайте директорию для бэкапов
mkdir -p /var/backups/aurelle

# Создайте бэкап
pg_dump -h localhost -U aurelle_user aurelle_production > /var/backups/aurelle/backup_$(date +%Y%m%d_%H%M%S).sql

# Автоматизируйте (cron)
crontab -e

# Ежедневный бэкап в 2 AM
0 2 * * * pg_dump -h localhost -U aurelle_user aurelle_production > /var/backups/aurelle/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql

# Удаление старых бэкапов (старше 7 дней)
0 3 * * * find /var/backups/aurelle -name "backup_*.sql" -mtime +7 -delete
```

---

## 🚨 Troubleshooting

### Проблема: Приложение не запускается

```bash
# Проверьте логи PM2
pm2 logs aurelle-production --err

# Проверьте .env файл
cat .env

# Проверьте подключение к БД
psql -h localhost -U aurelle_user -d aurelle_production -c "SELECT 1;"

# Проверьте порт
netstat -tlnp | grep 5000
```

### Проблема: Nginx показывает 502 Bad Gateway

```bash
# Проверьте статус приложения
pm2 status

# Проверьте логи Nginx
tail -f /var/log/nginx/error.log

# Перезапустите приложение
pm2 restart aurelle-production
```

### Проблема: База данных не подключается

```bash
# Проверьте статус PostgreSQL
systemctl status postgresql

# Проверьте подключение
psql -h localhost -U aurelle_user -d aurelle_production

# Проверьте pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Должна быть строка:
# local   all   aurelle_user   md5
```

### Проблема: Ошибки при сборке

```bash
# Очистите кеш и пересоберите
rm -rf node_modules dist
npm ci
npm run build
```

---

## 📋 Чеклист деплоя

- [ ] GitHub Secrets настроены
- [ ] Сервер подготовлен (Node.js, PostgreSQL, Nginx, PM2)
- [ ] PostgreSQL база данных создана
- [ ] Nginx настроен
- [ ] .env файл создан на сервере
- [ ] Репозиторий склонирован
- [ ] Зависимости установлены
- [ ] Проект собран
- [ ] Миграции выполнены
- [ ] Приложение запущено через PM2
- [ ] PM2 автозапуск настроен
- [ ] Nginx проксирует на приложение
- [ ] SSL сертификат установлен (опционально)
- [ ] Бэкапы настроены
- [ ] Приложение доступно в браузере
- [ ] Логи чистые, без ошибок

---

## 🎯 Следующие шаги после деплоя

1. **Настройте мониторинг**:
   - Sentry для отслеживания ошибок
   - PM2 Plus для мониторинга производительности
   - Uptime мониторинг (UptimeRobot, Pingdom)

2. **Настройте бэкапы**:
   - Автоматические бэкапы БД
   - Бэкапы загруженных файлов
   - Офсайт бэкапы (S3, BackBlaze)

3. **Оптимизация**:
   - Настройте CDN для статики
   - Включите compression в Nginx
   - Настройте кеширование

4. **Безопасность**:
   - Настройте firewall (ufw)
   - Включите fail2ban
   - Регулярные обновления безопасности

---

## 🆘 Поддержка

Если возникли проблемы:

1. Проверьте логи: `pm2 logs aurelle-production`
2. Проверьте статус: `pm2 status`
3. Проверьте Nginx логи: `tail -f /var/log/nginx/error.log`
4. Откройте issue на GitHub

---

**Удачного деплоя! 🚀**

**AURELLE Development Team**
