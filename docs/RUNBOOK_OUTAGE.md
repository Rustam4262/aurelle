# RUNBOOK — Полный аутаж (всё упало)

> Сайт недоступен. Пользователи не могут зайти. Читай по шагам, не паникуй.

---

## Шаг 1 — Определить ЧТО именно упало (2 минуты)

```bash
# Проверить сайт снаружи
curl -I https://aurelle.uz
```

| Ответ | Значит |
|-------|--------|
| `200 OK` | Сайт работает. Возможно, проблема у конкретного пользователя |
| `502 Bad Gateway` | nginx работает, но app упало → иди на Шаг 3 |
| `Connection refused` / timeout | nginx упало → иди на Шаг 2 |
| `SSL error` | Проблема с сертификатом → иди на [RUNBOOK_SSL](./RUNBOOK_SSL.md) |

---

## Шаг 2 — nginx упало

```bash
# Проверить статус
systemctl status nginx

# Посмотреть ошибки
journalctl -u nginx -n 50 --no-pager

# Перезапустить
nginx -t && systemctl restart nginx
```

Если `nginx -t` выдаёт ошибку конфига:
```bash
# Посмотреть что сломалось
nginx -t 2>&1

# Восстановить конфиг из бэкапа
cp /backups/configs/LAST_DATE/nginx/sites-enabled/aurelle /etc/nginx/sites-enabled/aurelle
nginx -t && systemctl reload nginx
```

---

## Шаг 3 — App упало (502)

```bash
# PM2
pm2 list
pm2 logs aurelle --lines 50 --err

# systemd
systemctl status aurelle
journalctl -u aurelle -n 50 --no-pager

# Проверить что порт 5000 слушается
ss -tulpn | grep 5000
```

### Если процесс не запущен — запустить:

```bash
# PM2
cd /path/to/aurelle
pm2 start ecosystem.config.js --env production
# ИЛИ
pm2 restart aurelle

# systemd
systemctl start aurelle

# Docker
docker-compose up -d
```

### Если процесс падает сразу после запуска:

```bash
# Смотреть логи в реальном времени
pm2 logs aurelle --lines 0
# ИЛИ
journalctl -u aurelle -f

# Типичные причины:
# - DATABASE_URL не настроен / база недоступна
# - SESSION_SECRET не задан
# - Порт 5000 уже занят другим процессом
# - Ошибка синтаксиса в .env
```

---

## Шаг 4 — База данных

```bash
# Проверить соединение
psql "$DATABASE_URL" -c "SELECT 1"

# Если ошибка — проверить что PostgreSQL запущен
systemctl status postgresql
# ИЛИ
pg_isready -h localhost

# Перезапустить PostgreSQL
systemctl restart postgresql
```

---

## Шаг 5 — Если ничего не помогает → Rollback

```bash
cd /path/to/aurelle
./scripts/rollback.sh
```

Или вручную:
```bash
git log --oneline -10
git checkout <LAST_KNOWN_GOOD_COMMIT>
npm ci
npm run build
pm2 restart aurelle
```

---

## Шаг 6 — Проверить что всё заработало

```bash
# Базовый health check
curl -I https://aurelle.uz

# API health
curl -s https://aurelle.uz/api/health

# Нет ли новых ошибок в логах
pm2 logs aurelle --lines 20
```

Открыть в браузере:
- [ ] `https://aurelle.uz` — главная
- [ ] `https://aurelle.uz/client` — нет ErrorBoundary
- [ ] `https://aurelle.uz/owner` — нет ErrorBoundary

---

## Эскалация

Если не решается за 15 минут:
1. Сообщить владельцу/команде
2. Включить maintenance page (если настроена)
3. Взять полный дамп логов: `pm2 logs aurelle --lines 500 > /tmp/outage_logs.txt`
