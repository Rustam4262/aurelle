# 🛡️ AURELLE Admin Panel - Complete Guide

**Статус:** ✅ Готово к Production
**Версия:** 2.0
**Дата:** 20 февраля 2026

---

## 📖 Содержание

1. [Быстрый Старт](#-быстрый-старт)
2. [Функциональность](#-функциональность)
3. [Архитектура](#-архитектура)
4. [API Documentation](#-api-documentation)
5. [Тестирование](#-тестирование)
6. [Деплой](#-деплой)
7. [Troubleshooting](#-troubleshooting)

---

## 🚀 Быстрый Старт

### 1. Применить Миграцию

```bash
# Вариант A: Через Neon Console
# 1. Откройте https://console.neon.tech
# 2. SQL Editor → Вставьте содержимое migrations/0017_create_user_activity_tracking.sql
# 3. Нажмите Run

# Вариант B: Через CLI (если есть DATABASE_URL)
npx tsx script/run-migration.ts
```

### 2. Деплой

```bash
git add migrations/0017_create_user_activity_tracking.sql shared/schema.ts
git commit -m "Admin Panel: Complete integration"
git push origin main

# На сервере
cd /path/to/AURELLE
git pull && npm install && npm run build
pm2 restart aurelle-production
```

### 3. Проверка

```bash
# Откройте в браузере
https://ваш-домен.com/admin/dashboard
https://ваш-домен.com/admin/users
https://ваш-домен.com/admin/activity

# Или используйте тесты
./script/test-admin-api.sh  # Linux/Mac
.\script\test-admin-api.ps1  # Windows
```

---

## ✨ Функциональность

### 🎯 Для Супер-Администратора

#### 👥 **User Management**
- ✅ Просмотр всех пользователей (клиенты, владельцы, мастера, админы)
- ✅ Блокировка/разблокировка с указанием причины
- ✅ Массовые операции (bulk block/unblock)
- ✅ Фильтры: по роли, статусу, верификации
- ✅ Поиск: по email, имени, телефону
- ✅ Сортировка: по любому полю
- ✅ Пагинация: 10/20/50/100 на страницу
- ✅ Email уведомления при блокировке/разблокировке

#### 📊 **Dashboard Analytics**
- ✅ **Пользователи:** всего, новые за неделю
- ✅ **Салоны:** всего, верифицированные
- ✅ **Мастера:** всего активных
- ✅ **Бронирования:** общее количество
- ✅ **Модерация:** открытые жалобы, активные санкции
- ✅ **Online Users:** кто онлайн прямо сейчас (real-time, обновление каждые 30 сек)

#### 🔍 **Activity Tracking**
- ✅ **Кто онлайн** в данный момент (< 10 минут активности)
- ✅ **История сессий** каждого пользователя
  - Время логина/логаута
  - Длительность сессии
  - Тип устройства (Desktop/Mobile/Tablet)
  - Браузер и ОС
  - IP адрес
  - Количество действий за сессию
- ✅ **Статистика по пользователю:**
  - Общее количество логинов
  - Общее время на платформе
  - Средняя длительность сессии
  - Общее количество действий

#### 📈 **Platform Health**
- ✅ Активные сессии за 24 часа
- ✅ Средняя длительность сессии
- ✅ % блокированных пользователей
- ✅ % верификации email/phone
- ✅ График роста пользователей (30 дней)

#### ✅ **Salon Verification**
- ✅ Верификация/де-верификация салонов
- ✅ Фильтрация по верифицированным

---

## 🏗️ Архитектура

### База Данных

#### Новые Таблицы:

**user_activity_sessions**
```sql
- id (PK)
- user_id (FK → users)
- session_id
- login_at (когда вошёл)
- logout_at (когда вышел, NULL если активен)
- last_activity_at (последняя активность)
- ip_address
- user_agent
- device_type (mobile/desktop/tablet)
- browser (Chrome 120, Firefox 115, etc.)
- os (Windows 11, macOS 14, Android 13, etc.)
- duration_seconds (вычисляется при логауте)
- page_views (счётчик)
- actions_count (счётчик действий)
- created_at
- updated_at
```

**user_activity_actions**
```sql
- id (PK)
- user_id (FK → users)
- session_id (FK → user_activity_sessions)
- action_type (page_view, booking_create, etc.)
- entity_type (booking, salon, master, etc.)
- entity_id
- metadata (JSONB)
- ip_address
- user_agent
- created_at
```

#### Обновлённые Таблицы:

**users**
```sql
+ last_login_at TIMESTAMP       -- Последний вход
+ last_activity_at TIMESTAMP    -- Последняя активность
+ login_count INTEGER            -- Количество входов
+ total_session_time_seconds BIGINT  -- Общее время
+ is_blocked BOOLEAN             -- Заблокирован?
+ block_reason TEXT              -- Причина блокировки
```

**salons**
```sql
+ is_verified BOOLEAN  -- Верифицирован администратором
```

### Backend Flow

#### Login Flow:
```
1. User submits credentials
2. server/localAuth.ts → authenticate()
3. trackUserLogin(userId, req)
   ├─ Create record in user_activity_sessions
   ├─ Parse User-Agent (browser, OS, device)
   ├─ Update users.last_login_at
   └─ Increment users.login_count
4. Return session to user
```

#### Activity Heartbeat:
```
1. ANY API request from authenticated user
2. trackActivityHeartbeat() middleware
3. Update user_activity_sessions.last_activity_at
4. Update users.last_activity_at
5. Continue to route handler (non-blocking)
```

#### Logout Flow:
```
1. POST /api/auth/logout
2. trackUserLogout(sessionId)
   ├─ Find active session (logout_at IS NULL)
   ├─ Calculate duration = NOW() - login_at
   ├─ Update session: logout_at, duration_seconds
   └─ Update users.total_session_time_seconds
3. Destroy session
```

#### "Online" Definition:
```sql
-- Пользователь онлайн если:
SELECT * FROM user_activity_sessions
WHERE logout_at IS NULL              -- Сессия активна
AND last_activity_at > NOW() - INTERVAL '10 minutes'
```

---

## 📡 API Documentation

### Dashboard Endpoints

#### GET `/api/admin/dashboard`
Общая статистика платформы

**Response:**
```json
{
  "stats": {
    "users": {
      "total": 1234,
      "newLastWeek": 56
    },
    "salons": {
      "total": 234,
      "verified": 120
    },
    "masters": { "total": 456 },
    "bookings": { "total": 7890 },
    "moderation": {
      "openComplaints": 5,
      "activeSanctions": 2
    }
  }
}
```

#### GET `/api/admin/dashboard/online`
Количество онлайн пользователей

**Response:**
```json
{
  "onlineUsers": 42
}
```

#### GET `/api/admin/dashboard/platform-health`
Здоровье платформы

**Response:**
```json
{
  "health": {
    "blockedUserPercentage": 1.2,
    "activeSessionsLast24h": 234,
    "avgSessionDurationMinutes": 15,
    "pendingComplaints": 3,
    "emailVerificationRate": 78.5,
    "phoneVerificationRate": 65.3
  }
}
```

### Users Management Endpoints

#### GET `/api/admin/users`
Список пользователей с пагинацией

**Query Parameters:**
- `page` (default: 1)
- `pageSize` (default: 20)
- `role` (all, client, salon_owner, master, admin)
- `status` (all, active, blocked)
- `search` (email/name/phone)
- `sortBy` (createdAt, email, loginCount, etc.)
- `sortOrder` (asc, desc)

**Response:**
```json
{
  "users": [
    {
      "id": "user123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "phone": "+998901234567",
      "role": "client",
      "roles": ["client"],
      "status": "active",
      "isBlocked": false,
      "blockReason": null,
      "lastLoginAt": "2026-02-20T10:30:00Z",
      "lastActivityAt": "2026-02-20T11:00:00Z",
      "loginCount": 15,
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "createdAt": "2026-01-15T08:00:00Z"
    }
  ],
  "total": 1234,
  "page": 1,
  "pageSize": 20,
  "totalPages": 62
}
```

#### POST `/api/admin/users/:id/block`
Заблокировать пользователя

**Body:**
```json
{
  "reason": "Violation of platform rules"
}
```

**Response:**
```json
{
  "user": { ...updated user object... },
  "message": "User blocked successfully"
}
```

**Side Effects:**
- ✅ Updates `users.is_blocked = true`
- ✅ Updates `users.block_reason = reason`
- ✅ Logs to `audit_logs`
- ✅ Sends email notification to user

#### POST `/api/admin/users/:id/unblock`
Разблокировать пользователя

**Response:**
```json
{
  "user": { ...updated user object... },
  "message": "User unblocked successfully"
}
```

**Side Effects:**
- ✅ Updates `users.is_blocked = false`
- ✅ Updates `users.block_reason = null`
- ✅ Logs to `audit_logs`
- ✅ Sends email notification to user

### Activity Tracking Endpoints

#### GET `/api/admin/activity/sessions`
История сессий пользователей

**Query Parameters:**
- `userId` - фильтр по пользователю
- `activeOnly` (true/false) - только активные
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "sessions": [
    {
      "session": {
        "id": "session123",
        "userId": "user123",
        "sessionId": "sess_xyz",
        "loginAt": "2026-02-20T10:00:00Z",
        "logoutAt": "2026-02-20T11:30:00Z",
        "lastActivityAt": "2026-02-20T11:29:45Z",
        "ipAddress": "192.168.1.1",
        "deviceType": "desktop",
        "browser": "Chrome 120",
        "os": "Windows 11",
        "durationSeconds": 5400,
        "actionsCount": 45
      },
      "userEmail": "user@example.com",
      "userFirstName": "John",
      "userLastName": "Doe"
    }
  ]
}
```

#### GET `/api/admin/activity/online`
Кто сейчас онлайн

**Response:**
```json
{
  "onlineUsers": [
    {
      "userId": "user123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "lastActivityAt": "2026-02-20T11:55:00Z",
      "loginAt": "2026-02-20T10:00:00Z",
      "deviceType": "desktop",
      "browser": "Chrome 120",
      "os": "Windows 11"
    }
  ],
  "count": 1
}
```

#### GET `/api/admin/activity/stats?userId=XXX`
Статистика активности пользователя

**Response:**
```json
{
  "user": {
    "loginCount": 15,
    "totalSessionTime": 54000,
    "lastLoginAt": "2026-02-20T10:00:00Z",
    "lastActivityAt": "2026-02-20T11:55:00Z"
  },
  "sessions": {
    "total": 15,
    "avgDurationSeconds": 3600,
    "totalActions": 450
  }
}
```

---

## 🧪 Тестирование

### Автоматические Тесты

#### Linux/Mac:
```bash
# Установите ADMIN_TOKEN
export ADMIN_TOKEN="your_admin_jwt_token"

# Запустите тесты
chmod +x script/test-admin-api.sh
./script/test-admin-api.sh
```

#### Windows PowerShell:
```powershell
# Установите ADMIN_TOKEN
$env:ADMIN_TOKEN = "your_admin_jwt_token"

# Запустите тесты
.\script\test-admin-api.ps1
```

### Ручное Тестирование

#### 1. Dashboard
```bash
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. Online Users
```bash
curl -X GET http://localhost:5000/api/admin/activity/online \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Block User
```bash
curl -X POST http://localhost:5000/api/admin/users/USER_ID/block \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test blocking"}'
```

#### 4. Verify in Database
```sql
-- Проверить блокировку
SELECT id, email, is_blocked, block_reason
FROM users
WHERE id = 'USER_ID';

-- Проверить сессии
SELECT * FROM user_activity_sessions
WHERE user_id = 'USER_ID'
ORDER BY login_at DESC
LIMIT 5;
```

### Проверка Activity Tracking

#### Login → Check Session Created
```sql
-- После логина пользователя
SELECT *
FROM user_activity_sessions
WHERE user_id = 'YOUR_USER_ID'
AND logout_at IS NULL;

-- Должна быть запись с:
-- ✅ login_at = NOW()
-- ✅ device_type, browser, os заполнены
-- ✅ logout_at IS NULL
```

#### Logout → Check Duration Calculated
```sql
-- После логаута
SELECT logout_at, duration_seconds
FROM user_activity_sessions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY login_at DESC
LIMIT 1;

-- Должно быть:
-- ✅ logout_at заполнен
-- ✅ duration_seconds > 0
```

---

## 📦 Деплой

### Production Checklist

- [ ] 1. Создать backup БД
- [ ] 2. Применить миграцию `0017_create_user_activity_tracking.sql`
- [ ] 3. Commit и push изменений
- [ ] 4. Build проекта (`npm run build`)
- [ ] 5. Перезапустить сервер (`pm2 restart`)
- [ ] 6. Проверить `/admin/dashboard` в браузере
- [ ] 7. Протестировать блокировку пользователя
- [ ] 8. Проверить "Online Users" обновляется
- [ ] 9. Запустить automated tests
- [ ] 10. Мониторить логи на ошибки

### Откат (Rollback)

Если что-то пошло не так:

```sql
-- Удалить новые таблицы
DROP TABLE IF EXISTS user_activity_sessions CASCADE;
DROP TABLE IF EXISTS user_activity_actions CASCADE;

-- Удалить новые поля из users
ALTER TABLE users
  DROP COLUMN IF EXISTS last_login_at,
  DROP COLUMN IF EXISTS last_activity_at,
  DROP COLUMN IF EXISTS login_count,
  DROP COLUMN IF EXISTS total_session_time_seconds,
  DROP COLUMN IF EXISTS is_blocked,
  DROP COLUMN IF EXISTS block_reason;

-- Удалить поле is_verified из salons
ALTER TABLE salons DROP COLUMN IF EXISTS is_verified;
```

---

## 🔧 Troubleshooting

### Проблема: "Migration failed"

**Решение:**
```sql
-- Проверьте, какие таблицы уже есть
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%activity%';

-- Если таблицы уже существуют, пропустите CREATE TABLE
-- Выполните только ALTER TABLE команды
```

### Проблема: "Block не работает"

**Диагностика:**
```sql
-- 1. Проверьте права админа
SELECT u.email, ar.role_name, ar.permissions
FROM admin_users au
JOIN users u ON au.user_id = u.id
JOIN admin_roles ar ON au.role_id = ar.id
WHERE u.id = 'YOUR_USER_ID';

-- Должно быть: permissions содержит "users.write"

-- 2. Проверьте, обновляется ли поле
SELECT is_blocked, block_reason
FROM users
WHERE id = 'BLOCKED_USER_ID';
```

### Проблема: "Online users = 0"

**Причины:**
1. Никто не залогинен
2. Heartbeat middleware не работает
3. База данных не обновляется

**Диагностика:**
```sql
-- Проверить активные сессии
SELECT COUNT(*)
FROM user_activity_sessions
WHERE logout_at IS NULL
AND last_activity_at > NOW() - INTERVAL '10 minutes';

-- Если 0, то действительно никого нет
-- Если > 0, проверьте API endpoint
```

### Проблема: "Сессии не создаются"

**Проверьте:**
```javascript
// В server/localAuth.ts должно быть:
import { trackUserLogin } from "./middleware/activity";

// После успешной аутентификации:
await trackUserLogin(userId, req);
```

---

## 📚 Документация

Дополнительная документация:

- [QUICK_START.md](QUICK_START.md) - Быстрый старт (5 минут)
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Полный чеклист деплоя
- [ADMIN_PANEL_INTEGRATION_STATUS.md](ADMIN_PANEL_INTEGRATION_STATUS.md) - Детальный статус
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Технический отчёт

---

## 🎯 Итого

**Реализовано:**
- ✅ 12 API endpoints
- ✅ 2 новые таблицы БД
- ✅ 7 новых полей в существующих таблицах
- ✅ Real-time tracking активности
- ✅ Email уведомления
- ✅ Audit logging
- ✅ Мультиязычность (en, ru, uz)
- ✅ Автоматические тесты

**Статус:** 🎉 **ГОТОВО К PRODUCTION**

---

**Версия:** 2.0
**Последнее обновление:** 20 февраля 2026
**Автор:** Claude Sonnet 4.5
