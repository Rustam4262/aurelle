# ⚡ Быстрый деплой на сервер

## 🎯 Минимальные шаги для деплоя

### 1. На сервере (89.39.94.194):

```bash
# Подключиться
ssh root@89.39.94.194
# Пароль: w2@nT*6D

# Установить Docker (если нет)
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose -y

# Создать директорию
mkdir -p /var/www/beauty_salon
cd /var/www/beauty_salon
```

### 2. Загрузить проект

**С вашей машины:**
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'venv' \
  . root@89.39.94.194:/var/www/beauty_salon/
```

### 3. Создать .env файл

```bash
# На сервере
cd /var/www/beauty_salon
nano .env
```

**Минимальный .env (ЗАМЕНИТЕ ПАРОЛЬ БД!):**
```env
DATABASE_URL=postgresql://aurelleu_aurelle_user:ВАШ_ПАРОЛЬ@localhost:5432/aurelleu_aurelle_db
SECRET_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=http://89.39.94.194
ALLOWED_HOSTS=89.39.94.194
VITE_API_URL=http://89.39.94.194/api
ENVIRONMENT=production
```

### 4. Запустить

```bash
cd /var/www/beauty_salon
chmod +x deploy/production/deploy.sh
./deploy/production/deploy.sh
```

**Или вручную:**
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml up -d --build
sleep 15
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend alembic upgrade head
```

### 5. Проверить

```bash
curl http://localhost/health
curl http://localhost/api/salons
```

**Откройте в браузере:** http://89.39.94.194

---

## ❗ Важно

1. **Нужен пароль от базы данных** - узнайте у администратора
2. **SECRET_KEY** - сгенерируйте уникальный ключ
3. **Порты 80, 443** - должны быть открыты

---

**Подробная инструкция:** см. `DEPLOY_INSTRUCTIONS.md`

