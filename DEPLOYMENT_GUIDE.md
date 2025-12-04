# 🚀 Руководство по развёртыванию AURELLE на продакшн сервере

## 📋 Информация о сервере

- **Домен**: aurelle.uz
- **IP адрес**: 89.39.94.194
- **ОС**: Linux (предполагается Ubuntu/Debian)
- **Ресурсы**:
  - RAM: 2 ГБ
  - CPU: 1 ядро
  - Диск: 50 ГБ
  - Интернет: 10 Mbit/s

## 🎯 Этап 1: Настройка DNS

### 1.1 Настройте A-записи для домена

Войдите в панель управления вашего регистратора домена (где вы купили aurelle.uz) и создайте следующие DNS записи:

```
Тип    Имя          Значение         TTL
A      @            89.39.94.194     3600
A      www          89.39.94.194     3600
A      api          89.39.94.194     3600
```

**Проверка**: Подождите 5-30 минут и проверьте:
```bash
# На вашем локальном компьютере
ping aurelle.uz
ping www.aurelle.uz
ping api.aurelle.uz
```

Все должны вернуть IP: 89.39.94.194

---

## 🎯 Этап 2: Подключение к серверу и начальная настройка

### 2.1 Подключитесь к серверу

```bash
ssh root@89.39.94.194
```

### 2.2 Обновите систему

```bash
apt update && apt upgrade -y
```

### 2.3 Создайте пользователя для приложения

```bash
# Создаём пользователя aurelle
adduser aurelle

# Добавляем в группу sudo
usermod -aG sudo aurelle

# Переключаемся на нового пользователя
su - aurelle
```

---

## 🎯 Этап 3: Установка необходимого ПО

### 3.1 Установите Docker

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Применение изменений группы (перелогиньтесь или выполните)
newgrp docker

# Проверка
docker --version
```

### 3.2 Установите Docker Compose

```bash
# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Права на выполнение
sudo chmod +x /usr/local/bin/docker-compose

# Проверка
docker-compose --version
```

### 3.3 Установите Git

```bash
sudo apt install git -y
git --version
```

### 3.4 Установите Nginx (для reverse proxy)

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Проверка
sudo systemctl status nginx
```

### 3.5 Установите Certbot (для SSL сертификатов)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

---

## 🎯 Этап 4: Загрузка проекта на сервер

### 4.1 Создайте директорию для проекта

```bash
cd ~
mkdir -p projects
cd projects
```

### 4.2 Вариант А: Клонирование из Git (если у вас есть репозиторий)

```bash
git clone https://github.com/ваш-username/aurelle.git
cd aurelle
```

### 4.2 Вариант Б: Загрузка файлов через SCP/SFTP

На вашем **локальном компьютере** (Windows):

```powershell
# Используйте WinSCP, FileZilla или команду scp
# Пример с scp:
scp -r "d:\Проекты\beauty_salon" aurelle@89.39.94.194:~/projects/aurelle
```

После загрузки, на сервере:
```bash
cd ~/projects/aurelle
```

---

## 🎯 Этап 5: Настройка переменных окружения

### 5.1 Создайте файл .env

```bash
cd ~/projects/aurelle
cp .env.production.template .env
nano .env  # или используйте vim
```

### 5.2 Заполните критически важные переменные

Обязательно измените следующие значения:

