# Sentry Error Monitoring Setup Guide

## Что такое Sentry?

Sentry - это платформа для мониторинга ошибок и производительности приложения в реальном времени.

**Преимущества:**
- ⚡ Мгновенное уведомление о критических ошибках
- 🔍 Детальный stack trace и контекст ошибки
- 📊 Дашборды и аналитика
- 👥 Контекст пользователя (кто столкнулся с ошибкой)
- 🎯 Breadcrumbs (последовательность действий до ошибки)
- 🚀 Performance Monitoring
- 📈 Release tracking

---

## Быстрый старт

### 1. Создание аккаунта Sentry

1. Зайдите на [https://sentry.io/](https://sentry.io/)
2. Создайте бесплатный аккаунт (до 5,000 ошибок/месяц бесплатно)
3. Создайте новый проект:
   - Platform: **Python**
   - Name: `beauty-salon-backend`
   - Team: Выберите или создайте

### 2. Получение DSN

После создания проекта:

1. Перейдите в **Settings** → **Projects** → **beauty-salon-backend**
2. Выберите **Client Keys (DSN)**
3. Скопируйте **DSN** (выглядит как: `https://xxxxx@sentry.io/xxxxxx`)

### 3. Конфигурация приложения

Добавьте DSN в `.env`:

```env
# Production
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.2
SENTRY_PROFILES_SAMPLE_RATE=0.2

# Development (не обязательно)
# SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
# SENTRY_ENVIRONMENT=development
# SENTRY_TRACES_SAMPLE_RATE=1.0
# SENTRY_PROFILES_SAMPLE_RATE=1.0
```

### 4. Установка зависимостей

```bash
pip install sentry-sdk==1.40.0
```

### 5. Проверка работы

Запустите приложение:

```bash
uvicorn app.main:app --reload
```

В логах должно появиться:
```
INFO: Sentry initialized for environment: development
```

---

## Тестирование интеграции

### Тест 1: Ручная отправка ошибки

Добавьте временный endpoint в `main.py`:

```python
@app.get("/sentry-test")
def sentry_test():
    """Тестовый endpoint для проверки Sentry"""
    from app.core.sentry import capture_message

    capture_message("Sentry test message", level="info")

    # Симуляция ошибки
    try:
        1 / 0
    except Exception as e:
        from app.core.sentry import capture_exception
        capture_exception(e, {"test": "value"})

    return {"status": "Check Sentry dashboard"}
```

Откройте: `http://localhost:8000/sentry-test`

Проверьте Sentry dashboard - там должны появиться 2 события.

### Тест 2: Автоматический захват ошибки

Добавьте endpoint с ошибкой:

```python
@app.get("/crash")
def crash():
    """Endpoint с ошибкой для теста автозахвата"""
    raise ValueError("Test error - this should appear in Sentry!")
```

Откройте: `http://localhost:8000/crash`

В Sentry должна появиться ошибка со stack trace.

---

## Использование в коде

### 1. Автоматический захват исключений

Sentry автоматически захватывает все необработанные исключения:

```python
@router.post("/bookings")
def create_booking(booking: BookingCreate, db: Session = Depends(get_db)):
    # Если здесь произойдет ошибка, Sentry автоматически её захватит
    result = db.query(Booking).filter(...).first()
    return result
```

### 2. Ручная отправка ошибок

Для важных операций используйте ручной захват:

```python
from app.core.sentry import capture_exception

try:
    process_payment(booking_id)
except PaymentError as e:
    # Отправить в Sentry с контекстом
    capture_exception(e, {
        "booking_id": booking_id,
        "amount": booking.total_amount,
        "payment_method": "payme"
    })
    raise HTTPException(500, "Payment processing failed")
```

### 3. Отправка предупреждений

Для подозрительных ситуаций:

```python
from app.core.sentry import capture_message

# Подозрительно большая сумма
if amount > 10000000:
    capture_message(
        f"Suspicious payment amount: {amount}",
        level="warning",
        context={"user_id": user.id, "amount": amount}
    )
```

### 4. Добавление контекста пользователя

В защищенных endpoints:

```python
from app.core.sentry import set_user_context

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    # Все ошибки в этом запросе будут привязаны к пользователю
    set_user_context(
        user_id=current_user.id,
        email=current_user.email,
        username=current_user.name
    )

    # ... rest of code
```

### 5. Breadcrumbs (следы действий)

Для отслеживания последовательности:

```python
from app.core.sentry import add_breadcrumb

@router.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    add_breadcrumb(
        message="User initiated booking cancellation",
        category="booking",
        level="info",
        data={"booking_id": booking_id}
    )

    booking = db.query(Booking).get(booking_id)

    add_breadcrumb(
        message="Booking found, checking cancellation policy",
        category="booking",
        level="info",
        data={"status": booking.status}
    )

    # Если здесь произойдет ошибка, в Sentry будут видны все breadcrumbs
    booking.cancel()
```

---

## Настройка алертов

### Email уведомления

1. В Sentry перейдите в **Alerts** → **Create Alert**
2. Выберите **Issues**
3. Настройте условия:
   - When: `A new issue is created`
   - Filter: `error.type equals "PaymentError"` (пример)
4. Action: `Send an email to...`

### Slack интеграция

1. **Settings** → **Integrations** → **Slack**
2. Connect workspace
3. Настройте канал для уведомлений
4. Создайте алерты с действием "Send to Slack"

### Критические алерты

Настройте отдельные алерты для:
- 💳 Ошибки платежей
- 🔐 Ошибки аутентификации
- 💾 Ошибки базы данных
- 🚨 Все 500 ошибки

---

## Production настройки

### Оптимизация Sample Rates

Для production используйте низкие sample rates:

```env
# Отслеживать только 20% транзакций (экономия квоты)
SENTRY_TRACES_SAMPLE_RATE=0.2
SENTRY_PROFILES_SAMPLE_RATE=0.2
```

### Release Tracking

Добавьте версию релиза в `app/core/sentry.py`:

```python
sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.SENTRY_ENVIRONMENT,
    release="beauty-salon@1.0.0",  # Добавьте версию
    # ...
)
```

### Фильтрация чувствительных данных

Sentry автоматически фильтрует:
- Пароли
- Токены
- API ключи
- Секретные ключи
- Данные карт

Реализовано в `app/core/sentry.py` функцией `before_send()`.

---

## Мониторинг производительности

### Performance Monitoring

Включено автоматически для FastAPI endpoints.

В Sentry → **Performance** вы увидите:
- Самые медленные endpoints
- Database queries
- Время ответа по процентилям (p50, p95, p99)

### Профилирование

Sentry автоматически профилирует код и показывает:
- Какие функции тратят больше всего времени
- CPU usage
- Memory usage

Включается через `SENTRY_PROFILES_SAMPLE_RATE`.

---

## Dashboard и отчеты

### Основные метрики

В Sentry Dashboard отслеживайте:

1. **Error Rate** - процент запросов с ошибками
2. **Crash-Free Sessions** - процент сессий без крашей
3. **Response Time** - среднее время ответа
4. **Top Errors** - самые частые ошибки

### Custom Dashboard

Создайте кастомный dashboard:

1. **Dashboards** → **Create Dashboard**
2. Добавьте виджеты:
   - Error rate по endpoints
   - Response time по операциям
   - Ошибки платежей
   - Ошибки бронирования

---

## Troubleshooting

### Sentry не захватывает ошибки

**Проблема**: Ошибки не попадают в Sentry

**Решения**:
1. Проверьте DSN в `.env`
2. Проверьте логи: `Sentry initialized for environment: ...`
3. Убедитесь что `SENTRY_DSN` не пустой
4. Проверьте quota в Sentry (возможно исчерпана)

### Слишком много ошибок

**Проблема**: Sentry quota исчерпана

**Решения**:
1. Снизьте sample rates (0.1-0.5)
2. Добавьте фильтры в `before_send()`
3. Используйте `ignore_errors` для известных ошибок
4. Обновите план Sentry

### Медленная работа приложения

**Проблема**: Sentry замедляет приложение

**Решения**:
1. Снизьте `SENTRY_TRACES_SAMPLE_RATE`
2. Снизьте `SENTRY_PROFILES_SAMPLE_RATE`
3. Отключите профилирование в production
4. Используйте async транспорт (по умолчанию)

---

## Best Practices

### ✅ DO

- ✅ Используйте Sentry в production
- ✅ Настройте алерты для критических ошибок
- ✅ Добавляйте контекст к ошибкам
- ✅ Используйте breadcrumbs для сложных операций
- ✅ Настройте Release Tracking
- ✅ Регулярно проверяйте dashboard

### ❌ DON'T

- ❌ Не отправляйте ошибки валидации (400-ые)
- ❌ Не логируйте чувствительные данные
- ❌ Не используйте 100% sample rate в production
- ❌ Не игнорируйте алерты
- ❌ Не забывайте обновлять версию релиза

---

## Стоимость

### Free Tier
- 5,000 ошибок/месяц
- 10,000 performance units/месяц
- 1 пользователь
- **Достаточно для старта!**

### Team ($26/месяц)
- 50,000 ошибок/месяц
- 100,000 performance units/месяц
- До 50 пользователей

### Business ($80/месяц)
- 100,000 ошибок/месяц
- 300,000 performance units/месяц
- Неограниченно пользователей
- SLA 99.9%

---

## Альтернативы

Если Sentry не подходит:

- **Rollbar** - похож на Sentry
- **Bugsnag** - проще интерфейс
- **Raygun** - фокус на Real User Monitoring
- **Self-hosted Sentry** - бесплатно, но нужен сервер

---

## Поддержка

- 📖 Документация: [https://docs.sentry.io/platforms/python/fastapi/](https://docs.sentry.io/platforms/python/fastapi/)
- 💬 Discord: [https://discord.gg/sentry](https://discord.gg/sentry)
- 🐛 Issues: [https://github.com/getsentry/sentry-python](https://github.com/getsentry/sentry-python)

---

## Заключение

Sentry - критически важный инструмент для production приложения.

**Минимальная настройка:**
1. Создайте аккаунт Sentry
2. Получите DSN
3. Добавьте в `.env`
4. Настройте алерты

**Время настройки:** ~15 минут
**Ценность:** Бесценно! 🎯
