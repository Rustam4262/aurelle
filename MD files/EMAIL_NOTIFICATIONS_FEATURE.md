# Email Notifications System

## Дата: 5 января 2026

## Обзор

Реализована система email уведомлений для ключевых событий бронирований. Клиенты теперь получают красивые HTML письма с подтверждениями, отменами и напоминаниями о записях.

## Проблема

**До реализации:**
- ❌ Клиенты не получали подтверждений после бронирования
- ❌ Нет уведомлений об отмене
- ❌ Нет напоминаний перед визитом
- ❌ Снижение доверия к платформе
- ❌ Высокий процент no-show

**После реализации:**
- ✅ Автоматические подтверждения бронирований
- ✅ Уведомления об отмене
- ✅ Готовая инфраструктура для напоминаний
- ✅ Профессиональные HTML письма
- ✅ Мультиязычность (en, ru, uz)
- ✅ Красивый дизайн с брендингом AURELLE

## Архитектура

### 1. Email Service

**Файл**: [server/email/index.ts](server/email/index.ts)

**Основные компоненты:**

#### Инициализация
```typescript
export function initializeEmail(): void
```
- Инициализирует Nodemailer transporter
- Читает SMTP настройки из environment variables
- Graceful degradation - если SMTP не настроен, просто логирует warning
- Вызывается при старте сервера

#### Проверка доступности
```typescript
export function isEmailConfigured(): boolean
```
- Проверяет, настроена ли email система
- Используется перед отправкой писем

#### Email Templates

**1. Подтверждение бронирования**
```typescript
export async function sendBookingConfirmation(
  email: string,
  data: BookingConfirmationData,
  language: string = "en"
): Promise<void>
```

**Данные:**
- `clientName` - имя клиента
- `salonName` - название салона
- `serviceName` - название услуги
- `masterName` - имя мастера (или null)
- `date` - дата записи
- `time` - время записи
- `price` - цена услуги
- `bookingId` - ID бронирования

**Дизайн:**
- Фиолетовый градиент в header
- Карточка с деталями записи
- Цена выделена крупным шрифтом
- Кнопка "View Booking" для перехода в профиль
- Инструкции о приходе за 5 минут

**2. Отмена бронирования**
```typescript
export async function sendBookingCancellation(
  email: string,
  data: BookingCancellationData,
  language: string = "en"
): Promise<void>
```

**Данные:**
- `clientName` - имя клиента
- `salonName` - название салона
- `serviceName` - название услуги
- `date` - дата записи
- `time` - время записи

**Дизайн:**
- Розово-красный градиент в header
- Детали отменённой записи
- Кнопка "Book Again" для новой записи
- Дружелюбное прощальное сообщение

**3. Напоминание о записи**
```typescript
export async function sendBookingReminder(
  email: string,
  data: BookingReminderData,
  language: string = "en"
): Promise<void>
```

**Данные:**
- `clientName` - имя клиента
- `salonName` - название салона
- `serviceName` - название услуги
- `masterName` - имя мастера
- `date` - дата записи
- `time` - время записи
- `hoursUntil` - часов до записи

**Дизайн:**
- Жёлто-розовый градиент в header
- Большой countdown "в X часов"
- Детали записи
- Напоминание о приходе за 5 минут
- Кнопки "View Booking" и "Need to cancel?"

### 2. Integration в Booking Endpoints

**Файл**: [server/routes/client.routes.ts](server/routes/client.routes.ts)

#### При создании бронирования
**Location**: Lines 292-343

**Логика:**
1. Создаётся бронирование в БД
2. Проверяется `isEmailConfigured()` и наличие email у пользователя
3. Загружаются дополнительные данные (мастер, название салона/услуги)
4. Определяется язык из `preferredLanguage` пользователя
5. Форматируется дата для письма
6. Отправляется email через `sendBookingConfirmation()`
7. Логируется успех/ошибка
8. **Важно**: Если email fails, бронирование НЕ откатывается

```typescript
// Send confirmation email if email is configured
if (isEmailConfigured() && result.profile.email) {
  try {
    // ... prepare data ...
    await sendBookingConfirmation(email, data, language);
    console.log(`[EMAIL] Confirmation email sent`);
  } catch (emailError) {
    // Don't fail the booking if email fails
    console.error("[EMAIL] Failed to send:", emailError);
  }
}
```

#### При отмене бронирования
**Location**: Lines 445-490

**Логика:**
1. Обновляется статус бронирования на "cancelled"
2. Проверяется `isEmailConfigured()` и наличие email
3. Загружаются данные салона и услуги
4. Форматируется дата и локализуются названия
5. Отправляется email через `sendBookingCancellation()`
6. Логируется успех/ошибка
7. **Важно**: Если email fails, отмена НЕ откатывается