```bash
# ========== БАЗА ДАННЫХ ==========
DATABASE_URL=postgresql://aurelle_user:ВАШ_СИЛЬНЫЙ_ПАРОЛЬ_123@postgres:5432/aurelle_db
POSTGRES_USER=aurelle_user
POSTGRES_PASSWORD=ВАШ_СИЛЬНЫЙ_ПАРОЛЬ_123
POSTGRES_DB=aurelle_db

# ========== БЕЗОПАСНОСТЬ ==========
# Сгенерируйте на сервере: openssl rand -hex 32
SECRET_KEY=ваш_уникальный_секретный_ключ_64_символа_минимум

# ========== EMAIL ==========
# Регистрация SendGrid: https://app.sendgrid.com/
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=ваш_sendgrid_api_ключ
FROM_EMAIL=noreply@aurelle.uz
FROM_NAME=AURELLE

# ========== SMS (для Узбекистана) ==========
# Регистрация Eskiz: https://eskiz.uz/
SMS_PROVIDER=eskiz
SMS_API_TOKEN=ваш_eskiz_токен
SMS_FROM=AURELLE

# ========== ЯНДЕКС КАРТЫ ==========
# Получите ключ: https://developer.tech.yandex.ru/
YANDEX_MAPS_API_KEY=ваш_yandex_maps_ключ
VITE_YANDEX_MAPS_API_KEY=ваш_yandex_maps_ключ

# ========== ПЛАТЕЖИ (Узбекистан) ==========
# Payme: https://developer.help.paycom.uz/
PAYME_MERCHANT_ID=ваш_payme_merchant_id
PAYME_SECRET_KEY=ваш_payme_secret_key
PAYME_ENDPOINT=https://checkout.paycom.uz

# Click: https://my.click.uz/
CLICK_MERCHANT_ID=ваш_click_merchant_id
CLICK_SERVICE_ID=ваш_click_service_id
CLICK_SECRET_KEY=ваш_click_secret_key

# ========== ДОМЕНЫ ==========
CORS_ORIGINS=https://aurelle.uz,https://www.aurelle.uz,https://api.aurelle.uz
FRONTEND_URL=https://aurelle.uz
API_URL=https://api.aurelle.uz
```

**Генерация паролей на сервере:**

```bash
# Для SECRET_KEY
openssl rand -hex 32

# Для паролей БД
openssl rand -base64 32
```

Сохраните файл: `Ctrl + X`, затем `Y`, затем `Enter`

---

## 🎯 Этап 6: Настройка Nginx

### 6.1 Создайте конфигурацию Nginx

```bash
sudo nano /etc/nginx/sites-available/aurelle
```

Вставьте следующую конфигурацию:

```nginx
# AURELLE - aurelle.uz
# Временная HTTP конфигурация (для получения SSL)

server {
    listen 80;
    listen [::]:80;
    server_name aurelle.uz www.aurelle.uz api.aurelle.uz;

    location / {
        return 200 "AURELLE Server OK";
        add_header Content-Type text/plain;
    }
}
```

### 6.2 Активируйте конфигурацию

```bash
# Создаём символическую ссылку
sudo ln -s /etc/nginx/sites-available/aurelle /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезагружаем Nginx
sudo systemctl reload nginx
```

### 6.3 Получите SSL сертификаты

```bash
sudo certbot --nginx -d aurelle.uz -d www.aurelle.uz -d api.aurelle.uz
```

Следуйте инструкциям Certbot:
- Введите email для уведомлений
- Согласитесь с условиями (Y)
- Выберите опцию 2 (redirect HTTP to HTTPS)

### 6.4 Обновите конфигурацию Nginx для reverse proxy

```bash
sudo nano /etc/nginx/sites-available/aurelle
```

Замените содержимое на:

```nginx
# AURELLE - aurelle.uz

# Перенаправление www на без www
server {
    listen 80;
    listen [::]:80;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.aurelle.uz;

    ssl_certificate /etc/letsencrypt/live/aurelle.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aurelle.uz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://aurelle.uz$request_uri;
}

# Основной сайт (Frontend)
server {
    listen 80;
    listen [::]:80;
    server_name aurelle.uz;

    # HTTP to HTTPS редирект
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name aurelle.uz;

    ssl_certificate /etc/letsencrypt/live/aurelle.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aurelle.uz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# API Backend
server {
    listen 80;
    listen [::]:80;
    server_name api.aurelle.uz;

    # HTTP to HTTPS редирект
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.aurelle.uz;

    ssl_certificate /etc/letsencrypt/live/aurelle.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aurelle.uz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers (если нужно)
        add_header Access-Control-Allow-Origin "https://aurelle.uz" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    }
}
```

