# 📂 Admin Panel - File Index

Все файлы, связанные с интеграцией Admin Panel и Activity Tracking.

## 📚 Документация

### Основные Руководства

| Файл | Описание | Для кого |
|------|----------|----------|
| [README_ADMIN_PANEL.md](README_ADMIN_PANEL.md) | 📖 **Полное руководство** - API docs, архитектура, тестирование | Разработчики |
| [QUICK_START.md](QUICK_START.md) | ⚡ **Быстрый старт** - за 5 минут | Все |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | ✅ **Чеклист деплоя** - шаг за шагом с тестами | DevOps |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | 📊 **Технический отчёт** - что и как реализовано | PM, Tech Lead |
| [ADMIN_PANEL_INTEGRATION_STATUS.md](ADMIN_PANEL_INTEGRATION_STATUS.md) | 📋 **Детальный статус** - компоненты, endpoints, переводы | Все |

---

## 💾 База Данных

### Миграция

| Файл | Описание |
|------|----------|
| [migrations/0017_create_user_activity_tracking.sql](migrations/0017_create_user_activity_tracking.sql) | SQL миграция для создания таблиц activity tracking |

**Что создаёт:**
- ✅ Таблица `user_activity_sessions` (15 полей)
- ✅ Таблица `user_activity_actions` (9 полей)
- ✅ Поля в `users`: `is_blocked`, `block_reason`, `last_login_at`, `login_count`, etc.
- ✅ Поле в `salons`: `is_verified`
- ✅ 10+ индексов для быстрых запросов

### Схема TypeScript

| Файл | Описание |
|------|----------|
| [shared/schema.ts](shared/schema.ts) | Drizzle ORM схема для activity tracking таблиц |

**Изменения:**
- Строки 745-814: Определения `userActivitySessions` и `userActivityActions`

---

## 🔧 Backend

### Middleware

| Файл | Описание |
|------|----------|
| [server/middleware/activity.ts](server/middleware/activity.ts) | Activity tracking middleware |

**Функции:**
- `trackUserLogin()` - создаёт сессию при логине
- `trackUserLogout()` - закрывает сессию, считает duration
- `trackActivityHeartbeat()` - middleware для обновления last_activity
- `trackUserAction()` - логирование действий

### API Routes

| Файл | Endpoint | Описание |
|------|----------|----------|
| [server/routes/admin/users.routes.ts](server/routes/admin/users.routes.ts) | `/api/admin/users` | User management с блокировкой |
| [server/routes/admin/activity.routes.ts](server/routes/admin/activity.routes.ts) | `/api/admin/activity` | Activity tracking endpoints |
| [server/routes/admin/dashboard.routes.ts](server/routes/admin/dashboard.routes.ts) | `/api/admin/dashboard` | Dashboard stats + online users |
| [server/routes/admin.routes.ts](server/routes/admin.routes.ts) | `/api/admin/*` | Main admin router |

### Интеграция

| Файл | Что делает |
|------|------------|
| [server/localAuth.ts](server/localAuth.ts) | Вызывает `trackUserLogin()` при успешном логине |
| [server/routes/auth.routes.ts](server/routes/auth.routes.ts) | Вызывает `trackUserLogout()` при выходе |
| [server/index.ts](server/index.ts) | Подключает `trackActivityHeartbeat()` middleware |

---

## 🎨 Frontend

### Pages

| Файл | URL | Описание |
|------|-----|----------|
| [client/src/pages/admin/dashboard.tsx](client/src/pages/admin/dashboard.tsx) | `/admin/dashboard` | Dashboard с KPI карточками, online users виджет, графики |
| [client/src/pages/admin/users.tsx](client/src/pages/admin/users.tsx) | `/admin/users` | User management с фильтрами, поиском, блокировкой |
| [client/src/pages/admin/activity.tsx](client/src/pages/admin/activity.tsx) | `/admin/activity` | Activity tracking - сессии, online users |

### Переводы

| Файл | Язык | Статус |
|------|------|--------|
| [client/src/locales/en.json](client/src/locales/en.json) | English | ✅ Готово |
| [client/src/locales/ru.json](client/src/locales/ru.json) | Русский | ✅ Готово |
| [client/src/locales/uz.json](client/src/locales/uz.json) | O'zbek | ✅ Готово |

**Ключи переводов:**
- `admin.activity.*` - все тексты для activity tracking
- `admin.users.*` - тексты для user management
- `admin.dashboard.*` - тексты для dashboard

---

## 🧪 Тестирование

### Автоматические Тесты

