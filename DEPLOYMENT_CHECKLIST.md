# 🚀 Deployment Checklist - Admin Panel Integration

## Перед Деплоем

### 1. Проверка Кода

- [x] ✅ Код скомпилирован без ошибок (`npm run build`)
- [x] ✅ TypeScript схема обновлена ([shared/schema.ts](shared/schema.ts))
- [x] ✅ Middleware для tracking создан ([server/middleware/activity.ts](server/middleware/activity.ts))
- [x] ✅ API endpoints обновлены:
  - [server/routes/admin/users.routes.ts](server/routes/admin/users.routes.ts)
  - [server/routes/admin/activity.routes.ts](server/routes/admin/activity.routes.ts)
  - [server/routes/admin/dashboard.routes.ts](server/routes/admin/dashboard.routes.ts)
- [x] ✅ Переводы добавлены (en, ru, uz)
- [x] ✅ Миграция SQL подготовлена ([migrations/0017_create_user_activity_tracking.sql](migrations/0017_create_user_activity_tracking.sql))

### 2. Файлы для Деплоя

Убедитесь, что следующие файлы закоммичены:

```bash
git status
# Должны быть staged:
# - migrations/0017_create_user_activity_tracking.sql (UPDATED)
# - shared/schema.ts (UPDATED)
# - server/middleware/activity.ts (already exists)
# - server/routes/admin/*.routes.ts (already exists)
```

---

## Деплой на Production

### Шаг 1: Commit & Push

```bash
git add migrations/0017_create_user_activity_tracking.sql
git add shared/schema.ts
git commit -m "Финализация интеграции Admin Panel: Activity tracking"
git push origin main
```

### Шаг 2: Применить Миграцию к БД

#### Вариант A: Через Neon Console (Рекомендуется)

1. Откройте https://console.neon.tech
2. Выберите проект AURELLE
3. Перейдите в **SQL Editor**
4. Скопируйте весь файл [migrations/0017_create_user_activity_tracking.sql](migrations/0017_create_user_activity_tracking.sql)
5. Вставьте в SQL Editor
6. Нажмите **Run** ▶️
7. Проверьте результат (должно быть без ошибок)

#### Вариант B: Через SSH на сервере

```bash
# Подключитесь к серверу
ssh your-server

# Перейдите в директорию проекта
cd /path/to/AURELLE

# Установите DATABASE_URL (если не установлен)
export DATABASE_URL="postgresql://..."

# Запустите миграцию
npx tsx script/run-migration.ts
```

### Шаг 3: Перезапустить Production Сервер

```bash
# На сервере
pm2 restart aurelle-production

# Или если используете другой процесс менеджер
npm run build
npm start
```

---

## После Деплоя - Проверка

### ✅ 1. Проверка База Данных

Откройте Neon SQL Editor и выполните:

```sql
-- Проверить новые таблицы
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%activity%';
-- Ожидаемый результат: user_activity_sessions, user_activity_actions

-- Проверить новые поля в users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('last_login_at', 'is_blocked', 'login_count', 'block_reason');
-- Ожидаемый результат: 4 строки

-- Проверить is_verified в salons
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'salons'
AND column_name = 'is_verified';
-- Ожидаемый результат: 1 строка

-- Проверить индексы
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('users', 'user_activity_sessions')
ORDER BY indexname;
-- Должны быть: idx_users_blocked, idx_user_activity_sessions_user_id, etc.
```

### ✅ 2. Проверка API Endpoints

#### Test 1: Dashboard Stats

```bash
curl -X GET https://your-domain.com/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Ожидаемый ответ:**
```json
{
  "stats": {
    "users": {
      "total": 123,
      "newLastWeek": 15
    },
    "salons": {
      "total": 45,
      "verified": 12
    },
    "masters": { "total": 67 },
    "bookings": { "total": 234 },
    "moderation": {
      "openComplaints": 3,
      "activeSanctions": 1
    }
  }
}
```

#### Test 2: Users List with Filters

```bash
curl -X GET "https://your-domain.com/api/admin/users?page=1&pageSize=10&role=all&status=active" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Ожидаемый ответ:**
```json
{
  "users": [...],
  "total": 123,
  "page": 1,
  "pageSize": 10,
  "totalPages": 13
}
```

#### Test 3: Block User (Главный тест!)

```bash
curl -X POST https://your-domain.com/api/admin/users/USER_ID/block \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test blocking - please unblock immediately"}'
```

**Ожидаемый ответ:**
```json
{
  "user": {
    "id": "...",
    "isBlocked": true,
    "blockReason": "Test blocking - please unblock immediately"
  },
  "message": "User blocked successfully"
}
```

