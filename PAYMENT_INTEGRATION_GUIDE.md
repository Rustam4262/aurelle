# 💳 Руководство по интеграции платежных систем
## AURELLE - Beauty Salon Marketplace

---

## 📋 Обзор

Проект поддерживает следующие платежные системы:
1. **Payme** (Узбекистан) ✅ Полностью интегрирован
2. **Click** (Узбекистан) ✅ Полностью интегрирован
3. **Uzum** (Узбекистан) ⏳ Базовая структура готова
4. **Cash** (Наличные в салоне) ✅ Готово
5. **Card** (Карта в салоне) ✅ Готово

---

## 🔐 PAYME - Интеграция

### Шаг 1: Регистрация

1. Перейдите на https://business.paycom.uz/
2. Зарегистрируйтесь как мерчант
3. Заполните документы (ИНН, договор)
4. Получите доступ к личному кабинету

### Шаг 2: Получение credentials

В личном кабинете Payme:
1. Перейдите в раздел "Настройки" → "API"
2. Скопируйте:
   - **Merchant ID** (например: `5f7d1d0f1d2e3c0001a12345`)
   - **Secret Key** (например: `?CY8Bl1pG&6fW7jv`)

### Шаг 3: Настройка в проекте

Добавьте в `.env`:
```env
PAYME_MERCHANT_ID=your_merchant_id_here
PAYME_SECRET_KEY=your_secret_key_here
PAYME_ENDPOINT=https://checkout.paycom.uz
```

### Шаг 4: Настройка Webhook

В личном кабинете Payme укажите Webhook URL:
```
https://api.aurelle.uz/api/payments/payme/callback
```

**Формат:** POST запросы в формате JSON-RPC 2.0

### Шаг 5: Тестирование

**Test Credentials** (для разработки):
- Merchant ID: `5f8b6c4a2b1e3d0001a12345` (пример)
- Test endpoint: `https://test.paycom.uz`

**Тестовые карты:**
```
Номер: 8600 0001 0000 0001
Срок: 03/99
SMS код: 666666
```

### Методы Payme:

1. **CheckPerformTransaction** - Проверка возможности оплаты
2. **CreateTransaction** - Создание транзакции
3. **PerformTransaction** - Выполнение транзакции
4. **CancelTransaction** - Отмена транзакции
5. **CheckTransaction** - Проверка статуса

Все методы уже реализованы в `backend/app/api/payments.py`

---

## 🔵 CLICK - Интеграция

### Шаг 1: Регистрация

1. Перейдите на https://my.click.uz/
2. Зарегистрируйтесь как мерчант
3. Подайте заявку на подключение
4. Дождитесь одобрения (обычно 1-3 дня)

### Шаг 2: Получение credentials

После одобрения вы получите:
- **Merchant ID** (Service ID)
- **Secret Key** для подписи запросов

### Шаг 3: Настройка в проекте

Добавьте в `.env`:
```env
CLICK_MERCHANT_ID=your_merchant_id
CLICK_SERVICE_ID=your_service_id
CLICK_SECRET_KEY=your_secret_key
```

### Шаг 4: Настройка Webhook

В личном кабинете Click укажите:

**Prepare URL:**
```
https://api.aurelle.uz/api/payments/click/callback
```

**Complete URL:**
```
https://api.aurelle.uz/api/payments/click/callback
```

### Шаг 5: Тестирование

**Test Credentials:**
- Service ID: `12345` (получите у менеджера)
- Test mode: Доступен в личном кабинете

**Тестовые карты:**
```
Карта: 8600 0001 0000 0001
Срок: 03/99
```

### Методы Click:

1. **Prepare** (action=0) - Подготовка платежа
2. **Complete** (action=1) - Завершение платежа

Оба метода реализованы в `backend/app/api/payments.py`

---

## 🟢 UZUM - Интеграция (Опционально)

### Статус: Базовая структура готова

Для полной интеграции:

1. Регистрация на https://uzum.uz/business/
2. Получение API ключей
3. Реализация методов в `backend/app/api/payments.py`:
   - `uzum_init_payment()`
   - `uzum_callback()`

### Примерная структура:

```python
@router.post("/uzum/init")
async def uzum_init_payment(request: UzumPaymentRequest):
    # Инициализация платежа
    # Возврат payment_url для редиректа
    pass

@router.post("/uzum/callback")
async def uzum_callback(request: UzumCallbackRequest):
    # Обработка callback от Uzum
    pass
```

---

## 💰 Комиссии платформы

Настраиваются автоматически в `backend/app/api/payments.py`:

```python
commission_rates = {
    PaymentMethod.PAYME: 0.02,  # 2%
    PaymentMethod.CLICK: 0.02,  # 2%
    PaymentMethod.UZUM: 0.025,  # 2.5%
    PaymentMethod.CASH: 0.0,    # 0%
    PaymentMethod.CARD: 0.015,  # 1.5%
}
```

Можно изменить по необходимости.

---

## 🔄 Процесс оплаты

### Схема работы:

```
1. Клиент создает бронирование
   ↓
2. Выбирает способ оплаты
   ↓
3. Frontend → POST /api/payments/create
   ↓
4. Backend создает Payment (status=PENDING)
   ↓
5. Клиент перенаправляется на платежную систему
   ↓
6. Платежная система → Webhook → /api/payments/{payme|click}/callback
   ↓
7. Backend обновляет Payment (status=COMPLETED)
   ↓
8. Booking.status → CONFIRMED
   ↓
9. Отправка уведомления клиенту
```

