# 🔧 PostgreSQL Tuning - Важные замечания

## ⚠️ Про max_connections

**ОСТОРОЖНО:** `max_connections = 200` на 4GB RAM может быть опасно!

### Почему это плохо:

```
Каждое PostgreSQL соединение = ~10MB RAM (минимум)
200 соединений × 10MB = 2GB RAM только на соединения!

На сервере с 4GB RAM:
- 2GB для PostgreSQL соединений
- 512MB для shared_buffers
- 1GB для приложения + Redis
- 500MB для системы
= Гарантированный OOM (Out of Memory)
```

### ✅ Правильный подход:

#### Вариант 1: Connection Pooling в приложении (рекомендуется)

**В коде приложения** (уже используется Drizzle):

```typescript
// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ВАЖНО: ограничить пул в приложении!
  max: 20, // Максимум 20 соединений от этого приложения
  min: 5, // Минимум 5 постоянных
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);
```

**PostgreSQL config:**

```ini
# /opt/aurelle/postgres/postgresql.conf
max_connections = 100  # Вместо 200
```

**Результат:**

- Приложение использует 5-20 соединений
- PostgreSQL разрешает до 100 (безопасно)
- RAM не взрывается

---

#### Вариант 2: PgBouncer (для множества приложений)

Если нужно много соединений от разных клиентов:

```yaml
# docker-compose.yml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: aurelle_user
      DATABASES_PASSWORD: ${POSTGRES_PASSWORD}
      DATABASES_DBNAME: aurelle_db
      PGBOUNCER_POOL_MODE: transaction # Важно!
      PGBOUNCER_MAX_CLIENT_CONN: 200
      PGBOUNCER_DEFAULT_POOL_SIZE: 25 # Реальные соединения к PG
    ports:
      - "127.0.0.1:6432:5432"
```

**PostgreSQL config:**

```ini
max_connections = 50  # Только для pgbouncer
```

**Приложение подключается через pgbouncer:**

```env
DATABASE_URL="postgres://aurelle_user:pass@127.0.0.1:6432/aurelle_db"
```

**Результат:**

- 200 клиентских соединений → pgbouncer
- Только 25 реальных соединений → PostgreSQL
- RAM в безопасности

---

## 📊 Рекомендации по max_connections

### Для 2GB RAM сервера (сейчас):

```ini
max_connections = 50
```

### Для 4GB RAM сервера (после апгрейда):

```ini
# Если БЕЗ pgbouncer:
max_connections = 100

# Если С pgbouncer:
max_connections = 50  # Pgbouncer управляет пулом
```

### Для 8GB RAM сервера (будущее):

```ini
# Если БЕЗ pgbouncer:
max_connections = 200

# Если С pgbouncer:
max_connections = 100
```

---

## 🔍 Как проверить текущую ситуацию

```sql
-- Сколько соединений сейчас активно
SELECT count(*) FROM pg_stat_activity;

-- Кто подключён
SELECT
  client_addr,
  state,
  count(*)
FROM pg_stat_activity
GROUP BY client_addr, state;

-- Максимум использованных соединений
SELECT setting::int AS max_connections,
       (SELECT count(*) FROM pg_stat_activity) AS current_connections,
       (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections
FROM pg_settings
WHERE name = 'max_connections';
```

---

## ✅ Что сделать прямо сейчас

1. **Проверить connection pool в коде:**

   ```bash
   grep -r "Pool\|createPool\|max:" d:\AURELLE\server\db.ts
   ```

2. **Если пула нет — добавить:**

   ```typescript
   // server/db.ts
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20, // ВАЖНО!
   });
   ```

3. **Снизить max_connections в PostgreSQL:**

   ```bash
   ssh root@89.39.94.194
   nano /opt/aurelle/postgres/postgresql.conf

   # Изменить:
   max_connections = 50  # Вместо 100 или 200

   # Перезапустить
   cd /opt/aurelle && docker compose restart postgres
   ```

4. **Проверить что всё работает:**

   ```bash
   # На сервере
   docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db \
     -c "SHOW max_connections;"

   # Должно показать: 50
   ```

---

## 🎯 Итоговая конфигурация

### Для текущего 2GB RAM сервера:

```ini
# /opt/aurelle/postgres/postgresql.conf
max_connections = 50

# В приложении (server/db.ts):
pool.max = 20
```

### Для будущего 4GB RAM сервера:

```ini
# /opt/aurelle/postgres/postgresql.conf
max_connections = 100
shared_buffers = 1GB         # Вместо 128MB
effective_cache_size = 3GB   # Вместо 384MB
work_mem = 16MB              # Вместо 4MB
maintenance_work_mem = 256MB # Вместо 64MB

# В приложении (server/db.ts):
pool.max = 30
```

---

## 📚 Дополнительные ресурсы

- [PostgreSQL Connection Pooling Best Practices](https://wiki.postgresql.org/wiki/Number_Of_Database_Connections)
- [PgBouncer Official Docs](https://www.pgbouncer.org/)
- [Drizzle ORM Connection Pooling](https://orm.drizzle.team/docs/get-started-postgresql#basic-file-structure)
