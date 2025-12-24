# ⚡ Быстрый деплой на сервер

## 🎯 Минимальные шаги для деплоя

### 0. Настройте учетные данные (на вашем компьютере):

```bash
cp .env.deploy.example .env.deploy
nano .env.deploy  # Заполните данные вашего сервера
```

### 1. На сервере:

```bash
# Подключиться
ssh YOUR_USER@YOUR_SERVER_IP
# Введите пароль при запросе

# Установить Docker (если нет)
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose -y

# Создать директорию
mkdir -p /var/www/beauty_salon
cd /var/www/beauty_salon
```

### 2. Загрузить проект

**С вашей машины (используйте данные из .env.deploy):**
```bash
# Используйте автоматический скрипт (рекомендуется):
.\deploy-to-prod.ps1

# Или вручную через rsync:
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'venv' \
  . YOUR_USER@YOUR_SERVER_IP:/var/www/beauty_salon/
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
CORS_ORIGINS=http://YOUR_SERVER_IP
ALLOWED_HOSTS=YOUR_SERVER_IP
VITE_API_URL=http://YOUR_SERVER_IP/api
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

**Откройте в браузере:** http://YOUR_SERVER_IP (замените на ваш IP)

---

## ❗ Важно

1. **Нужен пароль от базы данных** - узнайте у администратора
2. **SECRET_KEY** - сгенерируйте уникальный ключ
3. **Порты 80, 443** - должны быть открыты

---

**Подробная инструкция:** см. `DEPLOY_INSTRUCTIONS.md`