### API Endpoints:

```
POST   /api/payments/create              - Создать платеж
GET    /api/payments/{id}                - Получить статус
GET    /api/payments/booking/{id}        - Платежи по бронированию
POST   /api/payments/{id}/refund         - Возврат средств
POST   /api/payments/payme/callback      - Payme webhook
POST   /api/payments/click/callback      - Click webhook
```

---

## 🧪 Тестирование

### 1. Локальное тестирование

```bash
# Запустить проект
docker-compose up

# Создать тестовый платеж
curl -X POST http://localhost:8000/api/payments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "booking_id": 1,
    "amount": 100000,
    "payment_method": "payme",
    "currency": "UZS"
  }'
```

### 2. Тестирование webhook

Для локального тестирования webhook используйте **ngrok**:

```bash
# Установите ngrok
brew install ngrok  # MacOS
# или скачайте с https://ngrok.com/

# Запустите туннель
ngrok http 8000

# Используйте полученный URL в настройках Payme/Click
https://abc123.ngrok.io/api/payments/payme/callback
```

### 3. Проверка webhook вручную

**Payme CreateTransaction:**
```bash
curl -X POST https://api.aurelle.uz/api/payments/payme/callback \
  -H "Content-Type: application/json" \
  -d '{
    "method": "CreateTransaction",
    "params": {
      "id": "transaction_id",
      "time": 1234567890000,
      "amount": 10000000,
      "account": {"booking_id": 1}
    }
  }'
```

**Click Prepare:**
```bash
curl -X POST https://api.aurelle.uz/api/payments/click/callback \
  -H "Content-Type: application/json" \
  -d '{
    "click_trans_id": "123456",
    "merchant_trans_id": "1",
    "amount": 100000,
    "action": 0,
    "error": 0,
    "error_note": "",
    "sign_time": "2024-01-01 12:00:00",
    "sign_string": "test"
  }'
```

---

## 🐛 Troubleshooting

### Проблема: Webhook не вызывается

**Решение:**
1. Проверьте, что URL доступен публично
2. Проверьте SSL сертификат (должен быть валидный)
3. Проверьте логи: `docker-compose logs backend | grep payment`
4. Используйте ngrok для локального тестирования

### Проблема: Ошибка подписи

**Решение:**
1. Проверьте правильность SECRET_KEY
2. Проверьте формат подписи (MD5/SHA256)
3. Логируйте входящие данные для отладки

### Проблема: Транзакция не обновляется

**Решение:**
1. Проверьте статусы в БД: `SELECT * FROM payments;`
2. Проверьте логи webhook: `docker-compose logs backend`
3. Проверьте что ID бронирования существует

---

## 📊 Мониторинг

### Просмотр всех платежей:

```sql
SELECT
    p.id,
    p.booking_id,
    p.amount,
    p.payment_method,
    p.status,
    p.created_at
FROM payments p
ORDER BY p.created_at DESC
LIMIT 20;
```

### Статистика платежей:

```sql
SELECT
    payment_method,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM payments
GROUP BY payment_method, status;
```

### Dashboard метрики:

- Total payments today
- Success rate
- Average amount
- Failed payments (для расследования)

---

## 🔒 Безопасность

### Важно:

1. **НИКОГДА** не коммитьте `.env` в git
2. **ВСЕГДА** используйте HTTPS в production
3. **ПРОВЕРЯЙТЕ** подписи webhook запросов
4. **ЛОГИРУЙТЕ** все платежные операции
5. **ОГРАНИЧИВАЙТЕ** IP для webhook (опционально)

### Проверка подписи Payme:

```python
def verify_payme_signature(request_data: dict) -> bool:
    # TODO: Реализовать проверку
    # 1. Получить signature из headers
    # 2. Вычислить ожидаемую подпись
    # 3. Сравнить
    return True
```

### Проверка подписи Click:

```python
def verify_click_signature(request: ClickRequest) -> bool:
    # sign_string = MD5(click_trans_id + service_id +
    #                  secret_key + merchant_trans_id +
    #                  amount + action + sign_time)
    # TODO: Реализовать
    return True
```

---

## 📞 Поддержка

### Payme:
- Телефон: +998 71 200 05 00
- Email: info@paycom.uz
- Telegram: @payme_support

### Click:
- Телефон: +998 71 202 22 22
- Email: support@click.uz
- Telegram: @click_support

### Наша документация:
- API Docs: https://api.aurelle.uz/docs
- Backend: `backend/app/api/payments.py`
- Frontend: `frontend/src/api/payments.ts`

---

## ✅ Чеклист интеграции

### Payme:
- [ ] Зарегистрирован merchant account
- [ ] Получены Merchant ID и Secret Key
- [ ] Добавлены в .env
- [ ] Настроен webhook URL
- [ ] Протестирован весь flow
- [ ] Проверен refund процесс

### Click:
- [ ] Зарегистрирован merchant account
- [ ] Получены Service ID и Secret Key
- [ ] Добавлены в .env
- [ ] Настроены Prepare и Complete URLs
- [ ] Протестирован весь flow
- [ ] Проверен error handling

### Production:
- [ ] SSL сертификат установлен
- [ ] Webhook URLs публично доступны
- [ ] Логирование настроено
- [ ] Monitoring настроен
- [ ] Backup payments table настроен

---

**Последнее обновление:** 2025-12-01
**Версия:** 1.0.0
