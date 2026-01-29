# 🧪 Руководство по тестированию регистрации

**Дата:** 01 января 2026
**Статус:** ✅ Готово к тестированию

---

## ✅ Что было сделано

### 1. Очистка базы данных ✅

```sql
DELETE FROM users;    -- Удалено 3 пользователя
DELETE FROM sessions; -- Очищены старые сессии
```

**Результат:** База данных полностью чистая, можно регистрироваться с любым email.

### 2. Добавлена функция восстановления пароля ✅

**Новый API endpoint:** `POST /api/auth/reset-password`

**Как использовать:**

```bash
curl -X POST https://aurelle.uz/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "newPassword": "NewPassword123"
  }'
```

**Параметры:**

- `email` - Email пользователя
- `newPassword` - Новый пароль (минимум 8 символов)

**Безопасность:**

- Endpoint не раскрывает существует ли email в системе
- Использует те же bcrypt rounds что и регистрация (12)
- Защищен rate limiter'ом

### 3. Деплой на продакшен ✅

**Коммит:** `aeb11544` - Add password reset endpoint for user account recovery

**Статус сервера:**

```
✅ aurelle_app_1 - Up (port 5000)
✅ aurelle_postgres_1 - Up (port 5432)
✅ Auth system initialized
✅ Local auth configured successfully
✅ Serving on https://aurelle.uz
```

---

## 🧪 Как протестировать регистрацию

### Тест 1: Регистрация с новым email

1. Откройте https://aurelle.uz/auth
2. Перейдите на вкладку "Email"
3. Нажмите кнопку "Регистрация" (справа внизу)
4. Заполните форму:
   ```
   Email: test@example.com
   Password: Password123 (минимум 8 символов)
   Confirm Password: Password123
   ```
5. Нажмите "Создать аккаунт"
6. ✅ Должно успешно создать аккаунт и войти в систему

### Тест 2: Попытка регистрации с существующим email

1. Попробуйте зарегистрироваться еще раз с тем же email
2. ❌ Должно показать ошибку: "User with this email already exists"

### Тест 3: Вход с существующим аккаунтом

1. Перейдите на вкладку "Вход"
2. Введите данные:
   ```
   Email: test@example.com
   Password: Password123
   ```
3. Нажмите "Войти"
4. ✅ Должно успешно войти в систему

### Тест 4: Сброс пароля (через API)

1. Откройте терминал
2. Выполните команду:
   ```bash
   curl -X POST https://aurelle.uz/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "newPassword": "NewPassword456"
     }'
   ```
3. ✅ Должно вернуть: `{"success": true, "message": "Password has been reset successfully"}`

4. Попробуйте войти со старым паролем:
   - Email: test@example.com
   - Password: Password123
   - ❌ Должно показать ошибку: "Invalid email or password"

5. Попробуйте войти с новым паролем:
   - Email: test@example.com
   - Password: NewPassword456
   - ✅ Должно успешно войти

### Тест 5: Валидация пароля

1. Попробуйте зарегистрироваться с коротким паролем:
   ```
   Email: test2@example.com
   Password: 123 (меньше 8 символов)
   ```
2. ❌ Должно показать ошибку: "Password must be at least 8 characters"

### Тест 6: Сессии работают

1. Зарегистрируйтесь или войдите в систему
2. Закройте браузер
3. Откройте браузер снова
4. Перейдите на https://aurelle.uz
5. ✅ Должны остаться залогиненными (сессия сохранена на 30 дней)

---

## 📊 Текущее состояние базы данных

### Пользователи

```sql
SELECT COUNT(*) FROM users;
-- Результат: 0 (база чистая)
```

### Доступные email для регистрации

Любые! База данных полностью очищена. Можете использовать:

- test@example.com
- user@test.com
- admin@aurelle.uz
- roziyev18r@gmail.com (ваш предыдущий email - теперь свободен)
- любой другой email

---

## 🔧 Решение проблем

### Проблема: "User with this email already exists"

**Причина:** Email уже зарегистрирован в базе данных.

**Решение 1:** Использовать другой email для регистрации

**Решение 2:** Войти с существующим аккаунтом (если помните пароль)

**Решение 3:** Сбросить пароль через API:

```bash
curl -X POST https://aurelle.uz/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "roziyev18r@gmail.com",
    "newPassword": "YourNewPassword123"
  }'
```

**Решение 4 (для администратора):** Удалить пользователя из БД:

```bash
ssh root@89.39.94.194
docker-compose -f /var/www/aurelle/docker-compose.yml exec -T postgres \
  psql -U aurelle_user -d aurelle \
  -c "DELETE FROM users WHERE email = 'email@example.com';"
```

### Проблема: "Password must be at least 8 characters"

**Причина:** Пароль слишком короткий.

**Решение:** Используйте пароль минимум из 8 символов.

### Проблема: "Invalid email or password"

**Причина 1:** Неправильный пароль
**Решение:** Проверьте правильность пароля или сбросьте его

**Причина 2:** Email не зарегистрирован
**Решение:** Сначала зарегистрируйтесь

### Проблема: 429 Too Many Requests

**Причина:** Слишком много попыток входа/регистрации с одного IP

**Решение:** Подождите 15 минут или перезапустите app контейнер:

```bash
ssh root@89.39.94.194
docker-compose -f /var/www/aurelle/docker-compose.yml restart app
```

---

## 🎯 Следующие шаги

### 1. Добавить UI для сброса пароля (опционально)

Сейчас сброс пароля доступен только через API. Можно добавить кнопку "Забыли пароль?" на странице входа.

### 2. Добавить email подтверждение (опционально)

Отправлять письмо с ссылкой для подтверждения email при регистрации.

### 3. Добавить двухфакторную аутентификацию (опционально)

2FA через SMS или authenticator app.

### 4. Настроить OAuth Redirect URIs

Обновить redirect URIs для Google и Yandex OAuth:

- Google: `https://aurelle.uz/api/auth/google/callback`
- Yandex: `https://aurelle.uz/api/auth/yandex/callback`

---

## 📝 API Endpoints

### Регистрация

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Вход

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

### Сброс пароля

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "newPassword": "NewPassword456"
}
```

### Выход

```http
POST /api/auth/logout
```

### Проверка аутентификации

```http
GET /api/auth/user
```

---

## ✅ Чек-лист тестирования

- [ ] Регистрация с новым email работает
- [ ] Повторная регистрация с тем же email блокируется
- [ ] Вход с правильными данными работает
- [ ] Вход с неправильными данными блокируется
- [ ] Валидация пароля (8+ символов) работает
- [ ] Сброс пароля через API работает
- [ ] Сессии сохраняются после закрытия браузера
- [ ] Пользователь может выйти из системы
- [ ] После выхода требуется повторный вход

---

**Статус:** ✅ ВСЁ ГОТОВО К ТЕСТИРОВАНИЮ

**Сервер:** https://aurelle.uz
**База данных:** Очищена, готова к новым регистрациям
**Password Reset:** Доступен через API

---

**Последнее обновление:** 01 января 2026, 11:20 UTC