**🔍 ВАЖНО:** Проверьте в базе данных:
```sql
SELECT id, email, is_blocked, block_reason
FROM users
WHERE id = 'USER_ID';
```
Поле `is_blocked` должно быть **true**, а `block_reason` содержать текст!

#### Test 4: Unblock User

```bash
curl -X POST https://your-domain.com/api/admin/users/USER_ID/unblock \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Test 5: Online Users

```bash
curl -X GET https://your-domain.com/api/admin/activity/online \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Ожидаемый ответ:**
```json
{
  "onlineUsers": [
    {
      "userId": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "lastActivityAt": "2026-02-20T10:30:00Z",
      "deviceType": "desktop",
      "browser": "Chrome 120"
    }
  ],
  "count": 1
}
```

#### Test 6: User Activity Stats

```bash
curl -X GET "https://your-domain.com/api/admin/activity/stats?userId=USER_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Ожидаемый ответ:**
```json
{
  "user": {
    "loginCount": 15,
    "totalSessionTime": 36000,
    "lastLoginAt": "2026-02-20T09:00:00Z",
    "lastActivityAt": "2026-02-20T10:30:00Z"
  },
  "sessions": {
    "total": 15,
    "avgDurationSeconds": 2400,
    "totalActions": 450
  }
}
```

### ✅ 3. Проверка Frontend

#### Test 1: Admin Dashboard

1. Войдите как **super-admin**
2. Откройте `https://your-domain.com/admin/dashboard`
3. Проверьте, что отображается:
   - ✅ Статистика пользователей (Total Users, New This Week)
   - ✅ Статистика салонов (Total Salons, Verified)
   - ✅ Online Users count
   - ✅ Графики (User Growth, Booking Trends)

#### Test 2: Users Management

1. Откройте `https://your-domain.com/admin/users`
2. Проверьте:
   - ✅ Список пользователей загружается
   - ✅ Пагинация работает (переключение страниц)
   - ✅ Фильтр по роли работает (Client, Owner, Master, Admin)
   - ✅ Фильтр по статусу работает (Active, Blocked)
   - ✅ Поиск работает (по email/имени/телефону)
   - ✅ Сортировка работает (по любой колонке)

#### Test 3: Block/Unblock User

1. Выберите тестового пользователя
2. Нажмите "Block" 🚫
3. Введите причину блокировки
4. Нажмите "Confirm Block"
5. Проверьте:
   - ✅ Статус изменился на "Blocked"
   - ✅ Показывается причина блокировки
   - ✅ В базе данных `is_blocked = true`
6. Нажмите "Unblock" ✅
7. Проверьте:
   - ✅ Статус изменился на "Active"
   - ✅ В базе данных `is_blocked = false`

#### Test 4: Bulk Operations

1. Выберите несколько пользователей (чекбоксы)
2. Нажмите "Block Selected"
3. Введите причину
4. Подтвердите
5. Проверьте:
   - ✅ Все выбранные пользователи заблокированы
   - ✅ В базе данных все они имеют `is_blocked = true`

#### Test 5: Activity Tracking

1. Откройте `https://your-domain.com/admin/activity`
2. Проверьте (если UI реализован):
   - ✅ Список онлайн пользователей
   - ✅ История сессий
   - ✅ Детали устройств (Desktop/Mobile, Browser, OS)

### ✅ 4. Проверка Activity Tracking

#### Test: Login создаёт сессию

1. Выйдите из аккаунта
2. Войдите снова
3. Проверьте в базе данных:

```sql
SELECT *
FROM user_activity_sessions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY login_at DESC
LIMIT 1;
```

**Ожидаемый результат:**
- Новая запись с текущим временем в `login_at`
- `logout_at` должен быть NULL
- `device_type`, `browser`, `os` должны быть заполнены
- `ip_address` должен содержать ваш IP

#### Test: Activity Heartbeat обновляется

1. Залогиньтесь
2. Сделайте любое действие (откройте страницу салона, создайте бронирование)
3. Проверьте:

```sql
SELECT last_activity_at
FROM user_activity_sessions
WHERE user_id = 'YOUR_USER_ID'
AND logout_at IS NULL
ORDER BY login_at DESC
LIMIT 1;
```

`last_activity_at` должен обновиться!

#### Test: Logout завершает сессию

1. Выйдите из аккаунта
2. Проверьте:

```sql
SELECT logout_at, duration_seconds
FROM user_activity_sessions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY login_at DESC
LIMIT 1;
```

- `logout_at` должен быть заполнен
- `duration_seconds` должен быть > 0

#### Test: Online Users Detection

