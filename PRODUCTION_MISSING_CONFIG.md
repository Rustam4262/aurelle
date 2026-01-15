# ❌ Почему функции не работают на проде?

**Дата**: 2026-01-15
**Проблема**: Код реализован, но функции не активны

---

## 📊 Краткая статистика

| Категория | Реализовано | Настроено | % |
|-----------|-------------|-----------|---|
| **Базовый функционал** | ✅ Да | ✅ Да | 100% |
| **Email уведомления** | ✅ Да | ❌ Нет | 0% |
| **OAuth (Google, Yandex)** | ✅ Да | ❌ Нет | 0% |
| **Яндекс.Карты** | ✅ Да | ❌ Нет | 0% |
| **Redis кеш** | ✅ Да | ❌ Нет | 0% |
| **Sentry мониторинг** | ✅ Да | ❌ Нет | 0% |
| **Push уведомления** | ✅ Да | ❌ Нет | 0% |

---

## 🔍 Детальный анализ

### ✅ Что РАБОТАЕТ на проде:

1. **Базовая авторизация** (email + password)
2. **Регистрация пользователей**
3. **Профили** (клиент, владелец, мастер)
4. **Салоны** (создание, редактирование, просмотр)
5. **Услуги** (добавление в салон)
6. **Мастера** (назначение в салон)
7. **Бронирование** (создание, просмотр)
8. **Отзывы** (добавление, просмотр)
9. **Админ-панель** (управление)
10. **i18n** (3 языка: RU, EN, UZ)
11. **Загрузка изображений**
12. **База данных PostgreSQL**
13. **PM2 process manager**
14. **Nginx reverse proxy**
15. **SSL/HTTPS**

---

### ❌ Что НЕ РАБОТАЕТ (нужна конфигурация):

---

## 1️⃣ Email уведомления (P0 - КРИТИЧНО)

### Статус: ❌ Не работает
### Причина: Нет SMTP настроек в .env

### Что не работает:
- ❌ Подтверждение регистрации
- ❌ Подтверждение бронирования
- ❌ Напоминания о записи (за 24 часа)
- ❌ Уведомление об отмене
- ❌ Ответ на отзыв
- ❌ Восстановление пароля

### Где реализовано:
- [server/lib/email.ts](server/lib/email.ts) - EmailService класс
- [server/routes/bookings.ts](server/routes/bookings.ts:156) - отправка при бронировании
- [server/jobs/send-reminders.ts](server/jobs/send-reminders.ts) - напоминания

### Что добавить в .env:
```env
# Вариант 1: Gmail (бесплатно)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=AURELLE <your-email@gmail.com>

# Вариант 2: SendGrid (рекомендуется)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=AURELLE <noreply@aurelle.uz>
```

### Как настроить:

#### Gmail (бесплатно, 500 писем/день):
1. Включить 2FA: https://myaccount.google.com/security
2. Создать App Password: https://myaccount.google.com/apppasswords
3. Скопировать пароль в SMTP_PASS

#### SendGrid (бесплатно 100 писем/день):
1. Зарегистрироваться: https://signup.sendgrid.com
2. Verify email и domain (опционально)
3. Создать API key: https://app.sendgrid.com/settings/api_keys
4. Скопировать в SMTP_PASS

---

## 2️⃣ OAuth провайдеры (P0 - КРИТИЧНО)

### Статус: ❌ Не работает
### Причина: Нет credentials

### Что не работает:
- ❌ Вход через Google
- ❌ Вход через Яндекс
- ❌ Вход через GitHub

### Где реализовано:
- [server/lib/auth/index.ts](server/lib/auth/index.ts:45-80) - OAuth strategies
- [server/routes/auth.ts](server/routes/auth.ts) - OAuth routes
- [client/src/pages/auth.tsx](client/src/pages/auth.tsx:120) - кнопки OAuth

### Как настроить:

#### Google OAuth:
1. Открыть: https://console.cloud.google.com/apis/credentials
2. Создать проект "AURELLE"
3. Включить Google+ API
4. Создать OAuth 2.0 Client ID:
   - **Application type**: Web application
   - **Authorized redirect URIs**: https://aurelle.uz/api/auth/google/callback
5. Скопировать Client ID и Secret в .env

```env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123...
```

#### Yandex OAuth:
1. Открыть: https://oauth.yandex.ru
2. Создать приложение "AURELLE"
3. Platforms: Web services
4. Callback URI: https://aurelle.uz/api/auth/yandex/callback
5. Permissions: Login (login:info, login:email)
6. Скопировать ID и Password

