# RUNBOOK — SSL / Домен / HTTPS

> Браузер показывает "Соединение не защищено" или сертификат истёк.

---

## Диагностика сертификата

```bash
# Когда истекает?
echo | openssl s_client -connect aurelle.uz:443 -servername aurelle.uz 2>/dev/null \
  | openssl x509 -noout -dates

# Certbot: список и даты
certbot certificates

# Быстрая проверка: сколько дней осталось
echo | openssl s_client -connect aurelle.uz:443 -servername aurelle.uz 2>/dev/null \
  | openssl x509 -noout -checkend 604800  # 604800 = 7 дней
# Exitcode 0 = OK, 1 = истечёт через 7 дней
```

---

## Сценарий 1 — Сертификат истёк

```bash
# Продлить вручную
certbot renew --cert-name aurelle.uz

# Если nginx не перезагрузился автоматически
systemctl reload nginx

# Проверить
curl -I https://aurelle.uz
```

Если ошибка при продлении (`Connection refused` при challenge):
```bash
# Временно остановить nginx (certbot standalone mode)
systemctl stop nginx
certbot renew --standalone
systemctl start nginx
```

---

## Сценарий 2 — Сертификат ещё не истёк, но браузер ругается

```bash
# Проверить что сертификат для правильного домена
echo | openssl s_client -connect aurelle.uz:443 -servername aurelle.uz 2>/dev/null \
  | openssl x509 -noout -subject -subjectAltName

# Смотреть nginx конфиг — правильный ли путь к сертификату?
cat /etc/nginx/sites-enabled/aurelle | grep ssl_certificate
```

---

## Сценарий 3 — Домен не резолвится

```bash
# Проверить DNS
dig aurelle.uz A
nslookup aurelle.uz

# Должен указывать на IP сервера: 89.39.94.194
```

Если DNS не обновился — ждать до 48 часов или проверить TTL:
```bash
dig aurelle.uz A +ttl
```

---

## Сценарий 4 — HTTP не редиректит на HTTPS

Проверить nginx конфиг:
```nginx
# Должен быть блок для 80
server {
    listen 80;
    server_name aurelle.uz www.aurelle.uz;
    return 301 https://aurelle.uz$request_uri;
}
```

```bash
# Проверить редирект
curl -I http://aurelle.uz
# Ожидаем: 301 и Location: https://aurelle.uz/
```

---

## Автообновление сертификата

Certbot должен обновлять автоматически через cron/systemd timer.

```bash
# Проверить cron
crontab -l | grep certbot

# Или systemd timer
systemctl status certbot.timer

# Dry-run чтобы убедиться что автообновление работает
certbot renew --dry-run
```

Если таймер не настроен — добавить:
```bash
# Cron: продление в 3:30 каждый день
30 3 * * * certbot renew --quiet && systemctl reload nginx
```

---

## Настройка нового сертификата с нуля

```bash
# Получить новый сертификат
certbot --nginx -d aurelle.uz -d www.aurelle.uz

# Или standalone (без nginx интеграции)
certbot certonly --standalone -d aurelle.uz -d www.aurelle.uz

# После — указать пути в nginx конфиге
ssl_certificate     /etc/letsencrypt/live/aurelle.uz/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/aurelle.uz/privkey.pem;
```

---

## Мониторинг срока истечения

Добавить в cron — предупреждение за 30 дней:
```bash
# Ежедневная проверка
0 9 * * * certbot certificates 2>&1 | grep -A2 "VALID\|EXPIRED" | mail -s "SSL check aurelle.uz" admin@aurelle.uz
```

Или использовать внешний сервис: `uptimerobot.com`, `hetrixtools.com` — они умеют мониторить SSL.
