# 🚀 AURELLE - Быстрый запуск деплоя

**Сервер**: 89.39.94.194
**Домен**: aurelle.uz, www.aurelle.uz
**Логин**: root
**Пароль**: w2@nT\*6D

---

## Вариант 1: Автоматический деплой (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Загрузите файлы на сервер

Откройте PowerShell/CMD на вашем компьютере:

```powershell
# Перейдите в директорию проекта
cd d:\AURELLE

# Загрузите архив проекта
scp aurelle-deploy.tar.gz root@89.39.94.194:/root/

# Загрузите скрипт установки
scp server-setup.sh root@89.39.94.194:/root/
```

При запросе пароля введите: `w2@nT*6D`

### Шаг 2: Запустите автоматическую установку

Подключитесь к серверу:

```bash
ssh root@89.39.94.194
# Пароль: w2@nT*6D
```

На сервере выполните:

```bash
# Сделайте скрипт исполняемым
chmod +x /root/server-setup.sh

# Запустите установку
bash /root/server-setup.sh
```

Скрипт автоматически выполнит:

- ✅ Очистку старых файлов
- ✅ Установку Node.js, PostgreSQL, Nginx, PM2
- ✅ Создание базы данных
- ✅ Распаковку проекта
- ✅ Установку зависимостей
- ✅ Сборку проекта
- ✅ Настройку Nginx
- ✅ Запуск приложения с PM2
- ✅ Настройку firewall

**Время выполнения**: ~15-20 минут

### Шаг 3: Настройка SSL (HTTPS)

После успешной установки выполните:

```bash
certbot --nginx -d aurelle.uz -d www.aurelle.uz
```

При запросе email введите ваш email и следуйте инструкциям.

### Шаг 4: Обновите OAuth Redirect URIs

#### Google OAuth:

1. Откройте https://console.cloud.google.com/
2. Перейдите в **APIs & Services** → **Credentials**
3. Найдите OAuth 2.0 Client ID: `60089668488-9gvr0ahqda3neh2p3dsdvbofd39piguj.apps.googleusercontent.com`
4. Нажмите **Edit**
5. В **Authorized redirect URIs** добавьте:
   - `https://aurelle.uz/api/auth/google/callback`
   - `https://www.aurelle.uz/api/auth/google/callback`
6. Сохраните

#### Yandex OAuth:

1. Откройте https://oauth.yandex.ru/
2. Найдите ваше приложение (Client ID: `3b79a753092d49bb977ce1ec5b3017ec`)
3. Нажмите **Редактировать**
4. В **Callback URI** добавьте:
   - `https://aurelle.uz/api/auth/yandex/callback`
   - `https://www.aurelle.uz/api/auth/yandex/callback`
5. Сохраните

### Шаг 5: Проверьте работу

Откройте в браузере:

- https://aurelle.uz
- https://www.aurelle.uz

Проверьте авторизацию:

- ✅ Email/Password
- ✅ Google OAuth
- ✅ Yandex OAuth

---

## Вариант 2: Ручной деплой

Если автоматический скрипт не сработал, следуйте подробной инструкции в файле [DEPLOY_TO_SERVER.md](./DEPLOY_TO_SERVER.md)

---

## Полезные команды для управления

### Просмотр статуса и логов:

```bash
# Статус приложения
pm2 status

# Просмотр логов в реальном времени
pm2 logs aurelle

# Последние 100 строк логов
pm2 logs aurelle --lines 100

# Мониторинг (CPU, память)
pm2 monit
```

### Перезапуск приложения:

```bash
# Перезапуск
pm2 restart aurelle

# Остановка
pm2 stop aurelle

# Запуск
pm2 start aurelle
```

### Обновление приложения (после изменений):

```bash
cd /var/www/aurelle

# Если используете git
git pull origin main

# Установка зависимостей
npm install

# Сборка
npm run build

# Применение изменений БД (если есть)
npm run db:push

# Перезапуск
pm2 restart aurelle
```

Или используйте автоматический скрипт:

```bash
cd /var/www/aurelle
./deploy.sh
```

