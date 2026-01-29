# ⚡ AURELLE - Деплой на Production СЕЙЧАС

Быстрая инструкция для деплоя на сервер **89.39.94.194**

---

## 🎯 Выберите метод деплоя:

### ✅ МЕТОД 1: Автоматический (GitHub Actions) - РЕКОМЕНДУЕТСЯ

#### Шаг 1: Настройте GitHub Secrets

Перейдите: https://github.com/Rustam4262/aurelle/settings/secrets/actions

Добавьте:

```
PRODUCTION_SSH_HOST=89.39.94.194
PRODUCTION_SSH_USER=root
PRODUCTION_SSH_KEY=<ваш_SSH_ключ>
PRODUCTION_DB_PASSWORD=<пароль_БД>
PRODUCTION_SESSION_SECRET=<сгенерируйте: openssl rand -base64 32>
```

#### Шаг 2: Запустите деплой

```bash
# Убедитесь, что все изменения сохранены
git status

# Запушьте в main
git push origin main
```

Или вручную:

1. Перейдите: https://github.com/Rustam4262/aurelle/actions/workflows/deploy-production.yml
2. Нажмите **"Run workflow"**
3. Выберите **main**
4. **Run workflow**

#### Шаг 3: Подтвердите деплой

После сборки:

1. Откройте workflow run
2. Нажмите **"Review deployments"**
3. **Approve and deploy**

✅ Готово! Приложение развернётся автоматически.

---

### ⚙️ МЕТОД 2: Ручной деплой (если GitHub Actions не настроен)

#### Шаг 1: Подключитесь к серверу

```bash
ssh root@89.39.94.194
```

#### Шаг 2: Подготовьте сервер (только первый раз)

```bash
# Установите Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установите PM2, PostgreSQL, Nginx
apt install -y postgresql nginx
npm install -g pm2

# Создайте БД
sudo -u postgres psql <<EOF
CREATE DATABASE aurelle_production;
CREATE USER aurelle_user WITH PASSWORD 'ваш_пароль';
GRANT ALL PRIVILEGES ON DATABASE aurelle_production TO aurelle_user;
\c aurelle_production
GRANT ALL ON SCHEMA public TO aurelle_user;
EOF
```

#### Шаг 3: Разверните приложение

```bash
# Создайте директорию
mkdir -p /var/www/aurelle
cd /var/www/aurelle

# Клонируйте проект
git clone https://github.com/Rustam4262/aurelle.git current
cd current

# Установите зависимости
npm ci --production

# Создайте .env
cat > .env <<'EOF'
DATABASE_URL=postgresql://aurelle_user:ваш_пароль@localhost:5432/aurelle_production
NODE_ENV=production
PORT=5000
SESSION_SECRET=$(openssl rand -base64 32)
EOF

# Выполните миграции
npm run db:push

# Соберите проект
npm run build

# Запустите через PM2
pm2 start npm --name "aurelle-production" -- start
pm2 save
pm2 startup
```

#### Шаг 4: Настройте Nginx

```bash
# Создайте конфигурацию
cat > /etc/nginx/sites-available/aurelle <<'EOF'
server {
    listen 80;
    server_name 89.39.94.194;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
EOF

# Активируйте
ln -s /etc/nginx/sites-available/aurelle /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

✅ Готово! Откройте: **http://89.39.94.194**

---

## 🔍 Проверка

### На сервере:

```bash
# Статус PM2
pm2 status

# Логи
pm2 logs aurelle-production --lines 50

# HTTP тест
curl http://localhost:5000
```

### С вашего компьютера:

```bash
# Проверьте доступность
curl http://89.39.94.194

# Откройте в браузере
http://89.39.94.194
```

---

## 🔐 Создание тестовых пользователей

```bash
# На сервере
cd /var/www/aurelle/current

# Выполните SQL скрипт
psql -h localhost -U aurelle_user -d aurelle_production < scripts/setup-database-complete.sql
```

Тестовые пользователи (пароль: `password123`):

- admin@aurelle.uz
- salon1@aurelle.uz
- specialist1@aurelle.uz
- client1@aurelle.uz

---

## �� Обновление приложения

```bash
# На сервере
cd /var/www/aurelle/current

# Получите изменения
git pull origin main

# Установите зависимости
npm ci --production

# Соберите
npm run build

# Перезапустите (zero-downtime)
pm2 reload aurelle-production
```

---

## 🚨 Быстрые исправления

### Приложение не запускается

```bash
pm2 logs aurelle-production --err
pm2 restart aurelle-production
```

### 502 Bad Gateway

```bash
pm2 status
systemctl status nginx
pm2 restart aurelle-production
```

### Ошибка БД

```bash
# Проверьте подключение
psql -h localhost -U aurelle_user -d aurelle_production -c "SELECT 1;"

# Проверьте .env
cat .env
```

---

## 📚 Полная документация

См. [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)

---

**Сервер**: 89.39.94.194
**Порт**: 5000
**URL**: http://89.39.94.194

**Удачи! 🚀**
