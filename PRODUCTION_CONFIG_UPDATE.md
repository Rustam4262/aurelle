# ✅ Production Configuration Update

**Дата**: 2026-01-15 21:25 +05
**Сервер**: https://aurelle.uz

---

## 🎉 Что настроено

### ✅ Выполнено сегодня:

1. **Seed данные** ✅
   - Создано 3 тестовых салона
   - Создано 3 мастера
   - Создано 5 услуг
   - Настроено рабочее время
   - Связи мастер-услуга

2. **Redis кеширование** ✅
   - Подключен к Docker Redis (порт 6379)
   - Добавлено в .env: `REDIS_URL=redis://localhost:6379`
   - Работает rate limiting через Redis
   - Доступно для кеширования запросов

3. **Push уведомления** ✅
   - Сгенерированы VAPID ключи
   - Добавлено в .env
   - Логи показывают: `[PUSH] ✅ Web Push configured with VAPID keys`

4. **Дополнительные настройки** ✅
   - `APP_URL=https://aurelle.uz`
   - `APP_VERSION=1.0.0`

---

## 📊 Текущие данные в БД

### Салоны (4 шт):

1. **Люкс Салон Красоты** (Ташкент) - рейтинг 4.8, 24 отзыва
2. **Релакс СПА** (Ташкент) - рейтинг 4.9, 18 отзывов
3. **Стиль и Красота** (Самарканд) - рейтинг 4.7, 31 отзыв
4. **haircut** (Ташкент) - создан вручную пользователем

### Мастера (3 шт):

- Создано seed скриптом
- Привязаны к салонам

### Услуги (5 шт):

- Создано seed скриптом
- Связаны с мастерами

---

## ❌ Что ЕЩЕ нужно настроить

### Критичные (P0):

#### 1. Email уведомления

**Статус**: ❌ Не настроено
**Причина**: Нет SMTP credentials

**Быстрое решение (SendGrid, бесплатно 100 писем/день):**

1. Зарегистрироваться: https://signup.sendgrid.com
2. Verify email
3. Create API Key: https://app.sendgrid.com/settings/api_keys
   - Имя: "AURELLE Production"
   - Permissions: Full Access
4. Скопировать API key

Добавить в `.env` на сервере:

```env
# Email notifications
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=AURELLE <noreply@aurelle.uz>
```

Перезапустить:

```bash
pm2 restart aurelle-production --update-env
```

---

#### 2. OAuth (Google + Yandex)

**Статус**: ❌ Не настроено
**Причина**: Нет Client ID и Secret

**Google OAuth (5 минут):**

1. https://console.cloud.google.com/apis/credentials
2. Create project "AURELLE"
3. Enable "Google+ API"
4. Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://aurelle.uz/api/auth/google/callback`
5. Copy Client ID and Secret

**Yandex OAuth (5 минут):**

1. https://oauth.yandex.ru
2. Create application "AURELLE"
3. Platforms: Web services
4. Callback URI: `https://aurelle.uz/api/auth/yandex/callback`
5. Permissions: login:info, login:email
6. Copy ID and Password

Добавить в `.env`:

```env
# OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz123
YANDEX_CLIENT_ID=abc123
YANDEX_CLIENT_SECRET=xyz456
```

---

#### 3. Яндекс.Карты API

**Статус**: ❌ Не настроено
**Причина**: Нет API ключа

**Как получить (5 минут):**

1. https://developer.tech.yandex.ru
2. JavaScript API and HTTP Geocoder → "Получить ключ"
3. Добавить домен: `aurelle.uz`
4. Скопировать API key

**⚠️ Важно**: Это для **frontend**!

Создать на сервере:

```bash
echo "VITE_YANDEX_MAPS_API_KEY=your-api-key-here" > /var/www/aurelle/current/client/.env
```

Пересобрать фронтенд:

```bash
cd /var/www/aurelle/current
npm run build
pm2 restart aurelle-production
```

---

### Важные (P1):

#### 4. Sentry мониторинг (опционально)

**Статус**: ❌ Не настроено

1. https://sentry.io/signup
2. Create project "aurelle-backend" (Node.js)
3. Create project "aurelle-frontend" (React)
4. Copy DSN

Добавить в `.env`:

```env
SENTRY_DSN=https://abc@o123.ingest.sentry.io/456
SENTRY_ENVIRONMENT=production
```