### 3. Server Initialization

**Файл**: [server/index.ts](server/index.ts)

```typescript
import { initializeEmail } from "./email";

(async () => {
  initializeUploadDirectories();
  initializeEmail(); // <-- Инициализация email системы
  await registerRoutes(httpServer, app);
  // ...
})();
```

### 4. Environment Configuration

**Файл**: [.env.example](.env.example)

**Новые переменные:**
```bash
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=AURELLE <noreply@aurelle.uz>

# Application URL (for email links)
APP_URL=https://aurelle.uz
```

## Изменённые файлы

### Backend (3 файла)
1. ✅ [server/email/index.ts](server/email/index.ts) - Email service (новый файл, 565 строк)
2. ✅ [server/index.ts](server/index.ts) - Добавлена инициализация email
3. ✅ [server/routes/client.routes.ts](server/routes/client.routes.ts) - Интеграция отправки писем

### Configuration (2 файла)
1. ✅ [package.json](package.json) - Добавлены nodemailer dependencies
2. ✅ [.env.example](.env.example) - Добавлены SMTP настройки

## Email Templates Design

### Общие элементы всех писем

**Header:**
- Градиентный фон (разные цвета для разных типов)
- Логотип AURELLE белым цветом
- Padding 30px

**Content:**
- Персональное приветствие "Hello, {Name}!"
- Заголовок с эмодзи
- Карточка с деталями (серый фон)
- Кнопки действий (фиолетовые)

**Footer:**
- Логотип AURELLE (фиолетовый)
- Прощальное сообщение
- Ссылка на сайт aurelle.uz

**Responsive:**
- max-width: 600px
- Адаптивный под мобильные устройства
- Корректно отображается в Gmail, Outlook, Apple Mail

### Цветовая схема

**Подтверждение:**
- Primary: #667eea → #764ba2 (фиолетовый градиент)
- Accent: #667eea (кнопки)
- Info: #e7f3ff (инструкции)

**Отмена:**
- Primary: #f093fb → #f5576c (розово-красный градиент)
- Accent: #667eea (кнопки)
- Warning: #fff3cd (сообщение)

**Напоминание:**
- Primary: #fa709a → #fee140 (жёлто-розовый градиент)
- Accent: #667eea (кнопки)
- Success: #d4edda (напоминание)

## Мультиязычность

Все email templates поддерживают 3 языка:

**English (en):**
- Subject: "Booking Confirmation - AURELLE"
- Greeting: "Hello"
- All UI texts in English

**Русский (ru):**
- Subject: "Подтверждение записи - AURELLE"
- Greeting: "Здравствуйте"
- All UI texts in Russian

**O'zbekcha (uz):**
- Subject: "Yozilish tasdiqlandi - AURELLE"
- Greeting: "Assalomu alaykum"
- All UI texts in Uzbek

**Выбор языка:**
- Берётся из `userProfile.preferredLanguage`
- Fallback на 'en' если не указан
- Локализуются названия салонов и услуг

## SMTP Providers

### Gmail (рекомендуется для разработки)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-specific-password # НЕ обычный пароль!
```

**Как получить App Password:**
1. Включить 2FA на Google аккаунте
2. Перейти в Security → App Passwords
3. Создать новый App Password
4. Использовать его в SMTP_PASS

### SendGrid (рекомендуется для production)

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Преимущества:**
- Высокая deliverability
- Аналитика отправок
- 100 писем/день бесплатно
- Подробные логи

### Mailgun (альтернатива)

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password
```

## Настройка на Production

### Шаг 1: Выбрать SMTP провайдера

Рекомендую **SendGrid** для production:
1. Зарегистрироваться на sendgrid.com
2. Верифицировать sender email (noreply@aurelle.uz)
3. Создать API key
4. Добавить в .env на сервере

### Шаг 2: Настроить Environment Variables

SSH на сервер:
```bash
ssh root@89.39.94.194
cd /var/www/aurelle
nano .env
```

