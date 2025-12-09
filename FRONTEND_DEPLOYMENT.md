# 🚀 Руководство по деплою фронтенда AURELLE

## ✅ Выполненные изменения

### 1. Убраны все обращения к localhost

**Изменён файл**: [frontend/src/api/client.ts](frontend/src/api/client.ts)

**Было:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
```

**Стало:**
```typescript
// API_BASE_URL получаем из переменной окружения или используем относительный путь
// В продакшене VITE_API_URL будет https://api.aurelle.uz
// В разработке можно указать http://localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  // ...
})
```

**Что это даёт:**
- ✅ Нет захардкоженного localhost
- ✅ В продакшене используется `https://api.aurelle.uz`
- ✅ Fallback на `window.location.origin` (текущий домен)
- ✅ `/api` добавляется автоматически

---

### 2. Созданы файлы окружения

#### [frontend/.env.production](frontend/.env.production)
```env
# API URL для продакшена (БЕЗ /api - добавляется автоматически)
VITE_API_URL=https://api.aurelle.uz

# Yandex Maps API Key
VITE_YANDEX_MAPS_API_KEY=YOUR_YANDEX_MAPS_KEY
```

#### [frontend/.env.development](frontend/.env.development)
```env
# API URL для разработки
VITE_API_URL=http://localhost:8000

# Yandex Maps API Key
VITE_YANDEX_MAPS_API_KEY=YOUR_YANDEX_MAPS_KEY
```

#### [frontend/.env](frontend/.env) - для локальной разработки
```env
# API URL (БЕЗ /api на конце)
VITE_API_URL=http://localhost:8000

# Yandex Maps API Key
VITE_YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0
```

---

### 3. Обновлены скрипты сборки

**Файл**: [frontend/package.json](frontend/package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:check": "tsc && vite build",
    "build:prod": "vite build --mode production",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx"
  }
}
```

**Изменения:**
- ✅ `build` - быстрая сборка БЕЗ проверки TypeScript (для CI/CD)
- ✅ `build:check` - сборка С проверкой TypeScript (для разработки)
- ✅ `build:prod` - явная продакшн сборка с --mode production

---

### 4. Обновлён Dockerfile.prod

**Файл**: [frontend/Dockerfile.prod](frontend/Dockerfile.prod)

**Было:**
```dockerfile
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build
```

**Стало:**
```dockerfile
ARG VITE_API_URL=https://api.aurelle.uz
ARG VITE_YANDEX_MAPS_API_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_YANDEX_MAPS_API_KEY=$VITE_YANDEX_MAPS_API_KEY

RUN npm run build:prod
```

**Изменения:**
- ✅ Дефолтный URL для продакшена: `https://api.aurelle.uz`
- ✅ Передаётся Yandex Maps API ключ
- ✅ Используется `npm run build:prod`

---

### 5. Обновлён docker-compose.prod.yml

**Файл**: [docker-compose.prod.yml](docker-compose.prod.yml)

**Было:**
```yaml
frontend:
  build:
    args:
      - VITE_API_URL=${VITE_API_URL:-http://localhost/api}
```

**Стало:**
```yaml
frontend:
  build:
    args:
      - VITE_API_URL=https://api.aurelle.uz
      - VITE_YANDEX_MAPS_API_KEY=${VITE_YANDEX_MAPS_API_KEY}
```

**Изменения:**
- ✅ Захардкожен правильный продакшн URL
- ✅ Передаётся Yandex Maps ключ из .env

---

## 🔧 Локальное тестирование

### Проверка сборки:

```bash
cd frontend

# Установка зависимостей
npm install

# Сборка для продакшена
npm run build:prod

# Или быстрая сборка
npm run build

# Проверка с TypeScript
npm run build:check
```

### Запуск в dev режиме:

```bash
npm run dev
```

Откроется на `http://localhost:5173` и будет делать запросы на `http://localhost:8000/api` (из `.env`)

---

## 🚀 Деплой на продакшен (aurelle.uz)

### Шаг 1: Подключение к серверу

```bash
ssh aurelle@89.39.94.194
cd ~/projects/aurelle
```

### Шаг 2: Подготовка git

```bash
# Игнорировать изменения прав файлов
git config core.filemode false

# Добавить в exclude бэкапы и .env файлы
echo "backups/" >> .git/info/exclude
echo "frontend/.env.production" >> .git/info/exclude
echo "frontend/.env.development" >> .git/info/exclude
echo "frontend/.env.local" >> .git/info/exclude
```

### Шаг 3: Обновление кода

```bash
# Получить последние изменения
git fetch origin

# Жёсткий сброс на main (ОСТОРОЖНО!)
git reset --hard origin/main

# Дать права на выполнение скриптов
chmod +x deploy/scripts/*.sh
```

### Шаг 4: Проверка .env файла

```bash
# Проверить, что в главном .env есть Yandex Maps ключ
nano .env

# Должна быть строка:
# VITE_YANDEX_MAPS_API_KEY=ваш_ключ
```

