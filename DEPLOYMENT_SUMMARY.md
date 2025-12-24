# ✅ Готово к деплою!

## 📦 Что было подготовлено:

1. ✅ **docker-compose.prod-external-db.yml** - конфигурация для production с внешней БД
2. ✅ **deploy/production/deploy.sh** - скрипт автоматического деплоя
3. ✅ **.env.production.template** - шаблон переменных окружения
4. ✅ **DEPLOY_INSTRUCTIONS.md** - подробная инструкция
5. ✅ **QUICK_DEPLOY_GUIDE.md** - краткая инструкция
6. ✅ **deploy/nginx/conf.d/default.conf** - конфигурация Nginx для IP адреса
7. ✅ **backend/Dockerfile.prod** - production Dockerfile с gunicorn
8. ✅ Добавлен **gunicorn** в requirements.txt

---

## 🚀 Быстрый старт

### 0. Настройте учетные данные:

```bash
cp .env.deploy.example .env.deploy
nano .env.deploy  # Заполните данные вашего сервера
```

### 1. На сервере:

```bash
ssh YOUR_USER@YOUR_SERVER_IP
# Введите пароль при запросе
```

### 2. Загрузить проект:

```bash
# С вашей машины (используйте данные из .env.deploy):
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'venv' \
  . YOUR_USER@YOUR_SERVER_IP:/var/www/beauty_salon/

# Или используйте автоматический скрипт:
# .\deploy-to-prod.ps1
```

### 3. Настроить .env:

```bash
# На сервере:
cd /var/www/beauty_salon
nano .env
```

**Минимальный .env (ВАЖНО: замените пароль БД!):**
```env
DATABASE_URL=postgresql://aurelleu_aurelle_user:ВАШ_ПАРОЛЬ_БД@localhost:5432/aurelleu_aurelle_db
SECRET_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=http://YOUR_SERVER_IP
ALLOWED_HOSTS=YOUR_SERVER_IP
VITE_API_URL=http://YOUR_SERVER_IP/api
ENVIRONMENT=production
```

### 4. Запустить:

```bash
chmod +x deploy/production/deploy.sh
./deploy/production/deploy.sh
```

---

## ❗ Что нужно перед деплоем:

1. **Пароль от базы данных** - узнайте у администратора сервера
   - База: `aurelleu_aurelle_db`
   - Пользователь: `aurelleu_aurelle_user`
   - Хост: `localhost` (или IP БД сервера)
   - Порт: `5432` (обычно)

2. **Установить Docker на сервере** (если нет):
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
   apt install docker-compose -y
   ```

3. **Открыть порты** в файрволе (если есть):
   - 80 (HTTP)
   - 443 (HTTPS, если будет SSL)
   - 8000 (опционально, для прямого доступа к API)

---

## 📁 Структура файлов для деплоя:

```
beauty_salon/
├── deploy/
│   └── production/
│       ├── deploy.sh                              # Скрипт деплоя
│       └── docker-compose.prod-external-db.yml    # Docker Compose для продакшна
├── deploy/nginx/
│   └── conf.d/
│       └── default.conf                           # Nginx конфигурация
├── backend/
│   └── Dockerfile.prod                            # Production Dockerfile
├── .env.production.template                       # Шаблон .env
├── DEPLOY_INSTRUCTIONS.md                         # Подробная инструкция
└── QUICK_DEPLOY_GUIDE.md                          # Быстрый гайд
```

---

## 🔍 Проверка после деплоя:

```bash
# Статус контейнеров
docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps

# Логи
docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs -f

# Проверка API
curl http://localhost/api/health
curl http://localhost/api/salons
```

**В браузере:**
- Frontend: http://89.39.94.194
- API: http://89.39.94.194/api
- API Docs: http://89.39.94.194/api/docs

---

## 📝 Документация:

- **DEPLOY_INSTRUCTIONS.md** - полная инструкция с решением проблем
- **QUICK_DEPLOY_GUIDE.md** - краткая версия для быстрого деплоя
- **DEPLOY_TO_SERVER.md** - общая информация о деплое

---

## ✅ Готово к работе!

Проект полностью подготовлен для деплоя. Осталось только:
1. Узнать пароль от базы данных
2. Следовать инструкциям в `QUICK_DEPLOY_GUIDE.md` или `DEPLOY_INSTRUCTIONS.md`

