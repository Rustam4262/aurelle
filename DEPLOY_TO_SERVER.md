# Деплой AURELLE на сервер

**Сервер**: 89.39.94.194
**Домен**: aurelle.uz, www.aurelle.uz
**Логин**: root
**Пароль**: w2@nT*6D

## Шаг 1: Подключение к серверу

```bash
ssh root@89.39.94.194
# Пароль: w2@nT*6D
```

---

## Шаг 2: Полная очистка сервера (удаление старых файлов)

```bash
# Остановка всех PM2 процессов (если были)
pm2 delete all || true
pm2 kill || true

# Удаление старого проекта
rm -rf /var/www/aurelle
rm -rf /root/aurelle
rm -rf ~/aurelle

# Очистка Nginx конфигов (если были)
rm -f /etc/nginx/sites-enabled/aurelle
rm -f /etc/nginx/sites-available/aurelle

# Перезагрузка Nginx
systemctl reload nginx || true

echo "✅ Сервер очищен"
```

---

## Шаг 3: Установка необходимого ПО

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установка PostgreSQL
apt install -y postgresql postgresql-contrib

# Установка Nginx
apt install -y nginx

# Установка Certbot для SSL
apt install -y certbot python3-certbot-nginx

# Установка PM2
npm install -g pm2

# Установка Git
apt install -y git

# Проверка версий
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PostgreSQL: $(psql --version)"
echo "Nginx: $(nginx -v)"
```

---

## Шаг 4: Настройка PostgreSQL

```bash
# Переключение на пользователя postgres
sudo -u postgres psql

# В psql выполните следующие команды:
```

```sql
-- Удаление старой БД если была
DROP DATABASE IF EXISTS aurelle;
DROP USER IF EXISTS aurelle_user;

-- Создание новой БД и пользователя
CREATE DATABASE aurelle;
CREATE USER aurelle_user WITH PASSWORD 'w2@nT*6D';
GRANT ALL PRIVILEGES ON DATABASE aurelle TO aurelle_user;
ALTER DATABASE aurelle OWNER TO aurelle_user;

-- Выход
\q
```

**ВАЖНО**: Замените пароль `AurelleSecurePass2024!@#` на ваш собственный надежный пароль!

---

## Шаг 5: Клонирование проекта

### Вариант A: Через Git (если проект в репозитории)

```bash
# Создание директории
mkdir -p /var/www/aurelle
cd /var/www/aurelle

# Клонирование
git clone https://github.com/ваш-username/aurelle.git .
```

### Вариант B: Загрузка архива (если нет Git репозитория)

**На вашем локальном компьютере:**

```bash
# Создание архива проекта (выполнить в PowerShell/CMD)
cd d:\AURELLE
tar -czf aurelle.tar.gz --exclude=node_modules --exclude=dist --exclude=.git --exclude=.env --exclude=server/uploads .
```

Затем загрузите файл `aurelle.tar.gz` на сервер через SCP:

```bash
scp d:\AURELLE\aurelle.tar.gz root@89.39.94.194:/root/
```

**На сервере:**

```bash
# Распаковка
mkdir -p /var/www/aurelle
cd /var/www/aurelle
tar -xzf /root/aurelle.tar.gz
rm /root/aurelle.tar.gz
```

---

## Шаг 6: Установка зависимостей

```bash
cd /var/www/aurelle

# Установка
npm install

# Это займет несколько минут
```

---

## Шаг 7: Создание .env файла

```bash
cd /var/www/aurelle
nano .env
```

Вставьте следующее содержимое:

```env
# Database
DATABASE_URL=postgresql://aurelle_user:w2@nT*6D@localhost:5432/aurelle

# Session Secret (сгенерируйте новый - команда ниже)
SESSION_SECRET=ВСТАВЬТЕ_СГЕНЕРИРОВАННЫЙ_СЕКРЕТ_СЮДА

# Production
NODE_ENV=production
PORT=5000

# Google OAuth
GOOGLE_CLIENT_ID=60089668488-9gvr0ahqda3neh2p3dsdvbofd39piguj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Yandex OAuth
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

**Генерация SESSION_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Скопируйте вывод и вставьте в `.env` как `SESSION_SECRET=...`

Сохраните файл: `Ctrl+X`, затем `Y`, затем `Enter`

---

## Шаг 8: Сборка проекта

```bash
cd /var/www/aurelle
npm run build