### Бэкап базы данных:

```bash
cd /var/www/aurelle
./backup.sh
```

Бэкапы сохраняются в `/var/backups/aurelle/`

### Проверка Nginx:

```bash
# Проверка конфигурации
nginx -t

# Перезагрузка Nginx
systemctl reload nginx

# Статус Nginx
systemctl status nginx

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Проверка PostgreSQL:

```bash
# Подключение к БД
sudo -u postgres psql -d aurelle

# В psql:
\dt              # Список таблиц
\d+ users        # Структура таблицы users
SELECT * FROM users;  # Все пользователи
\q               # Выход
```

---

## Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
pm2 logs aurelle --err

# Проверьте, что порт 5000 свободен
netstat -tulpn | grep :5000

# Если порт занят, найдите процесс и убейте его
lsof -i :5000
kill -9 <PID>

# Перезапустите
pm2 delete aurelle
cd /var/www/aurelle
pm2 start npm --name "aurelle" -- start
```

### База данных не подключается

```bash
# Проверьте статус PostgreSQL
systemctl status postgresql

# Проверьте подключение
psql -U aurelle_user -d aurelle -h localhost -W
# Пароль: w2@nT*6D

# Если не работает, пересоздайте пользователя
sudo -u postgres psql
DROP DATABASE IF EXISTS aurelle;
DROP USER IF EXISTS aurelle_user;
CREATE DATABASE aurelle;
CREATE USER aurelle_user WITH PASSWORD 'w2@nT*6D';
GRANT ALL PRIVILEGES ON DATABASE aurelle TO aurelle_user;
ALTER DATABASE aurelle OWNER TO aurelle_user;
\q
```

### Nginx выдает ошибку 502 Bad Gateway

```bash
# Проверьте, что приложение запущено
pm2 status

# Если не запущено, запустите
pm2 start aurelle

# Проверьте, что приложение слушает порт 5000
curl http://localhost:5000

# Перезагрузите Nginx
systemctl restart nginx
```

### OAuth не работает

1. Проверьте, что Redirect URIs обновлены в Google/Yandex консолях
2. Проверьте, что в `.env` указаны правильные credentials
3. Проверьте логи: `pm2 logs aurelle`
4. Убедитесь, что используете HTTPS (не HTTP)

### SSL сертификат не выдается

```bash
# Проверьте, что DNS настроен правильно
dig aurelle.uz
dig www.aurelle.uz

# Проверьте, что порт 80 открыт
ufw status

# Попробуйте получить сертификат снова
certbot --nginx -d aurelle.uz -d www.aurelle.uz --verbose
```

---

## Контакты и документация

**Полная документация**:

- [README.md](./README.md) - Обзор проекта
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Детальная инструкция деплоя
- [DEPLOY_TO_SERVER.md](./DEPLOY_TO_SERVER.md) - Пошаговое руководство
- [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) - Настройка авторизации
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Чек-лист деплоя
- [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) - Сводка по проекту

**Важные файлы**:

- `server-setup.sh` - Автоматический скрипт установки
- `deploy.sh` - Скрипт обновления приложения
- `backup.sh` - Скрипт бэкапа БД
- `ecosystem.config.cjs` - Конфигурация PM2
- `nginx.conf` - Конфигурация Nginx

---

## ✅ Чек-лист после деплоя

- [ ] Сайт открывается по HTTPS: https://aurelle.uz
- [ ] SSL сертификат валидный (зеленый замок)
- [ ] HTTP редиректит на HTTPS
- [ ] Вход через Email работает
- [ ] Вход через Google работает
- [ ] Вход через Yandex работает
- [ ] Можно просмотреть список салонов
- [ ] Можно создать бронирование
- [ ] Переключение языков работает (EN/RU/UZ)
- [ ] PM2 показывает статус "online"
- [ ] Логи не содержат критических ошибок
- [ ] Бэкап базы данных настроен

---

**Удачного деплоя! 🚀**

Если возникнут проблемы, проверьте логи:

```bash
pm2 logs aurelle --lines 100
```

И обращайтесь за помощью, если нужно.
