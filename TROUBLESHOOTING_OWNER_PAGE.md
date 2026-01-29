# Решение проблемы "Что-то пошло не так" на странице /owner

## Проблема

Пользователь видит ошибку "Что-то пошло не так" при попытке открыть https://aurelle.uz/owner

## Причина

Страница `/owner` требует авторизации. Ошибка возникает, когда:

1. Пользователь НЕ вошел в систему (не авторизован)
2. Сессия истекла
3. Cookies заблокированы браузером

## Решение

### Шаг 1: Войдите в систему

1. **Откройте** https://aurelle.uz/auth
2. **Нажмите** "Sign In" или "Войти"
3. **Введите credentials**:
   - Email: xulkarraziyeva@gmail.com
   - Password: (ваш пароль)
4. **Нажмите** "Login"

### Шаг 2: Проверьте профиль

После входа вы должны увидеть:

- Ваше имя: Roziyeva Khulkar
- Роль: Owner
- Телефон: +998500151475
- Город: Tashkent

### Шаг 3: Перейдите в Owner Dashboard

Теперь можете безопасно открыть https://aurelle.uz/owner

Вы увидите Dashboard с вкладками:

- Dashboard (обзор)
- Bookings (бронирования)
- Services (услуги)
- Masters (мастера)
- Salons (салоны)
- Calendar (календарь)
- Analytics (аналитика)

---

## Если пароль забыт

### Вариант 1: Сброс пароля через базу данных

```bash
# Подключитесь к серверу
ssh root@89.39.94.194

# Сгенерируйте новый хеш пароля (например, для пароля "aurelle2026")
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('aurelle2026', 10, (err, hash) => console.log(hash));"

# Обновите пароль в базе данных
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db -c "UPDATE users SET password = '<хеш_пароля>' WHERE email = 'xulkarraziyeva@gmail.com';"
```

### Вариант 2: Создать новый аккаунт

1. Откройте https://aurelle.uz/auth
2. Нажмите "Sign Up" или "Регистрация"
3. Заполните форму с новым email
4. После регистрации создайте профиль Owner

---

## Альтернативный способ проверки

### Если ошибка все еще появляется ПОСЛЕ входа:

1. **Откройте Developer Tools** (F12)
2. **Перейдите на вкладку Console**
3. **Скопируйте текст ошибки** (красный текст)
4. **Отправьте** мне скриншот консоли

### Проверка сессии

Откройте в браузере Developer Tools → Application → Cookies → aurelle.uz

Должна быть cookie с именем `connect.sid` или подобным. Если её нет - значит сессия не сохраняется.

**Причины отсутствия сессии:**

- Браузер в режиме инкогнито
- Cookies заблокированы настройками браузера
- Расширения блокируют cookies (AdBlock, Privacy Badger)
- Проблема с SameSite cookies на HTTPS

---

## Если проблема в коде (для разработчика)

### Проверить логи сервера

```bash
ssh root@89.39.94.194
pm2 logs aurelle-production --lines 50
```

### Проверить базу данных

```bash
# Проверить что пользователь существует
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db -c "SELECT email, id FROM users WHERE email = 'xulkarraziyeva@gmail.com';"

# Проверить профиль
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db -c "SELECT * FROM user_profiles WHERE user_id = 'local:1768540768958-vpo3thpug';"
```

### Проверить API endpoints

```bash
# Без авторизации (должен вернуть Unauthorized)
curl https://aurelle.uz/api/owner/salons

# После входа cookies должны передаваться автоматически
```

---

## Текущее состояние системы

✅ **Backend работает**: PM2 process online
✅ **База данных работает**: PostgreSQL healthy
✅ **API отвечает**: Health check OK
✅ **Пользователь создан**: xulkarraziyeva@gmail.com с ролью owner
✅ **Профиль заполнен**: Roziyeva Khulkar, Tashkent

**Единственная проблема**: Пользователь не авторизован в браузере

---

## Быстрое решение

### Пошаговая инструкция:

1. Откройте **новое окно** браузера (не инкогнито)
2. Перейдите на https://aurelle.uz/auth
3. Войдите с вашими credentials
4. После успешного входа перейдите на https://aurelle.uz/owner
5. Вы должны увидеть Dashboard

**ВАЖНО**: Не используйте режим инкогнито, так как он не сохраняет cookies между страницами!

---

## Если вход не работает

### Проверьте что:

1. ✅ Email введен правильно (без пробелов)
2. ✅ Пароль введен правильно (чувствителен к регистру)
3. ✅ Cookies разрешены в браузере
4. ✅ Нет блокировщиков cookies
5. ✅ Интернет соединение стабильно

### Попробуйте другой браузер:

- Chrome/Edge
- Firefox
- Safari

---

## Контакты для помощи

Если проблема не решается:

1. **Скриншот** страницы с ошибкой
2. **Скриншот** Developer Tools → Console (F12)
3. **Скриншот** Developer Tools → Network tab
4. **Описание** шагов которые вы делали

Отправьте это мне, и я помогу решить проблему!

---

**Дата**: 16 января 2026
**Статус системы**: ✅ Все компоненты работают
**Решение**: Войдите в систему через /auth перед открытием /owner
