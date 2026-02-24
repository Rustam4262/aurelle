# Админ Панель: Статус Интеграции

## ✅ Что УЖЕ РЕАЛИЗОВАНО

### 1. База Данных

#### Таблицы для отслеживания активности:
- **user_activity_sessions** - сессии пользователей (логин/логаут, IP, устройство, длительность)
- **user_activity_actions** - детальный лог действий пользователей

#### Обновления таблицы users:
- `last_login_at` - время последнего входа
- `last_activity_at` - время последней активности
- `login_count` - количество входов
- `total_session_time_seconds` - общее время в системе
- `is_blocked` - заблокирован ли пользователь
- `block_reason` - причина блокировки

#### Обновления таблицы salons:
- `is_verified` - верифицирован ли салон администратором

**Файл миграции:** `migrations/0017_create_user_activity_tracking.sql`

**Схема TypeScript:** `shared/schema.ts` (строки 745-814)

### 2. Middleware для Отслеживания Активности

**Файл:** `server/middleware/activity.ts`

**Функции:**
- `trackUserLogin()` - создает сессию при входе, обновляет статистику пользователя
- `trackUserLogout()` - закрывает сессию, подсчитывает длительность
- `trackActivityHeartbeat()` - middleware для обновления времени последней активности
- `trackUserAction()` - логирование конкретных действий пользователя

**Интеграция:**
- ✅ Подключено в `server/localAuth.ts` (trackUserLogin при успешном логине)
- ✅ Подключено в `server/routes/auth.routes.ts` (trackUserLogout при выходе)
- ✅ Подключено в `server/index.ts` (heartbeat middleware для всех запросов)

### 3. Admin API Endpoints

#### Users Management (`/api/admin/users`)
**Файл:** `server/routes/admin/users.routes.ts`

**Endpoints:**
- `GET /api/admin/users` - список пользователей с пагинацией, фильтрацией (по роли, статусу, поиску)
- `GET /api/admin/users/:id` - детальная информация о пользователе
- `PUT /api/admin/users/:id` - обновление информации
- `POST /api/admin/users/:id/block` - блокировка пользователя (РЕАЛЬНО обновляет БД!)
- `POST /api/admin/users/:id/unblock` - разблокировка
- `DELETE /api/admin/users/:id` - удаление (soft delete через audit log)
- `POST /api/admin/users/bulk/block` - массовая блокировка
- `POST /api/admin/users/bulk/unblock` - массовая разблокировка
- `POST /api/admin/users/test/create` - создание тестовых пользователей

**Возвращаемые данные включают:**
- Полная информация о пользователе
- Роли (admin, salon_owner, master, client)
- Статус блокировки
- Активность (lastLoginAt, lastActivityAt, loginCount)
- Верификация email/phone

#### Activity Tracking (`/api/admin/activity`)
**Файл:** `server/routes/admin/activity.routes.ts`

**Endpoints:**
- `GET /api/admin/activity/sessions` - список сессий пользователей
  - Параметры: userId, limit, offset, activeOnly
- `GET /api/admin/activity/online` - пользователи онлайн прямо сейчас
  - Показывает пользователей с активностью за последние 10 минут
- `GET /api/admin/activity/stats` - статистика по пользователю
  - loginCount, totalSessionTime, avgDuration, totalActions
- `GET /api/admin/activity/actions` - лог действий пользователей
  - Параметры: userId, sessionId, actionType, limit, offset

#### Dashboard Stats (`/api/admin/dashboard`)
**Файл:** `server/routes/admin/dashboard.routes.ts`

**Endpoints:**
- `GET /api/admin/dashboard` - общая статистика
  - Пользователи (всего, новые за неделю)
  - Салоны (всего, верифицированные)
  - Мастера, Бронирования
  - Жалобы, Санкции
- `GET /api/admin/dashboard/activity` - недавняя активность
- `GET /api/admin/dashboard/online` - количество пользователей онлайн
- `GET /api/admin/dashboard/user-growth` - график роста пользователей
- `GET /api/admin/dashboard/booking-trends` - тренды бронирований
- `GET /api/admin/dashboard/platform-health` - здоровье платформы
  - % заблокированных пользователей
  - Активные сессии за 24ч
  - Средняя длительность сессии
  - Процент верификации email/phone

### 4. Routing

**Файл:** `server/routes/admin.routes.ts`

Все routes подключены:
```typescript
router.use("/users", usersRoutes);
router.use("/activity", activityRoutes);
router.use("/dashboard", dashboardRoutes);
```

### 5. Frontend (UI)

Админ панель уже имеет UI для:
- Dashboard с общей статистикой
- Users management с таблицей, фильтрами, поиском
- Модальные окна для блокировки/разблокировки
- Bulk operations (массовые действия)
- Analytics charts

---

## ⚠️ ЧТО НУЖНО СДЕЛАТЬ

### 1. Применить Миграцию к Базе Данных

База данных еще НЕ ОБНОВЛЕНА. Нужно выполнить SQL миграцию.

#### Способ 1: Через Neon Console

1. Откройте https://console.neon.tech
2. Выберите ваш проект AURELLE
3. Перейдите в SQL Editor
4. Скопируйте содержимое файла `migrations/0017_create_user_activity_tracking.sql`
5. Выполните SQL запрос
6. Проверьте, что все таблицы созданы без ошибок

#### Способ 2: Через script (при наличии DATABASE_URL)

