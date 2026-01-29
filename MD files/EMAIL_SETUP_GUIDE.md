# 📧 Email Notifications Setup Guide

## ✅ Что уже готово

### 1. Email система полностью реализована

- ✅ **Nodemailer** установлен и настроен
- ✅ **3 красивых HTML шаблона** с multi-language support (EN, RU, UZ):
  - Подтверждение бронирования (`sendBookingConfirmation`)
  - Отмена бронирования (`sendBookingCancellation`)
  - Напоминание о записи (`sendBookingReminder`)
- ✅ **Интеграция в API** - автоматически отправляются при создании/отмене записи
- ✅ **Graceful degradation** - приложение работает даже если SMTP не настроен

### 2. Файлы

- [server/email/index.ts](server/email/index.ts) - email сервис и шаблоны
- [server/index.ts:71](server/index.ts#L71) - инициализация при старте
- [server/routes/client.routes.ts:323](server/routes/client.routes.ts#L323) - отправка при бронировании

---

## 🚀 Настройка SMTP (3 варианта)

### Вариант 1: Gmail (БЕСПЛАТНО, рекомендуется для старта)

#### Шаг 1: Создать App Password

```
1. Открыть: https://myaccount.google.com/security
2. Включить двухфакторную аутентификацию (если не включена)
3. Перейти: https://myaccount.google.com/apppasswords
4. Выбрать:
   - App: Mail
   - Device: Other (Custom name) → "AURELLE Production"
5. Скопировать 16-значный пароль (пример: abcd efgh ijkl mnop)
```

#### Шаг 2: Добавить в .env

```bash
ssh root@89.39.94.194
nano /opt/aurelle/.env

# Добавить в конец файла:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
EMAIL_FROM=AURELLE <noreply@gmail.com>
APP_URL=https://aurelle.uz

# Сохранить: Ctrl+O, Enter, Ctrl+X
```

#### Шаг 3: Перезапустить приложение

```bash
cd /opt/aurelle
docker compose restart server
```

#### Шаг 4: Проверить логи

```bash
docker logs aurelle-server | grep -i email
# Ожидаем: ✅ Email system initialized
```

**Лимиты Gmail:**

- 500 писем в день
- 100 писем в час
- **Для старта достаточно, потом переключиться на SendGrid/Mailgun**

---

### Вариант 2: SendGrid (БЕСПЛАТНО 100 писем/день, затем платно)

#### Шаг 1: Создать аккаунт

```
1. Перейти: https://signup.sendgrid.com/
2. Зарегистрироваться (нужна карта даже для free tier)
3. Verify email и пройти onboarding
```

#### Шаг 2: Создать API Key

```
1. Dashboard → Settings → API Keys
2. Create API Key
3. Name: AURELLE Production
4. Permissions: Full Access (или только Mail Send)
5. Скопировать API Key (ONE TIME SHOW!)
```

#### Шаг 3: Verify sender identity

```
1. Dashboard → Settings → Sender Authentication
2. Verify a Single Sender
3. Email: noreply@aurelle.uz (или ваш Gmail)
4. From Name: AURELLE
5. Подтвердить через email
```

#### Шаг 4: Добавить в .env

```bash
ssh root@89.39.94.194
nano /opt/aurelle/.env

# Добавить:
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=<ваш API Key>
EMAIL_FROM=AURELLE <noreply@aurelle.uz>
APP_URL=https://aurelle.uz
```

#### Шаг 5: Перезапустить

```bash
cd /opt/aurelle && docker compose restart server
```

**Лимиты SendGrid:**

- Free: 100 писем/день
- Essentials ($19.95/мес): 50,000 писем/месяц
- Pro ($89.95/мес): 100,000 писем/месяц

---

### Вариант 3: Mailgun (БЕСПЛАТНО 5,000 писем/месяц первые 3 месяца)

#### Шаг 1: Создать аккаунт

```
1. Перейти: https://signup.mailgun.com/
2. Зарегистрироваться (нужна карта)
3. Verify email
```

#### Шаг 2: Получить SMTP credentials

```
1. Dashboard → Sending → Domain settings
2. Выбрать sandbox домен (mg.yoursubdomain.mailgun.org)
3. SMTP Credentials:
   - SMTP hostname: smtp.mailgun.org
   - Port: 587
   - Username: postmaster@<your-sandbox-domain>
   - Password: <показан там же>
```

#### Шаг 3: Добавить authorized recipients (для sandbox)

```
1. Sending → Domain settings → Authorized Recipients
2. Добавить тестовые email адреса (максимум 5 для sandbox)
3. Confirm через email
```

#### Шаг 4: Добавить в .env

```bash
ssh root@89.39.94.194
nano /opt/aurelle/.env

# Добавить:
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@<your-sandbox-domain>.mailgun.org
SMTP_PASS=<ваш пароль>
EMAIL_FROM=AURELLE <mailgun@<your-sandbox-domain>.mailgun.org>
APP_URL=https://aurelle.uz
```

#### Шаг 5 (опционально): Настроить свой домен

```
Для production лучше использовать aurelle.uz:
1. Dashboard → Sending → Domains → Add New Domain
2. Domain: mg.aurelle.uz
3. Добавить DNS записи (TXT, MX, CNAME) в настройки домена
4. Verify domain
5. Обновить SMTP_USER и EMAIL_FROM на mg.aurelle.uz
```

**Лимиты Mailgun:**

- Trial: 5,000 писем/месяц (3 месяца)
- Foundation ($35/мес): 50,000 писем/месяц
- Growth ($80/мес): 100,000 писем/месяц

---

## 🧪 Тестирование Email

### Тест 1: Создать тестовое бронирование

```bash
# Через curl
curl -X POST https://api.aurelle.uz/api/bookings \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "clientId": "<user-id>",
    "salonId": "<salon-id>",
    "serviceId": "<service-id>",
    "date": "2026-01-15",
    "startTime": "10:00",
    "endTime": "11:00"
  }'
```

**Или через UI:**

1. Открыть https://aurelle.uz
2. Зарегистрироваться/войти
3. Выбрать салон и услугу
4. Создать бронирование
5. **Проверить email** - должно прийти подтверждение ✅

### Тест 2: Проверить логи

```bash
# Посмотреть логи сервера
docker logs aurelle-server | grep -i "email"

# Должны увидеть:
# ✅ Email system initialized
# 📧 Email sent to user@example.com: Booking Confirmation - AURELLE
```

### Тест 3: Отменить бронирование

1. Открыть Profile → My Bookings
2. Отменить запись
3. **Проверить email** - должно прийти уведомление об отмене

---

## 🔧 Настройка напоминаний (Booking Reminders)

Email-напоминания за 24 часа до визита требуют **cron job**.

### Шаг 1: Создать скрипт напоминаний

```bash
ssh root@89.39.94.194
nano /opt/aurelle/send-reminders.sh
```

```bash
#!/bin/bash
set -euo pipefail

# Send booking reminders via API
curl -X POST http://localhost:8000/api/internal/send-reminders \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: ${INTERNAL_API_KEY}" \
  >> /var/log/aurelle-reminders.log 2>&1
```

```bash
chmod +x /opt/aurelle/send-reminders.sh
```

### Шаг 2: Создать endpoint для напоминаний

**Файл:** `server/routes/internal.routes.ts` (нужно создать)

```typescript
import { Router } from "express";
import { db } from "../db";
import { bookings, users, salons, services, masters } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { sendBookingReminder } from "../email";

const router = Router();

// Internal API key middleware
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "change-me-in-production";

function requireInternalKey(req: any, res: any, next: any) {
  const key = req.headers["x-internal-key"];
  if (key !== INTERNAL_API_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Send booking reminders (called by cron)
router.post("/send-reminders", requireInternalKey, async (req, res) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tomorrowDate = tomorrow.toISOString().split("T")[0];

    // Find all bookings for tomorrow that haven't been reminded
    const upcomingBookings = await db
      .select({
        booking: bookings,
        user: users,
        salon: salons,
        service: services,
        master: masters,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.clientId, users.id))
      .leftJoin(salons, eq(bookings.salonId, salons.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(masters, eq(bookings.masterId, masters.id))
      .where(
        and(
          eq(bookings.date, tomorrowDate),
          eq(bookings.status, "confirmed"),
          // Add reminderSent field to schema if not exists
          // eq(bookings.reminderSent, false)
        ),
      );

    let sent = 0;
    let failed = 0;

    for (const { booking, user, salon, service, master } of upcomingBookings) {
      if (!user?.email || !salon || !service) {
        failed++;
        continue;
      }

      try {
        // Calculate hours until appointment
        const appointmentTime = new Date(`${booking.date}T${booking.startTime}`);
        const hoursUntil = Math.round(
          (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60),
        );

        await sendBookingReminder(
          user.email,
          {
            clientName: user.fullName || user.username || "User",
            salonName: salon.name,
            serviceName: service.name,
            masterName: master?.name || null,
            date: booking.date,
            time: booking.startTime,
            hoursUntil,
          },
          user.preferredLanguage || "ru",
        );

        // TODO: Mark as sent in DB
        // await db.update(bookings)
        //   .set({ reminderSent: true })
        //   .where(eq(bookings.id, booking.id));

        sent++;
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error);
        failed++;
      }
    }

    return res.json({
      success: true,
      sent,
      failed,
      total: upcomingBookings.length,
    });
  } catch (error) {
    console.error("Send reminders error:", error);
    return res.status(500).json({ error: "Failed to send reminders" });
  }
});

export default router;
```

### Шаг 3: Зарегистрировать internal routes

```typescript
// server/routes.ts
import internalRoutes from "./routes/internal.routes";

// В функции registerRoutes, после health routes:
app.use("/api/internal", internalRoutes);
```

### Шаг 4: Добавить в .env

```bash
ssh root@89.39.94.194
nano /opt/aurelle/.env

# Добавить:
INTERNAL_API_KEY=<случайная строка 32+ символов>
```

### Шаг 5: Настроить cron

```bash
crontab -e

# Добавить (каждый день в 10:00 утра):
0 10 * * * INTERNAL_API_KEY="<ваш ключ>" /opt/aurelle/send-reminders.sh
```

### Шаг 6: Протестировать

```bash
# Ручной запуск
INTERNAL_API_KEY="<ваш ключ>" /opt/aurelle/send-reminders.sh

# Проверить логи
cat /var/log/aurelle-reminders.log
```

---

## 📊 Мониторинг Email

### Проверить статус email системы

```bash
curl https://api.aurelle.uz/api/health
# Можно добавить email status в health endpoint
```

### Проверить логи отправки

```bash
docker logs aurelle-server --tail 100 | grep "📧 Email sent"
```

### Добавить в Netdata (опционально)

Можно настроить Netdata для отслеживания отправленных email через log parsing.

---

## ⚠️ Важные замечания

### 1. Используйте правильный EMAIL_FROM

```bash
# Gmail
EMAIL_FROM=AURELLE <noreply@gmail.com>

# SendGrid (after verification)
EMAIL_FROM=AURELLE <noreply@aurelle.uz>

# Mailgun
EMAIL_FROM=AURELLE <mailgun@mg.aurelle.uz>
```

### 2. Тестируйте с реальными email адресами

Не используйте временные email сервисы (10minutemail, etc) - они часто блокируются SMTP провайдерами.

### 3. Проверяйте SPAM папку

Первые письма могут попадать в SPAM. Для улучшения deliverability:

- Verify sender domain (SPF, DKIM, DMARC)
- Используйте SendGrid/Mailgun вместо Gmail
- Не отправляйте слишком много писем сразу

### 4. Rate Limiting

Код уже учитывает rate limits провайдеров. Если нужно отправить много писем:

- Используйте очередь (Bull/BullMQ с Redis)
- Батчинг по 10-50 писем
- Delay между батчами

---

## 🎯 Критерии готовности

- ✅ SMTP credentials добавлены в production .env
- ✅ `docker logs aurelle-server` показывает "✅ Email system initialized"
- ✅ Тестовое бронирование отправило email
- ✅ Email не в SPAM
- ✅ Отмена бронирования отправила email
- ✅ (Опционально) Cron job для напоминаний настроен

---

## 🆘 Troubleshooting

### Email не отправляется

```bash
# 1. Проверить логи
docker logs aurelle-server | grep -i email

# 2. Проверить .env
docker exec aurelle-server sh -c 'echo $SMTP_USER'

# 3. Проверить что SMTP credentials правильные
# Тест через curl:
curl -v --url 'smtps://smtp.gmail.com:465' \
  --user 'your-email@gmail.com:your-app-password' \
  --mail-from 'your-email@gmail.com' \
  --mail-rcpt 'test@example.com' \
  --upload-file - <<EOF
From: Test <your-email@gmail.com>
To: Test <test@example.com>
Subject: Test

Test email body
EOF
```

### Gmail "Less secure app access"

Gmail больше НЕ поддерживает "less secure apps". Используйте **App Passwords** (см. Вариант 1).

### SendGrid "Sender Identity not verified"

1. Dashboard → Settings → Sender Authentication
2. Verify email через Single Sender Verification
3. Или настроить Domain Authentication (SPF/DKIM)

### Email в SPAM

1. Настроить SPF/DKIM/DMARC для домена
2. Использовать dedicated IP (платная опция у SendGrid/Mailgun)
3. Прогреть IP (начать с малого количества писем)
4. Не использовать спамерские слова в subject

---

## 📝 Следующие шаги

После настройки email:

1. ✅ Протестировать booking confirmation
2. ✅ Протестировать booking cancellation
3. ⏳ Создать internal API endpoint для reminders
4. ⏳ Настроить cron для ежедневных напоминаний
5. ⏳ Добавить поле `reminderSent` в bookings таблицу (migration)
6. ⏳ Настроить мониторинг email deliverability

---

## 🔗 Полезные ссылки

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid SMTP](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- [Mailgun SMTP](https://documentation.mailgun.com/en/latest/user_manual.html#sending-via-smtp)
- [Email Deliverability Best Practices](https://www.validity.com/everest/email-deliverability-best-practices/)
