# 🚀 PRODUCTION READINESS CHECKLIST - AURELLE

**Дата**: 10 декабря 2025
**Версия**: 1.0.0
**Статус**: В работе

---

## 📋 ОБЩИЙ СТАТУС

| Приоритет | Категория | Статус | Прогресс |
|-----------|-----------|--------|----------|
| 🔴 **P0** | Блокеры | В работе | 0/3 (0%) |
| 🟠 **P1** | Prod готовность | Не начато | 0/3 (0%) |
| 🟡 **P2** | UX/Quality | Не начато | 0/3 (0%) |
| 🟢 **P3** | Scale/Future | Не начато | 0/3 (0%) |

**OVERALL**: 0/12 (0%)

---

## 🔴 P0: БЛОКЕРЫ (БЕЗ ЭТОГО В ПРОД НЕЛЬЗЯ)

### ✅ 1. Payments & Money Safety (P0)

**Owner**: Backend Lead
**Приоритет**: 🔴 КРИТИЧЕСКИЙ
**Время**: 8 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **1.1. Реализовать Payme signature verification**
  ```python
  # backend/app/api/payments.py

  import hmac
  import hashlib
  import base64

  def verify_payme_signature(params: dict, secret_key: str) -> bool:
      """
      Payme использует HMAC-SHA1 для подписи
      """
      # Получаем signature из запроса
      signature = params.pop('id', None)

      # Формируем строку для подписи
      # Сортируем параметры по ключу
      sorted_params = sorted(params.items())
      message = '&'.join([f'{k}={v}' for k, v in sorted_params])

      # Вычисляем HMAC
      expected = hmac.new(
          secret_key.encode(),
          message.encode(),
          hashlib.sha1
      ).hexdigest()

      # Безопасное сравнение
      return hmac.compare_digest(signature, expected)
  ```

- [ ] **1.2. Реализовать Click signature verification**
  ```python
  def verify_click_signature(request: ClickRequest, secret_key: str) -> bool:
      """
      Click использует MD5 для подписи
      Format: MD5(click_trans_id + service_id + secret_key +
                  merchant_trans_id + amount + action + sign_time)
      """
      sign_string = (
          f"{request.click_trans_id}"
          f"{settings.CLICK_SERVICE_ID}"
          f"{secret_key}"
          f"{request.merchant_trans_id}"
          f"{request.amount}"
          f"{request.action}"
          f"{request.sign_time}"
      )

      expected = hashlib.md5(sign_string.encode()).hexdigest()
      return hmac.compare_digest(request.sign_string, expected)
  ```

- [ ] **1.3. Добавить payment_audit_log таблицу**
  ```python
  # backend/app/models/payment_audit.py

  class PaymentAuditLog(Base):
      __tablename__ = "payment_audit_logs"

      id = Column(Integer, primary_key=True)
      payment_id = Column(Integer, ForeignKey("payments.id"))

      # Webhook details
      provider = Column(String(20))  # payme, click, uzum
      callback_data = Column(JSON, nullable=False)  # Raw callback
      signature_valid = Column(Boolean, nullable=False)

      # Anti-replay
      idempotency_key = Column(String(100), unique=True, index=True)

      # Verification
      amount_verified = Column(Boolean)
      currency_verified = Column(Boolean)
      order_id_verified = Column(Boolean)

      # Metadata
      ip_address = Column(String(50))
      user_agent = Column(String(500))
      created_at = Column(DateTime(timezone=True), server_default=func.now())
  ```

- [ ] **1.4. Миграция для payment_audit_log**
  ```bash
  alembic revision -m "add_payment_audit_log"
  ```

- [ ] **1.5. Обновить Payme callback с проверками**
  ```python
  @router.post("/payme/callback", response_model=PaymeResponse)
  def payme_callback(
      request: PaymeRequest,
      db: Session = Depends(get_db)
  ):
      # 1. Проверка подписи
      if not verify_payme_signature(request.dict(), settings.PAYME_SECRET_KEY):
          audit_log = PaymentAuditLog(
              provider="payme",
              callback_data=request.dict(),
              signature_valid=False
          )
          db.add(audit_log)
          db.commit()
          return PaymeResponse(error=PaymeError(
              code=-32504,
              message="Invalid signature"
          ))

      # 2. Проверка idempotency (повторный callback)
      idempotency_key = f"payme_{request.id}_{request.method}"
      existing_log = db.query(PaymentAuditLog).filter(
          PaymentAuditLog.idempotency_key == idempotency_key
      ).first()

      if existing_log:
          # Повторный запрос - возвращаем прежний ответ
          return PaymeResponse(result={"message": "Already processed"})

      # 3. Проверка amount, currency, order_id
      booking_id = request.params.account.booking_id
      booking = db.query(Booking).filter(Booking.id == booking_id).first()

      if not booking:
          return PaymeResponse(error=PaymeError(code=-31050, message="Booking not found"))

      expected_amount = booking.total_price * 100  # В тиинах

      if request.params.amount != expected_amount:
          return PaymeResponse(error=PaymeError(
              code=-31001,
              message=f"Invalid amount. Expected {expected_amount}, got {request.params.amount}"
          ))

      # 4. Создаём audit log
      audit_log = PaymentAuditLog(
          provider="payme",
          callback_data=request.dict(),
          signature_valid=True,
          idempotency_key=idempotency_key,
          amount_verified=True,
          currency_verified=True,
          order_id_verified=True
      )
      db.add(audit_log)

      # 5. Обработка транзакции (как раньше)
      # ...

      db.commit()
      return PaymeResponse(result={...})
  ```

- [ ] **1.6. Аналогично для Click**
- [ ] **1.7. Запретить client-side success**
  ```typescript
  // frontend/src/api/payments.ts

  // ❌ СТАРЫЙ КОД (небезопасно):
  // const handlePaymentSuccess = () => {
  //   updateBookingStatus(bookingId, 'paid')  // НЕТ!
  // }

  // ✅ НОВЫЙ КОД:
  const checkPaymentStatus = async (paymentId: number) => {
    // Только читаем статус с сервера
    const response = await api.get(`/payments/${paymentId}`)
    return response.data.status  // backend сам обновит после callback
  }
  ```

