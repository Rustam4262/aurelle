# 🚀 Final Deployment Guide - Beauty Salon Marketplace

**Дата**: 2025-12-11
**Версия**: 2.0 (с критическими обновлениями безопасности)
**Статус**: ✅ Ready for Production (after legal setup)

---

## 📊 Текущий статус проекта

### ✅ Выполнено (100% критических задач P0)

1. **Payment Signature Verification** - ✅ DONE
2. **Refresh Token Rotation** - ✅ DONE
3. **Rate Limiting & Security Hardening** - ✅ DONE
4. **Idempotency Keys** - ✅ DONE
5. **Legal Document Templates** - ✅ DONE
6. **User Consent Tracking System** - ✅ DONE

### ⏳ Требуется перед запуском

- Legal compliance (2-3 недели с юристом)
- Настройка платежных ключей (1-2 дня)
- Обновление frontend (2-3 дня)

---

## 1. Database Migrations

### Применить все новые миграции:

```bash
cd backend

# Проверить текущую версию
alembic current

# Применить все миграции
alembic upgrade head

# Должны быть применены:
# - a46466e74e99: add_refresh_tokens_table
# - dff6a3944beb: add_idempotency_keys_table
# - 8d4a0b54d2e0: add_user_consents_tables
```

### Проверка успешного применения:

```sql
-- Подключиться к БД
psql -U beauty_user -d beauty_salon_db

-- Проверить наличие таблиц
\dt

-- Должны быть:
-- refresh_tokens
-- idempotency_keys
-- user_consents
-- consent_history
```

---

## 2. Environment Variables (.env)

Обновите `backend/.env` следующими переменными:

```bash
# ==========================================
# ОСНОВНЫЕ НАСТРОЙКИ
# ==========================================

# Database
DATABASE_URL=postgresql://beauty_user:beauty_pass@postgres:5432/beauty_salon_db

# JWT Security
SECRET_KEY=<GENERATE_32+_CHARACTERS>  # Используйте: openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_URL=redis://redis:6379/0

# Environment
ENVIRONMENT=production  # ← ВАЖНО! Активирует проверки безопасности

# ==========================================
# ПЛАТЕЖНЫЕ СИСТЕМЫ (КРИТИЧНО!)
# ==========================================

# Payme
PAYME_MERCHANT_ID=<ваш_merchant_id>
PAYME_SECRET_KEY=<ваш_secret_key>

# Click
CLICK_SERVICE_ID=<ваш_service_id>
CLICK_SECRET_KEY=<ваш_secret_key>

# Uzum
UZUM_MERCHANT_ID=<ваш_merchant_id>
UZUM_SECRET_KEY=<ваш_secret_key>

# ==========================================
# SECURITY & RATE LIMITING
# ==========================================

RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60

# CORS (укажите ваши домены)
CORS_ORIGINS=https://yourdomain.uz,https://www.yourdomain.uz

# ==========================================
# EXTERNAL SERVICES
# ==========================================

# Yandex Maps
YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0

# Logging
LOG_LEVEL=INFO

# ==========================================
# ДОКУМЕНТЫ (для consent tracking)
# ==========================================

# Версии юридических документов
TERMS_OF_SERVICE_VERSION=1.0
PRIVACY_POLICY_VERSION=1.0
TOS_EFFECTIVE_DATE=2025-12-15
PRIVACY_EFFECTIVE_DATE=2025-12-15

# URLs документов
TERMS_OF_SERVICE_URL=https://yourdomain.uz/terms
PRIVACY_POLICY_URL=https://yourdomain.uz/privacy
```

### Генерация SECRET_KEY:

```bash
# Метод 1: OpenSSL
openssl rand -hex 32

# Метод 2: Python
python -c "import secrets; print(secrets.token_hex(32))"

# Метод 3: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Получение ключей платежных систем

### 3.1. Payme

1. Зарегистрируйтесь на [https://developer.help.paycom.uz/](https://developer.help.paycom.uz/)
2. Создайте мерчанта
3. Получите:
   - `PAYME_MERCHANT_ID`
   - `PAYME_SECRET_KEY`

**Важно**: Установите webhook URL:
```
https://yourdomain.uz/api/payments/payme/callback
```

### 3.2. Click

1. Обратитесь в Click: [https://click.uz/for-business](https://click.uz/for-business)
2. Заключите договор
3. Получите:
   - `CLICK_SERVICE_ID`
   - `CLICK_SECRET_KEY`

**Важно**: Установите callback URL:
```
https://yourdomain.uz/api/payments/click/callback
```

### 3.3. Uzum

1. Зарегистрируйтесь на [https://pay.uzum.uz/business](https://pay.uzum.uz/business)
2. Пройдите верификацию
3. Получите:
   - `UZUM_MERCHANT_ID`
   - `UZUM_SECRET_KEY`

**Важно**: Установите webhook URL:
```
https://yourdomain.uz/api/payments/uzum/callback
```

---

## 4. Legal Compliance (обязательно!)

### 4.1. Документы для заполнения

1. **TERMS_OF_SERVICE_TEMPLATE.md**
   - Заполните все поля [...]
   - Укажите реквизиты компании
   - Установите размер комиссии
   - Определите политику возвратов

2. **PRIVACY_POLICY_TEMPLATE.md**
   - Заполните контакты DPO
   - Укажите реквизиты оператора ПД
   - Опишите процессоры данных

### 4.2. Регистрация как оператор персональных данных

**Требуется в Узбекистане согласно Закону №ЗРУ-547!**

Обратитесь в:
- **Агентство по информации и массовым коммуникациям**
- Или уполномоченный орган по защите персональных данных

Необходимые документы:
- Устав компании
- Положение о защите ПД
- Описание процессов обработки
- Технические и организационные меры защиты

### 4.3. Консультация с юристом

**ОБЯЗАТЕЛЬНО** проконсультируйтесь с юристом по:
- Пользовательскому соглашению
- Политике конфиденциальности
- Договорам с салонами
- Налогообложению комиссий

**Бюджет**: $1,500 - $2,500
**Срок**: 2-3 недели

---

## 5. Frontend Integration

### 5.1. Обновить auth flow для refresh tokens

```typescript
// src/services/auth.ts

interface AuthResponse {
  access_token: string;
  refresh_token: string;  // ← НОВОЕ
  token_type: string;
  user: User;
}

class AuthService {
  // Сохранять оба токена
  async login(phone: string, password: string) {
    const response = await api.post('/api/auth/login', { phone, password });
    const data: AuthResponse = response.data;

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);  // ← НОВОЕ

    return data;
  }

  // Auto-refresh при 401
  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');

    const response = await api.post('/api/auth/refresh', {
      refresh_token: refreshToken
    });

    const data: AuthResponse = response.data;

    // Обновить ОБА токена (rotation!)
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    return data;
  }

  // Logout с отзывом refresh token
  async logout() {
    const refreshToken = localStorage.getItem('refresh_token');

    await api.post('/api/auth/logout', {
      refresh_token: refreshToken
    });

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}
```

### 5.2. Добавить Axios interceptor для auto-refresh

```typescript
// src/services/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
});

