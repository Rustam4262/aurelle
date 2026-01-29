# 🚀 Деплой AURELLE с GitHub на сервер

**GitHub Repository**: https://github.com/Rustam4262/aurelle
**Сервер**: 89.39.94.194
**Домены**: aurelle.uz, www.aurelle.uz
**Логин**: root
**Пароль**: w2@nT\*6D

---

## ✅ Проект успешно загружен в GitHub!

Коммит: `Add multiple authentication methods and prepare for production deployment`

Изменения:

- ✅ 78 файлов изменено
- ✅ 10,668 строк добавлено
- ✅ 2,251 строка удалено

---

## 🚀 Автоматический деплой с GitHub (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Подключитесь к серверу

Откройте PowerShell/CMD и выполните:

```bash
ssh root@89.39.94.194
```

Пароль: `w2@nT*6D`

### Шаг 2: Очистите сервер (если нужно)

```bash
# Остановка PM2 процессов
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Удаление старых файлов
rm -rf /var/www/aurelle
rm -rf /root/aurelle

# Очистка Nginx конфигов
rm -f /etc/nginx/sites-enabled/aurelle
rm -f /etc/nginx/sites-available/aurelle
systemctl reload nginx 2>/dev/null || true

echo "✅ Сервер очищен"
```

### Шаг 3: Установите необходимое ПО

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка необходимых пакетов
apt install -y curl git

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL
apt install -y postgresql postgresql-contrib

# Nginx
apt install -y nginx

# Certbot для SSL
apt install -y certbot python3-certbot-nginx

# PM2 глобально
npm install -g pm2

# Проверка версий
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PostgreSQL: $(psql --version | head -1)"
echo "Nginx: $(nginx -v 2>&1)"
```

### Шаг 4: Настройте PostgreSQL

```bash
sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS aurelle;
DROP USER IF EXISTS aurelle_user;
CREATE DATABASE aurelle;
CREATE USER aurelle_user WITH PASSWORD 'w2@nT*6D';
GRANT ALL PRIVILEGES ON DATABASE aurelle TO aurelle_user;
ALTER DATABASE aurelle OWNER TO aurelle_user;
\q
EOF

echo "✅ PostgreSQL настроен"
```

### Шаг 5: Клонируйте проект с GitHub

```bash
# Создание директории
mkdir -p /var/www/aurelle
cd /var/www/aurelle

# Клонирование проекта
git clone https://github.com/Rustam4262/aurelle.git .

echo "✅ Проект склонирован"
```

### Шаг 6: Установите зависимости

```bash
cd /var/www/aurelle
npm install

echo "✅ Зависимости установлены"
```

### Шаг 7: Создайте .env файл

```bash
cd /var/www/aurelle

# Генерация SESSION_SECRET
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

cat > .env <<EOF
# Database
DATABASE_URL=postgresql://aurelle_user:w2@nT*6D@localhost:5432/aurelle

# Session Secret (auto-generated)
SESSION_SECRET=$SESSION_SECRET

# Production
NODE_ENV=production
PORT=5000