- [ ] **1.8. Тесты для payment verification**
  ```python
  # backend/tests/test_payment_security.py

  def test_payme_signature_verification():
      # Valid signature
      assert verify_payme_signature(valid_params, SECRET_KEY) == True

      # Invalid signature
      assert verify_payme_signature(tampered_params, SECRET_KEY) == False

  def test_payment_replay_protection():
      # First callback - accepted
      response1 = client.post("/api/payments/payme/callback", json=callback_data)
      assert response1.status_code == 200

      # Second callback (same data) - ignored
      response2 = client.post("/api/payments/payme/callback", json=callback_data)
      assert response2.json()["result"]["message"] == "Already processed"

  def test_payment_amount_verification():
      # Correct amount - accepted
      callback_data["params"]["amount"] = 5000000  # 50,000 сум в тиинах
      response = client.post("/api/payments/payme/callback", json=callback_data)
      assert response.status_code == 200

      # Wrong amount - rejected
      callback_data["params"]["amount"] = 1000000  # 10,000 сум (неправильно!)
      response = client.post("/api/payments/payme/callback", json=callback_data)
      assert response.json()["error"]["code"] == -31001
  ```

#### Acceptance Criteria:

- ✅ Поддельный callback → rejected (400 Bad Request)
- ✅ Повторный callback → ignored (200 OK, no action)
- ✅ Любая оплата → 1 immutable log в payment_audit_logs
- ✅ Amount mismatch → rejected
- ✅ Client-side success → невозможен
- ✅ Тесты покрывают все сценарии (unit + integration)

**Риск без выполнения**: 🔴 КРИТИЧЕСКИЙ - Финансовые потери, fraud

---

### ✅ 2. Security Hardening (P0)

**Owner**: Backend + DevOps
**Приоритет**: 🔴 КРИТИЧЕСКИЙ
**Время**: 12 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **2.1. Audit и удаление секретов из репозитория**
  ```bash
  # Проверить историю git на наличие секретов
  git log --all --full-history -- "**/*.env*"

  # Если найдены - очистить историю
  git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch .env" \
    --prune-empty --tag-name-filter cat -- --all

  # Добавить в .gitignore
  echo ".env" >> .gitignore
  echo ".env.local" >> .gitignore
  echo ".env.production" >> .gitignore
  ```

- [ ] **2.2. Очистить .env.example от реальных данных**
  ```env
  # ❌ БЫЛО:
  YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0

  # ✅ ДОЛЖНО БЫТЬ:
  YANDEX_MAPS_API_KEY=your-yandex-maps-api-key-here
  ```

- [ ] **2.3. Реализовать Refresh Token Rotation**
  ```python
  # backend/app/api/auth.py

  from datetime import timedelta

  ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)   # Короткий!
  REFRESH_TOKEN_EXPIRE = timedelta(days=30)

  @router.post("/login")
  def login(credentials: LoginRequest, db: Session = Depends(get_db)):
      user = authenticate_user(credentials.email, credentials.password, db)

      if not user:
          raise HTTPException(401, "Invalid credentials")

      # Создаём access token (короткий)
      access_token = create_access_token(
          data={"sub": user.email, "type": "access"},
          expires_delta=ACCESS_TOKEN_EXPIRE
      )

      # Создаём refresh token (длинный)
      refresh_token = create_access_token(
          data={"sub": user.email, "type": "refresh"},
          expires_delta=REFRESH_TOKEN_EXPIRE
      )

      # Сохраняем refresh token в БД (для отзыва)
      token_record = RefreshToken(
          user_id=user.id,
          token=refresh_token,
          expires_at=datetime.now(timezone.utc) + REFRESH_TOKEN_EXPIRE
      )
      db.add(token_record)
      db.commit()

      return {
          "access_token": access_token,
          "refresh_token": refresh_token,
          "token_type": "bearer"
      }

  @router.post("/refresh")
  def refresh(refresh_token: str, db: Session = Depends(get_db)):
      # Проверяем refresh token
      payload = decode_access_token(refresh_token)

      if not payload or payload.get("type") != "refresh":
          raise HTTPException(401, "Invalid refresh token")

      # Проверяем, что токен в БД и не отозван
      token_record = db.query(RefreshToken).filter(
          RefreshToken.token == refresh_token,
          RefreshToken.revoked == False
      ).first()

      if not token_record:
          raise HTTPException(401, "Token revoked or not found")

      # Отзываем старый refresh token (rotation!)
      token_record.revoked = True

      # Создаём новую пару токенов
      user = db.query(User).filter(User.email == payload["sub"]).first()

      new_access_token = create_access_token(
          data={"sub": user.email, "type": "access"},
          expires_delta=ACCESS_TOKEN_EXPIRE
      )

      new_refresh_token = create_access_token(
          data={"sub": user.email, "type": "refresh"},
          expires_delta=REFRESH_TOKEN_EXPIRE
      )

      # Сохраняем новый refresh token
      new_token_record = RefreshToken(
          user_id=user.id,
          token=new_refresh_token,
          expires_at=datetime.now(timezone.utc) + REFRESH_TOKEN_EXPIRE
      )
      db.add(new_token_record)
      db.commit()

      return {
          "access_token": new_access_token,
          "refresh_token": new_refresh_token,
          "token_type": "bearer"
      }
  ```

- [ ] **2.4. Добавить модель RefreshToken**
  ```python
  # backend/app/models/refresh_token.py

  class RefreshToken(Base):
      __tablename__ = "refresh_tokens"

      id = Column(Integer, primary_key=True)
      user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
      token = Column(String(500), unique=True, nullable=False, index=True)

      revoked = Column(Boolean, default=False)
      expires_at = Column(DateTime(timezone=True), nullable=False)

      created_at = Column(DateTime(timezone=True), server_default=func.now())
      revoked_at = Column(DateTime(timezone=True), nullable=True)

      # Metadata
      ip_address = Column(String(50))
      user_agent = Column(String(500))
  ```

- [ ] **2.5. Rate Limiting для критических endpoints**
  ```python
  # backend/app/main.py

  from slowapi import Limiter, _rate_limit_exceeded_handler
  from slowapi.util import get_remote_address
  from slowapi.errors import RateLimitExceeded

  limiter = Limiter(key_func=get_remote_address)
  app.state.limiter = limiter
  app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

  # backend/app/api/auth.py

  @router.post("/login")
  @limiter.limit("5/minute")  # Максимум 5 попыток входа в минуту
  def login(request: Request, credentials: LoginRequest):
      ...

  @router.post("/register")
  @limiter.limit("3/hour")  # Максимум 3 регистрации в час с одного IP
  def register(request: Request, user_data: UserCreate):
      ...

  # backend/app/api/payments.py

  @router.post("/create")
  @limiter.limit("10/minute")  # Не больше 10 платежей в минуту
  def create_payment(request: Request, payment_data: PaymentCreate):
      ...

  # backend/app/api/reviews.py

  @router.post("/")
  @limiter.limit("5/hour")  # Не больше 5 отзывов в час
  def create_review(request: Request, review_data: ReviewCreate):
      ...
  ```

