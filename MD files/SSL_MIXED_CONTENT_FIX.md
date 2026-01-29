# 🔒 SSL Mixed Content - Решение

## ✅ Что уже исправлено

### 1. Nginx конфигурация обновлена

Добавлен **Content-Security-Policy** header который автоматически апгрейдит все HTTP запросы в HTTPS:

```nginx
add_header Content-Security-Policy "upgrade-insecure-requests" always;
```

**Файл:** `/etc/nginx/sites-available/aurelle.uz`

### 2. Проверка кода завершена

✅ **HTML** - чистый, все ссылки относительные или HTTPS
✅ **JavaScript bundle** - только безопасные ссылки (W3C namespaces, не загружаются)
✅ **CSS** - нет HTTP ссылок
✅ **API requests** - все используют относительные пути (`/api/...`)
✅ **Внешние ресурсы** - Google Fonts использует HTTPS

### 3. Возможный источник Mixed Content

**Yandex Maps API** - библиотека @pbe/react-yandex-maps может загружать ресурсы по HTTP.

**Решение:** CSP header `upgrade-insecure-requests` автоматически апгрейдит их в HTTPS.

---

## 🧪 Тестирование (выполнить вручную)

### Шаг 1: Очистить кэш браузера

```
Chrome: Ctrl+Shift+Delete → Очистить всё
Firefox: Ctrl+Shift+Delete → Очистить всё
Safari: Cmd+Option+E

Или открыть в режиме инкогнито
```

### Шаг 2: Открыть https://aurelle.uz

### Шаг 3: Проверить замок в адресной строке

**Ожидаем:**

- 🔒 Зелёный замок
- "Соединение защищено"
- Без предупреждения "Не защищено"

### Шаг 4: Проверить DevTools Console

```
F12 → Console

Что искать:
❌ "Mixed Content"
❌ "insecure resource"
❌ "blocked loading"

Если есть - скопировать URL ресурса
```

### Шаг 5: Force reload

```
Ctrl+Shift+R (Windows)
Cmd+Shift+R (Mac)
```

---

## 🔧 Если замок всё ещё не зелёный

### Вариант 1: Проверить конкретный URL

Если в Console есть Mixed Content warning:

```
Mixed Content: The page was loaded over HTTPS, but requested an insecure resource 'http://example.com/...'
```

**Решение:**

1. Найти этот URL в коде
2. Заменить `http://` на `https://`
3. Или заменить на протокол-относительный `//example.com/...`

### Вариант 2: Проверить Yandex Maps

Если Mixed Content связан с Yandex Maps:

#### A) Проверить что apikey настроен

```typescript
// client/src/components/location-picker.tsx
<YMaps
  query={{
    apikey: apiKey,  // Должен быть установлен
    lang: "ru_RU",
  }}
>
```

#### B) Если apikey отсутствует

Yandex Maps API может использовать HTTP без apikey. Установите его:

1. Получить API ключ: https://developer.tech.yandex.ru/services/
2. Добавить в `.env`:

   ```env
   VITE_YANDEX_MAPS_API_KEY=your_api_key_here
   ```

3. Использовать в коде:
   ```typescript
   const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
   ```

#### C) Альтернатива: указать HTTPS явно

Если @pbe/react-yandex-maps поддерживает опцию:

```typescript
<YMaps
  query={{
    apikey: apiKey,
    lang: "ru_RU",
    load: "package.full",
    mode: "release",
    scheme: "https",  // Принудительно HTTPS
  }}
>
```

### Вариант 3: Проверить другие внешние ресурсы

```bash
# Поиск HTTP ссылок в коде
grep -r "http://" client/src/ | grep -v node_modules | grep -v ".git"
```

Заменить найденные HTTP URL на:

- `https://...` (явно HTTPS)
- `//...` (протокол-относительный, использует текущий протокол страницы)

---

## 📊 Диагностика (команды для проверки)

### Проверить headers сервера

```bash
curl -I https://aurelle.uz | grep -i 'content-security-policy'
# Ожидаем: content-security-policy: upgrade-insecure-requests
```

### Проверить HTTP ссылки в HTML

```bash
curl -s https://aurelle.uz | grep -o 'http://[^"]*' | head -20
# Не должно быть результатов (кроме W3C namespaces)
```

### Проверить Nginx конфиг

```bash
ssh root@89.39.94.194 "grep 'Content-Security-Policy' /etc/nginx/sites-available/aurelle.uz"
# Ожидаем: add_header Content-Security-Policy "upgrade-insecure-requests" always;
```

---

## 🎯 Критерии успеха

- ✅ https://aurelle.uz открывается
- ✅ 🔒 Зелёный замок в браузере
- ✅ Нет предупреждения "Не защищено"
- ✅ В DevTools Console нет "Mixed Content"
- ✅ Все ресурсы загружаются по HTTPS
- ✅ Yandex Maps работает корректно

---

## 🔍 Техническая информация

### Что делает CSP upgrade-insecure-requests

```
Браузер автоматически:
1. http://example.com → https://example.com
2. http://api.aurelle.uz → https://api.aurelle.uz
3. ws://... → wss://... (WebSocket)

НЕ апгрейдит:
- W3C namespaces (xmlns)
- data: URI
- blob: URI
```

### Где применено

**Файл:** `/etc/nginx/sites-available/aurelle.uz`

```nginx
server {
    listen 443 ssl http2;
    server_name aurelle.uz;

    add_header Content-Security-Policy "upgrade-insecure-requests" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    # ...
}
```

### Как проверить что работает

```bash
# 1. Header присутствует
curl -I https://aurelle.uz 2>&1 | grep -i content-security

# 2. Браузер применяет политику
# DevTools → Network → Headers → Response Headers
# Должен быть: content-security-policy: upgrade-insecure-requests
```

---

## 📝 Следующие шаги

1. **Протестировать сайт** в браузере (Ctrl+Shift+R для force reload)
2. **Проверить Console** на наличие Mixed Content warnings
3. **Если есть warnings** - сообщить какой именно URL
4. **Проверить Yandex Maps** работают ли карты корректно

---

## 🆘 Если нужна помощь

Если после всех шагов замок всё ещё не зелёный:

1. Открыть DevTools (F12)
2. Перейти в Console
3. Скопировать ВСЕ сообщения с "Mixed Content" или "insecure"
4. Отправить скриншот или текст ошибок

Пример информации, которая поможет:

```
Mixed Content: The page at 'https://aurelle.uz/' was loaded over HTTPS,
but requested an insecure resource 'http://api-maps.yandex.ru/...'.
This request has been blocked; the content must be served over HTTPS.
```

С этой информацией можно точно определить источник проблемы и исправить.
