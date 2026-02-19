# Тестирование Admin Users Page

## 🔧 Что было исправлено

### Главная проблема: "0 total users"

**Причина:**
- API делал фильтрацию по `role` **ПОСЛЕ** пагинации
- Брал 20 пользователей из БД → определял их роли → фильтровал по role
- Результат: могло быть 0 пользователей если из 20 взятых никто не соответствовал фильтру

**Решение:**
- Переписан endpoint `/api/admin/users`
- Фильтрация по role теперь в SQL через JOIN/субзапросы
- `total` корректно считается с учетом role фильтра
- Пагинация работает ПОСЛЕ фильтрации

---

## 🧪 План тестирования

### Шаг 1: Запустите dev server

```bash
cd d:/AURELLE
npm run dev
```

Откройте http://localhost:5000

### Шаг 2: Войдите как администратор

Если у вас еще нет админ аккаунта, создайте:

```bash
# Через psql или ваш DB client
INSERT INTO admin_users (user_id, role_id, is_active)
SELECT id, (SELECT id FROM admin_roles WHERE name = 'SUPER_ADMIN' LIMIT 1), true
FROM users
WHERE email = 'your-admin-email@example.com';
```

### Шаг 3: Создайте тестовых пользователей

1. Откройте `/admin/users`
2. Нажмите **"Create Test Users"** (справа вверху)
3. Подтвердите создание
4. Будет создано 7 тестовых пользователей:
   - `client1@test.com`, `client2@test.com` (клиенты)
   - `owner1@test.com`, `owner2@test.com` (владельцы)
   - `master1@test.com`, `master2@test.com` (мастера)
   - `blocked@test.com` (заблокированный)
5. Пароль для всех: **`TestPass123!`**

### Шаг 4: Проверьте отображение

✅ **Должно быть:**
- "Manage all platform users • X total users" (X > 0)
- Таблица с пользователями
- Карточки статистики (Total, Active, Blocked, By Role)

❌ **НЕ должно быть:**
- "0 total users"
- "No users found" (при наличии пользователей в БД)

### Шаг 5: Проверьте фильтры

#### Фильтр по роли
1. Выберите "Role: Client"
2. Должны остаться только клиенты
3. `total` должен показывать количество клиентов
4. Попробуйте другие роли: Owner, Master, Admin

#### Фильтр по статусу
1. Выберите "Status: Active"
2. Должны остаться только активные пользователи
3. Выберите "Status: Blocked"
4. Должен показаться `blocked@test.com`

#### Фильтр по верификации
1. Выберите "Verification: Email Verified"
2. Должны остаться только с verified email
3. Попробуйте другие: "Phone Verified", "Both Verified"

#### Поиск
1. Введите "client1" в поле Search
2. Должен показаться `client1@test.com`
3. Поиск работает по: email, firstName, lastName, phone

### Шаг 6: Проверьте действия

#### Блокировка пользователя
1. Нажмите "..." на любом активном пользователе
2. Выберите "Block"
3. Введите причину: "Test blocking"
4. Подтвердите
5. Статус должен измениться на "Blocked"
6. В audit logs должна появиться запись

#### Разблокировка
1. Нажмите "..." на заблокированном пользователе
2. Выберите "Unblock"
3. Подтвердите
4. Статус должен измениться на "Active"

#### Массовая блокировка (Bulk Actions)
1. Выберите чекбоксы у 2-3 пользователей
2. Появится Bulk Actions Bar внизу экрана
3. Нажмите "Block Selected"
4. Введите причину
5. Подтвердите
6. Все выбранные пользователи должны заблокироваться
7. Bulk Actions Bar исчезнет

#### Quick View
1. Кликните на любую строку пользователя (не на кнопку)
2. Откроется модальное окно с деталями
3. Проверьте что показываются: email, phone, role, verification, login count, etc.
4. Закройте модальное окно

#### Export to CSV
1. Нажмите "Export to CSV" (справа вверху)
2. Должен скачаться файл `users-export.csv`
3. Откройте его - должны быть все пользователи с текущими фильтрами

### Шаг 7: Проверьте пагинацию

Если у вас > 20 пользователей:
1. Внизу таблицы должны быть кнопки пагинации
2. Показывается "Showing 1-20 of X"
3. Нажмите "Next" → должна загрузиться следующая страница
4. total остается тем же, меняется только page

---

## 🐛 Известные проблемы и решения