- [ ] **2.6. Password Policy**
  ```python
  # backend/app/core/security.py

  import re

  def validate_password_strength(password: str) -> tuple[bool, str]:
      """
      Проверка силы пароля

      Требования:
      - Минимум 8 символов
      - Минимум 1 цифра
      - Минимум 1 заглавная буква
      - Минимум 1 строчная буква
      - Минимум 1 спецсимвол
      """
      if len(password) < 8:
          return False, "Password must be at least 8 characters long"

      if not re.search(r"\d", password):
          return False, "Password must contain at least one digit"

      if not re.search(r"[A-Z]", password):
          return False, "Password must contain at least one uppercase letter"

      if not re.search(r"[a-z]", password):
          return False, "Password must contain at least one lowercase letter"

      if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
          return False, "Password must contain at least one special character"

      return True, "Password is strong"

  # backend/app/api/auth.py

  @router.post("/register")
  def register(user_data: UserCreate, db: Session = Depends(get_db)):
      # Проверка силы пароля
      is_strong, message = validate_password_strength(user_data.password)

      if not is_strong:
          raise HTTPException(400, message)

      # Остальная логика регистрации
      ...
  ```

- [ ] **2.7. Force HTTPS middleware**
  ```python
  # backend/app/middleware/https_redirect.py

  from starlette.middleware.base import BaseHTTPMiddleware
  from starlette.responses import RedirectResponse

  class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
      async def dispatch(self, request, call_next):
          # В production перенаправляем HTTP -> HTTPS
          if settings.ENVIRONMENT == "production":
              if request.url.scheme != "https":
                  url = request.url.replace(scheme="https")
                  return RedirectResponse(url, status_code=301)

          response = await call_next(request)

          # Добавляем security headers
          response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
          response.headers["X-Content-Type-Options"] = "nosniff"
          response.headers["X-Frame-Options"] = "DENY"
          response.headers["X-XSS-Protection"] = "1; mode=block"

          return response

  # backend/app/main.py
  app.add_middleware(HTTPSRedirectMiddleware)
  ```

- [ ] **2.8. Security Headers в Nginx**
  ```nginx
  # deploy/nginx/conf.d/aurelle.conf

  server {
      listen 443 ssl http2;
      server_name aurelle.uz;

      # SSL configuration
      ssl_certificate /etc/nginx/ssl/aurelle.uz.crt;
      ssl_certificate_key /etc/nginx/ssl/aurelle.uz.key;
      ssl_protocols TLSv1.2 TLSv1.3;
      ssl_ciphers HIGH:!aNULL:!MD5;

      # Security headers
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-Frame-Options "DENY" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://api-maps.yandex.ru; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;

      # Rate limiting
      limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
      limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;

      location /api/auth/ {
          limit_req zone=auth burst=10 nodelay;
          proxy_pass http://backend:8000;
      }

      location /api/ {
          limit_req zone=api burst=20 nodelay;
          proxy_pass http://backend:8000;
      }
  }
  ```

#### Acceptance Criteria:

- ✅ OWASP Top-10 закрыт минимум на 80%
- ✅ Token replay невозможен (refresh token rotation)
- ✅ Нет секретов в git истории
- ✅ Password policy enforced
- ✅ Rate limiting на критических endpoints
- ✅ HTTPS enforced в production
- ✅ Security headers присутствуют

**Риск без выполнения**: 🔴 КРИТИЧЕСКИЙ - Взлом, утечка данных

---

### ✅ 3. Legal & Compliance (P0)

**Owner**: Product + Backend + Юрист
**Приоритет**: 🔴 КРИТИЧЕСКИЙ
**Время**: 2-3 недели (с юристом)
**Стоимость**: $500-1,500
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **3.1. Подготовить Terms of Service (ToS)**
  - [ ] Для клиентов (RU/UZ/EN)
  - [ ] Для владельцев салонов (RU/UZ/EN)
  - [ ] Консультация с юристом
  - [ ] Публикация на сайте `/legal/terms`

- [ ] **3.2. Подготовить Privacy Policy**
  - [ ] Соответствие Закону РУз о ПД
  - [ ] Соответствие GDPR (для будущей экспансии)
  - [ ] Описание обработки cookies
  - [ ] Права пользователей (доступ, изменение, удаление)
  - [ ] Публикация на сайте `/legal/privacy`

- [ ] **3.3. Подготовить Договор оферты для салонов**
  - [ ] Коммерческие условия (комиссия 2.5%)
  - [ ] Порядок выплат
  - [ ] Ответственность сторон
  - [ ] Публикация на сайте `/legal/salon-agreement`

- [ ] **3.4. Добавить модель UserConsent**
  ```python
  # backend/app/models/user_consent.py

  class UserConsent(Base):
      __tablename__ = "user_consents"

      id = Column(Integer, primary_key=True)
      user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

      # Тип согласия
      consent_type = Column(String(50), nullable=False)  # terms, privacy, marketing
      consent_version = Column(String(20), nullable=False)  # v1.0, v1.1, etc

      # Согласие
      accepted = Column(Boolean, nullable=False)
      accepted_at = Column(DateTime(timezone=True), nullable=False)

      # Метаданные
      ip_address = Column(String(50))
      user_agent = Column(String(500))

      created_at = Column(DateTime(timezone=True), server_default=func.now())
  ```

- [ ] **3.5. Frontend: Checkbox при регистрации**
  ```typescript
  // frontend/src/pages/RegisterPage.tsx

  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const handleRegister = async () => {
      if (!acceptedTerms || !acceptedPrivacy) {
          alert("Вы должны принять условия использования и политику конфиденциальности")
          return
      }

      const response = await api.post('/auth/register', {
          ...userData,
          consents: [
              { type: 'terms', version: 'v1.0', accepted: true },
              { type: 'privacy', version: 'v1.0', accepted: true }
          ]
      })
  }

  // UI
  <div>
      <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
      />
      <label>
          Я принимаю <a href="/legal/terms" target="_blank">условия использования</a>
      </label>
  </div>

  <div>
      <input
          type="checkbox"
          checked={acceptedPrivacy}
          onChange={(e) => setAcceptedPrivacy(e.target.checked)}
      />
      <label>
          Я принимаю <a href="/legal/privacy" target="_blank">политику конфиденциальности</a>
      </label>
  </div>
  ```

