# 📋 Deployment Checklist

Используйте этот чек-лист для деплоя AURELLE на production сервер.

---

## 🎯 Подготовка

### Локально (перед деплоем)

- [ ] Проект собирается без ошибок (`npm run build`)
- [ ] TypeScript проверка проходит (`npm run check`)
- [ ] Все изменения закоммичены в git
- [ ] `.env` добавлен в `.gitignore`
- [ ] Проект запушен в GitHub/GitLab
- [ ] README.md обновлен
- [ ] Документация актуальна

---

## 🖥️ Сервер - Базовая настройка

### Системные требования

- [ ] Ubuntu 20.04+ или Debian 11+ установлен
- [ ] Доступ по SSH с правами sudo
- [ ] Минимум 2GB RAM
- [ ] Минимум 10GB диск
- [ ] Открыты порты 80, 443, 22

### Установка ПО

- [ ] Node.js 18+ установлен (`node --version`)
- [ ] npm установлен (`npm --version`)
- [ ] PostgreSQL 14+ установлен (`psql --version`)
- [ ] Nginx установлен (`nginx -v`)
- [ ] Certbot установлен (`certbot --version`)
- [ ] PM2 установлен глобально (`pm2 --version`)
- [ ] Git установлен (`git --version`)

---

## 🗄️ База данных

### PostgreSQL настройка

- [ ] PostgreSQL запущен (`sudo systemctl status postgresql`)
- [ ] База данных `aurelle` создана
- [ ] Пользователь `aurelle_user` создан
- [ ] Права на базу предоставлены
- [ ] Пароль сохранен безопасно
- [ ] Подключение к БД работает (`psql -U aurelle_user -d aurelle`)

---

## 📂 Проект

### Клонирование и установка

- [ ] Проект склонирован в `/var/www/aurelle`
- [ ] Права на директорию настроены (`chown -R $USER:$USER`)
- [ ] `npm install` выполнен успешно
- [ ] Все зависимости установлены

### Environment (.env)

- [ ] Файл `.env` создан
- [ ] `DATABASE_URL` настроен правильно
- [ ] `SESSION_SECRET` сгенерирован (64+ символа)
- [ ] `NODE_ENV=production` установлен
- [ ] `PORT=5000` установлен
- [ ] Google OAuth credentials добавлены
- [ ] Yandex OAuth credentials добавлены
- [ ] GitHub OAuth credentials добавлены (если используется)
- [ ] Twilio credentials добавлены (если используется)

### Build и миграции

- [ ] `npm run build` выполнен успешно
- [ ] Build создан в `dist/` директории
- [ ] `npm run db:push` выполнен успешно
- [ ] Схема БД применена
- [ ] Тестовые данные загружены (опционально)

---

## 🌐 Nginx

### Конфигурация

- [ ] Файл `/etc/nginx/sites-available/aurelle` создан
- [ ] Домен заменен на реальный (не `your-domain.com`)
- [ ] Symbolic link создан в `sites-enabled`
- [ ] Nginx конфиг проверен (`sudo nginx -t`)
- [ ] Nginx перезапущен (`sudo systemctl restart nginx`)
- [ ] Nginx запускается автоматически (`sudo systemctl enable nginx`)

### Firewall

- [ ] UFW установлен
- [ ] SSH разрешен (`sudo ufw allow ssh`)
- [ ] HTTP разрешен (`sudo ufw allow 'Nginx HTTP'`)
- [ ] HTTPS разрешен (`sudo ufw allow 'Nginx HTTPS'`)
- [ ] UFW включен (`sudo ufw enable`)
- [ ] Статус проверен (`sudo ufw status`)

---

## 🔐 SSL сертификат

### Let's Encrypt

