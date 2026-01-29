# AURELLE - Quick Start Deploy Guide

Быстрая инструкция по деплою на VPS/Dedicated сервер.

## Предварительные требования

- ✅ VPS/сервер с Ubuntu 20.04+ или Debian 11+
- ✅ Доступ по SSH с правами sudo
- ✅ Зарегистрированный домен с A-записью на IP сервера
- ✅ Минимум 2GB RAM, 10GB диск

---

## Шаг 1: Подключение к серверу

```bash
ssh root@your-server-ip
# или
ssh your-username@your-server-ip
```

---

## Шаг 2: Установка зависимостей (5-10 минут)

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

# Установка Certbot (для SSL)
sudo apt install -y certbot python3-certbot-nginx

# Установка PM2
sudo npm install -g pm2

# Проверка установки
node --version   # должно показать v20.x.x
npm --version    # должно показать 10.x.x
psql --version   # должно показать PostgreSQL 14+
```

---

## Шаг 3: Настройка PostgreSQL (2 минуты)

```bash
# Подключение к PostgreSQL
sudo -u postgres psql

# Выполните следующие команды в psql:
```

```sql
CREATE DATABASE aurelle;
CREATE USER aurelle_user WITH PASSWORD 'ВАШ_НАДЕЖНЫЙ_ПАРОЛЬ';
GRANT ALL PRIVILEGES ON DATABASE aurelle TO aurelle_user;
ALTER DATABASE aurelle OWNER TO aurelle_user;
\q
```

**Сохраните пароль** - он понадобится для `.env` файла!

---

## Шаг 4: Клонирование проекта (2 минуты)

```bash
# Создание директории
sudo mkdir -p /var/www/aurelle
sudo chown -R $USER:$USER /var/www/aurelle
cd /var/www/aurelle

# Клонирование (замените на ваш репозиторий)
git clone https://github.com/your-username/aurelle.git .

# Или загрузка через SFTP/SCP
```

---

## Шаг 5: Установка зависимостей проекта (3-5 минут)

```bash
cd /var/www/aurelle
npm install
```

---

## Шаг 6: Настройка окружения (3 минуты)

### 6.1 Создание .env файла

```bash
nano .env
```

### 6.2 Вставьте и настройте:

```env
# Database (замените your_password на пароль из шага 3)
DATABASE_URL=postgresql://aurelle_user:your_password@localhost:5432/aurelle

# Session Secret (сгенерируйте новый!)
SESSION_SECRET=запустите_команду_ниже_чтобы_сгенерировать

# Production settings
NODE_ENV=production
PORT=5000

# Google OAuth (ваши текущие credentials)
GOOGLE_CLIENT_ID=60089668488-9gvr0ahqda3neh2p3dsdvbofd39piguj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Yandex OAuth (ваши текущие credentials)
YANDEX_CLIENT_ID=3b79a753092d49bb977ce1ec5b3017ec
YANDEX_CLIENT_SECRET=3086c3c9bf844b5298f801005307e4d4

# GitHub OAuth (опционально)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Twilio (опционально)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SERVICE_SID=
```

### 6.3 Генерация SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Скопируйте вывод и вставьте в `.env` как `SESSION_SECRET=...`

Сохраните файл: `Ctrl+X`, затем `Y`, затем `Enter`

---

## Шаг 7: Сборка проекта (2-3 минуты)

```bash
npm run build
```

---

## Шаг 8: Инициализация базы данных (1 минута)

```bash
npm run db:push
```

---

## Шаг 9: Настройка Nginx (3 минуты)

### 9.1 Создание конфига

```bash
sudo nano /etc/nginx/sites-available/aurelle
```

### 9.2 Вставьте конфигурацию (замените `your-domain.com`):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

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
    }

    client_max_body_size 50M;
}
```

### 9.3 Активация

```bash
sudo ln -s /etc/nginx/sites-available/aurelle /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Шаг 10: Получение SSL сертификата (2 минуты)

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Следуйте инструкциям, выберите опцию "2" (redirect HTTP to HTTPS).

---

## Шаг 11: Запуск приложения (1 минута)

```bash
cd /var/www/aurelle
pm2 start npm --name "aurelle" -- start
pm2 startup
pm2 save
```

Проверка статуса:

```bash
pm2 status
pm2 logs aurelle
```

---

## Шаг 12: Обновление OAuth Redirect URIs (5 минут)

### Google OAuth:

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Ваш OAuth Client ID → Edit
3. Authorized redirect URIs → Add:
   - `https://your-domain.com/api/auth/google/callback`
   - `https://www.your-domain.com/api/auth/google/callback`
4. Save

### Yandex OAuth:

1. [Яндекс OAuth](https://oauth.yandex.ru/) → Ваше приложение → Редактировать
2. Callback URI → Add:
   - `https://your-domain.com/api/auth/yandex/callback`
   - `https://www.your-domain.com/api/auth/yandex/callback`
3. Сохранить

---

## Шаг 13: Проверка работы ✅

### 13.1 Проверка доступности

```bash
curl https://your-domain.com
```

Должен вернуть HTML страницу.

### 13.2 Проверка API

```bash
curl https://your-domain.com/api/auth/providers
```

Должен вернуть:

```json
{ "local": true, "yandex": true, "google": true, "github": false, "phone": false }
```

### 13.3 Проверка в браузере

Откройте: `https://your-domain.com`

Протестируйте:

- ✅ Страница загружается
- ✅ Можно зайти на `/auth`
- ✅ Вход через Google работает
- ✅ Вход через Yandex работает
- ✅ Вход через Email работает

---

## Готово! 🎉

Ваше приложение AURELLE теперь работает на:

- 🌐 **https://your-domain.com**

---

## Полезные команды

### Просмотр логов

```bash
pm2 logs aurelle
pm2 logs aurelle --lines 100
```

### Перезапуск приложения

```bash
pm2 restart aurelle
```

### Обновление после изменений в коде

```bash
cd /var/www/aurelle
git pull
npm install
npm run build
npm run db:push
pm2 restart aurelle
```

Или используйте скрипт:

```bash
./deploy.sh
```

### Проверка статуса

```bash
pm2 status
systemctl status nginx
systemctl status postgresql
```

---

## Troubleshooting

### Приложение не запускается

```bash
# Проверить логи
pm2 logs aurelle --err

# Проверить порт
sudo netstat -tulpn | grep :5000

# Перезапустить
pm2 restart aurelle
```

### SSL не работает

```bash
# Проверить сертификат
sudo certbot certificates

# Обновить сертификат
sudo certbot renew --dry-run
```

### OAuth не работает

```bash
# Проверить переменные окружения
pm2 env aurelle | grep GOOGLE
pm2 env aurelle | grep YANDEX

# Проверить redirect URIs в консоли провайдера
# Убедиться что используется HTTPS
```

---

## Следующие шаги

1. Настройте автоматический бэкап:

   ```bash
   chmod +x backup.sh
   crontab -e
   # Добавьте: 0 2 * * * /var/www/aurelle/backup.sh
   ```

2. Настройте мониторинг:

   ```bash
   pm2 install pm2-logrotate
   ```

3. См. полную документацию:
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Подробная инструкция
   - [OAUTH_SETUP_PRODUCTION.md](./OAUTH_SETUP_PRODUCTION.md) - OAuth настройка

---

**Время деплоя: ~30-40 минут** ⏱️

**Вопросы?** Проверьте [DEPLOYMENT.md](./DEPLOYMENT.md) или создайте issue в репозитории.
