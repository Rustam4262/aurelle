# Reviews System & Push Notifications Feature

## Дата: 5 января 2026

## Обзор

Реализованы две критичные фичи для улучшения UX и вовлечённости:
1. **Reviews System** - система отзывов для салонов и мастеров
2. **Push Notifications** - браузерные уведомления о важных событиях

---

## ЧАСТЬ 1: REVIEWS SYSTEM

### Проблема

**До реализации:**
- Таблица reviews существовала, но не было API и UI
- Клиенты не могли оставлять отзывы
- Нет социального подтверждения качества салонов/мастеров
- Владельцы не могли отвечать на отзывы

**После реализации:**
- Клиенты оставляют отзывы после завершённых бронирований
- Рейтинг автоматически обновляется для салонов и мастеров
- Владельцы могут отвечать на отзывы
- Отзывы отображаются на страницах салонов

### Backend API

**Файл**: [server/routes/reviews.routes.ts](server/routes/reviews.routes.ts)

#### Endpoints:

**1. POST /api/reviews** - Создать отзыв
- Требует авторизации
- Проверяет что бронирование завершено (status=completed)
- Проверяет что бронирование принадлежит клиенту
- Предотвращает дублирование отзывов (один отзыв на booking)
- Автоматически обновляет averageRating для салона/мастера

**Валидация:**
```typescript
{
  bookingId: string (optional),
  salonId: string (optional),
  masterId: string (optional),
  rating: number (1-5, required),
  comment: string (optional)
}
```

**2. GET /api/reviews/salon/:salonId** - Получить отзывы салона
- Публичный endpoint
- Поддерживает pagination (limit, offset)
- Возвращает имя клиента и мастера
- Сортировка по createdAt DESC

**3. GET /api/reviews/master/:masterId** - Получить отзывы мастера
- Публичный endpoint
- Поддерживает pagination
- Возвращает имя клиента
- Сортировка по createdAt DESC

**4. GET /api/reviews/my-reviews** - Получить свои отзывы
- Требует авторизации
- Возвращает все отзывы текущего клиента
- Включает информацию о салоне и мастере

**5. PATCH /api/reviews/:reviewId/respond** - Ответить на отзыв (только владелец)
- Требует авторизации
- Проверяет что пользователь - владелец салона
- Добавляет ownerResponse к отзыву

#### Автоматическое обновление рейтинга:

Используются helper функции из `server/helpers/ratings.ts`:
- `updateSalonRating(salonId)` - пересчитывает средний рейтинг салона
- `updateMasterRating(masterId)` - пересчитывает средний рейтинг мастера

Рейтинг обновляется автоматически после каждого нового отзыва.

### Frontend Components

#### 1. ReviewForm Component

**Файл**: `client/src/components/review-form.tsx`

**Функциональность:**
- Форма для создания отзыва
- Star rating selector (1-5 звёзд)
- Текстовое поле для комментария
- Валидация: рейтинг обязателен, комментарий опционален
- Отправка через TanStack Query mutation
- Success/error toasts
- Автоматический refetch отзывов после создания

**Props:**
```typescript
interface ReviewFormProps {
  bookingId: string;
  salonId: string;
  masterId?: string;
  onSuccess?: () => void;
}
```

#### 2. ReviewsList Component

**Файл**: `client/src/components/reviews-list.tsx`

**Функциональность:**
- Отображение списка отзывов
- Фильтрация по salon/master
- Pagination (load more)
- Отображение:
  - Имя клиента
  - Рейтинг (звёзды)
  - Комментарий
  - Дата создания
  - Ответ владельца (если есть)
- Owner response form (только для владельца салона)

**Props:**
```typescript
interface ReviewsListProps {
  salonId?: string;
  masterId?: string;
  limit?: number;
}
```

#### 3. StarRating Component

**Файл**: `client/src/components/star-rating.tsx`

**Функциональность:**
- Отображение рейтинга звёздами (1-5)
- Два режима: readonly и editable
- Hover effect для редактируемого режима
- Цвета: жёлтый для заполненных, серый для пустых

**Props:**
```typescript
interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
```

### Интеграция

**Файлы для изменения:**
1. `client/src/pages/salon.tsx` - добавить ReviewsList и ReviewForm
2. `client/src/pages/client-bookings.tsx` - добавить кнопку "Leave Review" для completed bookings
3. `server/index.ts` - зарегистрировать reviews routes

### Переводы

**Добавить в locales (en, ru, uz):**

