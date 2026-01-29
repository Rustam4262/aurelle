# Настройка OAuth для продакшена

После деплоя на сервер необходимо обновить Redirect URIs во всех OAuth провайдерах.

## Важно!

Замените `your-domain.com` на ваш реальный домен во всех инструкциях ниже.

---

## 1. Google OAuth

### Ваши текущие credentials:

- **Client ID**: `60089668488-9gvr0ahqda3neh2p3dsdvbofd39piguj.apps.googleusercontent.com`
- **Client Secret**: `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`

### Шаги настройки:

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. В меню слева: **APIs & Services** → **Credentials**
4. Найдите ваш OAuth 2.0 Client ID
5. Нажмите на него для редактирования
6. В разделе **Authorized redirect URIs** добавьте:
   ```
   https://your-domain.com/api/auth/google/callback
   ```
7. Если используете www поддомен, добавьте также:
   ```
   https://www.your-domain.com/api/auth/google/callback
   ```
8. **Сохраните** изменения

### Проверка:

```bash
curl https://your-domain.com/api/auth/providers
# Должно вернуть: { "google": true, ... }
```

---

## 2. Yandex OAuth

### Ваши текущие credentials:

- **Client ID**: `3b79a753092d49bb977ce1ec5b3017ec`
- **Client Secret**: `3086c3c9bf844b5298f801005307e4d4`

### Шаги настройки:

1. Перейдите на [Яндекс OAuth](https://oauth.yandex.ru/)
2. Войдите в аккаунт
3. Найдите ваше приложение в списке
4. Нажмите **Редактировать**
5. В разделе **Callback URI** (Redirect URI) добавьте:
   ```
   https://your-domain.com/api/auth/yandex/callback
   ```
6. Если используете www поддомен, добавьте:
   ```
   https://www.your-domain.com/api/auth/yandex/callback
   ```
7. **Сохраните** изменения

### Проверка:

```bash
curl https://your-domain.com/api/auth/providers
# Должно вернуть: { "yandex": true, ... }
```

---

## 3. GitHub OAuth (опционально)

Если планируете использовать GitHub OAuth:

### Шаги настройки:

1. Перейдите в [GitHub Developer Settings](https://github.com/settings/developers)
2. Нажмите **New OAuth App** или выберите существующее
3. Заполните форму:
   - **Application name**: `AURELLE`
   - **Homepage URL**: `https://your-domain.com`
   - **Application description**: `Beauty salon marketplace`
   - **Authorization callback URL**: `https://your-domain.com/api/auth/github/callback`
4. Нажмите **Register application** (или **Update application**)
5. Скопируйте **Client ID** и сгенерируйте **Client Secret**
6. Добавьте их в `.env` файл на сервере:
   ```env
   GITHUB_CLIENT_ID=ваш-client-id
   GITHUB_CLIENT_SECRET=ваш-client-secret
   ```
7. Перезапустите приложение:
   ```bash
   pm2 restart aurelle
   ```

---

## 4. Проверка всех провайдеров

После настройки всех провайдеров проверьте их статус:

```bash
curl https://your-domain.com/api/auth/providers
```

Ожидаемый ответ:

```json
{
  "local": true,
  "yandex": true,
  "google": true,
  "github": false, // или true, если настроили
  "phone": false // или true, если настроили Twilio
}
```

---

## 5. Тестирование OAuth

### Тест Google OAuth:

1. Откройте https://your-domain.com/auth
2. Нажмите **Sign in with Google**
3. Вас перенаправит на страницу авторизации Google
4. После успешного входа вернет на ваш сайт

### Тест Yandex OAuth:

1. Откройте https://your-domain.com/auth
2. Нажмите **Войти через Яндекс**
3. Вас перенаправит на страницу авторизации Яндекс
4. После успешного входа вернет на ваш сайт

---

## Troubleshooting

### Ошибка "redirect_uri_mismatch"

**Проблема**: Google/Yandex возвращает ошибку о несовпадении redirect_uri

**Решение**:

1. Убедитесь что используете **HTTPS** (не HTTP)
2. Проверьте что домен точно совпадает (включая www или без него)
3. Проверьте что путь точно `/api/auth/google/callback` или `/api/auth/yandex/callback`
4. Убедитесь что в консоли провайдера redirect URI без trailing slash `/`

### OAuth работает локально, но не на сервере

**Проверьте**:

1. `.env` файл на сервере содержит правильные Client ID и Secret
2. HTTPS настроен правильно (проверьте SSL сертификат)
3. Nginx проксирует запросы на Node.js (проверьте логи nginx)
4. Приложение запущено: `pm2 status aurelle`

**Логи**:

```bash
# Логи приложения
pm2 logs aurelle

# Логи Nginx
sudo tail -f /var/log/nginx/aurelle_error.log
```

### Сессия не сохраняется после OAuth

**Проблема**: После успешной авторизации пользователь остается неавторизованным

**Решение**:

1. Проверьте что `SESSION_SECRET` установлен в `.env`
2. Убедитесь что используется один домен (не смешивайте с/без www)
3. Проверьте настройки cookies в браузере
4. Убедитесь что база данных доступна для сохранения сессий

---

## Обновление credentials

Если нужно изменить Client ID или Secret:

1. Обновите credentials в консоли провайдера (Google/Yandex/GitHub)
2. Обновите `.env` файл на сервере:
   ```bash
   nano /var/www/aurelle/.env
   ```
3. Перезапустите приложение:
   ```bash
   pm2 restart aurelle
   ```
4. Проверьте что приложение запустилось:
   ```bash
   pm2 status aurelle
   pm2 logs aurelle --lines 50
   ```

---

## Безопасность

### Важные рекомендации:

1. **Никогда не коммитьте `.env` в git**

   ```bash
   # Убедитесь что .env в .gitignore
   echo ".env" >> .gitignore
   ```

2. **Используйте разные credentials для dev и prod**
   - Development: `http://localhost:5000/api/auth/.../callback`
   - Production: `https://your-domain.com/api/auth/.../callback`

3. **Регулярно ротируйте Client Secrets**
   - Обновляйте секреты каждые 6-12 месяцев
   - При подозрении на компрометацию - немедленно

4. **Ограничьте права OAuth приложений**
   - Запрашивайте только необходимые scope
   - Google: `profile`, `email`
   - Yandex: доступ к email, аватару, имени

---

## Контрольный список перед запуском

- [ ] SSL сертификат установлен и работает
- [ ] Redirect URIs обновлены в Google OAuth Console
- [ ] Redirect URIs обновлены в Yandex OAuth
- [ ] `.env` файл содержит production credentials
- [ ] `SESSION_SECRET` сгенерирован новый (минимум 64 символа)
- [ ] Приложение запущено через PM2
- [ ] Nginx правильно настроен и запущен
- [ ] Протестирован вход через Google
- [ ] Протестирован вход через Yandex
- [ ] Проверены логи на наличие ошибок

---

**Готово! OAuth настроен для продакшена.** 🚀
