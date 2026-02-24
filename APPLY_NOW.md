# 🚨 ПРИМЕНИТЬ СЕЙЧАС - 1 минута!

## Что делать:

### 1. Откройте Neon Console
👉 https://console.neon.tech

### 2. Найдите проект AURELLE
Кликните на ваш проект → **SQL Editor**

### 3. Скопируйте и вставьте этот SQL:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
```

**Или** откройте файл [COPY_THIS_SQL.sql](COPY_THIS_SQL.sql) и скопируйте всё оттуда.

### 4. Нажмите "Run" ▶️

Вы должны увидеть:
```
Query executed successfully
```

### 5. Обновите страницу админки

Откройте `http://aurelle.uz/admin/users` и нажмите **Ctrl+Shift+R**

## ✅ Готово!

Пользователи должны появиться!

---

## Если не работает:

**Выполните в консоли браузера (F12 → Console):**

```javascript
fetch('/api/admin/users?page=1&pageSize=5')
  .then(r => r.json())
  .then(d => console.log('Пользователей:', d.total, d.users))
```

Если увидели пользователей → просто обновите страницу.

Если `total: 0` → SQL не применён, повторите шаги 1-4.

---

**Время:** 1 минута
**Сложность:** Копировать → Вставить → Run
