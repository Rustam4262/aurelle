# RECOVERY — Backup & Restore Plan

> Всё упало. Спокойно. Открываем этот файл и идём по шагам.

## Что бэкапим

| Что | Где лежит | Как часто |
|-----|-----------|-----------|
| PostgreSQL DB | `$DATABASE_URL` | Ежедневно |
| nginx конфиг | `/etc/nginx/` | При каждом изменении |
| `.env` | `/path/to/aurelle/.env` | При каждом изменении |
| Systemd/PM2 конфиг | `/etc/systemd/system/` или `ecosystem.config.js` | При каждом изменении |
| Загруженные файлы | `uploads/` (если есть) | Ежедневно |

---

## Бэкап базы данных

### Создать бэкап вручную

```bash
# Формат: aurelle_YYYY-MM-DD.sql
pg_dump "$DATABASE_URL" > /backups/aurelle_$(date +%Y-%m-%d).sql

# Сжатый вариант (экономит место)
pg_dump "$DATABASE_URL" | gzip > /backups/aurelle_$(date +%Y-%m-%d).sql.gz
```

### Автоматический ежедневный бэкап (cron)

```bash
# Редактируем cron
crontab -e

# Добавляем строку — бэкап в 03:00 каждую ночь
0 3 * * * pg_dump "postgresql://..." | gzip > /backups/aurelle_$(date +\%Y-\%m-\%d).sql.gz 2>> /var/log/aurelle-backup.log

# Удалять бэкапы старше 7 дней
0 4 * * * find /backups -name "aurelle_*.sql.gz" -mtime +7 -delete
```

### Проверить бэкап не пустой

```bash
ls -lh /backups/aurelle_*.sql.gz
# Размер должен быть > 1KB, иначе что-то пошло не так
```

---

## Восстановление базы данных

### Восстановить из бэкапа

```bash
# Из .sql файла
psql "$DATABASE_URL" < /backups/aurelle_2026-02-23.sql

# Из .sql.gz
gunzip -c /backups/aurelle_2026-02-23.sql.gz | psql "$DATABASE_URL"
```

### Если база повреждена — пересоздать

```bash
# ВНИМАНИЕ: удалит все данные!
dropdb aurelle
createdb aurelle
psql "$DATABASE_URL" < /backups/aurelle_LAST_GOOD.sql
```

---

## Бэкап конфигов

### Скрипт бэкапа конфигов

```bash
#!/bin/bash
# scripts/backup-configs.sh
BACKUP_DIR="/backups/configs/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# nginx
cp -r /etc/nginx "$BACKUP_DIR/nginx"

# systemd (если используется)
cp /etc/systemd/system/aurelle.service "$BACKUP_DIR/" 2>/dev/null || true

# pm2 (если используется)
pm2 save
cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2-dump.json" 2>/dev/null || true

# .env (ОСТОРОЖНО — содержит секреты, храни в защищённом месте)
cp /path/to/aurelle/.env "$BACKUP_DIR/.env.bak"

echo "✅ Configs backed up to $BACKUP_DIR"
```

---

## Восстановление приложения

### Сценарий 1: деплой сломал прод → откат на предыдущий коммит

```bash
# Смотрим историю
git log --oneline -10

# Откатываемся на последний рабочий коммит
git checkout <LAST_GOOD_COMMIT>

# Перебилдить и перезапустить
npm ci
npm run build
# Перезапуск см. OPS_COMMANDS.md
```

### Сценарий 2: сервер упал, поднимаем с нуля

```bash
# 1. Клонируем репозиторий
git clone <REPO_URL> /var/www/aurelle
cd /var/www/aurelle

# 2. Устанавливаем зависимости
npm ci

# 3. Восстанавливаем .env
cp /backups/configs/LAST_DATE/.env.bak .env
# ПРОВЕРЯЕМ что DATABASE_URL, SESSION_SECRET правильные

# 4. Восстанавливаем БД
psql "$DATABASE_URL" < /backups/aurelle_LAST_GOOD.sql

# 5. Билдим
npm run build

# 6. Запускаем (pm2 / systemd / docker — см. ниже)
pm2 start ecosystem.config.js --env production
# ИЛИ
systemctl start aurelle

# 7. Проверяем
curl -I https://aurelle.uz
```

### Сценарий 3: нужно восстановить только nginx

```bash
cp /backups/configs/LAST_DATE/nginx/sites-enabled/aurelle /etc/nginx/sites-enabled/aurelle
nginx -t && systemctl reload nginx
```

---

## Checklist после восстановления

- [ ] Сайт открывается на https://aurelle.uz
- [ ] `/api/health` возвращает 200
- [ ] Можно войти через OAuth
- [ ] Бронирование работает
- [ ] Нет ошибок в Sentry
- [ ] Нет ошибок в логах nginx (`tail -f /var/log/nginx/error.log`)
- [ ] Нет ошибок в логах приложения (`pm2 logs` / `journalctl -u aurelle -f`)
