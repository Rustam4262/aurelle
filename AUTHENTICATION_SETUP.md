# Authentication Setup Guide

AURELLE поддерживает несколько методов авторизации. Все провайдеры являются опциональными — вы можете включить только те, которые вам нужны.

## Доступные методы авторизации

1. **Local Auth (Email + Password)** - встроенная авторизация ✅ Уже настроена
2. **Google OAuth** - вход через Google аккаунт
3. **Yandex OAuth** - вход через Яндекс ID
4. **GitHub OAuth** - вход через GitHub аккаунт
5. **Phone Auth (SMS)** - вход через номер телефона с SMS-кодом

---

## 1. Local Auth (Email + Password)

**Статус:** ✅ Настроена и работает

Не требует дополнительной настройки. Пользователи могут регистрироваться с email и паролем.

---

## 2. Google OAuth

### Шаги настройки:

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите **Google+ API**
4. Перейдите в **Credentials** → **Create Credentials** → **OAuth client ID**
5. Выберите **Web application**
6. Добавьте **Authorized redirect URIs**:
   ```
   http://localhost:5000/api/auth/google/callback
   https://your-domain.com/api/auth/google/callback
   ```
7. Скопируйте **Client ID** и **Client Secret**
8. Добавьте в `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

### Проверка:
Перезапустите сервер и убедитесь, что в консоли появилось:
```
Google OAuth configured successfully
```

---

## 3. Yandex OAuth

### Шаги настройки:

1. Перейдите на [Яндекс OAuth](https://oauth.yandex.ru/)
2. Зарегистрируйте новое приложение
3. Укажите **Redirect URI**:
   ```
   http://localhost:5000/api/auth/yandex/callback
   https://your-domain.com/api/auth/yandex/callback
   ```
4. В разделе **Права** выберите:
   - Доступ к email адресу
   - Доступ к аватару
   - Доступ к имени и фамилии
5. Скопируйте **Client ID** и **Client Secret**
6. Добавьте в `.env`:
   ```env
   YANDEX_CLIENT_ID=your-yandex-client-id
   YANDEX_CLIENT_SECRET=your-yandex-client-secret
   ```

### Проверка:
Перезапустите сервер и убедитесь, что в консоли появилось:
```
Yandex OAuth configured successfully
```

---

## 4. GitHub OAuth

### Шаги настройки:

1. Перейдите в [GitHub Developer Settings](https://github.com/settings/developers)
2. Нажмите **New OAuth App**
3. Заполните форму:
   - **Application name**: AURELLE
   - **Homepage URL**: `http://localhost:5000` (или ваш домен)
   - **Authorization callback URL**: `http://localhost:5000/api/auth/github/callback`
4. После создания скопируйте **Client ID**
5. Сгенерируйте **Client Secret** и скопируйте его
6. Добавьте в `.env`:
   ```env
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

### Проверка:
Перезапустите сервер и убедитесь, что в консоли появилось:
```
GitHub OAuth configured successfully
```

---

## 5. Phone Auth (SMS через Twilio)

### Шаги настройки:

1. Зарегистрируйтесь на [Twilio](https://www.twilio.com/)
2. Перейдите в [Verify Service](https://console.twilio.com/us1/develop/verify/services)
3. Создайте новый Verify Service
4. Скопируйте:
   - **Account SID** (из Dashboard)
   - **Auth Token** (из Dashboard)
   - **Service SID** (из созданного Verify Service)
5. Добавьте в `.env`:
   ```env
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_SERVICE_SID=your-twilio-verify-service-sid
   ```

### Режим разработки:
В режиме `NODE_ENV=development` коды будут выводиться в консоль вместо отправки SMS (для тестирования без трат на SMS).

### Проверка:
Перезапустите сервер и убедитесь, что в консоли появилось:
```
Phone auth (SMS) configured successfully
```

---

## Проверка настроенных провайдеров

После настройки провайдеров проверьте статус через API:

```bash
curl http://localhost:5000/api/auth/providers
```

Ответ будет содержать статус каждого провайдера:
```json
{
  "local": true,
  "yandex": false,
  "google": true,
  "github": true,
  "phone": false
}
```

---

## Настройка для продакшена

### 1. Обновите Redirect URIs

Для каждого OAuth провайдера замените `http://localhost:5000` на ваш продакшн домен:
- Google: `https://yourapp.com/api/auth/google/callback`
- Yandex: `https://yourapp.com/api/auth/yandex/callback`
- GitHub: `https://yourapp.com/api/auth/github/callback`

### 2. Переменные окружения

Убедитесь, что все секреты хранятся безопасно (не в git, используйте переменные окружения хостинга).

### 3. HTTPS обязателен

OAuth провайдеры требуют HTTPS для продакшена. Убедитесь, что ваше приложение работает через HTTPS.

---

## Troubleshooting

### OAuth провайдер не работает

1. Проверьте, что Client ID и Secret правильно скопированы
2. Убедитесь, что Redirect URI точно совпадает (включая протокол и порт)
3. Проверьте логи сервера на наличие ошибок
4. Проверьте, что провайдер активирован в консоли разработчика

### Phone auth не отправляет SMS

1. Проверьте баланс Twilio аккаунта
2. Убедитесь, что Verify Service активен
3. В development режиме коды выводятся в консоль, а не отправляются SMS
4. Проверьте формат номера телефона (должен быть E.164: +998901234567)

### Redirect после OAuth не работает

1. Проверьте настройки CORS
2. Убедитесь, что сессии работают корректно
3. Проверьте настройку SESSION_SECRET в .env

---

## Безопасность

1. **Никогда не коммитьте `.env` файл** в git
2. **Используйте длинный SESSION_SECRET** (минимум 32 символа)
3. **Включите HTTPS** в продакшене
4. **Регулярно ротируйте секреты** OAuth приложений
5. **Ограничьте права** OAuth приложений (запрашивайте только необходимые данные)

---

## Дополнительные возможности

### Отключение провайдеров

Чтобы отключить провайдер, просто удалите или оставьте пустыми его переменные окружения в `.env`.

### Добавление новых провайдеров

Для добавления новых OAuth провайдеров:
1. Установите соответствующую passport стратегию
2. Создайте файл настройки (например, `server/facebookAuth.ts`)
3. Добавьте импорт в `server/routes.ts`
4. Обновите `/api/auth/providers` endpoint
5. Добавьте кнопку в `client/src/pages/auth.tsx`
6. Добавьте переводы в локали

---

## Поддержка

Если возникли проблемы с настройкой, проверьте:
- Логи сервера при запуске
- Консоль браузера при попытке входа
- Настройки OAuth приложения в консоли провайдера
