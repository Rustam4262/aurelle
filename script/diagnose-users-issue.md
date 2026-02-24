# 🔍 Диагностика: "No users found"

## Быстрая Диагностика

### 1. Проверьте Консоль Браузера

**Откройте DevTools (F12):**

1. Перейдите на вкладку **Console**
2. Обновите страницу `/admin/users`
3. Ищите **красные ошибки**

**Возможные ошибки:**

#### Ошибка 401 Unauthorized
```
GET /api/admin/users 401 (Unauthorized)
```
**Решение:** Вы не залогинены как админ. Войдите заново.

#### Ошибка 403 Forbidden
```
GET /api/admin/users 403 (Forbidden)
```
**Решение:** У вас нет прав `users.read`. Проверьте роль в БД.

#### Ошибка 500 Internal Server Error
```
GET /api/admin/users 500 (Internal Server Error)
```
**Решение:** Ошибка на сервере. Проверьте логи сервера.

---

### 2. Проверьте Network Tab

**В DevTools → Network:**

1. Обновите страницу
2. Найдите запрос `users?page=1&pageSize=20`
3. Кликните на него
4. Посмотрите **Response**

**Что должно быть:**
```json
{
  "users": [...array of users...],
  "total": 123,
  "page": 1,
  "pageSize": 20,
  "totalPages": 7
}
```

**Если пусто:**
```json
{
  "users": [],
  "total": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0
}
```
→ **В базе данных НЕТ пользователей!**

---

### 3. Проверьте Логи Сервера

**Windows (если запущен через npm start):**

Посмотрите в терминал, где запущен сервер.

**Ищите:**
- ❌ `List users error`
- ❌ `Database error`
- ❌ `TypeError`
- ✅ `Admin users request params` (должно быть)

---

### 4. Проверьте Базу Данных

**Откройте [Neon Console](https://console.neon.tech) → SQL Editor:**

```sql
-- Проверьте, есть ли пользователи
SELECT COUNT(*) as total_users FROM users;

-- Если есть пользователи, проверьте структуру
SELECT id, email, first_name, last_name, created_at
FROM users
LIMIT 5;

-- Проверьте, есть ли у вас админские права
SELECT u.email, au.is_active, ar.role_name, ar.permissions
FROM admin_users au
JOIN users u ON au.user_id = u.id
JOIN admin_roles ar ON au.role_id = ar.id
WHERE u.email = 'YOUR_EMAIL@example.com';
```

**Если `total_users = 0`:**
→ **В базе данных нет пользователей!** Нужно создать тестовых пользователей.

---

## Решения

### Решение 1: Нет пользователей в БД

**Создайте тестового пользователя:**

```sql
-- В Neon SQL Editor
INSERT INTO users (id, email, first_name, last_name, created_at)
VALUES (
  gen_random_uuid()::text,
  'test@example.com',
  'Test',
  'User',
  NOW()
);
```

Обновите страницу → пользователь должен появиться.

---

### Решение 2: Нет прав доступа

**Проверьте вашу роль:**

```sql
-- Найдите ваш user_id
SELECT id, email FROM users WHERE email = 'YOUR_EMAIL';

-- Проверьте, есть ли вы в admin_users
SELECT * FROM admin_users WHERE user_id = 'YOUR_USER_ID';

-- Если нет, добавьте себя как super_admin
-- 1. Найдите ID роли super_admin
SELECT id FROM admin_roles WHERE role_name = 'super_admin';

-- 2. Добавьте себя в админы
INSERT INTO admin_users (id, user_id, role_id, is_active, created_at)
VALUES (
  gen_random_uuid()::text,
  'YOUR_USER_ID',
  'SUPER_ADMIN_ROLE_ID',
  true,
  NOW()
);
```

Выйдите и войдите заново.

---

### Решение 3: API возвращает ошибку

**Если в консоли браузера ошибка 500:**

1. Откройте логи сервера
2. Найдите строку с `List users error`
3. Посмотрите stack trace

**Частые причины:**
- Таблица `users` не существует → применить миграцию
- Неправильная структура таблицы → применить миграцию
- Проблема с Drizzle ORM → проверить `shared/schema.ts`

---

### Решение 4: Миграция не применена

**Если вы еще не применили миграцию:**

```sql
-- В Neon SQL Editor выполните:
-- migrations/0017_create_user_activity_tracking.sql
```

После этого **ПЕРЕЗАПУСТИТЕ сервер:**

```bash
# Остановить
Ctrl+C

# Запустить заново
npm run dev
# или
npm start
```

---

## Быстрый Тест

**Выполните в браузере Console (F12 → Console):**

```javascript
// Проверьте, что вы залогинены
console.log('Authenticated:', document.cookie.includes('connect.sid'));

// Попробуйте запрос вручную
fetch('/api/admin/users?page=1&pageSize=10')
  .then(r => r.json())
  .then(data => console.log('Users API response:', data))
  .catch(err => console.error('Users API error:', err));
```

**Ожидаемый результат:**
```
Authenticated: true
Users API response: { users: [...], total: X, page: 1, ... }
```

**Если `Authenticated: false`:**
→ Вы не залогинены. Войдите как админ.

---

## Пошаговая Диагностика

### Шаг 1: Откройте DevTools
- Нажмите **F12**
- Перейдите на вкладку **Network**
- Обновите страницу

### Шаг 2: Найдите запрос
- Ищите `users?page=1`
- Кликните на него
- Посмотрите **Response** tab

### Шаг 3: Определите проблему

| Response | Проблема | Решение |
|----------|----------|---------|
| `401 Unauthorized` | Не залогинены | Войдите заново |
| `403 Forbidden` | Нет прав | Добавьте роль admin |
| `500 Internal Server Error` | Ошибка сервера | Проверьте логи |
| `{ users: [], total: 0 }` | Нет пользователей в БД | Создайте тестовых |
| `{ users: [...] }` | Всё работает! | Проблема на фронтенде |

---

## Если Всё Ещё Не Работает

### Проверьте версии файлов

```bash
# Убедитесь, что у вас последние изменения
git status

# Если есть uncommitted changes
git diff server/routes/admin/users.routes.ts
git diff shared/schema.ts
```

### Перезапустите сервер

```bash
# Полный рестарт
npm run build
npm start
```

### Очистите кеш браузера

- **Ctrl+Shift+R** (Windows)
- **Cmd+Shift+R** (Mac)

---

## Контакты для Помощи

Если ничего не помогло, предоставьте:

1. **Скриншот Console (F12)**
2. **Скриншот Network → users запрос → Response**
3. **Логи сервера** (последние 50 строк)
4. **Результат SQL:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM admin_users;
   ```

---

**Удачи в диагностике!** 🔧