---

## 📋 Полный .env файл

Текущий .env на сервере:

```env
# Database
DATABASE_URL=postgresql://aurelle_user:aurelle_pass_2026@localhost:5433/aurelle_production

# Server
NODE_ENV=production
PORT=5000

# Session
SESSION_SECRET=J8k3mP9xR2vN7qL4wT6yU1oI5eA0sD3fG8hZ2bC4vX6n

# Application
APP_URL=https://aurelle.uz
APP_VERSION=1.0.0

# Redis Cache ✅ НАСТРОЕНО
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Push Notifications ✅ НАСТРОЕНО
VAPID_PUBLIC_KEY=BPv9ImIK1D3hRX_UlTDWxCqL9QAUkX3PEwjYnx8hLkRWG7FEZh11pyYBhRv40tD-RHTVi2EpY5efJVv7XT4Y7a4
VAPID_PRIVATE_KEY=5lhCzr6U46-JHpfUUgt1bGR_P7NLUft_sONqxkVPU8s
VAPID_SUBJECT=mailto:admin@aurelle.uz

# OAuth ❌ НУЖНО НАСТРОИТЬ
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=

# Email ❌ НУЖНО НАСТРОИТЬ
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=
# EMAIL_FROM=

# Sentry (optional)
# SENTRY_DSN=
```

---

## 🚀 Быстрый чеклист

### Сделано ✅:

- [x] Тестовые данные созданы (3 салона, 3 мастера, 5 услуг)
- [x] Redis подключен и работает
- [x] Push уведомления настроены (VAPID ключи)
- [x] APP_URL и APP_VERSION добавлены
- [x] Приложение перезапущено

### Осталось сделать ❌:

- [ ] Настроить Email (SendGrid) - **15 минут**
- [ ] Получить Google OAuth credentials - **5 минут**
- [ ] Получить Yandex OAuth credentials - **5 минут**
- [ ] Получить Яндекс.Карты API ключ - **5 минут**
- [ ] (Опционально) Настроить Sentry - **10 минут**

**Итого: ~30 минут → ВСЕ критичные функции работают!**

---

## 🎯 Что изменится после настройки

### После Email:

✅ Пользователи получают письмо при регистрации
✅ Подтверждение бронирования по email
✅ Напоминания за 24 часа до записи
✅ Уведомление об отмене бронирования

### После OAuth:

✅ Вход через Google (кнопка появится)
✅ Вход через Яндекс (кнопка появится)
✅ Быстрая регистрация без пароля

### После Яндекс.Карты:

✅ Карта с салонами на главной странице
✅ Карта на странице салона
✅ Выбор местоположения при создании салона

### После Sentry:

✅ Автоматическое отслеживание ошибок
✅ Email уведомления об ошибках
✅ Performance monitoring

---

## 📝 Тестирование

### Проверка текущих функций:

**1. Салоны:**

```bash
curl https://aurelle.uz/api/salons
# Должно вернуть 4 салона (3 seed + 1 вручную)
```

**2. Push уведомления:**

```bash
pm2 logs aurelle-production | grep PUSH
# [PUSH] ✅ Web Push configured with VAPID keys
```

**3. Redis:**

```bash
docker exec aurelle-redis redis-cli ping
# PONG
```

**4. Seed данные:**

- https://aurelle.uz - должны отображаться 4 салона
- Рейтинги: 4.7-4.9
- Города: Ташкент, Самарканд

---

## 🔗 Полезные ссылки

### Для настройки:

- SendGrid: https://signup.sendgrid.com
- Google OAuth: https://console.cloud.google.com/apis/credentials
- Yandex OAuth: https://oauth.yandex.ru
- Яндекс.Карты: https://developer.tech.yandex.ru
- Sentry: https://sentry.io/signup

### Документация:

- [PRODUCTION_MISSING_CONFIG.md](./PRODUCTION_MISSING_CONFIG.md) - Полное описание проблем
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./MD%20files/PRODUCTION_DEPLOYMENT_GUIDE.md) - Руководство по деплою
- [PRODUCTION_QUICK_COMMANDS.md](./PRODUCTION_QUICK_COMMANDS.md) - Быстрые команды

---

**Статус**: 60% настроено, 40% осталось (критичные настройки)

**Следующий шаг**: Настроить Email, OAuth и Яндекс.Карты (~30 минут) 🚀