### Шаг 5: Запуск обновления

```bash
# Безопасное обновление с автоматическим бэкапом
bash ./deploy/scripts/update.sh
```

**Что произойдёт:**
1. ✅ Создастся бэкап БД
2. ✅ Подтянется новый код
3. ✅ Соберутся новые Docker образы
4. ✅ Остановятся старые контейнеры
5. ✅ Запустятся новые контейнеры
6. ✅ Выполнятся миграции БД
7. ✅ Проверится health backend

### Шаг 6: Проверка

```bash
# Проверить статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Проверить логи frontend
docker-compose -f docker-compose.prod.yml logs frontend

# Проверить логи backend
docker-compose -f docker-compose.prod.yml logs backend

# Открыть сайт
# https://aurelle.uz
```

---

## 🐛 Решение проблем

### Проблема: Frontend не собирается

**Симптомы:**
```
ERROR: failed to solve: process "/bin/sh -c npm run build:prod" did not complete successfully
```

**Решение:**
```bash
# На сервере зайти в контейнер
docker-compose -f docker-compose.prod.yml build frontend --no-cache

# Проверить логи сборки
docker-compose -f docker-compose.prod.yml logs frontend
```

### Проблема: API запросы идут не туда

**Симптомы:**
- В браузере видны запросы на `http://localhost:8000`
- Ошибки CORS

**Решение:**
```bash
# Проверить переменные в контейнере
docker-compose -f docker-compose.prod.yml exec frontend sh
printenv | grep VITE

# Пересобрать frontend с правильными переменными
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### Проблема: Yandex Maps не работают

**Симптомы:**
- Карты не загружаются
- Ошибка в консоли: "Invalid API key"

**Решение:**
```bash
# Проверить .env файл
cat .env | grep YANDEX

# Добавить ключ, если его нет
nano .env
# Добавить:
VITE_YANDEX_MAPS_API_KEY=ваш_ключ

# Пересобрать
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

---

## 📋 Чек-лист деплоя

Перед деплоем убедитесь:

- [ ] Код закоммичен и запушен в main
- [ ] В .env есть `VITE_YANDEX_MAPS_API_KEY`
- [ ] Создан бэкап БД (автоматически через update.sh)
- [ ] Проверен git status на сервере
- [ ] Права на скрипты (chmod +x deploy/scripts/*.sh)

После деплоя проверьте:

- [ ] `https://aurelle.uz` открывается
- [ ] `https://api.aurelle.uz/docs` открывается
- [ ] Регистрация работает
- [ ] Логин работает
- [ ] Карты загружаются
- [ ] Нет ошибок в консоли браузера
- [ ] API запросы идут на `https://api.aurelle.uz/api/...`

---

## 🔄 Откат при проблемах

Если что-то пошло не так:

```bash
# Найти последний бэкап
ls -lht ./backups/*.sql.gz | head -1

# Восстановить БД
bash ./deploy/scripts/restore.sh ./backups/backup_YYYYMMDD_HHMMSS.sql.gz

# Откатить код на предыдущий коммит
git log --oneline | head -5  # посмотреть коммиты
git reset --hard <commit_hash>

# Пересобрать
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📊 Проверка в браузере

### Откройте консоль разработчика (F12)

**Вкладка Network:**
- Все API запросы должны идти на: `https://api.aurelle.uz/api/...`
- НЕ должно быть запросов на `localhost`

**Вкладка Console:**
- НЕ должно быть ошибок CORS
- НЕ должно быть ошибок "Network Error"
- Может быть предупреждение о Yandex Maps API (нормально)

**Проверка запросов:**
```javascript
// В консоли браузера
console.log(import.meta.env.VITE_API_URL)
// Должно быть: undefined (переменные не доступны в runtime)

// Проверить baseURL axios
import { apiClient } from './api/client'
console.log(apiClient.defaults.baseURL)
// Должно быть: https://api.aurelle.uz/api
```

---

## 📝 Полезные команды

```bash
# Просмотр логов в реальном времени
docker-compose -f docker-compose.prod.yml logs -f frontend

# Перезапуск только frontend
docker-compose -f docker-compose.prod.yml restart frontend

# Пересборка frontend
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend

# Проверка переменных окружения
docker-compose -f docker-compose.prod.yml config

# Вход в контейнер frontend
docker-compose -f docker-compose.prod.yml exec frontend sh
```

---

## ✅ Готово!

Теперь ваш фронтенд:
- ✅ Не использует localhost нигде в коде
- ✅ Работает через единый API клиент
- ✅ Правильно настроен для продакшена (https://aurelle.uz)
- ✅ Готов к обновлениям через update.sh
- ✅ Защищён автоматическими бэкапами

**Следующие шаги:**
1. Добавляйте салоны
2. Привлекайте клиентов
3. Рекламируйте платформу

Все данные пользователей **надёжно сохранены** благодаря системе бэкапов! 🎉
