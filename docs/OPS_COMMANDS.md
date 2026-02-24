# OPS_COMMANDS — Операционные команды

> Единый вход для всех команд "что происходит на сервере".
> Сервер: `89.39.94.194` (aurelle.uz)

---

## Подключение

```bash
ssh user@89.39.94.194
```

---

## Логи

### nginx

```bash
# Ошибки nginx (самое важное)
tail -f /var/log/nginx/error.log

# Доступ (access log)
tail -f /var/log/nginx/access.log

# Только 5xx ошибки
grep " 5[0-9][0-9] " /var/log/nginx/access.log | tail -50

# За последние 5 минут
awk -v d="$(date -d '-5 minutes' '+%d/%b/%Y:%H:%M')" '$4 > "["d' /var/log/nginx/access.log
```

### Приложение (выбери свой вариант)

```bash
# PM2
pm2 logs aurelle --lines 100
pm2 logs aurelle --err --lines 50      # только ошибки
pm2 logs aurelle --lines 0             # realtime stream

# systemd
journalctl -u aurelle -f               # realtime
journalctl -u aurelle -n 100           # последние 100 строк
journalctl -u aurelle --since "5 min ago"
journalctl -u aurelle -p err           # только ошибки

# Docker
docker logs aurelle -f --tail 100
docker logs aurelle --since 5m
```

---

## Статус процессов

```bash
# PM2 — список и статус
pm2 list
pm2 status aurelle
pm2 monit              # интерактивный мониторинг

# systemd
systemctl status aurelle

# Docker
docker ps
docker stats aurelle

# Сырые процессы Node
ps aux | grep node
```

---

## Перезапуск

```bash
# PM2
pm2 restart aurelle
pm2 reload aurelle     # graceful (без downtime)

# systemd
systemctl restart aurelle
systemctl reload aurelle  # если поддерживается

# Docker
docker restart aurelle
docker-compose restart

# nginx
nginx -t               # проверить конфиг ПЕРЕД reload!
systemctl reload nginx # graceful reload (без downtime)
systemctl restart nginx
```

---

## Порты и сетевые соединения

```bash
# Что слушает какой порт
ss -tulpn
# Или
netstat -tulpn

# Проверить что приложение слушает :5000
ss -tulpn | grep 5000

# Проверить nginx на 80/443
ss -tulpn | grep -E '80|443'
```

---

## Диск и память

```bash
# Место на диске
df -h

# Самые тяжёлые директории
du -sh /var/www/* /var/log/* /backups/* 2>/dev/null | sort -h

# Память
free -h
top -b -n 1 | head -20

# PM2 метрики
pm2 show aurelle
```

---

## nginx

```bash
# Проверить конфиг
nginx -t

# Посмотреть конфиг aurelle
cat /etc/nginx/sites-enabled/aurelle

# Список site-конфигов
ls -la /etc/nginx/sites-enabled/

# Посмотреть заголовки ответа (включая CSP)
curl -I https://aurelle.uz
```

---

## SSL / Certbot

```bash
# Список сертификатов
certbot certificates

# Статус сертификата
certbot certificates 2>&1 | grep -A5 aurelle

# Продлить вручную
certbot renew --dry-run   # сначала dry-run!
certbot renew

# Дата истечения сертификата
echo | openssl s_client -connect aurelle.uz:443 2>/dev/null | openssl x509 -noout -dates
```

---

## База данных

```bash
# Подключиться к PostgreSQL
psql "$DATABASE_URL"

# Или явно
psql -h localhost -U postgres -d aurelle

# Проверить подключение
psql "$DATABASE_URL" -c "SELECT 1"

# Размер базы
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('aurelle'));"

# Активные соединения
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Ручной бэкап прямо сейчас
pg_dump "$DATABASE_URL" | gzip > /backups/aurelle_manual_$(date +%Y-%m-%d_%H%M).sql.gz
```

---

## Приложение — быстрая проверка

```bash
# Health check
curl -s http://localhost:5000/api/health | python3 -m json.tool
# Или через nginx
curl -s https://aurelle.uz/api/health

# Проверить что сайт открывается
curl -I https://aurelle.uz
# Ожидаем: HTTP/2 200

# Проверить редирект HTTP → HTTPS
curl -I http://aurelle.uz
# Ожидаем: 301/302 redirect to https://
```

---

## Деплой

```bash
# Быстрый деплой (если нет скрипта)
cd /path/to/aurelle
git pull origin main
npm ci --production=false
npm run build
pm2 restart aurelle        # или systemctl restart aurelle

# С проверкой
git pull && npm ci && npm run build && pm2 reload aurelle && curl -I https://aurelle.uz
```

---

## Откат (Rollback)

```bash
# Посмотреть последние коммиты
git log --oneline -10

# Откатиться на конкретный коммит
git checkout <COMMIT_HASH>
npm ci
npm run build
pm2 restart aurelle
```

---

## Переменные окружения

```bash
# Посмотреть текущие env (без секретов)
pm2 env aurelle | grep -v "SECRET\|PASSWORD\|TOKEN\|KEY"
# Или
cat /path/to/aurelle/.env | grep -v "SECRET\|PASSWORD\|TOKEN\|KEY"

# Проверить что Sentry настроен
grep "SENTRY_DSN" /path/to/aurelle/.env
```
