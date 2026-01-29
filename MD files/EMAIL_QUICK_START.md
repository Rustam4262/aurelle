# 📧 Email Notifications - Quick Start

## ✅ Статус

- ✅ **Email система реализована** - 3 HTML шаблона готовы
- ✅ **Nodemailer настроен** - автоматическая отправка при бронировании
- ✅ **SMTP переменные добавлены** в production .env
- ⏳ **Нужно получить SMTP credentials** и протестировать

---

## 🚀 Быстрый старт (5 минут)

### Вариант 1: Gmail (самый простой)

#### 1. Создать App Password

```
1. Открыть: https://myaccount.google.com/apppasswords
2. Выбрать: Mail → Other (Custom name) → "AURELLE"
3. Скопировать 16-значный пароль (например: abcd efgh ijkl mnop)
```

#### 2. Обновить .env на сервере

```bash
ssh root@89.39.94.194
nano /opt/aurelle/.env

# Найти и заменить:
SMTP_USER=your-email@gmail.com          # → ваш Gmail
SMTP_PASS=your-app-password-here        # → App Password из шага 1
EMAIL_FROM=AURELLE <noreply@gmail.com>  # → ваш Gmail

# Сохранить: Ctrl+O, Enter, Ctrl+X
```

#### 3. Перезапустить сервер

```bash
cd /opt/aurelle
docker compose restart server
```

#### 4. Проверить инициализацию

```bash
docker logs aurelle-server | grep -i email
# Должно показать: ✅ Email system initialized
```

#### 5. Протестировать

```
1. Открыть https://aurelle.uz
2. Войти/зарегистрироваться
3. Создать бронирование
4. Проверить email - должно прийти красивое письмо ✨
```

**Готово!** Email работает.

---

## 📋 Что дальше

После успешного теста:

### 1. Настроить напоминания (опционально)

Email-напоминания за 24 часа до визита требуют cron job.

**Файлы для создания:**

- `server/routes/internal.routes.ts` - endpoint для отправки напоминаний
- `/opt/aurelle/send-reminders.sh` - скрипт для cron

**Подробности:** См. [EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md#настройка-напоминаний-booking-reminders)

### 2. Перейти на SendGrid/Mailgun (для production)

Gmail имеет лимит 500 писем/день. Для production лучше:

- **SendGrid**: 100 писем/день бесплатно
- **Mailgun**: 5,000 писем/месяц (первые 3 месяца)

**Подробности:** См. [EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md#вариант-2-sendgrid)

### 3. Настроить домен (для deliverability)

Для лучшей доставляемости настроить:

- SPF запись
- DKIM подпись
- DMARC policy

SendGrid и Mailgun делают это автоматически при верификации домена.

---

## 🎯 Критерии успеха

- ✅ `docker logs aurelle-server` показывает "✅ Email system initialized"
- ✅ Создание бронирования → Email приходит
- ✅ Email не в SPAM
- ✅ Отмена бронирования → Email приходит
- ✅ Красивый HTML дизайн с градиентами
- ✅ Multi-language (EN, RU, UZ) работает

---

## 🆘 Troubleshooting

### Email не приходит

```bash
# 1. Проверить логи
docker logs aurelle-server | grep -i email

# 2. Проверить что .env обновился
docker exec aurelle-server sh -c 'echo $SMTP_USER'

# 3. Перезапустить если нужно
docker compose restart server
```

### "Email not configured" в логах

Значит `SMTP_USER` или `SMTP_PASS` не установлены. Проверить .env.

### Gmail "Authentication failed"

- Убедитесь что используете **App Password**, а не обычный пароль
- Проверьте что двухфакторная аутентификация включена
- App Password должен быть без пробелов: `abcdefghijklmnop`

### Email в SPAM

- Нормально для первых писем
- Попросите пользователей добавить в "Not Spam"
- Для production используйте SendGrid/Mailgun с verified domain

---

## 📊 Текущие шаблоны

### 1. Booking Confirmation (подтверждение записи)

- Градиент: Purple → Pink
- Детали: Салон, Услуга, Мастер, Дата, Время, Цена
- Кнопка: "View Booking" → `https://aurelle.uz/profile`

### 2. Booking Cancellation (отмена записи)

- Градиент: Pink → Orange
- Детали: Салон, Услуга, Дата, Время
- Кнопка: "Book Again" → `https://aurelle.uz`

### 3. Booking Reminder (напоминание)

- Градиент: Pink → Yellow
- Показывает "через X часов"
- Детали: Салон, Услуга, Мастер, Дата, Время
- 2 кнопки: "View Booking" + "Need to cancel?"

**Все шаблоны:**

- Responsive design
- Dark mode friendly
- Multi-language (EN, RU, UZ)
- Красивые градиенты и иконки

---

## 📁 Файлы

- [server/email/index.ts](server/email/index.ts) - Email сервис и шаблоны
- [EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md) - Полная документация
- [.env.example](.env.example) - Пример конфигурации

---

## 🔗 Ссылки

- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid Signup](https://signup.sendgrid.com/)
- [Mailgun Signup](https://signup.mailgun.com/)
- [Nodemailer Docs](https://nodemailer.com/)