- [ ] **3.6. Backend: Сохранение согласий**
  ```python
  # backend/app/api/auth.py

  @router.post("/register")
  def register(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
      # Проверяем наличие согласий
      if not user_data.consents or len(user_data.consents) < 2:
          raise HTTPException(400, "You must accept Terms and Privacy Policy")

      # Создаём пользователя
      user = User(
          email=user_data.email,
          name=user_data.name,
          hashed_password=get_password_hash(user_data.password)
      )
      db.add(user)
      db.flush()

      # Сохраняем согласия
      for consent_data in user_data.consents:
          consent = UserConsent(
              user_id=user.id,
              consent_type=consent_data.type,
              consent_version=consent_data.version,
              accepted=consent_data.accepted,
              accepted_at=datetime.now(timezone.utc),
              ip_address=request.client.host,
              user_agent=request.headers.get("user-agent")
          )
          db.add(consent)

      db.commit()
      return {"message": "User registered successfully"}
  ```

- [ ] **3.7. Endpoint для отзыва согласия**
  ```python
  @router.post("/users/me/revoke-consent")
  def revoke_consent(
      consent_type: str,
      current_user: User = Depends(get_current_user),
      db: Session = Depends(get_db)
  ):
      """
      Отзыв согласия (право на забвение)
      """
      if consent_type == "terms":
          # Блокируем аккаунт, т.к. без согласия использовать нельзя
          current_user.is_active = False

      # Логируем отзыв
      consent = UserConsent(
          user_id=current_user.id,
          consent_type=consent_type,
          consent_version="v1.0",
          accepted=False,
          accepted_at=datetime.now(timezone.utc)
      )
      db.add(consent)
      db.commit()

      return {"message": "Consent revoked"}
  ```

- [ ] **3.8. Создать страницы с документами**
  ```bash
  mkdir -p frontend/src/pages/legal
  touch frontend/src/pages/legal/TermsPage.tsx
  touch frontend/src/pages/legal/PrivacyPage.tsx
  touch frontend/src/pages/legal/SalonAgreementPage.tsx
  ```

#### Acceptance Criteria:

- ✅ Ни одного action без accepted terms
- ✅ Logs хранят факт согласия (user_id, timestamp, IP, version)
- ✅ Документы доступны на `/legal/terms`, `/legal/privacy`
- ✅ Пользователь может отозвать согласие
- ✅ При отзыве согласия аккаунт блокируется
- ✅ Документы проверены юристом
- ✅ Мультиязычность (RU/UZ/EN)

**Риск без выполнения**: 🔴 КРИТИЧЕСКИЙ - Штрафы от регулятора, блокировка платформы

---

## 🟠 P1: ПРОД ГОТОВНОСТЬ

### ✅ 4. Observability & Logs

**Owner**: DevOps
**Приоритет**: 🟠 ВЫСОКИЙ
**Время**: 8 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **4.1. Настроить Sentry для ошибок**
  ```bash
  pip install sentry-sdk
  ```

  ```python
  # backend/app/main.py

  import sentry_sdk
  from sentry_sdk.integrations.fastapi import FastApiIntegration

  if settings.ENVIRONMENT == "production":
      sentry_sdk.init(
          dsn=settings.SENTRY_DSN,
          integrations=[FastApiIntegration()],
          traces_sample_rate=0.1,  # 10% requests для performance monitoring
          environment=settings.ENVIRONMENT
      )
  ```

- [ ] **4.2. Structured Logging (JSON)**
  ```python
  # backend/app/core/logging_config.py

  import logging
  import json
  from datetime import datetime

  class JSONFormatter(logging.Formatter):
      def format(self, record):
          log_data = {
              "timestamp": datetime.utcnow().isoformat(),
              "level": record.levelname,
              "message": record.getMessage(),
              "module": record.module,
              "function": record.funcName,
              "line": record.lineno
          }

          if hasattr(record, "request_id"):
              log_data["request_id"] = record.request_id

          if record.exc_info:
              log_data["exception"] = self.formatException(record.exc_info)

          return json.dumps(log_data)

  # Setup
  handler = logging.StreamHandler()
  handler.setFormatter(JSONFormatter())
  logger = logging.getLogger("aurelle")
  logger.addHandler(handler)
  logger.setLevel(logging.INFO)
  ```

- [ ] **4.3. Request ID Tracing**
  ```python
  # backend/app/middleware/request_id.py

  import uuid
  from starlette.middleware.base import BaseHTTPMiddleware

  class RequestIDMiddleware(BaseHTTPMiddleware):
      async def dispatch(self, request, call_next):
          request_id = str(uuid.uuid4())
          request.state.request_id = request_id

          response = await call_next(request)
          response.headers["X-Request-ID"] = request_id

          return response

  # backend/app/main.py
  app.add_middleware(RequestIDMiddleware)
  ```

- [ ] **4.4. Логирование всех платежей**
  ```python
  # backend/app/api/payments.py

  import logging
  logger = logging.getLogger("aurelle.payments")

  @router.post("/create")
  def create_payment(...):
      logger.info(
          "Payment created",
          extra={
              "request_id": request.state.request_id,
              "user_id": current_user.id,
              "booking_id": payment_data.booking_id,
              "amount": payment_data.amount,
              "payment_method": payment_data.payment_method
          }
      )
      # ...

  @router.post("/payme/callback")
  def payme_callback(...):
      logger.info(
          "Payme callback received",
          extra={
              "request_id": request.state.request_id,
              "payme_trans_id": request.id,
              "method": request.method,
              "amount": request.params.amount
          }
      )
      # ...
  ```

#### Acceptance Criteria:

- ✅ Любой баг → traceable за 2 минуты в Sentry
- ✅ Платёж → полный путь в логах (create → callback → completion)
- ✅ Request ID прослеживается через все сервисы
- ✅ Structured logs (JSON) для удобного парсинга

---

