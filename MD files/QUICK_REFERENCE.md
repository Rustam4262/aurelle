# 🚀 AURELLE - Быстрая справка

## 🌐 URL приложения

**https://aurelle.uz** ✅

---

## 🔑 Доступ к серверу

```bash
ssh root@89.39.94.194
# Пароль: w2@nT*6D
```

---

## ⚠️ ВАЖНО: СДЕЛАЙТЕ СРАЗУ!

### Обновите OAuth Redirect URIs

**Google**: https://console.cloud.google.com/

```
Добавьте в Authorized redirect URIs:
https://aurelle.uz/api/auth/google/callback
https://www.aurelle.uz/api/auth/google/callback
```

**Yandex**: https://oauth.yandex.ru/

```
Добавьте в Callback URI:
https://aurelle.uz/api/auth/yandex/callback
https://www.aurelle.uz/api/auth/yandex/callback
```

**БЕЗ ЭТОГО OAuth НЕ БУДЕТ РАБОТАТЬ!**

---

## 🐳 Docker команды

```bash
cd /var/www/aurelle

# Статус контейнеров
docker-compose ps

# Логи приложения
docker-compose logs app -f

# Перезапуск
docker-compose restart app

# Остановить всё
docker-compose down

# Запустить всё
docker-compose up -d
```

---

## 🔄 Обновление с GitHub

```bash
cd /var/www/aurelle
git pull origin main
docker-compose up -d --build
docker-compose exec app npm run db:push
```

---

## 📊 Логи

```bash
# Приложение
docker-compose logs app -f

# База данных
docker-compose logs postgres -f

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 💾 Бэкап БД

```bash
cd /var/www/aurelle
docker-compose exec postgres pg_dump -U aurelle_user aurelle > backup-$(date +%Y%m%d).sql
```

---

## 🔐 SSL

```bash
# Статус сертификата
certbot certificates

# Обновить (автоматически каждые 60 дней)
certbot renew
```

---

## ✅ Что работает

- ✅ HTTPS с автообновлением SSL
- ✅ Email авторизация
- ✅ Google OAuth (после обновления URIs)
- ✅ Yandex OAuth (после обновления URIs)
- ✅ База данных PostgreSQL 14
- ✅ Автозапуск при перезагрузке сервера

---

## 📞 Поддержка

**Документация**: См. `DEPLOYMENT_SUCCESS.md`
**GitHub**: https://github.com/Rustam4262/aurelle
