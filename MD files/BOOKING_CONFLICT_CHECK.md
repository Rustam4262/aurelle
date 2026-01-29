# Защита от двойных бронирований (Booking Conflict Detection)

## Дата: 5 января 2026

## Проблема

**КРИТИЧНО**: Система позволяла создавать несколько бронирований на одно и то же время для одного мастера, что могло привести к:

- Двойным записям клиентов
- Потере доверия к платформе
- Конфликтам между клиентами
- Репутационным рискам для салонов

## Решение

### 1. Функция проверки конфликтов

**Файл**: [server/routes/client.routes.ts:28-110](server/routes/client.routes.ts#L28-L110)

Создана функция `checkBookingConflict()` которая:

- ✅ Проверяет пересечение временных интервалов
- ✅ Учитывает буфер между бронированиями
- ✅ Проверяет по мастеру (если указан) или по салону
- ✅ Исключает отменённые бронирования
- ✅ Поддерживает обновление существующих бронирований

**Алгоритм проверки:**

```typescript
// Проверка пересечения: (start1 < end2) AND (start2 < end1)
const hasOverlap = bufferedStart < existingBufferedEnd && existingBufferedStart < bufferedEnd;
```

**Параметры:**

- `masterId`: ID мастера (null если не указан)
- `salonId`: ID салона
- `bookingDate`: Дата бронирования
- `startTime`: Время начала ("14:00")
- `endTime`: Время окончания ("15:00")
- `excludeBookingId`: ID текущего бронирования (при обновлении)
- `bufferMinutes`: Буфер между бронированиями (по умолчанию 10 минут)

**Возвращает:**

```typescript
{
  hasConflict: boolean;
  conflictingBooking?: Booking;
}
```

### 2. Таблица настроек салона (salon_settings)

**Файл**: [shared/schema.ts:61-82](shared/schema.ts#L61-L82)

Новая таблица для гибкой настройки поведения бронирований:

```typescript
export const salonSettings = pgTable("salon_settings", {
  id: varchar("id").primaryKey(),
  salonId: varchar("salon_id").notNull().unique(),
  bufferMinutes: integer("buffer_minutes").default(10), // Буфер между бронированиями
  allowDoubleBooking: boolean("allow_double_booking").default(false), // Разрешить двойные записи
  autoConfirmBookings: boolean("auto_confirm_bookings").default(false), // Автоподтверждение
  maxAdvanceBookingDays: integer("max_advance_booking_days").default(30), // Макс дней вперёд
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Настройки:**

- **bufferMinutes** (по умолчанию 10): Минуты между бронированиями для подготовки, уборки
- **allowDoubleBooking** (по умолчанию false): Для салонов с несколькими креслами
- **autoConfirmBookings** (по умолчанию false): Автоматическое подтверждение или требуется ручное
- **maxAdvanceBookingDays** (по умолчанию 30): Насколько вперёд можно бронировать

### 3. Интеграция в создание бронирования

**Файл**: [server/routes/client.routes.ts:231-261](server/routes/client.routes.ts#L231-L261)

**Логика:**

1. Получаем настройки салона из БД
2. Берём буфер из настроек (или default 10 минут)
3. Проверяем флаг `allowDoubleBooking`
4. Если двойные записи запрещены → проверяем конфликт
5. Если конфликт найден → возвращаем 409 Conflict
6. Если конфликта нет → создаём бронирование

**HTTP ответ при конфликте:**

```json
{
  "error": "Time slot not available",
  "message": "This master already has a booking from 14:00 to 15:00. Please choose a different time.",
  "conflictingBooking": {
    "startTime": "14:00",
    "endTime": "15:00",
    "date": "2026-01-05T00:00:00.000Z"
  }
}
```

### 4. Оптимизация производительности

**Файл**: [shared/schema.ts:200-209](shared/schema.ts#L200-L209)

Добавлены композитные индексы для быстрой проверки:

```typescript
index("idx_bookings_status").on(table.status),
index("idx_bookings_master_date_status").on(table.masterId, table.bookingDate, table.status),
index("idx_bookings_salon_date_status").on(table.salonId, table.bookingDate, table.status),
```

**Зачем:**

- Ускоряет поиск существующих бронирований по мастеру + дате
- Фильтрует по статусу (исключаем cancelled)
- Критично для масштабирования (1000+ бронирований в день)

## Изменённые файлы

### Backend

1. ✅ [server/routes/client.routes.ts](server/routes/client.routes.ts)
   - Добавлена функция `checkBookingConflict()`
   - Интегрирована проверка в POST /api/client/bookings
   - Добавлен импорт `salonSettings`

2. ✅ [shared/schema.ts](shared/schema.ts)
   - Добавлена таблица `salonSettings`
   - Добавлены индексы в таблицу `bookings`

### База данных

Новые объекты:

- Таблица: `salon_settings`
- Индексы:
  - `idx_bookings_status`
  - `idx_bookings_master_date_status`
  - `idx_bookings_salon_date_status`

## Примеры использования

### Пример 1: Успешное бронирование

```http
POST /api/client/bookings
{
  "salonId": "salon-123",
  "serviceId": "service-456",
  "masterId": "master-789",
  "bookingDate": "2026-01-06",
  "startTime": "14:00"
}

Response: 201 Created
{
  "id": "booking-abc",
  "startTime": "14:00",
  "endTime": "15:00",
  ...
}
```

### Пример 2: Конфликт (мастер занят)

```http
POST /api/client/bookings
{
  "salonId": "salon-123",
  "serviceId": "service-456",
  "masterId": "master-789",  // У него уже есть запись в 14:00
  "bookingDate": "2026-01-06",
  "startTime": "14:00"
}

Response: 409 Conflict
{
  "error": "Time slot not available",
  "message": "This master already has a booking from 14:00 to 15:00. Please choose a different time.",
  "conflictingBooking": {
    "startTime": "14:00",
    "endTime": "15:00",
    "date": "2026-01-06T00:00:00.000Z"
  }
}
```

### Пример 3: С учётом буфера

**Настройки салона**: bufferMinutes = 15

```
Существующее бронирование: 14:00 - 15:00
Буфер: 15 минут до и после
Занято: 13:45 - 15:15

Попытка записи на 13:50 → ❌ КОНФЛИКТ (попадает в буфер)
Попытка записи на 15:20 → ✅ МОЖНО
```

## Миграция БД

### На локальной машине:

```bash
npm run db:push
```

### На продакшене:

```bash
ssh root@89.39.94.194
cd /var/www/aurelle
git pull origin main

# Применить миграцию
docker exec aurelle_app_1 npm run db:push

# Проверить таблицу
docker exec aurelle_app_1 psql $DATABASE_URL -c "\d salon_settings"
docker exec aurelle_app_1 psql $DATABASE_URL -c "\di bookings*"
```

## Тестирование

### Тест 1: Двойная запись на одно время (должна блокироваться)

1. Создать бронирование: Мастер A, 14:00-15:00
2. Попытка создать: Мастер A, 14:00-15:00
3. **Ожидаемо**: 409 Conflict

### Тест 2: Запись с пересечением (должна блокироваться)

1. Создать бронирование: Мастер A, 14:00-15:00
2. Попытка создать: Мастер A, 14:30-15:30
3. **Ожидаемо**: 409 Conflict (пересечение)

### Тест 3: Запись с учётом буфера (должна блокироваться)

1. Настройка салона: bufferMinutes = 10
2. Создать бронирование: Мастер A, 14:00-15:00
3. Попытка создать: Мастер A, 15:05-16:00
4. **Ожидаемо**: 409 Conflict (попадает в буфер 15:00-15:10)

### Тест 4: Запись после буфера (должна проходить)

1. Буфер: 10 минут
2. Существующее: 14:00-15:00 (с буфером 13:50-15:10)
3. Попытка создать: Мастер A, 15:15-16:00
4. **Ожидаемо**: 201 Created

### Тест 5: Разные мастера (должна проходить)

1. Создать: Мастер A, 14:00-15:00
2. Создать: Мастер B, 14:00-15:00
3. **Ожидаемо**: 201 Created (разные мастера)

### Тест 6: allowDoubleBooking = true

1. Настроить салон: allowDoubleBooking = true
2. Создать: Мастер A, 14:00-15:00
3. Создать: Мастер A, 14:00-15:00
4. **Ожидаемо**: 201 Created (разрешено)

## Будущие улучшения

### P0 - Критично

- [ ] **Frontend блокировка**: Показывать занятые слоты ДО отправки запроса
- [ ] **Race condition protection**: Database-level locking для 100% защиты

### P1 - Важно

- [ ] **Capacity tracking**: Для салонов с несколькими креслами
- [ ] **Recurring bookings**: Повторяющиеся записи
- [ ] **Waitlist**: Лист ожидания при занятых слотах

### P2 - Nice to have

- [ ] **Smart scheduling**: AI-рекомендации свободных слотов
- [ ] **Overbooking policy**: Для салонов с историей no-show

## Метрики

После внедрения отслеживаем:

- Количество 409 ответов (попытки двойных записей)
- Среднее время проверки конфликтов
- Процент успешных бронирований

## Статус

✅ **РЕАЛИЗОВАНО И ГОТОВО К РАЗВЁРТЫВАНИЮ**

## Риски

**Минимальные**:

- ✅ Только добавлены проверки (нет breaking changes)
- ✅ Backward compatible (если нет salon_settings → используется default)
- ✅ Производительность оптимизирована индексами

**Что может пойти не так:**

1. Миграция БД упадёт → откат на предыдущую версию
2. Много 409 ошибок → проверить логику буфера
3. Медленные запросы → проверить индексы

## Контрольный список развёртывания

- [x] Код написан и протестирован локально
- [x] Добавлены индексы для производительности
- [x] Создана таблица salon_settings
- [x] Документация создана
- [ ] Миграция применена на продакшене
- [ ] Тесты пройдены на продакшене
- [ ] Мониторинг ошибок настроен
