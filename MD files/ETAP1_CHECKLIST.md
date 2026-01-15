# ✅ ЭТАП 1 - «Спокойный прод» - ЧЕКЛИСТ

## 🎯 Цель
Закрыть Этап 1 за 1 день без боли. Все скрипты уже установлены, остались только настройки.

---

## 📝 Что сделать (в порядке приоритета)

### ☑️ Задача 1: Настроить Telegram алерты (15 минут)

**Шаг 1.1:** Создать Telegram бота
```
1. Открыть Telegram → найти @BotFather
2. Отправить: /newbot
3. Название: AURELLE Server Monitor
4. Username: aurelle_monitor_bot (или любой, заканчивающийся на _bot)
5. Скопировать BOT_TOKEN (строка вида: 123456789:ABCdefGHI...)
```

**Шаг 1.2:** Получить CHAT_ID
```
1. Написать своему боту любое сообщение
2. Открыть в браузере:
   https://api.telegram.org/bot<ВАШ_BOT_TOKEN>/getUpdates

3. Найти "chat":{"id":123456789 — это ваш CHAT_ID
```

**Шаг 1.3:** Настроить на сервере
```bash
# Подключиться к серверу
ssh root@89.39.94.194

# Отредактировать конфиг
nano /etc/aurelle/telegram.env

# Заменить:
BOT_TOKEN="ВАШ_РЕАЛЬНЫЙ_TOKEN"
CHAT_ID="ВАШ_РЕАЛЬНЫЙ_CHAT_ID"

# Сохранить: Ctrl+O, Enter, Ctrl+X
```

**Шаг 1.4:** Протестировать
```bash
source /etc/aurelle/telegram.env
BOT_TOKEN="$BOT_TOKEN" CHAT_ID="$CHAT_ID" /usr/local/bin/telegram-send.sh "✅ AURELLE: Telegram alerts connected"
```

**Результат:** В Telegram должно прийти сообщение ✅

---

### ☑️ Задача 2: Health endpoints (30 минут, для разработчика)

**Файлы уже созданы:**
- `d:\AURELLE\server\health.routes.ts` ✅
- `d:\AURELLE\server\routes.ts` (обновлён) ✅

**Что сделать:**
```bash
# 1. На локальной машине
cd d:\AURELLE

# 2. Проверить что файлы существуют
ls server/health.routes.ts server/routes.ts

# 3. Пересобрать и задеплоить
# (используйте свой обычный процесс деплоя)

# 4. После деплоя протестировать:
curl https://api.aurelle.uz/api/health
# Должно вернуть: {"status":"ok","timestamp":"...","uptime":...}

curl https://api.aurelle.uz/api/ready
# Должно вернуть: {"status":"ready",...,"checks":{"database":{"status":"up"}}}
```

**Результат:** Два работающих endpoint'а для мониторинга

---

### ☑️ Задача 3: Настроить Backblaze B2 бэкапы (20 минут)

**Шаг 3.1:** Создать аккаунт Backblaze
```
1. Перейти: https://www.backblaze.com/b2/sign-up.html
2. Зарегистрироваться (бесплатно 10GB)
3. Войти в Account → Buckets → Create a Bucket
4. Название: aurelle-backups
5. Files in Bucket are: Private
```

**Шаг 3.2:** Создать Application Key
```
1. Account → App Keys → Add a New Application Key
2. Name: aurelle-server
3. Allow access to: aurelle-backups
4. Type: Read and Write
5. Скопировать:
   - keyID (например: 005abc...)
   - applicationKey (ОДИН РАЗ показывается!)
```

**Шаг 3.3:** Установить rclone на сервере
```bash
ssh root@89.39.94.194

# Установить rclone
apt update && apt install -y rclone

# Настроить
rclone config

# Выбрать:
# n) New remote
# name> b2-aurelle
# Storage> 5 (Backblaze B2)
# account> <ваш keyID>
# key> <ваш applicationKey>
# endpoint> (оставить пустым, Enter)
# Edit advanced config? n
# Configuration complete. y
# Quit config. q
```

**Шаг 3.4:** Протестировать
```bash
# Проверить подключение
rclone lsd b2-aurelle:

# Должны увидеть ваш bucket: aurelle-backups
```

**Шаг 3.5:** Включить загрузку в скрипте
```bash
nano /opt/aurelle/backup-db.sh

# Найти строки:
#    # Upload to S3/Backblaze (uncomment when rclone configured)
#    # if rclone copy ${BACKUP_FILE} b2-aurelle:your-bucket/aurelle/db; then

# Раскомментировать и исправить:
    # Upload to Backblaze
    if rclone copy ${BACKUP_FILE} b2-aurelle:aurelle-backups/db; then
        send_notification "✅ Backup uploaded: ${DATE} (${SIZE})"
    else
        send_notification "⚠️ Upload failed: ${DATE}"
    fi

# Также раскомментировать блок с send_notification выше (строка ~35)

# Сохранить: Ctrl+O, Enter, Ctrl+X
```

