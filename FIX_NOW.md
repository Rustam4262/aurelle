# ⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ - 30 секунд!

## Шаг 1: Скопируйте Connection String

В Neon Console (где вы сейчас находитесь):

1. Нажмите кнопку **"Copy snippet"** (видна на вашем скриншоте)
2. Или откройте Connection Details → скопируйте **Connection String**

Должно быть примерно так:
```
postgresql://neondb_owner:пароль@ep-icy-snow-...neon.tech/neondb?sslmode=require
```

## Шаг 2: Выполните команду

Откройте терминал в проекте AURELLE и выполните:

```bash
DATABASE_URL="вставьте_скопированный_connection_string" npx tsx quick-fix.ts
```

**Пример:**
```bash
DATABASE_URL="postgresql://neondb_owner:abc123@ep-icy-snow-something.neon.tech/neondb?sslmode=require" npx tsx quick-fix.ts
```

## Шаг 3: Готово! ✅

Скрипт автоматически:
- Подключится к Neon базе
- Добавит поля email_verified и phone_verified
- Проверит что всё работает

После этого обновите `/admin/users` и пользователи появятся!

---

## Альтернатива (если не хотите копировать пароль):

**Обновите `.env` файл:**

Замените строку 6 в `.env`:
```
DATABASE_URL=ваш_neon_connection_string
```

Затем запустите:
```bash
npx tsx quick-fix.ts
```

---

**Время:** 30 секунд
**Статус:** Готово к запуску!