### ✅ 5. DB & Data Safety

**Owner**: Backend + DevOps
**Приоритет**: 🟠 ВЫСОКИЙ
**Время**: 8 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **5.1. Soft Delete для критичных сущностей**
  ```python
  # backend/app/models/mixins.py

  class SoftDeleteMixin:
      deleted_at = Column(DateTime(timezone=True), nullable=True)
      is_deleted = Column(Boolean, default=False, index=True)

      def soft_delete(self):
          self.is_deleted = True
          self.deleted_at = datetime.now(timezone.utc)

  # Применить к моделям
  class User(Base, SoftDeleteMixin):
      ...

  class Salon(Base, SoftDeleteMixin):
      ...

  class Booking(Base, SoftDeleteMixin):
      ...

  class Payment(Base, SoftDeleteMixin):
      ...
  ```

- [ ] **5.2. Добавить индексы на критичные поля**
  ```sql
  -- Уже есть:
  CREATE INDEX ix_bookings_client_id ON bookings(client_id);
  CREATE INDEX ix_bookings_salon_id ON bookings(salon_id);
  CREATE INDEX ix_bookings_master_id ON bookings(master_id);

  -- Добавить:
  CREATE INDEX ix_bookings_start_at ON bookings(start_at);
  CREATE INDEX ix_bookings_status ON bookings(status);
  CREATE INDEX ix_payments_status ON payments(status);
  CREATE INDEX ix_payments_created_at ON payments(created_at);
  CREATE INDEX ix_salons_is_verified ON salons(is_verified);
  CREATE INDEX ix_salons_is_active ON salons(is_active);
  CREATE INDEX ix_users_role ON users(role);
  CREATE INDEX ix_users_is_active ON users(is_active);
  ```

- [ ] **5.3. Тестирование restore из бэкапа**
  ```bash
  # 1. Создать тестовый бэкап
  ./deploy/scripts/backup.sh

  # 2. Восстановить на тестовой БД
  docker exec -i aurelle_db_test psql -U beauty_user -d beauty_salon_test < backups/latest.sql

  # 3. Проверить целостность
  docker exec aurelle_db_test psql -U beauty_user -d beauty_salon_test -c "SELECT COUNT(*) FROM users;"
  docker exec aurelle_db_test psql -U beauty_user -d beauty_salon_test -c "SELECT COUNT(*) FROM bookings;"

  # 4. Документировать процедуру в RUNBOOK
  ```

- [ ] **5.4. Автоматизация бэкапов с проверкой**
  ```bash
  # deploy/scripts/backup_with_verification.sh

  #!/bin/bash

  BACKUP_DIR="./backups"
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

  echo "Creating backup..."
  docker exec aurelle_db_prod pg_dump -U beauty_user beauty_salon_db | gzip > $BACKUP_FILE

  echo "Verifying backup..."
  gunzip -t $BACKUP_FILE

  if [ $? -eq 0 ]; then
      echo "✅ Backup verified: $BACKUP_FILE"

      # Отправить уведомление в Telegram
      curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id=$TELEGRAM_CHAT_ID \
        -d text="✅ Database backup created successfully: $BACKUP_FILE"
  else
      echo "❌ Backup verification failed!"

      # Отправить alert
      curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id=$TELEGRAM_CHAT_ID \
        -d text="❌ Database backup FAILED!"

      exit 1
  fi
  ```

#### Acceptance Criteria:

- ✅ Rollback без даунтайма (soft delete позволяет)
- ✅ Restore < 1h
- ✅ Бэкапы проверяются автоматически
- ✅ Индексы на всех часто используемых полях

---

### ✅ 6. API Contract & Stability

**Owner**: Backend
**Приоритет**: 🟠 ВЫСОКИЙ
**Время**: 6 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **6.1. Обновить OpenAPI spec**
  ```python
  # backend/app/main.py

  app = FastAPI(
      title="AURELLE API",
      description="Beauty Salon Marketplace API",
      version="1.0.0",
      docs_url="/docs",
      redoc_url="/redoc",
      openapi_url="/openapi.json"
  )
  ```

  ```bash
  # Экспортировать OpenAPI spec
  curl http://localhost:8000/openapi.json > docs/openapi.json
  ```

- [ ] **6.2. Стандартизировать error codes**
  ```python
  # backend/app/core/errors.py

  class APIError(Exception):
      def __init__(self, code: str, message: str, status_code: int = 400):
          self.code = code
          self.message = message
          self.status_code = status_code

  # Catalogue ошибок
  class ErrorCodes:
      # Auth
      INVALID_CREDENTIALS = "AUTH_001"
      TOKEN_EXPIRED = "AUTH_002"
      INSUFFICIENT_PERMISSIONS = "AUTH_003"

      # Bookings
      BOOKING_NOT_FOUND = "BOOKING_001"
      TIMESLOT_UNAVAILABLE = "BOOKING_002"
      BOOKING_CANCELLED = "BOOKING_003"

      # Payments
      PAYMENT_FAILED = "PAYMENT_001"
      INVALID_AMOUNT = "PAYMENT_002"
      PAYMENT_ALREADY_EXISTS = "PAYMENT_003"

  # Exception handler
  @app.exception_handler(APIError)
  async def api_error_handler(request: Request, exc: APIError):
      return JSONResponse(
          status_code=exc.status_code,
          content={
              "error": {
                  "code": exc.code,
                  "message": exc.message,
                  "request_id": request.state.request_id
              }
          }
      )
  ```

- [ ] **6.3. Idempotency keys для POST endpoints**
  ```python
  # backend/app/api/bookings.py

  @router.post("/")
  def create_booking(
      booking_data: BookingCreate,
      idempotency_key: str = Header(None, alias="Idempotency-Key"),
      db: Session = Depends(get_db)
  ):
      if not idempotency_key:
          raise HTTPException(400, "Idempotency-Key header is required")

      # Проверяем, не создавали ли мы уже бронирование с таким ключом
      existing = db.query(Booking).filter(
          Booking.idempotency_key == idempotency_key
      ).first()

      if existing:
          # Возвращаем существующее бронирование
          return existing

      # Создаём новое
      booking = Booking(
          **booking_data.dict(),
          idempotency_key=idempotency_key
      )
      db.add(booking)
      db.commit()

      return booking
  ```

  ```python
  # Добавить поле в модель
  class Booking(Base):
      ...
      idempotency_key = Column(String(100), unique=True, nullable=True, index=True)
  ```