**Шаг 3.6:** Протестировать загрузку
```bash
# Создать тестовый бэкап
/opt/aurelle/backup-db.sh

# Проверить что файл загрузился
rclone ls b2-aurelle:aurelle-backups/db
```

**Результат:**
- ✅ Бэкапы локально (/opt/aurelle/backups)
- ✅ Бэкапы в облаке (Backblaze)
- ✅ Уведомления в Telegram

---

### ☑️ Задача 4: Протестировать restore (10 минут)

```bash
ssh root@89.39.94.194

# Запустить тест восстановления
/opt/aurelle/restore-test.sh

# Должно показать:
# ✅ Restore successful
# Tables: <число>
# Users: <число>

# И прийти уведомление в Telegram (если настроен)
```

**Если тест упал:**
```bash
# Проверить логи
tail -50 /var/log/aurelle-restore-test.log

# Проверить что бэкап существует
ls -lh /opt/aurelle/backups/
```

**Результат:** Подтверждение, что бэкапы можно восстановить ✅

---

### ☑️ Задача 5 (опционально): Netdata → Telegram (15 минут)

Если хотите, чтобы Netdata тоже слал алерты:

```bash
ssh root@89.39.94.194

# Редактировать конфиг
nano /etc/netdata/health_alarm_notify.conf

# Найти секцию "telegram"
# Раскомментировать и настроить:

SEND_TELEGRAM="YES"
TELEGRAM_BOT_TOKEN="<ваш BOT_TOKEN>"
DEFAULT_RECIPIENT_TELEGRAM="<ваш CHAT_ID>"

# Сохранить

# Перезапустить
systemctl restart netdata

# Протестировать
/usr/libexec/netdata/plugins.d/alarm-notify.sh test

# В Telegram должно прийти тестовое сообщение
```

---

## 🎉 Критерии готовности Этапа 1

### ✅ Чеклист финальной проверки:

```bash
# На сервере:
ssh root@89.39.94.194

# 1. Telegram работает
source /etc/aurelle/telegram.env && \
  BOT_TOKEN="$BOT_TOKEN" CHAT_ID="$CHAT_ID" \
  /usr/local/bin/telegram-send.sh "✅ Test message"

# 2. Бэкапы создаются
ls -lh /opt/aurelle/backups/

# 3. Бэкапы в облаке
rclone ls b2-aurelle:aurelle-backups/db

# 4. Restore работает
/opt/aurelle/restore-test.sh

# 5. Health endpoints работают
curl http://localhost:8000/api/health
curl http://localhost:8000/api/ready

# 6. Cron jobs установлены
crontab -l
```

### 📊 Ожидаемые результаты:

- ✅ Telegram сообщения приходят
- ✅ Ежедневные бэкапы в 03:00
- ✅ Еженедельный restore test в воскресенье 05:00
- ✅ Проверка диска каждые 4 часа
- ✅ VACUUM PostgreSQL каждый день в 04:00
- ✅ /api/health возвращает {"status":"ok"}
- ✅ /api/ready возвращает {"status":"ready"}

---

## 📅 График автоматических задач

```
03:00 ежедневно  - Бэкап БД → Backblaze + Telegram уведомление
04:00 ежедневно  - PostgreSQL VACUUM (ANALYZE)
05:00 воскресенье - Restore test + Telegram уведомление
Каждые 4 часа    - Проверка свободного места (алерт если >85%)
```

---

## 🆘 Что делать если что-то не работает

### Telegram не приходит:
```bash
# Проверить токен и chat_id
cat /etc/aurelle/telegram.env

# Проверить вручную через curl
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>" \
  -d "text=test"
```

### Бэкап не создаётся:
```bash
# Запустить вручную
/opt/aurelle/backup-db.sh

# Проверить логи
tail -50 /var/log/aurelle-backup.log

# Проверить что контейнер работает
docker ps | grep postgres
```

### Rclone ошибка:
```bash
# Проверить конфиг
rclone config show

# Проверить подключение
rclone about b2-aurelle:
```

### Health endpoints 404:
```bash
# Проверить что код задеплоен
curl http://localhost:8000/api/health

# Проверить логи сервера
docker logs aurelle-server | tail -50
```

---

## 🎯 Что дальше

После выполнения всех задач:
- ✅ Этап 1 закрыт
- ✅ Инфраструктура production-ready
- ✅ Мониторинг работает
- ✅ Бэкапы автоматические
- ✅ Алерты настроены

**Следующие шаги:**
- Мониторить Telegram на предмет алертов
- Проверять бэкапы раз в неделю
- При росте нагрузки → Этап 2 (апгрейд VPS)
