# 🛠️ ИНСТРУКЦИЯ ПО ИСПРАВЛЕНИЮ КРИТИЧЕСКИХ ОШИБОК

На основе анализа документации проекта, вот список необходимых изменений кода для устранения критических ошибок (OOM, API Keys, UX).

## 1. 🚨 База данных: Защита от переполнения памяти (OOM)

**Файл:** `server/db.ts`
**Причина:** Отсутствие лимита соединений может привести к падению сервера с 2GB/4GB RAM.

**Код для вставки:**

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Оптимизированный пул для предотвращения OOM
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Ограничение: 20 соединений на инстанс приложения
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });
```

## 2. 🔑 Настройка переменных окружения

**Файл:** `.env`
**Причина:** Ошибки "Invalid API Key" на картах и неработающая почта.

**Добавить/Исправить:**

```ini
# Yandex Maps (Получить на developer.tech.yandex.ru)
VITE_YANDEX_MAPS_API_KEY=ваш_ключ_здесь

# Email (Настройки SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ваш_email@gmail.com
SMTP_PASS=ваш_app_password
EMAIL_FROM=AURELLE <noreply@aurelle.uz>
```

## 3. 🖼️ Исправление загрузки фото (Frontend)

**Файл:** Компонент загрузки (например, в `client/src/pages/owner.tsx` или отдельный компонент)
**Причина:** Текущий UI требует ввода URL вручную.

**Пример реализации обработчика загрузки:**

```tsx
// Внутри компонента React
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch("/api/upload/salon-photo", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    // Сохраните data.url в состояние формы
    console.log("Uploaded:", data.url);
  } catch (error) {
    console.error("Upload failed", error);
  }
};
```