1. Залогиньтесь с 2-3 разных аккаунтов (или попросите коллег)
2. Сделайте API запрос:

```bash
curl -X GET https://your-domain.com/api/admin/activity/online \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

3. Должны отображаться все активные пользователи (с активностью < 10 минут назад)

### ✅ 5. Проверка Email Уведомлений

1. Заблокируйте пользователя
2. Проверьте, что пользователь получил email:
   - Тема: "Your AURELLE Account Has Been Blocked"
   - Содержит причину блокировки
   - Содержит контактную информацию поддержки

3. Разблокируйте пользователя
4. Проверьте email:
   - Тема: "Your AURELLE Account Has Been Unblocked"

---

## 🔍 Мониторинг и Логи

### Проверить Логи Сервера

```bash
# PM2 logs
pm2 logs aurelle-production --lines 100

# Или прямые логи Node.js
tail -f /path/to/logs/server.log
```

**Ищите:**
- ✅ `User login tracked: USER_ID (session: SESSION_ID)`
- ✅ `User logout tracked: USER_ID (duration: XXXs)`
- ❌ Любые ошибки связанные с `activity` или `userActivitySessions`

### Проверить Audit Logs

```sql
SELECT *
FROM audit_logs
WHERE action LIKE '%user.block%'
OR action LIKE '%user.unblock%'
ORDER BY created_at DESC
LIMIT 10;
```

Должны быть записи о всех блокировках/разблокировках!

---

## 🎯 Финальный Чеклист

### База Данных
- [ ] Таблица `user_activity_sessions` создана
- [ ] Таблица `user_activity_actions` создана
- [ ] Поля `is_blocked`, `block_reason` добавлены в `users`
- [ ] Поля `last_login_at`, `login_count` добавлены в `users`
- [ ] Поле `is_verified` добавлено в `salons`
- [ ] Индексы созданы

### API Endpoints
- [ ] `GET /api/admin/dashboard` возвращает статистику
- [ ] `GET /api/admin/users` возвращает пагинированный список
- [ ] `POST /api/admin/users/:id/block` РЕАЛЬНО блокирует в БД
- [ ] `POST /api/admin/users/:id/unblock` РЕАЛЬНО разблокирует
- [ ] `GET /api/admin/activity/online` показывает онлайн пользователей
- [ ] `GET /api/admin/activity/stats` возвращает статистику по пользователю

### Activity Tracking
- [ ] Логин создаёт запись в `user_activity_sessions`
- [ ] Heartbeat обновляет `last_activity_at`
- [ ] Логаут записывает `logout_at` и `duration_seconds`
- [ ] `users.login_count` инкрементируется при каждом логине
- [ ] `users.total_session_time_seconds` обновляется при логауте

### Frontend
- [ ] Dashboard загружается без ошибок
- [ ] Users list работает с фильтрами
- [ ] Block/Unblock меняет статус в UI и БД
- [ ] Bulk operations работают
- [ ] Переводы корректны (en, ru, uz)

### Email & Notifications
- [ ] Email отправляется при блокировке
- [ ] Email отправляется при разблокировке
- [ ] Audit logs записываются

---

## ❗ Troubleshooting

### Проблема: "Migration failed"

**Решение:**
```sql
-- Проверьте, какие таблицы уже существуют
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Если таблицы уже есть, миграция не нужна
-- Если нет, запустите SQL вручную построчно
```

### Проблема: "Block не работает"

**Проверьте:**
```sql
-- Права админа
SELECT * FROM admin_roles WHERE role_name = 'super_admin';
-- Должно быть permissions с "users.write"

-- Текущий пользователь админ?
SELECT * FROM admin_users WHERE user_id = 'YOUR_USER_ID';
```

### Проблема: "Online users показывает 0"

**Причина:** Пользователи не залогинены или heartbeat не работает

**Проверьте:**
```sql
SELECT *
FROM user_activity_sessions
WHERE logout_at IS NULL
AND last_activity_at > NOW() - INTERVAL '10 minutes';
```

Если пусто - пользователи не активны или middleware не работает.

---

## 🎉 Успех!

Если все чеклисты пройдены ✅, поздравляем! Админ панель полностью интегрирована и готова к использованию.

### Что Теперь Доступно:

- 📊 **Полная статистика** платформы на dashboard
- 👥 **Управление пользователями** с блокировкой/разблокировкой
- 🔍 **Отслеживание активности** (кто онлайн, сколько времени провели)
- ✅ **Верификация салонов**
- 📧 **Email уведомления** при блокировке
- 📝 **Audit trail** всех действий админов
- 🌍 **Мультиязычность** (en, ru, uz)

**Администратор теперь имеет полный контроль над платформой!** 🚀
