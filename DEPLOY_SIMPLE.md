# 🚀 Простой деплой на продакшн

## Что нужно сделать вручную:

### 0. Настройте учетные данные (на вашем компьютере):

```bash
cp .env.deploy.example .env.deploy
nano .env.deploy  # Заполните данные вашего сервера
```

### 1. Подключиться к серверу

```bash
ssh YOUR_USER@YOUR_SERVER_IP
# Введите пароль при запросе
```

### 2. Подготовить сервер (если еще не сделано)

```bash
# Установить Docker (если нет)
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose -y

# Создать директорию
mkdir -p /var/www/beauty_salon
cd /var/www/beauty_salon
```

### 3. Загрузить проект (с вашего компьютера)

**Вариант А - через WinSCP или FileZilla:**
- Подключитесь к серверу по SFTP
- Загрузите все файлы проекта в `/var/www/beauty_salon`

**Вариант Б - через Git (если есть репозиторий):**
```bash
# На сервере
git clone <ваш-репозиторий> /var/www/beauty_salon
cd /var/www/beauty_salon
```

**Вариант В - через scp из PowerShell:**
```powershell
# С вашего компьютера (используйте данные из .env.deploy)
# Или используйте автоматический скрипт:
.\deploy-to-prod.ps1

# Или вручную:
scp -r . YOUR_USER@YOUR_SERVER_IP:/var/www/beauty_salon/
```

### 4. Настроить .env файл (на сервере)

```bash
cd /var/www/beauty_salon
nano .env
```

Вставьте это (ЗАМЕНИТЕ ПАРОЛЬ БД!):
```env
DATABASE_URL=postgresql://aurelleu_aurelle_user:ВАШ_ПАРОЛЬ_БД@localhost:5432/aurelleu_aurelle_db
SECRET_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=http://YOUR_SERVER_IP
ALLOWED_HOSTS=YOUR_SERVER_IP
VITE_API_URL=http://YOUR_SERVER_IP/api
ENVIRONMENT=production
REDIS_URL=redis://redis:6379/0
YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0
VITE_YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

### 5. Запустить деплой (на сервере)

```bash
cd /var/www/beauty_salon
chmod +x deploy/production/deploy.sh
./deploy/production/deploy.sh
```

**Или вручную:**
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml up -d --build
sleep 20
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend alembic upgrade head
```

### 6. Проверить работу

```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps
curl http://localhost/api/health
```

**Откройте в браузере:** http://YOUR_SERVER_IP (замените на ваш IP или домен)

---

## ❗ Важно

1. **Пароль от базы данных** - обязательно нужен!
   - Узнайте у администратора сервера
   - Или найдите в панели управления хостингом

2. **SECRET_KEY** - можно сгенерировать на сервере:
   ```bash
   openssl rand -hex 32
   ```

---

## 📝 Краткая версия команд

```bash
# На сервере (используйте данные из .env.deploy)
ssh YOUR_USER@YOUR_SERVER_IP
mkdir -p /var/www/beauty_salon && cd /var/www/beauty_salon
# Загрузить файлы проекта (через scp/git/sftp или используйте .\deploy-to-prod.ps1)
nano .env  # Создать .env с паролем БД
chmod +x deploy/production/deploy.sh
./deploy/production/deploy.sh
```