```env
YANDEX_CLIENT_ID=abc123...
YANDEX_CLIENT_SECRET=xyz456...
```

---

## 3️⃣ Яндекс.Карты (P0 - КРИТИЧНО)

### Статус: ❌ Не работает
### Причина: Нет API ключа

### Что не работает:
- ❌ Карта на главной странице
- ❌ Карта на странице салона
- ❌ Выбор местоположения при создании салона

### Где реализовано:
- [client/src/components/SalonMap.tsx](client/src/components/SalonMap.tsx) - компонент карты
- [client/src/pages/salon.tsx](client/src/pages/salon.tsx) - использование

### Как настроить:

1. Открыть: https://developer.tech.yandex.ru
2. Войти / Зарегистрироваться
3. JavaScript API and HTTP Geocoder → "Получить ключ"
4. Добавить домен: aurelle.uz
5. Скопировать API ключ

**⚠️ Важно**: Это переменная для FRONTEND!

Добавить на сервере в `/var/www/aurelle/current/client/.env`:
```env
VITE_YANDEX_MAPS_API_KEY=your-yandex-maps-api-key-here
```

Пересобрать фронтенд:
```bash
cd /var/www/aurelle/current
npm run build
pm2 reload aurelle-production
```

---

## 4️⃣ Redis кеширование (P1 - ВАЖНО)

### Статус: ❌ Не используется
### Причина: Нет подключения

### Что не работает:
- ❌ Кеширование списка салонов
- ❌ Кеширование сессий
- ❌ Rate limiting (используется memory store)
- ❌ Job queue для фоновых задач

### Где реализовано:
- [server/lib/redis.ts](server/lib/redis.ts) - Redis client
- [server/middleware/rateLimit.ts](server/middleware/rateLimit.ts) - rate limiting

### Как настроить:

На сервере уже есть Redis в Docker (порт 6379):
```bash
docker ps | grep redis
# aurelle-redis   redis:7   Up 6 days   127.0.0.1:6379->6379/tcp
```

Добавить в .env:
```env
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

Или установить системный Redis:
```bash
apt install redis-server
systemctl enable redis-server
systemctl start redis-server
```

---

## 5️⃣ Sentry мониторинг (P1 - ВАЖНО)

### Статус: ❌ Не работает
### Причина: Нет DSN

### Что не работает:
- ❌ Мониторинг ошибок на фронте
- ❌ Мониторинг ошибок на бэке
- ❌ Performance tracking
- ❌ User feedback

### Где реализовано:
- [server/lib/sentry.ts](server/lib/sentry.ts) - Sentry backend
- [client/src/lib/sentry.ts](client/src/lib/sentry.ts) - Sentry frontend

### Как настроить:

1. Зарегистрироваться: https://sentry.io
2. Создать проект "aurelle-backend" (Node.js)
3. Создать проект "aurelle-frontend" (React)
4. Скопировать DSN

```env
# Backend
SENTRY_DSN=https://abc123@o123.ingest.sentry.io/456
SENTRY_ENVIRONMENT=production

# Frontend (добавить в client/.env)
VITE_SENTRY_DSN=https://xyz789@o123.ingest.sentry.io/789
```

---

## 6️⃣ Push уведомления (P1 - ВАЖНО)

### Статус: ❌ Не работает
### Причина: Нет VAPID ключей

### Что не работает:
- ❌ Браузерные push уведомления
- ❌ Напоминания о записи
- ❌ Уведомления о новых сообщениях

### Где реализовано:
- [server/lib/push-notifications.ts](server/lib/push-notifications.ts) - Push service
- [client/src/lib/notifications.ts](client/src/lib/notifications.ts) - Frontend integration

### Как настроить:

Сгенерировать VAPID ключи:
```bash
npx web-push generate-vapid-keys
```

Добавить в .env:
```env
VAPID_PUBLIC_KEY=BGt8...
VAPID_PRIVATE_KEY=xyz...
VAPID_SUBJECT=mailto:admin@aurelle.uz
```

---

## 7️⃣ Google Analytics (P2 - ПОЛЕЗНО)

### Статус: ❌ Не работает
### Причина: Нет Measurement ID

### Что не работает:
- ❌ Отслеживание посетителей
- ❌ Конверсии
- ❌ События (бронирования, регистрации)

### Где реализовано:
- [server/services/analytics.service.ts](server/services/analytics.service.ts) - GA4 Measurement Protocol
- 25+ событий готово к отправке

### Как настроить:

1. Открыть: https://analytics.google.com
2. Создать GA4 property "AURELLE"
3. Data Streams → Add stream → Web
4. URL: https://aurelle.uz
5. Скопировать Measurement ID (G-XXXXXXXXXX)
6. Admin → Data Streams → Measurement Protocol API secrets → Create
7. Скопировать API Secret

```env
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=abc123xyz...
```

---

## 8️⃣ Seed данных (P0 - НУЖНО ДЛЯ ТЕСТИРОВАНИЯ)

### Статус: ❌ Нет тестовых данных
### Причина: Не запущен seed скрипт

### Что отсутствует:
- ❌ Тестовые салоны
- ❌ Тестовые мастера
- ❌ Тестовые услуги
- ❌ Тестовые бронирования
- ❌ Тестовые отзывы

### Как создать:

```bash
ssh root@89.39.94.194
cd /var/www/aurelle/current

