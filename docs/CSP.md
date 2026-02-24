# CSP — Content Security Policy

> Документация по политике безопасности контента для AURELLE.

## ⚠️ Архитектура: CSP задаётся В ДВУХ местах

```
User → nginx (443)
         ├── /api/* → proxy_pass → Node.js (Express + Helmet CSP)
         └── /*     → try_files  → dist/public/index.html  ← nginx CSP
```

В production nginx отдаёт `index.html` **напрямую** через `try_files`.
Это значит:

| Запрос                | CSP-источник                               |
| --------------------- | ------------------------------------------ |
| HTML-страница (GET /) | **nginx** → `configs/nginx-https.conf`     |
| API-ответы (/api/*)   | Node.js Helmet → `server/index.ts`         |
| Локальный dev (vite)  | Только Node.js Helmet                      |

**Правило**: при изменении CSP — менять **оба файла** синхронно.
Менять только `server/index.ts` → в проде ничего не поменяется для HTML.

---

## Текущая политика

### 1. nginx — production HTML (`configs/nginx-https.conf`)

```
default-src   'self'
style-src     'self' 'unsafe-inline' https://fonts.googleapis.com
font-src      'self' https://fonts.gstatic.com
script-src    'self' 'unsafe-inline' 'unsafe-eval'
              https://www.googletagmanager.com
              https://www.google-analytics.com
img-src       'self' data: https: blob:
connect-src   'self'
              https://*.sentry.io
              https://api-maps.yandex.ru
              https://www.google-analytics.com
              https://www.googletagmanager.com
frame-src     https://www.googletagmanager.com
```

## Разрешённые домены — таблица

| Директива | Домен | Зачем |
|-----------|-------|-------|
| `style-src` | `https://fonts.googleapis.com` | Загрузка CSS для Google Fonts |
| `font-src` | `https://fonts.gstatic.com` | Загрузка woff2 файлов шрифтов |
| `script-src` | `https://www.googletagmanager.com` | GTM скрипт |
| `script-src` | `https://www.google-analytics.com` | GA4 |
| `connect-src` | `https://*.sentry.io` | Sentry — отправка ошибок |
| `connect-src` | `https://api-maps.yandex.ru` | Yandex Maps API |
| `connect-src` | `https://www.google-analytics.com` | GA4 hit запросы |
| `connect-src` | `https://www.googletagmanager.com` | GTM |
| `frame-src` | `https://www.googletagmanager.com` | GTM noscript iframe |

## Почему `'unsafe-inline'` для script-src

GTM и GA инлайнят скрипты прямо в HTML (`client/index.html`).
Без `'unsafe-inline'` они не работают.

**Правильное решение (следующий шаг):** перейти на nonce:

```javascript
// server: генерировать nonce на каждый запрос
const nonce = crypto.randomBytes(16).toString('base64');

// CSP заголовок:
scriptSrc: ["'self'", `'nonce-${nonce}'`, "https://www.googletagmanager.com"],

// HTML: передавать nonce в шаблон
<script nonce="${nonce}">...</script>
```

Это требует SSR или серверного рендеринга HTML, у нас пока SPA.

## Диагностика CSP-блокировок

### Где смотреть

В браузере → DevTools → Console → фильтр "Content Security Policy"

Пример нормальной ошибки (не критично):
```
Refused to load the script 'chrome-extension://...' because it violates CSP
```

Пример критичной ошибки (нужно чинить):
```
Refused to load the stylesheet 'https://fonts.googleapis.com/...'
because it violates the following Content Security Policy directive: "style-src 'self'"
```

### Как проверить заголовки в проде

```bash
curl -I https://aurelle.uz | grep -i "content-security"
```

### Быстрая проверка без деплоя (локально)

```bash
npm run build && npm start
# Открыть http://localhost:5000 и смотреть Console
```

## Что НЕ нужно разрешать

| Что | Почему не нужно |
|-----|-----------------|
| `'unsafe-eval'` для prod | Нужно убрать — GTM не требует, используется только для dev Vite |
| `*` (wildcard) | Слишком широко |
| `data:` для `script-src` | XSS вектор |

**TODO**: убрать `'unsafe-eval'` из production CSP (сейчас нужен для dev Vite).

## Следующий шаг: self-hosted fonts

Самый безопасный вариант — убрать зависимость от Google Fonts:

```bash
# 1. Скачать шрифты локально
mkdir -p client/public/fonts
# Скачать Inter и Cormorant Garamond .woff2 файлы

# 2. В index.css добавить @font-face
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}

# 3. Убрать из CSP:
#   style-src: fonts.googleapis.com
#   font-src: fonts.gstatic.com

# 4. Убрать из index.html:
#   <link rel="preconnect" href="https://fonts.googleapis.com" />
#   <link href="https://fonts.googleapis.com/css2?..." rel="stylesheet" />
```

Это даёт: быстрее загрузка, нет GDPR проблем с Google, CSP проще.