| Файл | Платформа | Описание |
|------|-----------|----------|
| [script/test-admin-api.sh](script/test-admin-api.sh) | Linux/Mac | Bash скрипт для тестирования всех endpoints |
| [script/test-admin-api.ps1](script/test-admin-api.ps1) | Windows | PowerShell версия тестов |
| [script/test-admin-integration.ts](script/test-admin-integration.ts) | Node.js | TypeScript тесты БД интеграции |

**Что тестируют:**
- ✅ Dashboard stats endpoint
- ✅ Online users endpoint
- ✅ User growth chart
- ✅ Platform health
- ✅ Users list с пагинацией
- ✅ Блокировка пользователя (РЕАЛЬНО обновляет БД!)
- ✅ Разблокировка
- ✅ Activity sessions
- ✅ User activity stats

### Утилиты

| Файл | Описание |
|------|----------|
| [script/run-migration.ts](script/run-migration.ts) | Скрипт для автоматического применения миграции |

---

## 📋 Использование Документации

### Сценарий 1: "Я впервые вижу админ панель"
**Читайте в порядке:**
1. [QUICK_START.md](QUICK_START.md) - быстрое знакомство
2. [README_ADMIN_PANEL.md](README_ADMIN_PANEL.md) - полное руководство
3. [ADMIN_PANEL_INTEGRATION_STATUS.md](ADMIN_PANEL_INTEGRATION_STATUS.md) - что доступно

### Сценарий 2: "Нужно задеплоить в production"
**Читайте:**
1. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - следуйте чеклисту
2. [QUICK_START.md](QUICK_START.md) - команды для деплоя

### Сценарий 3: "Хочу понять как работает activity tracking"
**Читайте:**
1. [README_ADMIN_PANEL.md](README_ADMIN_PANEL.md) - раздел "Архитектура"
2. [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - технические детали

### Сценарий 4: "Что-то не работает"
**Читайте:**
1. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - раздел "Troubleshooting"
2. [README_ADMIN_PANEL.md](README_ADMIN_PANEL.md) - раздел "Troubleshooting"

### Сценарий 5: "Нужно протестировать API"
**Используйте:**
1. `script/test-admin-api.sh` (Linux/Mac)
2. `script/test-admin-api.ps1` (Windows)

---

## 🎯 Quick Links

**Для Разработчиков:**
- API Documentation: [README_ADMIN_PANEL.md § API Documentation](README_ADMIN_PANEL.md#-api-documentation)
- Database Schema: [README_ADMIN_PANEL.md § Архитектура](README_ADMIN_PANEL.md#️-архитектура)
- Backend Flow: [IMPLEMENTATION_SUMMARY.md § Поток Данных](IMPLEMENTATION_SUMMARY.md#-архитектура)

**Для DevOps:**
- Deployment Guide: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- Migration SQL: [migrations/0017_create_user_activity_tracking.sql](migrations/0017_create_user_activity_tracking.sql)
- Rollback Instructions: [README_ADMIN_PANEL.md § Откат](README_ADMIN_PANEL.md#-деплой)

**Для Тестировщиков:**
- Test Scripts: [script/test-admin-api.sh](script/test-admin-api.sh), [script/test-admin-api.ps1](script/test-admin-api.ps1)
- Manual Testing: [DEPLOYMENT_CHECKLIST.md § Проверка](DEPLOYMENT_CHECKLIST.md#-после-деплоя---проверка)

**Для Менеджеров:**
- Feature List: [QUICK_START.md § Что Было Сделано](QUICK_START.md#-что-было-сделано)
- Implementation Summary: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- Status Overview: [ADMIN_PANEL_INTEGRATION_STATUS.md](ADMIN_PANEL_INTEGRATION_STATUS.md)

---

## ✅ Checklist: Готовность к Деплою

Перед деплоем убедитесь, что:

### Файлы на месте:
- [x] `migrations/0017_create_user_activity_tracking.sql` - миграция БД
- [x] `shared/schema.ts` - обновлена схема
- [x] `server/middleware/activity.ts` - middleware создан
- [x] `server/routes/admin/*.routes.ts` - endpoints готовы
- [x] `client/src/pages/admin/*.tsx` - UI страницы готовы
- [x] `client/src/locales/*.json` - переводы добавлены

### Документация готова:
- [x] README_ADMIN_PANEL.md - полное руководство
- [x] QUICK_START.md - быстрый старт
- [x] DEPLOYMENT_CHECKLIST.md - чеклист деплоя
- [x] IMPLEMENTATION_SUMMARY.md - технический отчёт

### Тесты готовы:
- [x] script/test-admin-api.sh - Linux/Mac тесты
- [x] script/test-admin-api.ps1 - Windows тесты
- [x] script/test-admin-integration.ts - БД тесты

---

**Всё готово к деплою!** 🚀

См. [QUICK_START.md](QUICK_START.md) для начала работы.