# Вариант 1: TypeScript seed (если есть)
npm run db:seed

# Вариант 2: SQL скрипт (уже создан)
PGPASSWORD='aurelle_pass_2026' psql -h localhost -p 5433 -U aurelle_user -d aurelle_production < scripts/setup-database-complete.sql
```

---

## 📋 Чеклист настройки

### Критичные (P0) - Сделать сегодня:
- [ ] **Email** - Настроить SMTP (Gmail или SendGrid)
- [ ] **OAuth** - Получить Google и Yandex credentials
- [ ] **Яндекс.Карты** - Получить API ключ
- [ ] **Seed данных** - Создать тестовые данные

### Важные (P1) - Сделать на этой неделе:
- [ ] **Redis** - Подключить кеширование
- [ ] **Sentry** - Настроить мониторинг ошибок
- [ ] **Push** - Сгенерировать VAPID ключи

### Полезные (P2) - Сделать позже:
- [ ] **Google Analytics** - Настроить аналитику
- [ ] **Rate Limiting** - Оптимизировать с Redis

---

## 🚀 Быстрый старт

### Шаг 1: Обновить .env на сервере

```bash
ssh root@89.39.94.194
nano /var/www/aurelle/current/.env
```

Добавить минимальные настройки:
```env
# Email (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
EMAIL_FROM=AURELLE <noreply@aurelle.uz>

# OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
YANDEX_CLIENT_ID=YOUR_YANDEX_CLIENT_ID
YANDEX_CLIENT_SECRET=YOUR_YANDEX_CLIENT_SECRET

# Redis (используем Docker)
REDIS_URL=redis://localhost:6379
```

### Шаг 2: Настроить фронтенд

```bash
cat > /var/www/aurelle/current/client/.env <<EOF
VITE_YANDEX_MAPS_API_KEY=YOUR_YANDEX_MAPS_KEY
EOF
```

### Шаг 3: Пересобрать и перезапустить

```bash
cd /var/www/aurelle/current
npm run build
pm2 reload aurelle-production
```

### Шаг 4: Проверить

```bash
pm2 logs aurelle-production --lines 50
```

Должны исчезнуть warnings:
- ✅ "Sentry DSN not configured" → должен пропасть
- ✅ "Auth system initialized (local auth only)" → должно измениться на "Google/Yandex OAuth configured"
- ✅ "Push notifications not configured" → должен пропасть (если добавили VAPID)

---

## 📊 Приоритеты

### Сегодня (обязательно):
1. **Email** (30 минут) - SendGrid
2. **OAuth** (30 минут) - Google + Yandex
3. **Яндекс.Карты** (15 минут)
4. **Seed данных** (5 минут)

**Итого: ~1.5 часа → Все критичные функции работают!**

### На этой неделе:
5. **Redis** (15 минут)
6. **Sentry** (20 минут)
7. **Push** (10 минут)

### Потом:
8. **Google Analytics** (15 минут)

---

## 🎯 После настройки получите:

✅ Email уведомления при бронировании
✅ Вход через Google и Яндекс
✅ Карты с салонами на главной
✅ Тестовые данные для демо
✅ Мониторинг ошибок (Sentry)
✅ Кеширование (быстрее работает)
✅ Push уведомления в браузере

---

**Итого**: Код готов на 100%, но конфигурация только на 40%.

После добавления credentials и ключей ВСЕ функции заработают! 🚀
