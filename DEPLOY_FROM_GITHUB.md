# 🚀 Деплой изменений из GitHub на продакшн сервер

## ✅ Быстрый способ (автоматический скрипт)

### Вариант 1: С файлом .env.deploy (рекомендуется)

1. **Создайте файл с учетными данными** (если еще не создан):
   ```powershell
   # Скопируйте шаблон
   Copy-Item .env.deploy.example .env.deploy
   
   # Откройте в редакторе и заполните
   notepad .env.deploy
   ```

2. **Заполните данные в .env.deploy:**
   ```env
   DEPLOY_SERVER_IP=ваш_ip_адрес
   DEPLOY_SERVER_USER=root
   DEPLOY_SERVER_PATH=/var/www/beauty_salon
   ```

3. **Запустите скрипт:**
   ```powershell
   .\deploy-to-prod-from-git.ps1
   ```

Скрипт автоматически:
- ✅ Подключится к серверу
- ✅ Выполнит `git pull` на сервере
- ✅ Пересоберет Docker образы
- ✅ Перезапустит контейнеры
- ✅ Выполнит миграции БД

---

### Вариант 2: Без файла .env.deploy

Если файла `.env.deploy` нет, скрипт попросит ввести данные вручную:

```powershell
.\deploy-to-prod-from-git.ps1

# Скрипт запросит:
# - Server IP address
# - SSH username (по умолчанию: root)
# - Project path (по умолчанию: /var/www/beauty_salon)
```

---

## 🔧 Ручной способ (если скрипт не работает)

### Подключитесь к серверу:

```bash
ssh YOUR_USER@YOUR_SERVER_IP
cd /var/www/beauty_salon
```

### Выполните обновление:

```bash
# 1. Обновить код из GitHub
git pull origin main  # или git pull origin master

# 2. Сделать скрипт исполняемым (если еще не сделано)
chmod +x deploy/production/update-from-git.sh

# 3. Запустить скрипт обновления
./deploy/production/update-from-git.sh
```

Или вручную по шагам:

```bash
# 1. Git pull
git pull origin main

# 2. Остановить контейнеры
docker-compose -f deploy/production/docker-compose.prod-external-db.yml down

# 3. Пересобрать образы
docker-compose -f deploy/production/docker-compose.prod-external-db.yml build --no-cache

# 4. Запустить контейнеры
docker-compose -f deploy/production/docker-compose.prod-external-db.yml up -d

# 5. Подождать запуска
sleep 15

# 6. Выполнить миграции
docker-compose -f deploy/production/docker-compose.prod-external-db.yml exec backend alembic upgrade head

# 7. Проверить статус
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps
```

---

## ⚠️ Важно перед деплоем

1. **Убедитесь что изменения закоммичены и запушены в GitHub:**
   ```bash
   git status
   git push origin main  # или git push origin master
   ```

2. **Проверьте что на сервере настроен Git репозиторий:**
   ```bash
   ssh YOUR_USER@YOUR_SERVER_IP
   cd /var/www/beauty_salon
   git remote -v  # должен показать ваш GitHub репозиторий
   ```

---

## 🔍 Проверка после деплоя

```bash
# На сервере или локально
ssh YOUR_USER@YOUR_SERVER_IP

# Проверить статус контейнеров
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps

# Проверить логи
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs -f backend

# Проверить API
curl http://localhost/api/health
curl http://localhost/api/salons

# Проверить последний коммит
cd /var/www/beauty_salon
git log --oneline -5
```

---

## ❌ Откат (если что-то пошло не так)

```bash
# На сервере
cd /var/www/beauty_salon

# Посмотреть историю коммитов
git log --oneline -10

# Откатиться к предыдущему коммиту
git reset --hard <commit-hash>

# Перезапустить с предыдущей версией
./deploy/production/update-from-git.sh
```

---

**Готово!** 🎉 Ваши изменения из GitHub теперь на продакшене!