- [ ] DNS A-запись настроена на IP сервера
- [ ] DNS propagation завершена (можно проверить на dnschecker.org)
- [ ] Certbot запущен (`sudo certbot --nginx -d domain.com -d www.domain.com`)
- [ ] Сертификат получен успешно
- [ ] Автоматический renewal настроен
- [ ] Nginx автоматически настроен для HTTPS
- [ ] HTTP редирект на HTTPS работает
- [ ] SSL проверен (https://www.ssllabs.com/ssltest/)

---

## 🚀 PM2 и запуск приложения

### PM2 Setup

- [ ] PM2 установлен глобально
- [ ] Приложение запущено (`pm2 start npm --name "aurelle" -- start`)
- [ ] Приложение в статусе "online" (`pm2 status`)
- [ ] Автозапуск настроен (`pm2 startup` и `pm2 save`)
- [ ] Логи проверены (`pm2 logs aurelle`)
- [ ] Нет ошибок в логах

### ecosystem.config.cjs (опционально)

- [ ] Файл `ecosystem.config.cjs` настроен
- [ ] Режим cluster включен
- [ ] Logging настроен
- [ ] PM2 запущен через ecosystem (`pm2 start ecosystem.config.cjs`)

---

## 🔑 OAuth провайдеры

### Google OAuth

- [ ] Google Cloud Console открыт
- [ ] OAuth Client ID найден
- [ ] Authorized redirect URIs обновлены:
  - [ ] `https://domain.com/api/auth/google/callback`
  - [ ] `https://www.domain.com/api/auth/google/callback`
- [ ] Изменения сохранены
- [ ] Вход через Google протестирован

### Yandex OAuth

- [ ] Яндекс OAuth консоль открыта
- [ ] Приложение найдено
- [ ] Callback URI обновлены:
  - [ ] `https://domain.com/api/auth/yandex/callback`
  - [ ] `https://www.domain.com/api/auth/yandex/callback`
- [ ] Изменения сохранены
- [ ] Вход через Yandex протестирован

### GitHub OAuth (опционально)

- [ ] GitHub Developer Settings открыты
- [ ] OAuth App найден/создан
- [ ] Authorization callback URL обновлен:
  - [ ] `https://domain.com/api/auth/github/callback`
- [ ] Client ID и Secret добавлены в `.env`
- [ ] Приложение перезапущено
- [ ] Вход через GitHub протестирован

---

## ✅ Тестирование

### Базовые проверки

- [ ] Сайт открывается по HTTPS (`https://domain.com`)
- [ ] HTTP редиректит на HTTPS
- [ ] SSL сертификат валидный (зеленый замок в браузере)
- [ ] Статические файлы загружаются (картинки, CSS, JS)
- [ ] Нет ошибок в консоли браузера

### API проверки

- [ ] `/api/auth/providers` возвращает правильные данные
  ```bash
  curl https://domain.com/api/auth/providers
  # {"local":true,"yandex":true,"google":true,...}
  ```
- [ ] `/api/auth/user` работает
- [ ] API отвечает быстро (<500ms)

### Авторизация

- [ ] Регистрация через Email работает
- [ ] Вход через Email работает
- [ ] Вход через Google работает
- [ ] Вход через Yandex работает
- [ ] Вход через GitHub работает (если настроен)
- [ ] Вход через Phone работает (если настроен)
- [ ] Выход работает
- [ ] Сессия сохраняется после перезагрузки страницы

### Функциональность

- [ ] Главная страница загружается
- [ ] Можно просмотреть список салонов
- [ ] Детали салона открываются
- [ ] Бронирование работает
- [ ] Профиль пользователя работает
- [ ] Переключение языков работает (EN/RU/UZ)
- [ ] Загрузка изображений работает

### Производительность

- [ ] Страницы загружаются быстро (<2s)
- [ ] Нет memory leaks (проверить `pm2 monit`)
- [ ] CPU использование нормальное (<50% при обычной нагрузке)
- [ ] База данных отвечает быстро

---

## 📊 Мониторинг

### Логи

- [ ] PM2 логи доступны (`pm2 logs aurelle`)
- [ ] Nginx логи доступны
  - [ ] Access log: `/var/log/nginx/aurelle_access.log`
  - [ ] Error log: `/var/log/nginx/aurelle_error.log`
- [ ] PostgreSQL логи доступны
- [ ] Logrotate настроен (опционально)

### Monitoring

- [ ] PM2 monitoring работает (`pm2 monit`)
- [ ] Uptime monitoring настроен (опционально, например UptimeRobot)
- [ ] Error tracking настроен (опционально, например Sentry)

---

## 💾 Backup

### Database Backup

- [ ] Скрипт `backup.sh` настроен
- [ ] Скрипт исполняемый (`chmod +x backup.sh`)
- [ ] Тестовый бэкап выполнен (`./backup.sh`)
- [ ] Бэкап-директория создана (`/var/backups/aurelle`)
- [ ] Cron job настроен для автоматического бэкапа
  ```bash
  0 2 * * * /var/www/aurelle/backup.sh >> /var/log/aurelle_backup.log 2>&1
  ```
- [ ] Ротация бэкапов работает (удаление старых)

### File Backup

- [ ] `.env` файл сохранен отдельно (вне git)
- [ ] SSL сертификаты сохранены
- [ ] Uploaded files бэкапятся отдельно

---

## 🔄 Deployment процесс

### Автоматический деплой

- [ ] Скрипт `deploy.sh` настроен
- [ ] Скрипт исполняемый (`chmod +x deploy.sh`)
- [ ] Тестовый деплой выполнен (`./deploy.sh`)
- [ ] Git pull работает
- [ ] Build проходит успешно
- [ ] DB migrations применяются
- [ ] PM2 restart работает

### CI/CD (опционально)

- [ ] GitHub Actions настроен (опционально)
- [ ] Автоматическое тестирование (опционально)
- [ ] Автоматический deploy (опционально)

---

## 📱 Дополнительно

### Performance

- [ ] Gzip compression включен в Nginx
- [ ] Static files caching настроен
- [ ] Database indexes созданы
- [ ] CDN настроен для статики (опционально)

### Security

- [ ] SSH ключи настроены (не password auth)
- [ ] Root login отключен
- [ ] Fail2ban установлен (опционально)
- [ ] Регулярные security updates настроены
- [ ] Секреты не в git (.env в .gitignore)
- [ ] CORS настроен правильно
- [ ] Rate limiting работает

### SEO (опционально)

- [ ] Meta tags настроены
- [ ] Open Graph tags добавлены
- [ ] robots.txt создан
- [ ] sitemap.xml создан
- [ ] Google Analytics добавлен (опционально)

---

## 📞 Post-deployment

### Документация

- [ ] Production credentials задокументированы (в безопасном месте)
- [ ] Server access details сохранены
- [ ] Emergency contacts список создан
- [ ] Runbook создан для типичных проблем

### Communication

- [ ] Команда уведомлена о деплое
- [ ] Пользователи уведомлены (если нужно)
- [ ] Status page обновлен (если есть)

---

## ✅ Final Check

- [ ] Приложение работает стабильно 24+ часа
- [ ] Нет критических ошибок в логах
- [ ] Все тесты пройдены
- [ ] Performance удовлетворительна
- [ ] Backup работает
- [ ] Monitoring настроен

---

## 🎉 Готово!

**Дата деплоя**: ******\_******

**Deployed by**: ******\_******

**Production URL**: https://******\_\_\_\_******

**Notes**:

---

---

---

---

**Следующий review**: через 7 дней

**Следующее обновление**: ******\_******