```bash
# Установите DATABASE_URL в .env файле
# Затем запустите:
npx tsx script/run-migration.ts
```

### 2. Перезапустить Сервер

После применения миграции перезапустите сервер:

```bash
npm run build
npm start
# или
pm2 restart aurelle-production
```

### 3. Проверить Работоспособность

#### API Тесты:

```bash
# 1. Получить список пользователей
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# 2. Заблокировать пользователя
curl -X POST http://localhost:5000/api/admin/users/USER_ID/block \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Тестовая блокировка"}'

# 3. Пользователи онлайн
curl -X GET http://localhost:5000/api/admin/activity/online \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 4. Dashboard stats
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Frontend Tests:

1. Войдите как супер-админ
2. Откройте `/admin/dashboard`
3. Проверьте, что статистика загружается
4. Откройте `/admin/users`
5. Проверьте пагинацию, фильтры, поиск
6. Заблокируйте тестового пользователя
7. Разблокируйте пользователя
8. Проверьте "Online Users" виджет (если добавлен в UI)

#### Database Verification:

После применения миграции проверьте в SQL Editor:

```sql
-- Проверить созданные таблицы
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%activity%';

-- Проверить новые поля в users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('last_login_at', 'is_blocked', 'login_count');

-- Посмотреть сессии (после логинов)
SELECT * FROM user_activity_sessions
ORDER BY login_at DESC
LIMIT 10;
```

---

## 📊 Как Работает Отслеживание Активности

### При Логине Пользователя:

1. `trackUserLogin()` создает запись в `user_activity_sessions`
2. Записывается: IP, user agent, тип устройства, браузер, ОС
3. Обновляется `users.last_login_at`, `users.login_count += 1`

### Во Время Сессии:

1. Middleware `trackActivityHeartbeat()` срабатывает на каждый API запрос
2. Обновляется `user_activity_sessions.last_activity_at`
3. Обновляется `users.last_activity_at`

### При Логауте:

1. `trackUserLogout()` находит активную сессию
2. Устанавливает `logout_at = NOW()`
3. Подсчитывает `duration_seconds` (logout_at - login_at)
4. Обновляет `users.total_session_time_seconds`

### Определение "Онлайн":

Пользователь считается онлайн, если:
- У него есть активная сессия (`logout_at IS NULL`)
- И `last_activity_at` < 10 минут назад

---

## 🎯 Что Теперь Доступно Админу

### Статистика на Dashboard:

- **Всего пользователей** и новых за неделю
- **Верифицированные салоны** (is_verified = true)
- **Пользователей онлайн** прямо сейчас
- **Активные сессии** за последние 24 часа
- **Средняя длительность сессии**
- **% блокированных пользователей**
- **% верификации email/phone**

### Users Management:

- **Полный список** всех пользователей с ролями
- **Фильтрация** по роли (admin, owner, master, client)
- **Фильтрация** по статусу (active, blocked)
- **Поиск** по email, имени, телефону
- **Сортировка** по любому полю
- **Пагинация** (10, 20, 50, 100 на страницу)
- **Блокировка/Разблокировка** с причиной
- **Bulk operations** (массовая блокировка/разблокировка)
- **История активности** для каждого пользователя

### Activity Tracking:

- **Все сессии** пользователя с деталями устройства
- **Кто онлайн** прямо сейчас
- **Статистика по пользователю:**
  - Сколько раз заходил (login_count)
  - Общее время в системе (total_session_time_seconds)
  - Среднее время сессии
  - Количество действий
- **Лог действий** (если используется trackUserAction)

---

## 🔐 Безопасность

- ✅ Все admin endpoints защищены `requirePermission()`
- ✅ Блокировка пользователя логируется в `audit_logs`
- ✅ Email уведомления при блокировке/разблокировке
- ✅ Отслеживание IP и user agent для безопасности
- ✅ Activity tracking не блокирует основные операции (ошибки просто логируются)

---

## 📝 Следующие Шаги (Опционально)

### 1. Добавить Online Users Widget в Dashboard UI

Создать компонент для отображения онлайн пользователей в реальном времени.

### 2. Добавить User Activity Timeline в User Profile

Показывать историю сессий и действий для каждого пользователя.

### 3. Настроить Автоматические Санкции

Например, автоблокировка после X жалоб или подозрительной активности.

### 4. Экспорт Данных

Добавить экспорт списка пользователей и активности в Excel/PDF.

### 5. Real-Time Updates

Использовать WebSocket для обновления "онлайн" статуса в реальном времени.

---

## ✅ Checklist для Деплоя

- [ ] Применена миграция `0017_create_user_activity_tracking.sql`
- [ ] Проверены новые таблицы в базе данных
- [ ] Перезапущен production сервер
- [ ] Протестирован логин (должен создаваться session record)
- [ ] Протестирована блокировка пользователя (должна обновляться БД)
- [ ] Проверен dashboard (должна отображаться статистика)
- [ ] Проверен /admin/users (должен работать поиск и фильтры)
- [ ] Проверен online users endpoint
- [ ] Мониторинг логов на наличие ошибок

---

## 📞 Поддержка

Если возникают проблемы:
1. Проверьте логи сервера
2. Проверьте, применилась ли миграция
3. Проверьте права доступа админа (permissions в admin_roles)
4. Проверьте DATABASE_URL корректен

**Все готово к использованию после применения миграции!** 🎉