### 6.5 Проверьте и перезагрузите Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 Этап 7: Запуск приложения

### 7.1 Перейдите в директорию проекта

```bash
cd ~/projects/aurelle
```

### 7.2 Соберите и запустите Docker контейнеры

```bash
# Сборка образов
docker-compose -f docker-compose.prod.yml build

# Запуск контейнеров в фоновом режиме
docker-compose -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps
```

### 7.3 Проверьте логи

```bash
# Все логи
docker-compose -f docker-compose.prod.yml logs

# Только backend
docker-compose -f docker-compose.prod.yml logs backend

# Только frontend
docker-compose -f docker-compose.prod.yml logs frontend

# С отслеживанием в реальном времени
docker-compose -f docker-compose.prod.yml logs -f
```

### 7.4 Выполните миграции базы данных

```bash
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### 7.5 Создайте первого администратора (опционально)

```bash
# Подключитесь к контейнеру backend
docker-compose -f docker-compose.prod.yml exec backend bash

# Внутри контейнера создайте администратора через Python
python -c "
from database import SessionLocal
from models import User
from auth import get_password_hash

db = SessionLocal()
admin = User(
    email='admin@aurelle.uz',
    phone='+998901234567',
    password=get_password_hash('ваш_пароль'),
    full_name='Администратор',
    role='admin',
    is_active=True,
    is_verified=True
)
db.add(admin)
db.commit()
print('Admin created!')
"

# Выход из контейнера
exit
```

---

## 🎯 Этап 8: Проверка работоспособности

### 8.1 Проверьте доступность сервисов

Откройте в браузере:

1. **Frontend**: https://aurelle.uz
2. **API Docs**: https://api.aurelle.uz/docs
3. **API Health**: https://api.aurelle.uz/health

### 8.2 Проверьте контейнеры

```bash
docker-compose -f docker-compose.prod.yml ps
```

Все контейнеры должны быть в статусе `Up`.

### 8.3 Проверьте использование ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
df -h

# Использование памяти
free -h
```

---

## 🎯 Этап 9: Настройка автозапуска

### 9.1 Создайте systemd сервис

```bash
sudo nano /etc/systemd/system/aurelle.service
```

Вставьте:

```ini
[Unit]
Description=AURELLE Beauty Salon Marketplace
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/aurelle/projects/aurelle
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
User=aurelle

[Install]
WantedBy=multi-user.target
```

### 9.2 Активируйте сервис

```bash
sudo systemctl daemon-reload
sudo systemctl enable aurelle.service
sudo systemctl start aurelle.service
sudo systemctl status aurelle.service
```

---

## 🎯 Этап 10: Настройка мониторинга и бэкапов

### 10.1 Настройте автоматические бэкапы

```bash
# Создайте директорию для бэкапов
mkdir -p ~/backups

# Добавьте в crontab
crontab -e
```

Добавьте строки:

```cron
# Бэкап БД каждый день в 3:00 ночи
0 3 * * * cd ~/projects/aurelle && bash ./deploy/scripts/backup.sh

# Очистка старых бэкапов (старше 7 дней)
0 4 * * * find ~/backups -name "*.sql.gz" -mtime +7 -delete

# Перезапуск контейнеров каждую неделю (воскресенье в 4:00)
0 4 * * 0 cd ~/projects/aurelle && docker-compose -f docker-compose.prod.yml restart
```

### 10.2 Настройте мониторинг (опционально)

```bash
# Установите htop для мониторинга ресурсов
sudo apt install htop -y

# Для мониторинга логов
sudo apt install lnav -y
```

---

## 🔧 Полезные команды

### Управление приложением