```json
{
  "reviews": {
    "title": "Reviews",
    "writeReview": "Write a Review",
    "yourRating": "Your Rating",
    "yourComment": "Your Comment (optional)",
    "submitReview": "Submit Review",
    "noReviews": "No reviews yet",
    "beFirst": "Be the first to leave a review",
    "ownerResponse": "Owner's Response",
    "respondToReview": "Respond to Review",
    "yourResponse": "Your Response",
    "submitResponse": "Submit Response",
    "alreadyReviewed": "You have already reviewed this booking",
    "mustBeCompleted": "You can only review completed bookings",
    "reviewSuccess": "Review submitted successfully",
    "responseSuccess": "Response submitted successfully",
    "loadMore": "Load More Reviews"
  }
}
```

---

## ЧАСТЬ 2: PUSH NOTIFICATIONS

### Проблема

**До реализации:**
- Мастер не знает о новых бронированиях пока не обновит страницу
- Клиент не получает напоминания перед визитом
- Плохая real-time коммуникация

**После реализации:**
- Браузерные push уведомления о важных событиях
- Мастер получает уведомление о новой брони
- Клиент получает напоминание за 1 час до визита
- Работает даже когда вкладка неактивна

### Архитектура

**Технология**: Web Push API (встроенный в браузер, не требует внешних сервисов)

**Компоненты:**
1. Service Worker для фоновых уведомлений
2. Backend API для отправки push уведомлений
3. Frontend UI для запроса разрешений

### Backend API

**Файл**: `server/push/push-service.ts`

**Функциональность:**
- Хранение push subscriptions в БД
- Отправка уведомлений через web-push library
- Автоматическая отправка при событиях:
  - Новое бронирование → уведомление мастеру
  - За 1 час до брони → напоминание клиенту
  - Изменение статуса брони → уведомление клиенту

**Endpoints:**
- `POST /api/push/subscribe` - Сохранить push subscription
- `POST /api/push/unsubscribe` - Удалить push subscription
- `POST /api/push/send` - Отправить тестовое уведомление

**Схема БД**:
```sql
CREATE TABLE push_subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Frontend

**Файлы:**
1. `client/public/service-worker.js` - Service Worker для обработки push
2. `client/src/hooks/usePushNotifications.ts` - React hook для управления push
3. `client/src/components/push-permission-banner.tsx` - UI для запроса разрешения

**usePushNotifications Hook:**
```typescript
const {
  isSupported,
  isSubscribed,
  permission,
  subscribe,
  unsubscribe
} = usePushNotifications();
```

**Использование:**
```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MasterDashboard() {
  const { isSubscribed, subscribe } = usePushNotifications();

  useEffect(() => {
    if (!isSubscribed) {
      subscribe();
    }
  }, []);

  return <div>Dashboard</div>;
}
```

### Типы уведомлений

**1. NEW_BOOKING** - Новое бронирование
```json
{
  "title": "New Booking",
  "body": "New booking for 15 Jan at 14:00",
  "icon": "/logo.png",
  "badge": "/badge.png",
  "data": {
    "type": "new_booking",
    "bookingId": "123",
    "url": "/master/bookings"
  }
}
```

**2. BOOKING_REMINDER** - Напоминание о брони
```json
{
  "title": "Upcoming Appointment",
  "body": "Your appointment at Salon X starts in 1 hour",
  "icon": "/logo.png",
  "data": {
    "type": "reminder",
    "bookingId": "123",
    "url": "/bookings"
  }
}
```

**3. STATUS_CHANGE** - Изменение статуса
```json
{
  "title": "Booking Confirmed",
  "body": "Your booking for 15 Jan has been confirmed",
  "icon": "/logo.png",
  "data": {
    "type": "status_change",
    "bookingId": "123",
    "url": "/bookings"
  }
}
```

### Environment Variables

Добавить в `.env`:
```bash
# Web Push (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=BNxZh3...
VAPID_PRIVATE_KEY=ab12cd...
VAPID_SUBJECT=mailto:admin@aurelle.uz
```

### Генерация VAPID ключей

```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Cron Jobs для Reminders

**Файл**: `server/cron/booking-reminders.ts`

```typescript
import cron from 'node-cron';
import { sendBookingReminder } from '../push/push-service';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const upcomingBookings = await db.select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, 'confirmed'),
        gte(bookings.bookingDate, now),
        lte(bookings.bookingDate, oneHourLater)
      )
    );

  for (const booking of upcomingBookings) {
    await sendBookingReminder(booking);
  }
});
```

---

## Тестирование

### Reviews System

**Test 1: Создание отзыва**
1. Завершить бронирование (status=completed)
2. Открыть страницу салона
3. Нажать "Write a Review"
4. Выбрать рейтинг 5 звёзд
5. Написать комментарий
6. **Ожидаемо**: Отзыв создан, рейтинг салона обновлён

**Test 2: Дублирование отзыва**
1. Попытаться оставить второй отзыв на то же бронирование
2. **Ожидаемо**: Ошибка "You have already reviewed this booking"

