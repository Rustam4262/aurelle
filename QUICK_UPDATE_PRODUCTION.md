# 🚀 Быстрое обновление продакшена из GitHub

## Вариант 1: Автоматический скрипт (рекомендуется)

### С вашего компьютера (Windows PowerShell):

```powershell
# Запустите скрипт деплоя
.\deploy-to-prod-from-git.ps1
```

Скрипт автоматически:
1. ✅ Подключится к серверу
2. ✅ Выполнит `git pull` на сервере
3. ✅ Пересоберет Docker образы
4. ✅ Перезапустит контейнеры
5. ✅ Выполнит миграции БД

---

## Вариант 2: Вручную на сервере

### Подключитесь к серверу:

```bash
ssh YOUR_USER@YOUR_SERVER_IP
cd /var/www/beauty_salon
```

### Выполните обновление:

```bash
# Сделайте скрипт исполняемым (если еще не сделано)
chmod +x deploy/production/update-from-git.sh

# Запустите обновление
./deploy/production/update-from-git.sh
```

Или вручную:

```bash
# 1. Обновить код из GitHub
git pull origin main  # или git pull origin master

# 2. Остановить контейнеры
docker-compose -f deploy/production/docker-compose.prod-external-db.yml down

# 3. Пересобрать образы
docker-compose -f deploy/production/docker-compose.prod-external-db.yml build --no-cache

# 4. Запустить контейнеры
docker-compose -f deploy/production/docker-compose.prod-external-db.yml up -d

# 5. Подождать пока backend запустится
sleep 15

# 6. Выполнить миграции
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend alembic upgrade head

# 7. Проверить статус
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps
```

---

## ⚠️ Важно перед обновлением

1. **Убедитесь что изменения закоммичены в GitHub:**
   ```bash
   git status
   git push origin main  # или git push origin master
   ```

2. **Проверьте что на сервере есть .env файл:**
   ```bash
   ssh YOUR_USER@YOUR_SERVER_IP
   cd /var/www/beauty_salon
   test -f .env && echo "OK" || echo "ERROR: .env not found!"
   ```

3. **Рекомендуется сделать бэкап БД перед обновлением:**
   ```bash
   # На сервере
   docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend python -c "from app.core.database import engine; print('DB connection OK')"
   ```

---

## 📋 Что делает скрипт обновления

Скрипт `deploy/production/update-from-git.sh` выполняет:

1. **Git Pull** - получает последние изменения из GitHub
2. **Остановка контейнеров** - останавливает текущие контейнеры
3. **Сборка образов** - пересобирает Docker образы с новым кодом
4. **Запуск сервисов** - запускает обновленные контейнеры
5. **Проверка здоровья** - ждет пока backend станет доступен
6. **Миграции БД** - выполняет миграции Alembic

---

## 🔍 Проверка после обновления

```bash
# Проверить статус контейнеров
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps

# Проверить логи
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs -f backend

# Проверить API
curl http://localhost/api/health

# Проверить что изменения применились
git log --oneline -5
```

---

## ❌ Откат изменений (если что-то пошло не так)

```bash
# На сервере
cd /var/www/beauty_salon

# Откатить к предыдущему коммиту
git log --oneline -5  # найти нужный коммит
git reset --hard <commit-hash>

# Перезапустить с предыдущей версией
./deploy/production/update-from-git.sh
```

---

**Готово!** Ваши изменения из GitHub теперь на продакшене! 🎉

