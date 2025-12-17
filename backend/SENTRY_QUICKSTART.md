# Sentry - Быстрый старт (5 минут)

## Шаг 1: Регистрация в Sentry

1. Откройте: **https://sentry.io/signup/**
2. Зарегистрируйтесь (через GitHub/Google или email)
3. Создайте организацию (например, "aurelle")

## Шаг 2: Создание проекта

1. Нажмите **"Create Project"**
2. Выберите платформу: **Python** → **FastAPI**
3. Настройки:
   - **Alert frequency:** Default
   - **Project name:** `beauty-salon-backend`
   - **Team:** #backend (или создайте новую)
4. Нажмите **"Create Project"**

## Шаг 3: Получение DSN

После создания проекта Sentry покажет код инициализации с вашим DSN:

```python
sentry_sdk.init(
    dsn="https://YOUR_KEY@o0.ingest.us.sentry.io/YOUR_PROJECT_ID",
    ...
)
```

**Скопируйте только DSN** (строка начинается с `https://`)

Или получите DSN вручную:
- Settings → Projects → beauty-salon-backend → Client Keys (DSN)

## Шаг 4: Настройка проекта

### 4.1 Установите зависимости:

```bash
cd backend
pip install -r requirements.txt
```

### 4.2 Создайте файл .env:

```bash
copy .env.example .env
```

### 4.3 Добавьте DSN в .env:

Откройте `backend/.env` и замените:

```env
# До
SENTRY_DSN=

# После
SENTRY_DSN=https://YOUR_KEY@o0.ingest.us.sentry.io/YOUR_PROJECT_ID
```

## Шаг 5: Запуск и тестирование

### 5.1 Запустите сервер:

```bash
uvicorn app.main:app --reload
```

### 5.2 Проверьте логи:

В консоли должно появиться:
```
INFO: Sentry initialized for environment: development
```

### 5.3 Протестируйте интеграцию:

Откройте в браузере:
```
http://localhost:8000/sentry-debug
```

Вы увидите ошибку 500 - это нормально!

### 5.4 Проверьте Sentry Dashboard:

1. Откройте: **https://sentry.io/**
2. Перейдите в проект **beauty-salon-backend**
3. Во вкладке **Issues** должна появиться ошибка:
   - **ZeroDivisionError**: division by zero
4. Во вкладке **Performance** должна появиться транзакция:
   - **GET /sentry-debug**

**Если видите ошибку и транзакцию - всё работает!** ✅

## Шаг 6: Настройка алертов (опционально)

1. Перейдите: **Alerts** → **Create Alert**
2. Выберите: **Issues**
3. Настройте:
   - **When:** "A new issue is created"
   - **If:** "The issue's level is equal to error"
4. **Then:** "Send an email to..." (ваш email)
5. **Save Rule**

Теперь вы будете получать email при каждой новой ошибке!

---

## 🎯 Готово!

Sentry настроен и работает. Теперь все ошибки будут автоматически отслеживаться.

### Что дальше?

- 📖 Полная документация: [SENTRY_SETUP.md](SENTRY_SETUP.md)
- 🌐 Sentry Dashboard: https://sentry.io/
- 📚 Официальная документация: https://docs.sentry.io/platforms/python/fastapi/

---

## ⚙️ Production настройки

Для production обновите `.env`:

```env
SENTRY_DSN=https://YOUR_KEY@o0.ingest.us.sentry.io/YOUR_PROJECT_ID
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.2    # Снизить до 20%
SENTRY_PROFILES_SAMPLE_RATE=0.2   # Снизить до 20%
```

Это сэкономит квоту Sentry в production.

---

## 🔥 Использование в коде

### Автоматический захват ошибок:

```python
@router.post("/bookings")
def create_booking(booking: BookingCreate):
    # Если здесь произойдет ошибка, Sentry автоматически её захватит
    return process_booking(booking)
```

### Ручная отправка ошибок:

```python
from app.core.sentry import capture_exception

try:
    process_payment(booking_id)
except PaymentError as e:
    capture_exception(e, {
        "booking_id": booking_id,
        "amount": booking.total_amount
    })
    raise HTTPException(500, "Payment failed")
```

### Добавление контекста пользователя:

```python
from app.core.sentry import set_user_context

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    set_user_context(
        user_id=current_user.id,
        email=current_user.email,
        username=current_user.name
    )
    # Все ошибки будут привязаны к этому пользователю
    return current_user
```

---

**Время настройки:** 5 минут
**Ценность:** Бесценно! 🎉
