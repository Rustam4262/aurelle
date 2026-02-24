# RUNBOOK — Ошибки API (5xx / 4xx)

> Сайт открывается, но API отдаёт ошибки.

---

## Диагностика — определить масштаб

```bash
# Сколько ошибок за последние 5 минут?
grep " 5[0-9][0-9] " /var/log/nginx/access.log \
  | awk -v d="$(date -d '-5 minutes' '+%d/%b/%Y:%H:%M')" '$4 > "["d' \
  | wc -l

# Какие именно endpoint'ы падают?
grep " 5[0-9][0-9] " /var/log/nginx/access.log | tail -20 \
  | awk '{print $7, $9}' | sort | uniq -c | sort -rn
```

---

## Типовые сценарии

### 500 Internal Server Error — все endpoint'ы

**Причина**: приложение падает/завило в панику.

```bash
# Смотреть ошибки приложения
pm2 logs aurelle --err --lines 50
# ИЛИ
journalctl -u aurelle -p err -n 50

# Искать: TypeError, ReferenceError, Cannot read properties of undefined
```

**Решение**: найти ошибку в логах → починить или откатить.

---

### 502 Bad Gateway — все endpoint'ы

**Причина**: приложение не отвечает (упало или перезагружается).

```bash
ss -tulpn | grep 5000   # должен быть Listen
pm2 list                 # должен быть "online"
pm2 restart aurelle
```

---

### 500 на конкретном endpoint

Например, `/api/bookings` всегда 500.

```bash
# Проверить вручную
curl -s -u "..." https://aurelle.uz/api/bookings | python3 -m json.tool

# Смотреть логи в момент запроса
pm2 logs aurelle --lines 0 &
curl https://aurelle.uz/api/bookings
```

**Типичные причины**:
- Неправильный SQL запрос (schema изменилась, поле переименовали)
- Drizzle ORM ошибка (база не соответствует схеме)
- Null pointer — данные не те что ожидались

**Фикс**:
```bash
# Проверить схему базы
npm run db:push --dry-run   # что изменилось?
```

---

### 401 Unauthorized — пользователи не могут войти

```bash
# Проверить что SESSION_SECRET не изменился
grep SESSION_SECRET .env

# Проверить OAuth callback URL
# Google OAuth → https://console.cloud.google.com
# Убедиться что redirect_uri = https://aurelle.uz/api/auth/google/callback
```

---

### 429 Too Many Requests

**Причина**: rate limiter сработал.

```bash
# Смотреть кто шлёт много запросов
grep " 429 " /var/log/nginx/access.log | tail -20 | awk '{print $1}' | sort | uniq -c | sort -rn
```

Если это не атака — временно увеличить лимит или добавить IP в whitelist.

---

### Database connection errors

Ошибка в логах типа: `Connection terminated unexpectedly` / `Too many clients`

```bash
# Количество активных соединений
psql "$DATABASE_URL" -c "
  SELECT count(*), state
  FROM pg_stat_activity
  WHERE datname = 'aurelle'
  GROUP BY state;
"

# Максимум соединений
psql "$DATABASE_URL" -c "SHOW max_connections;"
```

**Фикс**:
```bash
# Перезапустить приложение (закроет соединения)
pm2 restart aurelle

# Если соединений много — проверить пул в коде
# shared/schema.ts или server/db.ts — параметр pool.max
```

---

## Sentry — быстрый поиск

Если Sentry настроен:
1. Открыть `https://sentry.io` → AURELLE проект
2. Фильтр: `environment:production last 1h`
3. Сортировать по `frequency` → видно самую частую ошибку
4. Click на ошибку → stack trace с именами файлов и строк

---

## После исправления

```bash
# Убедиться что ошибки перестали
watch -n 5 'grep " 5[0-9][0-9] " /var/log/nginx/access.log | tail -5'

# Проверить Sentry — новые ошибки не прибывают
```