**Test 3: Ответ владельца**
1. Войти как владелец салона
2. Открыть отзыв
3. Нажать "Respond"
4. Написать ответ
5. **Ожидаемо**: Ответ отображается под отзывом

### Push Notifications

**Test 1: Подписка на уведомления**
1. Открыть сайт как мастер
2. **Ожидаемо**: Всплывает запрос разрешения push уведомлений
3. Нажать "Allow"
4. **Ожидаемо**: Subscription сохранён в БД

**Test 2: Уведомление о новой брони**
1. Создать новое бронирование к мастеру
2. **Ожидаемо**: Мастер получает браузерное уведомление
3. Кликнуть на уведомление
4. **Ожидаемо**: Открывается страница с бронированиями

**Test 3: Напоминание клиенту**
1. Создать бронирование на время через 1 час
2. Подождать (или изменить системное время)
3. **Ожидаемо**: Клиент получает уведомление-напоминание

---

## Развёртывание

### Локально

```bash
# Install dependencies
npm install web-push

# Generate VAPID keys
npx web-push generate-vapid-keys

# Add to .env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@aurelle.uz

# Run dev server
npm run dev
```

### Production

```bash
ssh root@89.39.94.194
cd /var/www/aurelle

# Pull changes
git pull origin main

# Install web-push
docker exec aurelle_app_1 npm install web-push

# Add VAPID keys to .env
echo "VAPID_PUBLIC_KEY=..." >> .env
echo "VAPID_PRIVATE_KEY=..." >> .env
echo "VAPID_SUBJECT=mailto:admin@aurelle.uz" >> .env

# Copy files
docker cp /var/www/aurelle/server/routes/reviews.routes.ts aurelle_app_1:/app/server/routes/reviews.routes.ts
docker cp /var/www/aurelle/server/push aurelle_app_1:/app/server/push
docker cp /var/www/aurelle/client/src/components/review-form.tsx aurelle_app_1:/app/client/src/components/review-form.tsx
docker cp /var/www/aurelle/client/src/components/reviews-list.tsx aurelle_app_1:/app/client/src/components/reviews-list.tsx
docker cp /var/www/aurelle/client/src/hooks/usePushNotifications.ts aurelle_app_1:/app/client/src/hooks/usePushNotifications.ts
docker cp /var/www/aurelle/client/public/service-worker.js aurelle_app_1:/app/client/public/service-worker.js

# Rebuild
docker exec aurelle_app_1 npm run build

# Restart
docker restart aurelle_app_1
```

---

## Статус

🚧 **В РАЗРАБОТКЕ**

### Готово:
- ✅ Reviews API (backend)
- ✅ Схема БД для reviews
- ✅ Helper функции для обновления рейтинга

### В процессе:
- 🔄 Reviews UI компоненты (ReviewForm, ReviewsList, StarRating)
- 🔄 Push Notifications API
- 🔄 Push Notifications Service Worker
- 🔄 Push Notifications React Hook

### Осталось:
- ⏳ Интеграция reviews в страницы
- ⏳ Переводы для reviews
- ⏳ Cron для booking reminders
- ⏳ Тестирование обеих фич
- ⏳ Развёртывание на production

---

## Приоритет следующих шагов

1. **Завершить Reviews UI** (ReviewForm, ReviewsList, StarRating)
2. **Интегрировать в salon.tsx** и client-bookings.tsx
3. **Добавить переводы** (en, ru, uz)
4. **Реализовать Push Notifications backend**
5. **Создать Service Worker**
6. **Создать usePushNotifications hook**
7. **Тестировать всё вместе**
8. **Развернуть на production**

---

## Файлы для создания

### Reviews System:
- ✅ `server/routes/reviews.routes.ts` (расширен)
- ⏳ `client/src/components/review-form.tsx`
- ⏳ `client/src/components/reviews-list.tsx`
- ⏳ `client/src/components/star-rating.tsx`

### Push Notifications:
- ⏳ `server/push/push-service.ts`
- ⏳ `server/push/push.routes.ts`
- ⏳ `server/cron/booking-reminders.ts`
- ⏳ `client/src/hooks/usePushNotifications.ts`
- ⏳ `client/src/components/push-permission-banner.tsx`
- ⏳ `client/public/service-worker.js`
- ⏳ Добавить в `shared/schema.ts`: pushSubscriptions table

---

## Примечания

- Reviews система использует существующую таблицу `reviews`
- Push Notifications требует HTTPS (уже есть на aurelle.uz)
- Service Worker кэшируется браузером - нужен versioning
- VAPID ключи нужно сгенерировать один раз и сохранить
- Cron jobs для reminders запускаются каждые 5 минут
- Push subscriptions привязаны к userId, не к устройству
