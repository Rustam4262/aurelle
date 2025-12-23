# 🔒 SSL/HTTPS Configuration для AURELLE

## ✅ Текущий статус

- **HTTPS**: ✅ Работает на `https://aurelle.uz`
- **HTTP -> HTTPS редирект**: ✅ Автоматический
- **SSL сертификат**: ✅ Let's Encrypt (бесплатный)
- **Срок действия**: до **22 марта 2026**
- **Авто-обновление**: ✅ Настроено (каждый день в 3:00 UTC)

---

## 📋 Что было сделано

### 1. Получен SSL сертификат от Let's Encrypt

```bash
certbot certonly --standalone -d aurelle.uz -d www.aurelle.uz \
  --non-interactive --agree-tos --email admin@aurelle.uz
```

**Файлы сертификата:**
- Сертификат: `/etc/letsencrypt/live/aurelle.uz/fullchain.pem`
- Приватный ключ: `/etc/letsencrypt/live/aurelle.uz/privkey.pem`

### 2. Nginx настроен на HTTPS

**Конфигурация**: [`nginx_https.conf`](nginx_https.conf)

**Основные возможности:**
- ✅ HTTP (80) → HTTPS (443) автоматический редирект
- ✅ TLS 1.2 + TLS 1.3 (современные протоколы)
- ✅ Security headers (HSTS, X-Frame-Options, CSP и др.)
- ✅ HTTP/2 для быстрой загрузки
- ✅ Кэширование статики (1 год)

### 3. Docker контейнер обновлен

Контейнер `beauty_frontend_prod` теперь:
- Слушает порты **80** (HTTP) и **443** (HTTPS)
- Имеет доступ к сертификатам (`-v /etc/letsencrypt:/etc/letsencrypt:ro`)
- Автоматически перезапускается при падении

### 4. Автоматическое обновление сертификата

**Cron job** (запускается каждый день в 3:00 UTC):
```cron
0 3 * * * /usr/bin/certbot renew --quiet --post-hook "docker exec beauty_frontend_prod nginx -s reload"
```

**Что происходит:**
1. Certbot проверяет, не истек ли сертификат (за 30 дней до истечения)
2. Если нужно - обновляет сертификат
3. Перезагружает nginx в контейнере для применения нового сертификата

---

## 🔧 Управление SSL

### Проверить статус сертификата

```bash
ssh root@89.39.94.194

# Посмотреть информацию о сертификате
certbot certificates

# Проверить срок действия
echo | openssl s_client -connect aurelle.uz:443 -servername aurelle.uz 2>/dev/null | \
  openssl x509 -noout -dates
```

### Вручную обновить сертификат (если нужно)

```bash
ssh root@89.39.94.194

# Остановить контейнер (освободить порт 80)
docker stop beauty_frontend_prod

# Обновить сертификат
certbot renew --force-renewal

# Запустить контейнер обратно
docker start beauty_frontend_prod

# Перезагрузить nginx
docker exec beauty_frontend_prod nginx -s reload
```

### Тест авто-обновления (dry-run)

```bash
ssh root@89.39.94.194
certbot renew --dry-run
```

Если видишь "Congratulations, all simulated renewals succeeded" - всё настроено правильно!

---

## 🛡️ Security Headers

Сайт защищен следующими заголовками:

| Header | Значение | Защита от |
|--------|----------|-----------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Downgrade атак, заставляет браузер использовать только HTTPS |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking (встраивание сайта в iframe) |
| `X-Content-Type-Options` | `nosniff` | MIME-type sniffing атак |
| `X-XSS-Protection` | `1; mode=block` | XSS атак (дополнительная защита) |

**Проверить заголовки:**
```bash
curl -I https://aurelle.uz
```

---

## 🔄 Что делать при проблемах

### Проблема: HTTPS не работает

1. **Проверь контейнер:**
```bash
docker ps | grep frontend
# Должен быть UP с портами 0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

2. **Проверь nginx:**
```bash
docker exec beauty_frontend_prod nginx -t
docker logs beauty_frontend_prod --tail 50
```

3. **Проверь сертификаты примонтированы:**
```bash
docker exec beauty_frontend_prod ls -la /etc/letsencrypt/live/aurelle.uz/
```

### Проблема: Сертификат истек

1. **Обнови вручную:**
```bash
docker stop beauty_frontend_prod
certbot renew --force-renewal
docker start beauty_frontend_prod
docker exec beauty_frontend_prod nginx -s reload
```

2. **Проверь cron:**
```bash
crontab -l
# Должна быть строка: 0 3 * * * /usr/bin/certbot renew...
```

### Проблема: HTTP редирект не работает

1. **Проверь nginx конфиг:**
```bash
docker exec beauty_frontend_prod cat /etc/nginx/conf.d/default.conf | grep -A 5 "listen 80"
```

Должен быть блок с `return 301 https://...`

2. **Перезагрузи nginx:**
```bash
docker exec beauty_frontend_prod nginx -s reload
```

---

## 📊 SSL Rating

Проверь качество SSL на сайте: https://www.ssllabs.com/ssltest/analyze.html?d=aurelle.uz

**Ожидаемый рейтинг**: A или A+

---

## 🚀 Дополнительные улучшения (опционально)

### 1. OCSP Stapling (для ускорения SSL handshake)

Добавь в nginx config:
```nginx
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/letsencrypt/live/aurelle.uz/chain.pem;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

### 2. Certificate Transparency (CT) логи

Уже включено в Let's Encrypt по умолчанию! Проверить можно на: https://crt.sh/?q=aurelle.uz

---

## 📞 Контакты для SSL вопросов

- **Let's Encrypt документация**: https://letsencrypt.org/docs/
- **Certbot документация**: https://certbot.eff.org/docs/
- **Проверка SSL**: https://www.ssllabs.com/ssltest/

---

## ✅ Чеклист после настройки SSL

- [x] HTTPS работает на `https://aurelle.uz`
- [x] HTTP редиректит на HTTPS
- [x] Сертификат валидный (без предупреждений в браузере)
- [x] Security headers настроены
- [x] Авто-обновление сертификата работает
- [x] Cron job создан и активен
- [x] Контейнер слушает порты 80 и 443
- [x] Сертификаты примонтированы в контейнер

---

**Дата создания**: 22.12.2025
**Дата истечения сертификата**: 22.03.2026
**Следующая проверка обновления**: Автоматически каждый день в 3:00 UTC