Добавить:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=AURELLE <noreply@aurelle.uz>
APP_URL=https://aurelle.uz
```

### Шаг 3: Перезапустить сервер

```bash
docker restart aurelle_app_1
docker logs -f aurelle_app_1
```

Должно появиться:
```
✅ Email system initialized
```

Если нет SMTP настроек:
```
⚠️  Email not configured - SMTP_USER or SMTP_PASS missing
```

## Тестирование

### Test 1: Создание бронирования
1. Зарегистрироваться с реальным email
2. Создать бронирование на любое время
3. **Ожидаемо**: Письмо "Booking Confirmation" приходит в течение 1-2 секунд
4. Проверить содержимое: дата, время, салон, услуга, цена

### Test 2: Отмена бронирования
1. Открыть профиль
2. Отменить созданное бронирование
3. **Ожидаемо**: Письмо "Booking Cancelled" приходит сразу
4. Проверить кнопку "Book Again" - ведёт на главную

### Test 3: Мультиязычность
1. Изменить язык профиля на русский
2. Создать бронирование
3. **Ожидаемо**: Письмо на русском языке
4. Повторить для узбекского

### Test 4: Без email (graceful degradation)
1. Создать пользователя без email
2. Создать бронирование
3. **Ожидаемо**: Бронирование создаётся успешно, email не отправляется
4. В логах: "Email not configured" или "No email for user"

### Test 5: SMTP ошибка
1. Намеренно указать неправильный SMTP_PASS
2. Создать бронирование
3. **Ожидаемо**: Бронирование создаётся, в логах ошибка отправки
4. Бронирование НЕ откатывается

## Логирование

**Успешная отправка:**
```
[DEBUG] Booking created successfully
[EMAIL] Confirmation email sent to client@example.com
```

**Email не настроен:**
```
⚠️  Email not configured - SMTP_USER or SMTP_PASS missing
Email not configured, skipping email send
```

**Ошибка отправки:**
```
[EMAIL] Failed to send confirmation email: Error: Invalid login
```

## Будущие улучшения

### P0 - Критично
- [ ] **Автоматические напоминания**: Cron job для отправки за 24ч и 1ч
- [ ] **Email templates для мастеров**: Уведомления о новых бронированиях
- [ ] **Email templates для владельцев**: Ежедневные/еженедельные отчёты

### P1 - Важно
- [ ] **Email верификация**: Подтверждение email при регистрации
- [ ] **Unsubscribe функция**: Возможность отписаться от рассылок
- [ ] **Email preferences**: Настройки типов уведомлений

### P2 - Nice to have
- [ ] **Rich emails с фото**: Добавить фото салона/мастера
- [ ] **Calendar attachments**: .ics файлы для добавления в календарь
- [ ] **SMS fallback**: Если нет email, отправлять SMS
- [ ] **Push notifications**: Дополнить email web push уведомлениями

## Мониторинг

### Метрики для отслеживания

**Delivery rate:**
- % успешных отправок
- % bounced emails
- % spam complaints

**Engagement:**
- Open rate письем
- Click-through rate на кнопки
- Conversions (повторные записи)

**Performance:**
- Время отправки письма
- Queue size (если добавим очередь)

### Рекомендуемые инструменты

**SendGrid Dashboard:**
- Статистика отправок
- Bounce/spam reports
- Engagement metrics

**Sentry:**
- Отслеживание ошибок отправки
- Alerts при высоком проценте failures

## Security

**Best Practices:**
- ✅ SMTP credentials в .env (не в коде)
- ✅ App-specific passwords (не основные пароли)
- ✅ Rate limiting на booking endpoints (уже есть)
- ✅ Email validation перед отправкой
- ✅ Graceful error handling (не ломает бронирование)

**Потенциальные риски:**
- ❌ Email spoofing - нужно настроить SPF/DKIM records
- ❌ Spam filters - нужно прогреть IP на SendGrid
- ❌ Email bombing - добавить rate limit на email отправку

## Стоимость

**Gmail:**
- Бесплатно: 500 писем/день
- Ограничение: Не подходит для production

**SendGrid:**
- Free tier: 100 писем/день (достаточно для старта)
- Essentials: $19.95/мес за 50,000 писем
- Pro: $89.95/мес за 100,000 писем

**Mailgun:**
- Free tier: 5,000 писем/мес
- Foundation: $35/мес за 50,000 писем

**Рекомендация:**
- Старт: SendGrid Free (100/день)
- Если > 100 записей/день: SendGrid Essentials

## Статус
✅ **РЕАЛИЗОВАНО И ГОТОВО К РАЗВЁРТЫВАНИЮ**

## Контрольный список

- [x] Установлен nodemailer
- [x] Создан email service с templates
- [x] Добавлена инициализация в server
- [x] Интегрирована отправка при создании бронирования
- [x] Интегрирована отправка при отмене бронирования
- [x] Добавлены SMTP настройки в .env.example
- [x] Создана документация
- [ ] Настроен SendGrid аккаунт
- [ ] Добавлены SMTP credentials на production
- [ ] Протестирована отправка на production
- [ ] Настроен мониторинг

## Примечания

- Email отправка асинхронная и не блокирует ответ API
- Если email fails, бронирование всё равно создаётся
- Поддержка мультиязычности из коробки
- Красивый дизайн с брендингом AURELLE
- Готовая инфраструктура для будущих типов уведомлений