# Google OAuth
GOOGLE_CLIENT_ID=60089668488-9gvr0ahqda3neh2p3dsdvbofd39piguj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Yandex OAuth
YANDEX_CLIENT_ID=3b79a753092d49bb977ce1ec5b3017ec
YANDEX_CLIENT_SECRET=3086c3c9bf844b5298f801005307e4d4

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Twilio (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SERVICE_SID=
EOF

echo "✅ .env файл создан"
```

### Шаг 8: Соберите проект

```bash
cd /var/www/aurelle
npm run build

echo "✅ Проект собран"
```

### Шаг 9: Инициализируйте базу данных

```bash
cd /var/www/aurelle
npm run db:push

echo "✅ База данных инициализирована"
```

### Шаг 10: Настройте Nginx

```bash
cat > /etc/nginx/sites-available/aurelle <<'NGINXCONF'
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

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
NGINXCONF

# Активация конфигурации
ln -sf /etc/nginx/sites-available/aurelle /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo "✅ Nginx настроен"
```

### Шаг 11: Запустите приложение с PM2

```bash
cd /var/www/aurelle

# Запуск
pm2 start npm --name "aurelle" -- start

# Автозапуск при перезагрузке
pm2 startup systemd -u root --hp /root
pm2 save

# Проверка статуса
pm2 status

echo "✅ Приложение запущено"
```

### Шаг 12: Настройте firewall

```bash
# Разрешить SSH
ufw allow ssh
ufw allow 22/tcp

# Разрешить HTTP и HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 'Nginx Full'

# Включить firewall
echo "y" | ufw enable

# Проверить статус
ufw status

echo "✅ Firewall настроен"
```

### Шаг 13: Проверьте работу

```bash
# Проверка локально
curl http://localhost:5000

# Проверка через IP
curl http://89.39.94.194
```

Откройте в браузере:

- http://aurelle.uz
- http://www.aurelle.uz
- http://89.39.94.194

### Шаг 14: Настройте SSL (HTTPS)

```bash
certbot --nginx -d aurelle.uz -d www.aurelle.uz
```

Следуйте инструкциям Certbot:

1. Введите ваш email
2. Согласитесь с условиями
3. Выберите опцию 2 (redirect HTTP to HTTPS)

### Шаг 15: Обновите OAuth Redirect URIs

#### Google OAuth Console:

1. Откройте https://console.cloud.google.com/
2. Перейдите в **APIs & Services** → **Credentials**
3. Найдите OAuth Client ID: `60089668488-9gvr0ahqda3neh2p3dsdvbofd39piguj.apps.googleusercontent.com`
4. Нажмите **Edit**
5. В **Authorized redirect URIs** добавьте:
   - `https://aurelle.uz/api/auth/google/callback`
   - `https://www.aurelle.uz/api/auth/google/callback`
6. Сохраните

#### Yandex OAuth:

1. Откройте https://oauth.yandex.ru/
2. Найдите ваше приложение (Client ID: `3b79a753092d49bb977ce1ec5b3017ec`)
3. Нажмите **Редактировать**
4. В **Callback URI** добавьте:
   - `https://aurelle.uz/api/auth/yandex/callback`
   - `https://www.aurelle.uz/api/auth/yandex/callback`
5. Сохраните

### Шаг 16: Финальная проверка

Откройте https://aurelle.uz и проверьте:

- ✅ SSL сертификат валидный (зеленый замок)
- ✅ HTTP редиректит на HTTPS
- ✅ Главная страница загружается
- ✅ Авторизация через Email работает
- ✅ Авторизация через Google работает
- ✅ Авторизация через Yandex работает
- ✅ Можно просмотреть салоны
- ✅ Можно создать бронирование
- ✅ Переключение языков работает (EN/RU/UZ)

---

## 🔄 Обновление проекта в будущем

Когда вы внесете изменения в GitHub, на сервере выполните:

```bash
cd /var/www/aurelle

# Получить изменения
git pull origin main

# Установить зависимости (если добавлены новые)
npm install

# Собрать проект
npm run build

# Применить изменения БД (если есть)
npm run db:push

# Перезапустить приложение
pm2 restart aurelle
```

Или используйте автоматический скрипт:

```bash
cd /var/www/aurelle
./deploy.sh
```

---

## 📊 Полезные команды

### Просмотр логов:

```bash
# PM2 логи
pm2 logs aurelle
pm2 logs aurelle --lines 100

# Nginx логи
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Управление приложением:

```bash
pm2 status          # Статус
pm2 restart aurelle # Перезапуск
pm2 stop aurelle    # Остановка
pm2 start aurelle   # Запуск
pm2 monit          # Мониторинг CPU/Memory
```

### Бэкап базы данных:

```bash
cd /var/www/aurelle
./backup.sh
```

---

## 🆘 Troubleshooting

### Приложение не запускается

```bash
pm2 logs aurelle --err
pm2 delete aurelle
cd /var/www/aurelle
pm2 start npm --name "aurelle" -- start
```

### База данных не подключается

```bash
systemctl status postgresql
psql -U aurelle_user -d aurelle -h localhost -W
# Пароль: w2@nT*6D
```

### 502 Bad Gateway

```bash
pm2 status
pm2 start aurelle
systemctl restart nginx
```

### OAuth не работает

1. Проверьте Redirect URIs в консолях Google/Yandex
2. Убедитесь что используете HTTPS
3. Проверьте `.env` файл
4. Проверьте логи: `pm2 logs aurelle`

---

## ✅ Готово!

После выполнения всех шагов ваше приложение будет доступно по адресу:

**https://aurelle.uz**

Все OAuth провайдеры работают, база данных настроена, приложение запущено через PM2 с автозапуском при перезагрузке сервера.

---

**Время выполнения**: ~30-40 минут
**Дата**: 26 декабря 2024
**Статус**: ✅ READY TO DEPLOY FROM GITHUB

🚀 Удачного деплоя!