// Request interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor для auto-refresh
let isRefreshing = false;
let failedQueue: any[] = [];

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Если 401 и не refresh endpoint
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Добавить в очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token: new_refresh } = response.data;

        // Сохранить новые токены
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', new_refresh);

        // Обработать очередь
        failedQueue.forEach(callback => callback.resolve(access_token));
        failedQueue = [];

        // Повторить оригинальный запрос
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);

      } catch (refreshError) {
        failedQueue.forEach(callback => callback.reject(refreshError));
        failedQueue = [];

        // Logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 5.3. Добавить Idempotency-Key для платежей

```typescript
// src/services/payments.ts

import { v4 as uuidv4 } from 'uuid';
import api from './api';

class PaymentService {
  async createPayment(bookingId: number, amount: number) {
    // Генерировать уникальный ключ
    const idempotencyKey = uuidv4();

    try {
      const response = await api.post('/api/payments/create', {
        booking_id: bookingId,
        amount: amount,
        currency: 'UZS',
        payment_method: 'PAYME'
      }, {
        headers: {
          'Idempotency-Key': idempotencyKey  // ← ОБЯЗАТЕЛЬНО
        }
      });

      return response.data;
    } catch (error) {
      // При ошибке сети можно повторить с ТЕМ ЖЕ ключом
      // Сервер вернет результат первой операции
      throw error;
    }
  }
}
```

### 5.4. Добавить consent flow при регистрации

```typescript
// src/components/RegistrationForm.tsx

interface RegistrationFormData {
  name: string;
  phone: string;
  password: string;

  // Согласия (обязательные)
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptDataProcessing: boolean;

  // Согласия (опциональные)
  marketingEmails?: boolean;
  marketingSms?: boolean;
}

function RegistrationForm() {
  const [formData, setFormData] = useState<RegistrationFormData>({
    // ...
    acceptTerms: false,
    acceptPrivacy: false,
    acceptDataProcessing: false,
    marketingEmails: false,
    marketingSms: false
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Проверить обязательные согласия
    if (!formData.acceptTerms || !formData.acceptPrivacy || !formData.acceptDataProcessing) {
      alert('Необходимо принять обязательные соглашения');
      return;
    }

    // Отправить регистрацию
    await api.post('/api/auth/register', {
      name: formData.name,
      phone: formData.phone,
      password: formData.password,

      // Backend автоматически создаст consent записи
      consents: {
        accept_terms: formData.acceptTerms,
        accept_privacy: formData.acceptPrivacy,
        accept_data_processing: formData.acceptDataProcessing,
        marketing_emails: formData.marketingEmails,
        marketing_sms: formData.marketingSms,
        terms_version: '1.0',
        privacy_version: '1.0'
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... поля формы ... */}

      {/* Обязательные согласия */}
      <label>
        <input
          type="checkbox"
          checked={formData.acceptTerms}
          onChange={e => setFormData({ ...formData, acceptTerms: e.target.checked })}
          required
        />
        Я принимаю <a href="/terms" target="_blank">Пользовательское соглашение</a>
      </label>

      <label>
        <input
          type="checkbox"
          checked={formData.acceptPrivacy}
          onChange={e => setFormData({ ...formData, acceptPrivacy: e.target.checked })}
          required
        />
        Я принимаю <a href="/privacy" target="_blank">Политику конфиденциальности</a>
      </label>

      <label>
        <input
          type="checkbox"
          checked={formData.acceptDataProcessing}
          onChange={e => setFormData({ ...formData, acceptDataProcessing: e.target.checked })}
          required
        />
        Я даю согласие на обработку персональных данных
      </label>

      {/* Опциональные */}
      <label>
        <input
          type="checkbox"
          checked={formData.marketingEmails}
          onChange={e => setFormData({ ...formData, marketingEmails: e.target.checked })}
        />
        Хочу получать новости и акции по email
      </label>

      <button type="submit">Зарегистрироваться</button>
    </form>
  );
}
```

---

## 6. Testing Before Launch

### 6.1. Тест payment signature verification

```bash
# Попробовать отправить webhook без подписи
curl -X POST https://yourdomain.uz/api/payments/payme/callback \
  -H "Content-Type: application/json" \
  -d '{"method": "CheckPerformTransaction", "params": {...}}'

# Ожидаемый ответ:
# {"error": {"code": -32504, "message": "Insufficient privilege..."}}
```

### 6.2. Тест refresh token rotation

```bash
# 1. Login
TOKEN_RESPONSE=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+998901234567", "password": "test123"}')

REFRESH_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.refresh_token')

# 2. Refresh (должен вернуть НОВУЮ пару токенов)
curl -X POST http://localhost:8000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}"

# 3. Попробовать использовать старый refresh token (должна быть ошибка)
curl -X POST http://localhost:8000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}"

# Ожидаемый ответ: 401 Unauthorized
```

### 6.3. Тест rate limiting

```bash
# Отправить 6 login запросов (лимит 5/мин)
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone": "test", "password": "wrong"}' \
    -w "\nHTTP Status: %{http_code}\n\n"
done

# 6-й запрос должен вернуть: 429 Too Many Requests
```

### 6.4. Тест idempotency

```bash
# Отправить один платеж ДВАЖДЫ с одним ключом
IDEMPOTENCY_KEY="test-key-12345"

# Первый запрос
curl -X POST http://localhost:8000/api/payments/create \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"booking_id": 1, "amount": 50000, ...}'

# Второй запрос с ТЕМ ЖЕ ключом
curl -X POST http://localhost:8000/api/payments/create \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"booking_id": 1, "amount": 50000, ...}'

# Должен вернуть ТОТ ЖЕ результат + заголовок X-Idempotency-Replay: true
```

---

## 7. Deployment Checklist

### Pre-deployment:
- [ ] `.env` заполнен со всеми ключами
- [ ] `ENVIRONMENT=production` установлен
- [ ] SECRET_KEY сгенерирован (32+ символов)
- [ ] Платежные ключи получены и настроены
- [ ] Database migrations применены
- [ ] Legal documents готовы и проверены юристом
- [ ] Компания зарегистрирована как оператор ПД

### Deployment:
- [ ] Docker images собраны
- [ ] SSL сертификат установлен
- [ ] Nginx настроен
- [ ] Health checks работают
- [ ] Backup strategy настроена
- [ ] Monitoring setup (Sentry/logs)

### Post-deployment:
- [ ] Протестированы все критические flow
- [ ] Payment webhooks зарегистрированы
- [ ] Frontend обновлен (refresh tokens, consents)
- [ ] Load testing пройден
- [ ] Пользователи могут регистрироваться и бронировать

---

## 8. Monitoring & Alerts

### Рекомендуемые метрики:

**Payment Security:**
- Количество отклоненных webhook (invalid signature)
- Частота payment errors
- Успешность платежей

**Authentication:**
- Количество failed logins
- Refresh token usage
- Rate limit hits

**Performance:**
- Response time API endpoints
- Database query time
- Error rate (5xx)

### Alerts:

1. **Critical**: Payment signature failures > 5/hour
2. **Warning**: Failed logins > 10/hour per IP
3. **Info**: Rate limit hits > 100/hour

---

## 9. Support & Contacts

### Technical Support:
- Email: dev@yourcompany.uz
- Telegram: @your_tech_support

### Legal/Compliance:
- DPO Email: dpo@yourcompany.uz
- Phone: +998 XX XXX XX XX

### Payment Systems Support:
- Payme: +998 71 200 08 00
- Click: +998 78 150 01 10
- Uzum: support@uzum.uz

---

## 10. Timeline to Launch

| Task | Duration | Responsible |
|------|----------|-------------|
| Legal documents preparation | 2-3 weeks | Lawyer |
| Payment keys setup | 1-2 days | Finance + Dev |
| Frontend updates | 2-3 days | Frontend Dev |
| Testing & QA | 3-5 days | QA Team |
| Deploy to production | 1 day | DevOps |

**Total**: ~4 weeks from now

---

**Готово к запуску после выполнения всех пунктов!** 🚀

Все критические security tasks выполнены. Основное время теперь - юридическая подготовка и настройка платежных систем.

---

**Документ подготовлен**: Claude Sonnet 4.5
**Дата**: 2025-12-11
**Версия**: 2.0 Final
