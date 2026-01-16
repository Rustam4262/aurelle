# Руководство по постоянному хранению данных и обновлению платформы

## Важно: База данных не удаляется при обновлениях!

Ваша база данных PostgreSQL работает в Docker контейнере с постоянным хранилищем данных. Это означает, что:

✅ **Данные сохраняются** между обновлениями кода
✅ **Пользователи не теряются** после перезапуска
✅ **Салоны и бронирования остаются** в базе
✅ **Один и тот же database для всех обновлений**

---

## Как устроено постоянное хранение

### Текущая конфигурация

```
PostgreSQL Container: aurelle-postgres
Database Name: aurelle_db
User: aurelle_user
Status: Running and persistent
```

### Где хранятся данные

Данные PostgreSQL хранятся **внутри Docker контейнера** в директории `/var/lib/postgresql/data`.

Эта директория сохраняется, даже когда вы:
- Обновляете код приложения
- Перезапускаете PM2
- Делаете `git pull` новых изменений
- Запускаете `npm run build`

---

## Безопасное обновление платформы

### Процедура обновления БЕЗ потери данных

```bash
# 1. Подключиться к серверу
ssh root@89.39.94.194

# 2. Перейти в директорию проекта
cd /var/www/aurelle/current

# 3. Получить новый код
git pull origin main

# 4. Установить зависимости (если есть новые)
npm install

# 5. Собрать проект
npm run build

# 6. Перезапустить приложение
pm2 restart aurelle-production

# 7. Проверить статус
pm2 logs aurelle-production --lines 20
```

**ВАЖНО:** База данных **НЕ ТРОГАЕТСЯ** во время этого процесса!

---

## Проверка целостности базы данных

### Как убедиться, что данные на месте

```bash
# Подсчитать пользователей
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db -c "SELECT COUNT(*) FROM users;"

# Подсчитать салоны
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db -c "SELECT COUNT(*) FROM salons;"

# Подсчитать бронирования
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db -c "SELECT COUNT(*) FROM bookings;"

# Список всех таблиц
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db -c "\dt"
```

---

## Миграции базы данных

### Когда нужна миграция

Миграция требуется только когда:
- Добавляются новые таблицы
- Изменяется структура существующих таблиц
- Добавляются новые колонки

### Как применить миграцию

Миграции уже применены для Phase 1:
- ✅ Колонки в `services`: booking_count, last_booked_at, display_order
- ✅ Колонки в `bookings`: modified_by, modification_history
- ✅ Таблицы: master_statistics, booking_history
- ✅ 9 индексов для производительности

При будущих обновлениях миграции будут применяться отдельными SQL скриптами.

---

## Резервное копирование

### Создание backup'а базы данных

```bash
# Создать backup всей базы
docker exec aurelle-postgres pg_dump -U aurelle_user aurelle_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Создать backup с сжатием
docker exec aurelle-postgres pg_dump -U aurelle_user aurelle_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Восстановление из backup'а

```bash
# Восстановить из SQL файла
cat backup_20260116.sql | docker exec -i aurelle-postgres psql -U aurelle_user -d aurelle_db

# Восстановить из сжатого файла
gunzip < backup_20260116.sql.gz | docker exec -i aurelle-postgres psql -U aurelle_user -d aurelle_db
```

**Рекомендация:** Создавайте backup перед каждым большим обновлением!

---

## Текущие пользователи

На данный момент в системе зарегистрировано **2 пользователя**:
1. xulkarraziyeva@gmail.com (Owner)
2. roziyev18r@gmail.com (Новый пользователь)

Эти пользователи останутся в системе навсегда (пока вы не удалите их вручную).

---

## Что происходит при обновлении

### ❌ НЕ изменяется:
- База данных PostgreSQL
- Все пользователи
- Все салоны
- Все бронирования
- Все мастера и услуги
- История и статистика

### ✅ Обновляется только:
- JavaScript код приложения
- React компоненты (frontend)
- API endpoints (backend)
- Стили и UI

---

## Добавление первого салона

### Процесс регистрации салона

1. **Зарегистрируйтесь** как владелец на https://aurelle.uz/auth
2. **Войдите в систему** с вашими учетными данными
3. **Создайте профиль** владельца (Owner)
4. **Перейдите в Owner Dashboard** на https://aurelle.uz/owner
5. **Создайте салон** через интерфейс

### Данные салона сохранятся навсегда

После создания салона:
- Информация о салоне → **сохранится в PostgreSQL**
- Мастера → **сохранятся в PostgreSQL**
- Услуги → **сохранятся в PostgreSQL**
- Бронирования → **сохранятся в PostgreSQL**

Все это **НЕ ПОТЕРЯЕТСЯ** при обновлениях!

---

## Важные напоминания

### 🔴 Никогда не делайте:

```bash
# ❌ НЕ удаляйте контейнер PostgreSQL
docker rm aurelle-postgres

# ❌ НЕ пересоздавайте контейнер без volume
docker-compose down -v  # флаг -v удаляет volumes!
```

### ✅ Безопасные команды:

```bash
# ✅ Перезапуск контейнера (данные сохранятся)
docker restart aurelle-postgres

# ✅ Обновление кода
cd /var/www/aurelle/current && git pull && npm run build && pm2 restart aurelle-production

# ✅ Проверка статуса
pm2 status
docker ps | grep postgres
```

---

## Контакты для проверки

После каждого обновления проверяйте:

1. **Health check**: `curl https://aurelle.uz/api/health`
2. **PM2 logs**: `pm2 logs aurelle-production`
3. **Database connection**: `docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db -c "SELECT COUNT(*) FROM users;"`

---

## Текущий статус

✅ **База данных**: Работает
✅ **PostgreSQL**: Слушает на 0.0.0.0:5432
✅ **Приложение**: Запущено через PM2
✅ **Сайт**: https://aurelle.uz доступен
✅ **Пользователи**: 2 аккаунта в системе
✅ **Постоянное хранение**: Настроено и работает

**Вы можете безопасно подключать первый салон!** Все данные будут сохранены.
