# 🌱 Seed Test Data - Quick Guide

## ✅ Что уже готово

- ✅ **Seed скрипт создан** - [server/seed.ts](server/seed.ts)
- ✅ **npm run db:seed** команда настроена
- ⚠️ **Проблема:** Seed.ts не копируется в Docker контейнер

---

## 🚀 Способ 1: Seed через локальную разработку (Рекомендуется)

### Шаг 1: Запустить seed локально

```bash
cd d:\AURELLE

# Убедиться что DATABASE_URL указывает на production БД
export DATABASE_URL="postgresql://aurelle_user:3540834Dd$1804!@89.39.94.194:5432/aurelle_db"

# Или добавить в .env:
# DATABASE_URL="postgresql://aurelle_user:3540834Dd$1804!@89.39.94.194:5432/aurelle_db"

# Запустить seed
npm run db:seed
```

### Шаг 2: Проверить результат

```bash
# Проверить через API
curl https://aurelle.uz/api/salons | python -m json.tool

# Или через БД
ssh root@89.39.94.194
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db \
  -c "SELECT id, name->>'ru' as name, city FROM salons LIMIT 5;"
```

---

## 🚀 Способ 2: Seed через SSH туннель

### Шаг 1: Создать SSH туннель к БД

```bash
# Открыть туннель (оставить терминал открытым)
ssh -L 5433:127.0.0.1:5432 root@89.39.94.194 -N

# В другом терминале
```

### Шаг 2: Обновить DATABASE_URL локально

```bash
# d:\AURELLE\.env
DATABASE_URL="postgresql://aurelle_user:3540834Dd$1804!@localhost:5433/aurelle_db"
```

### Шаг 3: Запустить seed

```bash
npm run db:seed
```

---

## 🚀 Способ 3: Ручной SQL seed (быстрый)

### Создать минимальный test dataset

```bash
ssh root@89.39.94.194

# Создать SQL seed файл
cat > /tmp/seed_test_data.sql << 'EOF'
-- Create test salon owner user
INSERT INTO users (id, username, email, "fullName", role)
VALUES
  ('test-owner-1', 'test_owner', 'owner@test.uz', 'Test Owner', 'owner')
ON CONFLICT (id) DO NOTHING;

-- Create test salons
INSERT INTO salons (id, "ownerId", name, description, address, city, latitude, longitude, phone, email, photos, "isActive", "averageRating", "reviewCount")
VALUES
  (
    gen_random_uuid(),
    'test-owner-1',
    '{"ru": "Тестовый Салон", "en": "Test Salon", "uz": "Test Salon"}',
    '{"ru": "Салон для тестирования", "en": "Test salon", "uz": "Test salon"}',
    'ул. Тестовая, 1',
    'Ташкент',
    '41.311151',
    '69.279737',
    '+998901234567',
    'test@salon.uz',
    ARRAY[]::text[],
    true,
    '4.5',
    10
  )
ON CONFLICT DO NOTHING
RETURNING id;

-- Get salon ID for services
\gset salon_

-- Create test services
INSERT INTO services ("salonId", name, description, category, "priceMin", "priceMax", duration, "isActive")
SELECT
  :'salon_id',
  '{"ru": "Стрижка", "en": "Haircut", "uz": "Soch kesish"}',
  '{"ru": "Классическая стрижка", "en": "Classic haircut", "uz": "Klassik kesim"}',
  'hair',
  100000,
  200000,
  60,
  true
WHERE :'salon_id' IS NOT NULL;

-- Create working hours (Mon-Sat 9-20, Sun closed)
INSERT INTO salon_working_hours ("salonId", "dayOfWeek", "openTime", "closeTime", "isClosed")
SELECT
  :'salon_id',
  generate_series(1, 6),
  '09:00',
  '20:00',
  false
WHERE :'salon_id' IS NOT NULL
UNION ALL
SELECT
  :'salon_id',
  0,
  '00:00',
  '00:00',
  true
WHERE :'salon_id' IS NOT NULL;

EOF

# Run seed SQL
docker exec -i aurelle-postgres psql -U aurelle_user -d aurelle_db < /tmp/seed_test_data.sql
```

### Проверить результат