```bash
# Перейти в директорию проекта
cd ~/projects/aurelle

# Посмотреть статус
docker-compose -f docker-compose.prod.yml ps

# Посмотреть логи
docker-compose -f docker-compose.prod.yml logs -f

# Перезапустить все сервисы
docker-compose -f docker-compose.prod.yml restart

# Перезапустить конкретный сервис
docker-compose -f docker-compose.prod.yml restart backend

# Остановить все
docker-compose -f docker-compose.prod.yml down

# Запустить все
docker-compose -f docker-compose.prod.yml up -d

# Пересобрать и запустить
docker-compose -f docker-compose.prod.yml up -d --build
```

### Работа с БД

```bash
# Войти в PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U aurelle_user -d aurelle_db

# Бэкап БД вручную
bash ./deploy/scripts/backup.sh

# Восстановление из бэкапа
gunzip < ~/backups/backup_2024-01-15_03-00.sql.gz | \
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U aurelle_user -d aurelle_db
```

### Обновление приложения

```bash
# Если используете git
cd ~/projects/aurelle
git pull

# Запустить скрипт деплоя
bash ./deploy/scripts/deploy.sh
```

### Очистка диска

```bash
# Очистка неиспользуемых Docker образов
docker system prune -a

# Очистка логов
sudo journalctl --vacuum-time=7d

# Проверка использования диска
df -h
du -sh ~/projects/aurelle/*
```

---

## 🚨 Решение проблем

### Проблема: Контейнер не запускается

```bash
# Посмотрите логи
docker-compose -f docker-compose.prod.yml logs [service_name]

# Проверьте .env файл
cat .env

# Пересоздайте контейнеры
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### Проблема: Нет места на диске

```bash
# Проверьте использование
df -h

# Очистите Docker
docker system prune -a -f

# Очистите логи
sudo journalctl --vacuum-size=100M

# Удалите старые бэкапы
find ~/backups -name "*.sql.gz" -mtime +7 -delete
```

### Проблема: Сайт недоступен

```bash
# Проверьте Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx

# Проверьте контейнеры
docker-compose -f docker-compose.prod.yml ps

# Проверьте порты
sudo netstat -tlnp | grep -E '80|443|3000|8000'
```

### Проблема: SSL сертификат не обновляется

```bash
# Вручную обновите сертификат
sudo certbot renew

# Проверьте задачу в cron
sudo systemctl status certbot.timer
```

---

## 📊 Мониторинг производительности

### Рекомендации для сервера с 2 ГБ RAM:

1. **Ограничение памяти для контейнеров** (уже настроено в docker-compose.prod.yml):
   - PostgreSQL: 512 MB
   - Redis: 256 MB
   - Backend: 768 MB
   - Frontend: 256 MB
   - Nginx: 128 MB

2. **Мониторинг использования памяти**:
```bash
# Постоянный мониторинг
watch -n 5 'free -h && echo && docker stats --no-stream'
```

3. **Настройка swap** (если не настроен):
```bash
# Создание 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Добавить в /etc/fstab для автозагрузки
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🎉 Готово!

Ваше приложение AURELLE теперь работает на продакшн сервере!

**Адреса**:
- 🌐 Сайт: https://aurelle.uz
- 🔌 API: https://api.aurelle.uz
- 📚 API Документация: https://api.aurelle.uz/docs

**Следующие шаги**:
1. ✅ Настройте интеграции (SMS, Email, Платежи)
2. ✅ Зарегистрируйтесь в Yandex.Metrica или Google Analytics
3. ✅ Настройте Telegram бота для уведомлений
4. ✅ Протестируйте все функции приложения
5. ✅ Создайте первые салоны и услуги

**Поддержка**:
- Логи: `docker-compose -f docker-compose.prod.yml logs -f`
- Статус: `docker-compose -f docker-compose.prod.yml ps`
- Перезапуск: `docker-compose -f docker-compose.prod.yml restart`
