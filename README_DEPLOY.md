# 🚀 Деплой на сервер - Краткая инструкция

## ⚡ Быстрый старт

### 0. Настройте учетные данные (на вашем компьютере):

```bash
# Создайте файл с учетными данными (НЕ коммитьте в git!)
cp .env.deploy.example .env.deploy
nano .env.deploy  # Заполните ваши данные сервера
```

### 1. На сервере:

```bash
ssh YOUR_USER@YOUR_SERVER_IP
# Введите пароль при запросе

# Установить Docker (если нет)
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose -y

# Создать директорию
mkdir -p /var/www/beauty_salon
cd /var/www/beauty_salon
```

### 2. Загрузить проект:

**С вашей машины (Windows PowerShell):**
```powershell
# Загрузить проект на сервер (используйте данные из .env.deploy)
# Или используйте автоматический скрипт:
.\deploy-to-prod.ps1
```

Или вручную через **scp**:
```powershell
scp -r . YOUR_USER@YOUR_SERVER_IP:/var/www/beauty_salon/
```

Или через **rsync** (если установлен):
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'venv' \
  . YOUR_USER@YOUR_SERVER_IP:/var/www/beauty_salon/
```

### 3. Создать .env файл:

```bash
# На сервере
cd /var/www/beauty_salon
nano .env
```

**Содержимое .env (ЗАМЕНИТЕ ПАРОЛЬ БД и IP!):**
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

**Сохранить:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 4. Запустить деплой:

```bash
chmod +x deploy/production/deploy.sh
./deploy/production/deploy.sh
```

**Или вручную:**
```bash
docker-compose -f deploy/production/docker-compose.prod-external-db.yml up -d --build
sleep 20
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend alembic upgrade head
```

### 5. Проверить:

```bash
curl http://localhost/api/health
curl http://localhost/api/salons
```

**Откройте в браузере:** http://YOUR_SERVER_IP (замените на ваш IP или домен)

---

## ❗ Важно

1. **Пароль от базы данных** - обязательно нужен!
   - База: `aurelleu_aurelle_db`
   - Пользователь: `aurelleu_aurelle_user`
   - Узнайте пароль у администратора сервера

2. **SECRET_KEY** - сгенерируйте уникальный ключ:
   ```bash
   openssl rand -hex 32
   ```

3. **Порты** - убедитесь что порты 80 и 443 открыты

---

## 📚 Подробная документация

- **DEPLOY_INSTRUCTIONS.md** - полная инструкция с решением проблем
- **QUICK_DEPLOY_GUIDE.md** - краткая версия
- **DEPLOYMENT_SUMMARY.md** - сводка о подготовке

---

## 🔧 Полезные команды

```bash
# Статус контейнеров
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps

# Логи
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs -f

# Перезапустить
docker-compose -f deploy/production/docker-compose.prod-external-db.yml restart

# Остановить
docker-compose -f deploy/production/docker-compose.prod-external-db.yml down
```

---

**Готово! Проект подготовлен к деплою!** 🎉