```bash
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db -c "
SELECT s.id, s.name->>'ru' as name, s.city, COUNT(sv.id) as services_count
FROM salons s
LEFT JOIN services sv ON sv.\"salonId\" = s.id
GROUP BY s.id;
"
```

---

## 🚀 Способ 4: Копировать seed.ts в контейнер

### Шаг 1: Обновить Dockerfile

```dockerfile
# В /opt/aurelle/src/server/Dockerfile
# После COPY --from=build /app/migrations ./migrations

# Add seed script for manual seeding
COPY --from=build /app/server/seed.ts ./server/seed.ts
```

### Шаг 2: Rebuild контейнера

```bash
ssh root@89.39.94.194
cd /opt/aurelle
docker compose down
docker compose up -d --build
```

### Шаг 3: Запустить seed

```bash
docker compose exec server npm run db:seed
```

---

## 📊 Что создаёт seed скрипт

### Салоны (3 шт):

1. **Люкс Салон Красоты** (Ташкент) - 3 фото, рейтинг 4.8
2. **Релакс СПА** (Ташкент) - 2 фото, рейтинг 4.9
3. **Стиль и Красота** (Самарканд) - 3 фото, рейтинг 4.7

### Мастера (3 шт):

1. **Анна Иванова** - стрижки, окрашивание (салон 1)
2. **Мария Петрова** - маникюр, педикюр (салон 1)
3. **Елена Соколова** - массаж, SPA (салон 2)

### Услуги (5 шт):

1. Женская стрижка - 150,000-300,000 UZS, 60 мин
2. Окрашивание волос - 250,000-600,000 UZS, 120 мин
3. Маникюр классический - 100,000 UZS, 90 мин
4. Расслабляющий массаж - 200,000-350,000 UZS, 60 мин
5. Уход за лицом - 150,000-250,000 UZS, 90 мин

### Расписание:

- Понедельник-Суббота: 09:00-20:00
- Воскресенье: Выходной

---

## 🧪 Проверка seed данных

### Через API

```bash
# Получить все салоны
curl https://aurelle.uz/api/salons

# Получить услуги салона
curl https://aurelle.uz/api/salons/{salon-id}/services

# Получить мастеров салона
curl https://aurelle.uz/api/salons/{salon-id}/masters
```

### Через БД

```bash
ssh root@89.39.94.194

# Статистика
docker exec aurelle-postgres psql -U aurelle_user -d aurelle_db << 'EOF'
SELECT
  'Salons' as table_name, COUNT(*) as count FROM salons
UNION ALL
SELECT 'Masters', COUNT(*) FROM masters
UNION ALL
SELECT 'Services', COUNT(*) FROM services
UNION ALL
SELECT 'Users', COUNT(*) FROM users;
EOF
```

---

## ⚠️ Важно

### 1. Не запускать seed дважды

Seed script **НЕ проверяет** существующие данные и создаст дубликаты. Перед повторным запуском:

```sql
-- Очистить тестовые данные
DELETE FROM master_services;
DELETE FROM salon_working_hours;
DELETE FROM services;
DELETE FROM masters;
DELETE FROM salons WHERE "ownerId" LIKE 'seed-owner-%';
```

### 2. Фото не загружены

Seed использует пути к stock изображениям, но **файлы отсутствуют**. Нужно:

- Загрузить реальные изображения
- Или обновить пути на placeholder URLs
- Или оставить как есть (broken images)

### 3. Test users

Seed создаёт салоны с `ownerId: "seed-owner-1"`, но **users не создаются**. Нужно либо:

- Добавить INSERT users в seed.ts
- Или игнорировать (salons будут без владельцев)

---

## 🎯 Рекомендуемый подход

**Для быстрого тестирования:**

1. Использовать Способ 3 (SQL seed) - самый быстрый
2. Создаёт минимальный dataset за 5 секунд

**Для полного тестирования:**

1. Использовать Способ 1 (локальный seed с SSH туннелем)
2. Создаёт полный dataset из seed.ts

**Для production:**

1. НЕ использовать seed данные
2. Дождаться реальных пользователей
3. Или создать "showcase" салоны вручную через UI

---

## 🔗 Файлы

- [server/seed.ts](server/seed.ts) - полный seed скрипт
- package.json - `"db:seed": "tsx server/seed.ts"`
