# 🚀 Инструкция по развёртыванию на продакшен

## Что будет развёрнуто:

### ✅ Fix #1: Исправление бронирования (master_id nullable)
- Клиенты могут бронировать без выбора конкретного мастера
- Изменена схема БД: master_id теперь опциональный

### ✅ Fix #2: Исправление загрузки фото
- Автоматическое создание папок для загрузок при старте сервера
- Работает загрузка фото салонов и портфолио мастеров

### ✅ Fix #3: Геолокация с Яндекс.Картами
- Владельцы могут указать местоположение салона на карте
- Клиенты видят салон на карте с возможностью скопировать адрес
- Интеграция с Яндекс.Картами

### ✅ Fix #4: Исправления TypeScript
- Убраны все ошибки компиляции
- Убраны предупреждения о устаревших опциях

---

## 📋 Команды для развёртывания

### Вариант 1: Автоматическое развёртывание (Рекомендуется)

```bash
# Подключитесь к серверу
ssh root@185.217.131.144

# Перейдите в директорию проекта
cd /var/www/aurelle

# Запустите скрипт развёртывания
bash deploy_booking_fix.sh
```

Скрипт автоматически выполнит:
1. ✅ Подтянет последний код с GitHub
2. ✅ Скопирует обновлённые файлы в контейнер
3. ✅ Установит новые зависимости (@pbe/react-yandex-maps)
4. ✅ Применит изменения схемы БД (master_id nullable)
5. ✅ Пересоберёт приложение с новыми компонентами
6. ✅ Перезапустит сервер

**Время развёртывания:** ~5-7 минут

---

### Вариант 2: Ручное развёртывание (пошагово)

Если хотите контроль на каждом шаге:

```bash
ssh root@185.217.131.144
cd /var/www/aurelle

# Шаг 1: Подтянуть код
git pull origin main

# Шаг 2: Скопировать файлы в контейнер
docker cp /var/www/aurelle/shared/schema.ts aurelle_app_1:/app/shared/schema.ts
docker cp /var/www/aurelle/server/initUploads.ts aurelle_app_1:/app/server/initUploads.ts
docker cp /var/www/aurelle/server/index.ts aurelle_app_1:/app/server/index.ts
docker cp /var/www/aurelle/tsconfig.json aurelle_app_1:/app/tsconfig.json
docker cp /var/www/aurelle/package.json aurelle_app_1:/app/package.json
docker cp /var/www/aurelle/package-lock.json aurelle_app_1:/app/package-lock.json

# Шаг 3: Установить зависимости
docker exec aurelle_app_1 npm install

# Шаг 4: Применить изменения БД
docker exec aurelle_app_1 npm run db:push

# Шаг 5: Собрать приложение
docker exec aurelle_app_1 npm run build

# Шаг 6: Перезапустить
docker restart aurelle_app_1

# Проверить статус
docker ps | grep aurelle_app_1
docker logs --tail=30 aurelle_app_1
```

---

## ✅ Проверка после развёртывания

### 1. Проверка работы сервера
```bash
docker ps | grep aurelle_app_1
# Статус должен быть "Up X seconds/minutes"

docker logs --tail=50 aurelle_app_1
# Должно быть: "serving on port 5000"
```

### 2. Проверка БД
```bash
docker exec aurelle_postgres_1 psql -U aurelle_user -d aurelle -c "\d bookings" | grep master_id
# Должно быть: master_id | varchar |  |  |
# (без "not null")
```

### 3. Проверка папок для загрузок
```bash
docker exec aurelle_app_1 ls -la /app/server/uploads/
# Должны быть папки: salons/, masters/, portfolio/, avatars/
```

### 4. Функциональная проверка

**Тест бронирования:**
1. Откройте https://aurelle.uz
2. Зайдите как клиент
3. Выберите салон → услугу
4. НЕ выбирайте мастера (или выберите "Любой")
5. Нажмите "Записаться"
6. ✅ Должно успешно создаться бронирование

**Тест загрузки фото:**
1. Зайдите как владелец салона
2. Перейдите в управление салоном
3. Нажмите "Фотографии" → "Добавить фото"
4. Выберите файл с компьютера
5. ✅ Должно успешно загрузиться

**Тест геолокации:**
1. Зайдите как владелец
2. В разделе "Информация о салоне"
3. Нажмите "Изменить местоположение"
4. Кликните на карте или введите адрес
5. Нажмите "Сохранить"
6. ✅ Должно сохраниться
7. Откройте страницу салона как клиент
8. Перейдите на вкладку "О салоне"
9. ✅ Должна отображаться карта с местоположением

---

## 🔄 Откат изменений (если что-то пошло не так)

```bash
# Восстановить БД из бэкапа
docker exec -i aurelle_postgres_1 psql -U aurelle_user -d aurelle < /root/backups/backup_before_update_20260105_005003.sql

# Откатить код на предыдущий коммит
cd /var/www/aurelle
git checkout c1459452  # Последний стабильный коммит перед изменениями

# Скопировать старые файлы
docker cp /var/www/aurelle/shared/schema.ts aurelle_app_1:/app/shared/schema.ts
docker cp /var/www/aurelle/server/index.ts aurelle_app_1:/app/server/index.ts

# Пересобрать и перезапустить
docker exec aurelle_app_1 npm run build
docker restart aurelle_app_1
```

---

## 📊 Информация о коммитах

**Последний коммит:** `71d16e7a`

**История изменений:**
- `51f07c2b` - Fix booking creation: make master_id nullable
- `fd05f5e4` - Fix photo upload: initialize upload directories
- `460230a6` - Add Yandex Maps geolocation feature
- `408be3a0` - Fix TypeScript configuration errors
- `71d16e7a` - Fix TypeScript errors permanently

**GitHub:** https://github.com/Rustam4262/aurelle

---

## 📞 Поддержка

Если возникнут проблемы:

1. **Проверьте логи:**
   ```bash
   docker logs -f aurelle_app_1
   ```

2. **Проверьте статус контейнеров:**
   ```bash
   docker ps -a
   ```

3. **Проверьте использование ресурсов:**
   ```bash
   docker stats aurelle_app_1
   ```

---

**Дата подготовки:** 5 января 2026
**Подготовил:** Claude Code AI Assistant
**Время развёртывания:** ~5-7 минут
**Время простоя:** ~10 секунд (перезапуск контейнера)