#### Acceptance Criteria:

- ✅ Frontend не падает при 4xx/5xx (graceful error handling)
- ✅ Повторный запрос ≠ дубликат данных (idempotency)
- ✅ Все ошибки имеют код и понятное сообщение
- ✅ OpenAPI spec актуален

---

## 🟡 P2: UX / PRODUCT QUALITY

### ✅ 7. Booking Flow from Hell Test

**Owner**: QA + Frontend
**Приоритет**: 🟡 СРЕДНИЙ
**Время**: 16 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **7.1. Тест race condition при записи**
  ```python
  # backend/tests/test_booking_race_condition.py

  import asyncio
  import pytest

  @pytest.mark.asyncio
  async def test_concurrent_booking_same_slot():
      """
      2 пользователя пытаются забронировать один и тот же слот одновременно.
      Ожидаем: только 1 успешное бронирование.
      """

      slot_data = {
          "salon_id": 1,
          "master_id": 1,
          "service_id": 1,
          "start_at": "2025-12-11T10:00:00Z"
      }

      # Создаём 2 одновременных запроса
      tasks = [
          create_booking_async(client_id=1, **slot_data),
          create_booking_async(client_id=2, **slot_data)
      ]

      results = await asyncio.gather(*tasks, return_exceptions=True)

      # Проверяем: только 1 успех, 1 ошибка
      successful = [r for r in results if not isinstance(r, Exception)]
      failed = [r for r in results if isinstance(r, Exception)]

      assert len(successful) == 1
      assert len(failed) == 1
      assert "already booked" in str(failed[0]).lower()
  ```

- [ ] **7.2. Database-level lock для слотов**
  ```python
  # backend/app/api/bookings.py

  from sqlalchemy import select, and_
  from sqlalchemy.orm import with_for_update

  @router.post("/")
  def create_booking(booking_data: BookingCreate, db: Session = Depends(get_db)):
      # Проверяем доступность слота с блокировкой строки
      existing_booking = db.execute(
          select(Booking)
          .filter(and_(
              Booking.master_id == booking_data.master_id,
              Booking.start_at == booking_data.start_at,
              Booking.status.in_(["pending", "confirmed"])
          ))
          .with_for_update()  # FOR UPDATE - блокируем строку
      ).scalar_one_or_none()

      if existing_booking:
          raise HTTPException(409, "Time slot already booked")

      # Создаём бронирование
      booking = Booking(**booking_data.dict())
      db.add(booking)
      db.commit()

      return booking
  ```

- [ ] **7.3. Тест timezone handling**
  ```python
  def test_booking_timezone():
      """
      Проверяем, что время бронирования корректно обрабатывается
      в разных часовых поясах.
      """

      # Ташкент: UTC+5
      # Москва: UTC+3
      # Лондон: UTC+0

      # Клиент в Москве бронирует на 14:00 по Ташкенту
      response = client.post("/api/bookings", json={
          "start_at": "2025-12-11T09:00:00Z",  # UTC
          "timezone": "Asia/Tashkent"
      })

      booking = response.json()

      # Проверяем, что в БД время сохранено в UTC
      assert booking["start_at"] == "2025-12-11T09:00:00Z"

      # Проверяем, что для клиента время отображается в его timezone
      assert booking["local_start_at"] == "2025-12-11T12:00:00+03:00"  # Москва
  ```

#### Acceptance Criteria:

- ✅ 0 double booking (гарантировано)
- ✅ User всегда видит реальный статус
- ✅ Timezones обрабатываются корректно
- ✅ Race conditions невозможны

---

### ✅ 8. Role & Permission Matrix

**Owner**: Backend
**Приоритет**: 🟡 СРЕДНИЙ
**Время**: 4 часа
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **8.1. Создать Permission Matrix**
  ```python
  # backend/app/core/permissions.py

  from enum import Enum

  class Permission(str, Enum):
      # Users
      VIEW_USERS = "view_users"
      EDIT_USERS = "edit_users"
      DELETE_USERS = "delete_users"

      # Salons
      VIEW_SALONS = "view_salons"
      EDIT_OWN_SALON = "edit_own_salon"
      EDIT_ANY_SALON = "edit_any_salon"
      DELETE_SALON = "delete_salon"

      # Bookings
      VIEW_OWN_BOOKINGS = "view_own_bookings"
      VIEW_SALON_BOOKINGS = "view_salon_bookings"
      VIEW_ALL_BOOKINGS = "view_all_bookings"
      EDIT_BOOKING = "edit_booking"

      # Payments
      VIEW_OWN_PAYMENTS = "view_own_payments"
      VIEW_ALL_PAYMENTS = "view_all_payments"
      REFUND_PAYMENT = "refund_payment"

  # Матрица ролей → разрешений
  ROLE_PERMISSIONS = {
      "client": [
          Permission.VIEW_SALONS,
          Permission.VIEW_OWN_BOOKINGS,
          Permission.VIEW_OWN_PAYMENTS,
      ],
      "salon_owner": [
          Permission.VIEW_SALONS,
          Permission.EDIT_OWN_SALON,
          Permission.VIEW_SALON_BOOKINGS,
          Permission.EDIT_BOOKING,
      ],
      "master": [
          Permission.VIEW_SALONS,
          Permission.VIEW_SALON_BOOKINGS,
      ],
      "admin": [
          Permission.VIEW_USERS,
          Permission.EDIT_USERS,
          Permission.DELETE_USERS,
          Permission.VIEW_SALONS,
          Permission.EDIT_ANY_SALON,
          Permission.DELETE_SALON,
          Permission.VIEW_ALL_BOOKINGS,
          Permission.VIEW_ALL_PAYMENTS,
          Permission.REFUND_PAYMENT,
      ]
  }

  def has_permission(user: User, permission: Permission) -> bool:
      """Проверка прав доступа"""
      user_permissions = ROLE_PERMISSIONS.get(user.role, [])
      return permission in user_permissions
  ```

- [ ] **8.2. Permission decorator**
  ```python
  # backend/app/api/deps.py

  from functools import wraps

  def require_permission(permission: Permission):
      def decorator(func):
          @wraps(func)
          def wrapper(*args, **kwargs):
              current_user = kwargs.get("current_user")

              if not current_user:
                  raise HTTPException(401, "Not authenticated")

              if not has_permission(current_user, permission):
                  raise HTTPException(403, f"Permission denied: {permission}")

              return func(*args, **kwargs)
          return wrapper
      return decorator
  ```