# Проверка что build создался
ls -la dist/
```

---

## Шаг 9: Инициализация базы данных

```bash
cd /var/www/aurelle
npm run db:push
```

Если команда выполнилась успешно, значит БД настроена правильно.

---

## Шаг 10: Настройка Nginx

```bash
nano /etc/nginx/sites-available/aurelle
```

Вставьте следующую конфигурацию:

```nginx
# HTTP Server - редирект на HTTPS будет после SSL
server {
    listen 80;
    listen [::]:80;
    server_name aurelle.uz www.aurelle.uz 89.39.94.194;

    client_max_body_size 50M;

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

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
```

Активируйте конфигурацию:

```bash
ln -s /etc/nginx/sites-available/aurelle /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## Шаг 11: Запуск приложения с PM2

```bash
cd /var/www/aurelle

# Запуск
pm2 start npm --name "aurelle" -- start

# Автозапуск при перезагрузке
pm2 startup
# Выполните команду которую выведет pm2 startup

pm2 save

# Проверка статуса
pm2 status
pm2 logs aurelle --lines 50
```

---

## Шаг 12: Проверка работы

```bash
# Проверка что приложение отвечает
curl http://localhost:5000

# Проверка через внешний IP
curl http://89.39.94.194
```

Откройте в браузере:
- **http://aurelle.uz**
- **http://www.aurelle.uz**
- **http://89.39.94.194**

Вы должны увидеть главную страницу AURELLE!

---

## Шаг 13: Настройка firewall (UFW)

```bash
# Разрешить SSH (ВАЖНО!)
ufw allow ssh
ufw allow 22/tcp

# Разрешить HTTP и HTTPS
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp

# Включить firewall
ufw --force enable

# Проверить статус
ufw status
```

---

## Шаг 14: Настройка SSL (HTTPS)

```bash
# Установка SSL сертификата Let's Encrypt
certbot --nginx -d aurelle.uz -d www.aurelle.uz

# Выберите опцию 2 (redirect HTTP to HTTPS)
```

Certbot автоматически:
- Получит бесплатный SSL сертификат
- Настроит HTTPS
- Настроит автоматический редирект HTTP → HTTPS
- Настроит автообновление сертификата

---

## Шаг 15: Обновление OAuth Redirect URIs

После настройки SSL обновите Redirect URIs на HTTPS:

### Google OAuth Console:
1. https://console.cloud.google.com/
2. Credentials → OAuth 2.0 Client IDs
3. Удалите старые и добавьте:
   - `https://aurelle.uz/api/auth/google/callback`
   - `https://www.aurelle.uz/api/auth/google/callback`

### Yandex OAuth:
1. https://oauth.yandex.ru/
2. Ваше приложение → Редактировать
3. Удалите старые и добавьте:
   - `https://aurelle.uz/api/auth/yandex/callback`
   - `https://www.aurelle.uz/api/auth/yandex/callback`

---

## Шаг 15: (Опционально) Настройка SSL с доменом

Если у вас есть домен (например, aurelle.uz), выполните:

```bash
# Обновите server_name в Nginx
nano /etc/nginx/sites-available/aurelle
# Замените 89.39.94.194 на ваш домен

# Получите SSL сертификат
certbot --nginx -d aurelle.uz -d www.aurelle.uz

# Certbot автоматически настроит редирект HTTP → HTTPS
```

Затем обновите OAuth redirect URIs на `https://aurelle.uz/api/auth/.../callback`

---

## Полезные команды

```bash
# Просмотр логов
pm2 logs aurelle
pm2 logs aurelle --lines 100

# Перезапуск приложения
pm2 restart aurelle

# Остановка
pm2 stop aurelle

# Статус
pm2 status

# Мониторинг
pm2 monit

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Проверка PostgreSQL
sudo -u postgres psql -d aurelle -c "\dt"
```

---

## Обновление приложения в будущем

```bash
cd /var/www/aurelle
git pull origin main  # или загрузите новый архив
npm install
npm run build
npm run db:push
pm2 restart aurelle
```

Или используйте скрипт:

```bash
cd /var/www/aurelle
chmod +x deploy.sh
./deploy.sh
```

---

## Troubleshooting

### Порт 5000 занят
```bash
netstat -tulpn | grep :5000
kill -9 <PID>
pm2 restart aurelle
```

### База данных не подключается
```bash
# Проверка что PostgreSQL запущен
systemctl status postgresql

# Проверка подключения
psql -U aurelle_user -d aurelle -h localhost
```

### Приложение не запускается
```bash
pm2 logs aurelle --err
pm2 delete aurelle
cd /var/www/aurelle
pm2 start npm --name "aurelle" -- start
```

---

## ✅ Готово!

После выполнения всех шагов ваше приложение будет доступно по адресу:

**http://89.39.94.194**

Все OAuth провайдеры работают, база данных настроена, приложение запущено через PM2 с автозапуском.

---

**Время выполнения**: примерно 30-40 минут
**Дата**: 26 декабря 2024