### Проблема: "Authentication required"

**Причина:** Не залогинены как администратор

**Решение:**
1. Войдите как пользователь с admin правами
2. Проверьте что в БД есть запись в `admin_users` с `is_active = true`

### Проблема: "Permission denied" (403)

**Причина:** У админ роли нет permission `users.read`

**Решение:**
```sql
-- Проверьте permissions вашей роли
SELECT * FROM admin_role_permissions
WHERE role_id = (SELECT role_id FROM admin_users WHERE user_id = 'your-user-id');

-- Добавьте permission если нужно
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM admin_roles WHERE name = 'SUPER_ADMIN'),
  id
FROM admin_permissions
WHERE name IN ('users.read', 'users.write', 'users.delete', 'analytics.read');
```

### Проблема: Пустая таблица при role фильтре

**Причина:** В БД нет пользователей с такой ролью

**Решение:**
- Используйте "Create Test Users" чтобы создать тестовых пользователей всех ролей
- Или создайте салон/мастера для существующих пользователей

### Проблема: total показывает правильно, но users = []

**Причина:** Может быть проблема с JOIN в SQL

**Решение:**
1. Откройте DevTools → Network
2. Найдите запрос `/api/admin/users?...`
3. Проверьте Response - должен быть `{ users: [...], total: X }`
4. Если `users: []` но `total > 0` - проверьте логи сервера на ошибки SQL

---

## 📊 API Endpoints для тестирования

### GET /api/admin/users

```bash
# Все пользователи
curl http://localhost:5000/api/admin/users

# С фильтрами
curl "http://localhost:5000/api/admin/users?role=client&status=active&page=1&pageSize=20"

# С поиском
curl "http://localhost:5000/api/admin/users?search=client1"

# С верификацией
curl "http://localhost:5000/api/admin/users?verified=email"
```

### POST /api/admin/users/bulk/block

```bash
curl -X POST http://localhost:5000/api/admin/users/bulk/block \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user-id-1", "user-id-2"],
    "reason": "Test bulk blocking"
  }'
```

### GET /api/admin/users/stats/overview

```bash
curl http://localhost:5000/api/admin/users/stats/overview
```

**Ожидаемый ответ:**
```json
{
  "total": 10,
  "active": 9,
  "blocked": 1,
  "emailVerified": 7,
  "phoneVerified": 5,
  "newToday": 0,
  "activeLastWeek": 3
}
```

---

## ✅ Checklist успешного тестирования

- [ ] Страница `/admin/users` открывается без ошибок
- [ ] `total` показывает правильное количество пользователей (> 0 если есть в БД)
- [ ] Таблица показывает пользователей
- [ ] Карточки статистики показывают данные
- [ ] Поиск работает с debounce 500ms
- [ ] Фильтр по Role работает (client, master, owner, admin)
- [ ] Фильтр по Status работает (active, blocked)
- [ ] Фильтр по Verification работает (email, phone, both, none)
- [ ] Пагинация работает (Next/Prev кнопки)
- [ ] Блокировка пользователя работает
- [ ] Разблокировка пользователя работает
- [ ] Bulk блокировка работает (2+ пользователей)
- [ ] Bulk разблокировка работает
- [ ] Quick View модальное окно открывается
- [ ] Export to CSV скачивает файл
- [ ] Действия логируются в `/admin/audit`

---

## 🚀 Деплой в продакшн

После успешного тестирования локально:

1. **Код уже на GitHub** (commit `a8a6c23e`)
2. **GitHub Actions автоматически задеплоит** при push в main
3. **Проверьте статус деплоя:**
   - https://github.com/Rustam4262/aurelle/actions

4. **После деплоя:**
   - Откройте https://aurelle.uz/admin/users
   - Создайте тестовых пользователей
   - Проверьте все функции

5. **Миграция БД:**
   - Миграция `0017_create_user_activity_tracking.sql` должна запуститься автоматически
   - Проверьте что таблицы созданы: `user_activity_sessions`, `user_activity_actions`

---

## 📞 Поддержка

Если что-то не работает:

1. Проверьте логи сервера: `pm2 logs aurelle-production`
2. Проверьте Browser DevTools → Console → Network
3. Проверьте `/admin/audit` - есть ли там действия
4. Откройте issue: https://github.com/Rustam4262/aurelle/issues

---

**Версия:** 2.5.0
**Дата:** 2026-02-19
**Автор:** Claude Sonnet 4.5