- [ ] **8.3. Применить к endpoints**
  ```python
  # backend/app/api/admin.py

  @router.get("/users")
  @require_permission(Permission.VIEW_USERS)
  def get_all_users(current_user: User = Depends(get_current_user)):
      # Только admin может видеть всех пользователей
      ...

  @router.delete("/users/{user_id}")
  @require_permission(Permission.DELETE_USERS)
  def delete_user(user_id: int, current_user: User = Depends(get_current_user)):
      # Только admin может удалять пользователей
      ...
  ```

#### Acceptance Criteria:

- ✅ Ни одного "лишнего" доступа
- ✅ Admin ≠ God mode без логов
- ✅ Явная матрица прав
- ✅ Access guards на каждом endpoint'е

---

### ✅ 9. Notifications & Fail-safety

**Owner**: Backend
**Приоритет**: 🟡 СРЕДНИЙ
**Время**: 16 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **9.1. Выбрать провайдера (Eskiz.uz для SMS)**
  ```python
  # backend/app/services/notifications.py

  import httpx

  class SMSProvider:
      def __init__(self, api_token: str):
          self.api_token = api_token
          self.base_url = "https://notify.eskiz.uz/api"

      async def send_sms(self, phone: str, message: str) -> dict:
          async with httpx.AsyncClient() as client:
              response = await client.post(
                  f"{self.base_url}/message/sms/send",
                  json={
                      "mobile_phone": phone,
                      "message": message,
                      "from": "AURELLE"
                  },
                  headers={"Authorization": f"Bearer {self.api_token}"}
              )
              return response.json()
  ```

- [ ] **9.2. Fallback: Email если SMS не удалось**
  ```python
  async def send_notification(user_id: int, message: str, notification_type: str):
      user = db.query(User).filter(User.id == user_id).first()

      # Попытка 1: SMS
      try:
          if user.phone:
              await sms_provider.send_sms(user.phone, message)
              logger.info(f"SMS sent to {user.phone}")
              return
      except Exception as e:
          logger.error(f"SMS failed: {e}")

      # Fallback: Email
      try:
          if user.email:
              await email_provider.send_email(
                  to=user.email,
                  subject=f"AURELLE: {notification_type}",
                  body=message
              )
              logger.info(f"Email sent to {user.email}")
              return
      except Exception as e:
          logger.error(f"Email failed: {e}")

      # Fallback: In-app notification
      notification = Notification(
          user_id=user.id,
          message=message,
          type=notification_type,
          read=False
      )
      db.add(notification)
      db.commit()
  ```

- [ ] **9.3. Retry logic с Celery**
  ```python
  # backend/app/tasks/notifications.py

  from celery import Celery

  celery = Celery("aurelle", broker=settings.REDIS_URL)

  @celery.task(
      bind=True,
      max_retries=3,
      default_retry_delay=60  # 1 минута
  )
  def send_notification_task(self, user_id: int, message: str):
      try:
          send_notification(user_id, message)
      except Exception as exc:
          # Retry через 1 минуту
          raise self.retry(exc=exc)
  ```

- [ ] **9.4. Dead Letter Queue**
  ```python
  @celery.task
  def send_notification_task(user_id: int, message: str):
      try:
          send_notification(user_id, message)
      except Exception as e:
          # После 3 неудачных попыток отправляем в DLQ
          dead_letter = DeadLetterQueue(
              task_name="send_notification",
              payload={"user_id": user_id, "message": message},
              error=str(e),
              retries=3
          )
          db.add(dead_letter)
          db.commit()

          # Алерт админу
          logger.critical(f"Notification failed after 3 retries: {user_id}")
  ```

#### Acceptance Criteria:

- ✅ Сообщения не теряются
- ✅ Ошибка доставки → лог + retry (3 попытки)
- ✅ Fallback: SMS → Email → In-app
- ✅ Dead Letter Queue для критических ошибок

---

## 🟢 P3: SCALE & FUTURE

### ✅ 10. Performance & Load

**Owner**: DevOps
**Приоритет**: 🟢 НИЗКИЙ
**Время**: 8 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **10.1. Load testing с Locust**
  ```python
  # backend/tests/load/locustfile.py

  from locust import HttpUser, task, between

  class BeautySalonUser(HttpUser):
      wait_time = between(1, 3)

      def on_start(self):
          # Логинимся
          self.client.post("/api/auth/login", json={
              "email": "test@example.com",
              "password": "test123"
          })

      @task(5)
      def view_salons(self):
          self.client.get("/api/salons")

      @task(2)
      def view_salon_detail(self):
          self.client.get("/api/salons/1")

      @task(1)
      def create_booking(self):
          self.client.post("/api/bookings", json={
              "salon_id": 1,
              "master_id": 1,
              "service_id": 1,
              "start_at": "2025-12-11T10:00:00Z"
          })
  ```

  ```bash
  # Запуск
  locust -f backend/tests/load/locustfile.py --host http://localhost:8000

  # Цель: 10,000 users, p95 < 500ms
  ```

- [ ] **10.2. Redis caching для salons**
  ```python
  # backend/app/api/salons.py

  import redis
  import json

  redis_client = redis.from_url(settings.REDIS_URL)

  @router.get("/{salon_id}")
  def get_salon(salon_id: int, db: Session = Depends(get_db)):
      # Проверяем кеш
      cache_key = f"salon:{salon_id}"
      cached = redis_client.get(cache_key)

      if cached:
          return json.loads(cached)

      # Загружаем из БД
      salon = db.query(Salon).filter(Salon.id == salon_id).first()

      if not salon:
          raise HTTPException(404, "Salon not found")

      # Сохраняем в кеш (5 минут)
      redis_client.setex(
          cache_key,
          300,  # 5 минут
          json.dumps(salon.dict())
      )

      return salon
  ```

- [ ] **10.3. Pagination everywhere**
  ```python
  # backend/app/api/salons.py

  @router.get("/")
  def get_salons(
      page: int = Query(1, ge=1),
      per_page: int = Query(20, ge=1, le=100),
      db: Session = Depends(get_db)
  ):
      offset = (page - 1) * per_page

      salons = db.query(Salon).offset(offset).limit(per_page).all()
      total = db.query(Salon).count()

      return {
          "items": salons,
          "page": page,
          "per_page": per_page,
          "total": total,
          "pages": (total + per_page - 1) // per_page
      }
  ```

