# 🚀 Деплой на Production из VS Code

Готово! Теперь можно задеплоить проект на сервер **89.39.94.194** прямо из VS Code одной командой.

---

## ✅ Проверка готовности

### 1. Сервер доступен

Сервер **89.39.94.194** пингуется (25-61ms). ✅

### 2. Скрипты деплоя созданы

- ✅ `scripts/deploy-to-server.sh` (Linux/Mac)
- ✅ `scripts/deploy-to-server.bat` (Windows)
- ✅ Оба скрипта добавлены в Git

### 3. Документация готова

- ✅ [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Полное руководство
- ✅ [DEPLOY_TO_PRODUCTION_NOW.md](./DEPLOY_TO_PRODUCTION_NOW.md) - Быстрая инструкция

---

## 🎯 Выберите метод деплоя

### МЕТОД 1: Автоматический деплой (из VS Code) ⭐ РЕКОМЕНДУЕТСЯ

Запустите скрипт прямо из терминала VS Code:

**Windows:**

```bash
scripts\deploy-to-server.bat
```

**Linux/Mac:**

```bash
bash scripts/deploy-to-server.sh
```

**Что произойдет:**

1. ✅ Проверка git статуса
2. ✅ Коммит изменений (если есть)
3. ✅ Push в GitHub
4. ✅ Проверка SSH подключения к 89.39.94.194
5. ✅ Установка сервера (Node.js 20, PM2, PostgreSQL, Nginx)
6. ✅ Клонирование/обновление репозитория
7. ✅ npm ci && npm run build
8. ✅ PM2 restart (zero-downtime)
9. ✅ Health check

**Время выполнения:** 3-5 минут

---

### МЕТОД 2: GitHub Actions (автоматизированный)

1. Откройте: https://github.com/Rustam4262/aurelle/actions/workflows/deploy-production.yml
2. Нажмите **"Run workflow"**
3. Выберите **main**
4. Нажмите **"Run workflow"**

После сборки:

1. **Review deployments** → Approve and deploy

**Требует:** Настройку GitHub Secrets (см. [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md))

---

### МЕТОД 3: Ручной деплой (SSH)

Подключитесь к серверу:

```bash
ssh root@89.39.94.194
```

Следуйте инструкциям из [DEPLOY_TO_PRODUCTION_NOW.md](./DEPLOY_TO_PRODUCTION_NOW.md).

---

## 🔑 Перед первым деплоем

### Требуется SSH ключ

Убедитесь, что у вас настроен SSH доступ к серверу:

```bash
# Проверьте подключение
ssh root@89.39.94.194 exit
```

Если не работает:

**1. Генерация SSH ключа (если нет):**

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

**2. Копирование ключа на сервер:**

```bash
ssh-copy-id root@89.39.94.194
```

Или вручную:

```bash
# Скопируйте содержимое
cat ~/.ssh/id_ed25519.pub

# На сервере добавьте в:
# ~/.ssh/authorized_keys
```

---

## 📋 Что будет установлено на сервере

При первом запуске скрипт автоматически установит:

- ✅ **Node.js 20.x** (через nodesource)
- ✅ **PM2** (process manager)
- ✅ **PostgreSQL 14+** (база данных)
- ✅ **Nginx** (reverse proxy)
- ✅ **Git** (для клонирования)

Директория: `/var/www/aurelle/current`

---

## 🔍 После деплоя

### Проверьте статус:

```bash
# Подключитесь к серверу
ssh root@89.39.94.194

# Проверьте PM2
pm2 status

# Посмотрите логи
pm2 logs aurelle-production --lines 50

# Проверьте HTTP
curl http://localhost:5000
```

### Откройте в браузере:

```
http://89.39.94.194
```

Должна открыться главная страница AURELLE.

---

## 🔐 Настройка .env на сервере

После первого деплоя создайте `.env` файл на сервере:

```bash
ssh root@89.39.94.194

cd /var/www/aurelle/current

# Создайте .env
cat > .env <<'EOF'
# Database
DATABASE_URL=postgresql://aurelle_user:YOUR_PASSWORD@localhost:5432/aurelle_production

# Server
NODE_ENV=production
PORT=5000

# Session
SESSION_SECRET=<сгенерируйте: openssl rand -base64 32>

# Optional: OAuth, Sentry, Email
EOF

# Защитите файл
chmod 600 .env

# Перезапустите приложение
pm2 restart aurelle-production
```

---

## 🗄️ Настройка базы данных

```bash
# На сервере
ssh root@89.39.94.194

# Создайте БД и пользователя
sudo -u postgres psql <<EOF
CREATE DATABASE aurelle_production;
CREATE USER aurelle_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE aurelle_production TO aurelle_user;
\c aurelle_production
GRANT ALL ON SCHEMA public TO aurelle_user;
EOF

# Выполните миграции
cd /var/www/aurelle/current
npm run db:push

# Или загрузите тестовые данные
psql -h localhost -U aurelle_user -d aurelle_production < scripts/setup-database-complete.sql
```

---

## 🚨 Troubleshooting

### Проблема: SSH не подключается

```bash
# Проверьте доступность сервера
ping 89.39.94.194

# Проверьте SSH ключ
ssh -v root@89.39.94.194
```

### Проблема: Скрипт не запускается (Windows)

Убедитесь, что используете **Git Bash** или **WSL**:

- Git Bash поставляется с Git for Windows
- Или используйте PowerShell/CMD для .bat версии

### Проблема: PM2 не запускается

```bash
# На сервере
pm2 logs aurelle-production --err

# Проверьте .env
cat .env

# Перезапустите
pm2 restart aurelle-production
```

### Проблема: 502 Bad Gateway

```bash
# Проверьте PM2
pm2 status

# Проверьте Nginx
sudo systemctl status nginx

# Проверьте логи Nginx
tail -f /var/log/nginx/error.log
```

---

## 📊 Мониторинг после деплоя

```bash
# Статус приложения
ssh root@89.39.94.194 "pm2 status"

# Логи в реальном времени
ssh root@89.39.94.194 "pm2 logs aurelle-production"

# Использование ресурсов
ssh root@89.39.94.194 "pm2 monit"
```

---

## 🔄 Обновление после изменений

После внесения изменений в код:

```bash
# 1. Закоммитьте изменения
git add .
git commit -m "Update features"
git push origin main

# 2. Запустите скрипт деплоя снова
scripts\deploy-to-server.bat  # Windows
# или
bash scripts/deploy-to-server.sh  # Linux/Mac
```

Скрипт автоматически:

- Подтянет изменения на сервере
- Пересоберёт проект
- Перезапустит приложение (zero-downtime)

---

## ✅ Чеклист готовности

Перед запуском деплоя убедитесь:

- [ ] SSH ключ настроен для root@89.39.94.194
- [ ] Все изменения закоммичены в Git
- [ ] Сервер доступен (ping 89.39.94.194)
- [ ] У вас есть доступ к серверу как root
- [ ] Все тесты проходят локально

---

## 🎯 Следующие шаги после деплоя

1. **Настройте SSL/HTTPS** (см. [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md#шаг-6-настройка-ssl-https))
2. **Настройте бэкапы БД** (автоматические ежедневные)
3. **Настройте мониторинг** (Sentry, PM2 Plus)
4. **Настройте домен** (если есть)
5. **Создайте тестовых пользователей**

---

## 📚 Полная документация

- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Подробное руководство (6000+ строк)
- [DEPLOY_TO_PRODUCTION_NOW.md](./DEPLOY_TO_PRODUCTION_NOW.md) - Быстрая инструкция
- [scripts/deploy-to-server.sh](./scripts/deploy-to-server.sh) - Скрипт деплоя (bash)
- [scripts/deploy-to-server.bat](./scripts/deploy-to-server.bat) - Скрипт деплоя (Windows)

---

## 🆘 Нужна помощь?

1. Проверьте логи: `pm2 logs aurelle-production`
2. Проверьте статус: `pm2 status`
3. Откройте issue на GitHub
4. См. раздел Troubleshooting в [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)

---

**Готово к деплою! Запустите скрипт и через 5 минут приложение будет на продакшене. 🚀**

**Сервер**: 89.39.94.194
**Порт**: 5000
**URL**: http://89.39.94.194

**Удачи! 🎉**