#### Acceptance Criteria:

- ✅ 10k users → no meltdown
- ✅ p95 < 500ms
- ✅ Кеширование для часто запрашиваемых данных
- ✅ Pagination на всех list endpoints

---

### ✅ 11. CI/CD & Release

**Owner**: DevOps
**Приоритет**: 🟢 НИЗКИЙ
**Время**: 8 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **11.1. GitHub Actions CI**
  ```yaml
  # .github/workflows/ci.yml

  name: CI Pipeline

  on:
    push:
      branches: [main, develop]
    pull_request:
      branches: [main]

  jobs:
    backend-tests:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3

        - name: Set up Python
          uses: actions/setup-python@v4
          with:
            python-version: '3.13'

        - name: Install dependencies
          run: |
            cd backend
            pip install -r requirements.txt

        - name: Run tests
          run: |
            cd backend
            pytest --cov=app tests/

        - name: Upload coverage
          uses: codecov/codecov-action@v3

    frontend-tests:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3

        - name: Set up Node
          uses: actions/setup-node@v3
          with:
            node-version: '18'

        - name: Install dependencies
          run: |
            cd frontend
            npm ci

        - name: Run tests
          run: |
            cd frontend
            npm test -- --coverage
  ```

- [ ] **11.2. CD Pipeline**
  ```yaml
  # .github/workflows/cd.yml

  name: CD Pipeline

  on:
    push:
      branches: [main]

  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3

        - name: Deploy to production
          run: |
            ssh user@production-server << 'EOF'
              cd /opt/aurelle
              git pull origin main
              docker-compose -f docker-compose.prod.yml up -d --build
            EOF
  ```

#### Acceptance Criteria:

- ✅ Deploy < 10 min
- ✅ Rollback < 5 min
- ✅ Автоматические тесты на каждом PR
- ✅ Staging → Prod pipeline

---

### ✅ 12. Data for Business

**Owner**: Product + Backend
**Приоритет**: 🟢 НИЗКИЙ
**Время**: 16 часов
**Статус**: ⬜ Не начато

#### Задачи:

- [ ] **12.1. Метрики для дашборда**
  ```python
  # backend/app/api/analytics.py

  @router.get("/metrics")
  def get_metrics(
      start_date: date = Query(...),
      end_date: date = Query(...),
      current_user: User = Depends(get_current_admin)
  ):
      # Conversion: visits → bookings
      visits = db.query(AuditLog).filter(
          AuditLog.action == "salon.view",
          AuditLog.created_at >= start_date,
          AuditLog.created_at <= end_date
      ).count()

      bookings = db.query(Booking).filter(
          Booking.created_at >= start_date,
          Booking.created_at <= end_date
      ).count()

      conversion = bookings / visits if visits > 0 else 0

      # CAC: Customer Acquisition Cost
      marketing_spend = get_marketing_spend(start_date, end_date)  # Из внешней системы
      new_users = db.query(User).filter(
          User.created_at >= start_date,
          User.created_at <= end_date
      ).count()

      cac = marketing_spend / new_users if new_users > 0 else 0

      # LTV: Lifetime Value
      avg_booking_value = db.query(func.avg(Booking.total_price)).scalar() or 0
      avg_bookings_per_user = bookings / new_users if new_users > 0 else 0
      ltv = avg_booking_value * avg_bookings_per_user

      # Churn
      active_users_last_month = db.query(User).filter(
          User.last_active >= start_date - timedelta(days=30)
      ).count()

      active_users_this_month = db.query(User).filter(
          User.last_active >= start_date
      ).count()

      churn = (active_users_last_month - active_users_this_month) / active_users_last_month

      return {
          "conversion": conversion,
          "cac": cac,
          "ltv": ltv,
          "churn": churn
      }
  ```

- [ ] **12.2. Admin Dashboard UI**
  ```typescript
  // frontend/src/pages/admin/AnalyticsDashboard.tsx

  const AnalyticsDashboard = () => {
      const [metrics, setMetrics] = useState(null)

      useEffect(() => {
          api.get('/api/analytics/metrics', {
              params: {
                  start_date: '2025-01-01',
                  end_date: '2025-12-31'
              }
          }).then(response => setMetrics(response.data))
      }, [])

      return (
          <div>
              <h1>Analytics Dashboard</h1>

              <div className="metrics-grid">
                  <MetricCard
                      title="Conversion Rate"
                      value={`${(metrics.conversion * 100).toFixed(2)}%`}
                  />

                  <MetricCard
                      title="CAC"
                      value={`$${metrics.cac.toFixed(2)}`}
                  />

                  <MetricCard
                      title="LTV"
                      value={`$${metrics.ltv.toFixed(2)}`}
                  />

                  <MetricCard
                      title="Churn Rate"
                      value={`${(metrics.churn * 100).toFixed(2)}%`}
                  />
              </div>
          </div>
      )
  }
  ```

#### Acceptance Criteria:

- ✅ Любой вопрос инвестора → ответ за 30 секунд
- ✅ Метрики обновляются в реальном времени
- ✅ Экспорт в CSV/Excel

---

## 📊 ОБЩИЙ ПРОГРЕСС

**Всего задач**: 12
**Завершено**: 0
**В работе**: 0
**Осталось**: 12

**Прогресс**: 0%

---

## 🎯 ПРИОРИТИЗАЦИЯ

### Что делать СЕЙЧАС (Неделя 1):
1. 🔴 Payment signature verification (4 часа)
2. 🔴 Security hardening (12 часов)
3. 🔴 Legal documents (начать с юристом)

### Что делать ПОТОМ (Неделя 2-3):
4. 🟠 Observability (8 часов)
5. 🟠 DB safety (8 часов)
6. 🟠 API stability (6 часов)
7. 🟡 Booking tests (16 часов)

### Что можно ОТЛОЖИТЬ (После запуска):
8. 🟡 Permissions matrix (4 часа)
9. 🟡 Notifications (16 часов)
10. 🟢 Load testing (8 часов)
11. 🟢 CI/CD (8 часов)
12. 🟢 Analytics dashboard (16 часов)

---

**Следующий шаг**: Начать с задачи #1 (Payment signature verification)

---

*Версия: 1.0.0 | Последнее обновление: 10 декабря 2025*
