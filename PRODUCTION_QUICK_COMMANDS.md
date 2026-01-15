# 🚀 AURELLE Production - Быстрые команды

**Сервер**: 89.39.94.194
**URL**: http://89.39.94.194

---

## 🔗 Подключение

```bash
ssh root@89.39.94.194
```

---

## 📊 Мониторинг

### PM2 статус
```bash
pm2 status
```

### Логи в реальном времени
```bash
pm2 logs aurelle-production
```

### Последние 50 строк логов
```bash
pm2 logs aurelle-production --lines 50
```

### Только ошибки
```bash
pm2 logs aurelle-production --err
```

### Мониторинг CPU/Memory
```bash
pm2 monit
```

---

## 🔄 Управление приложением

### Перезапуск (zero-downtime)
```bash
pm2 reload aurelle-production
```

### Рестарт (с остановкой)
```bash
pm2 restart aurelle-production
```

### Остановка
```bash
pm2 stop aurelle-production
```

### Запуск
```bash
pm2 start aurelle-production
```

### Удаление из PM2
```bash
pm2 delete aurelle-production
```

---

## 🔧 Обновление приложения

### Полное обновление
```bash
cd /var/www/aurelle/current
git pull origin main
npm ci
npm run build
pm2 reload aurelle-production
```

### Быстрое обновление (только код)
```bash
cd /var/www/aurelle/current
git pull origin main
pm2 reload aurelle-production
```

### После изменений в зависимостях
```bash
cd /var/www/aurelle/current
npm ci
npm run build
pm2 restart aurelle-production
```

---

## 🗄️ База данных

### Подключение через psql
```bash
PGPASSWORD='aurelle_pass_2026' psql -h localhost -p 5433 -U aurelle_user -d aurelle_production
```

### Проверка подключения
```bash
PGPASSWORD='aurelle_pass_2026' psql -h localhost -p 5433 -U aurelle_user -d aurelle_production -c "SELECT version();"
```

### Применить миграции
```bash
cd /var/www/aurelle/current
npm run db:push
```

### Бэкап базы данных
```bash
PGPASSWORD='aurelle_pass_2026' pg_dump -h localhost -p 5433 -U aurelle_user aurelle_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Восстановление из бэкапа
```bash
PGPASSWORD='aurelle_pass_2026' psql -h localhost -p 5433 -U aurelle_user -d aurelle_production < backup_20260115_181700.sql
```

---

## 🌐 Nginx

### Проверка конфигурации
```bash
nginx -t
```

### Перезагрузка конфигурации
```bash
systemctl reload nginx
```

### Рестарт Nginx
```bash
systemctl restart nginx
```

### Статус
```bash
systemctl status nginx
```

### Логи ошибок
```bash
tail -f /var/log/nginx/error.log
```

### Логи доступа
```bash
tail -f /var/log/nginx/access.log
```

---

## 🧪 Проверка работоспособности

### HTTP проверка
```bash
curl http://localhost:5000
```

### Статус-код
```bash
curl -I http://localhost:5000
```

### С внешнего IP
```bash
curl http://89.39.94.194
```

### Время отклика
```bash
curl -w "Time: %{time_total}s\n" -o /dev/null -s http://localhost:5000
```

---

## 📂 Важные пути

```bash
# Приложение
/var/www/aurelle/current

# Логи PM2
/root/.pm2/logs/

# Логи Nginx
/var/log/nginx/

# Конфигурация Nginx
/etc/nginx/sites-available/aurelle

# .env файл
/var/www/aurelle/current/.env

# PostgreSQL данные
/var/lib/postgresql/14/main/

# PostgreSQL конфигурация
/etc/postgresql/14/main/
```

---

## 🔥 Быстрое решение проблем

### Приложение не отвечает
```bash
pm2 restart aurelle-production
```

### 502 Bad Gateway
```bash
pm2 status
pm2 restart aurelle-production
systemctl restart nginx
```

### Высокая нагрузка на память
```bash
pm2 reload aurelle-production
```

### База данных не подключается
```bash
systemctl status postgresql@14-main
systemctl restart postgresql@14-main
```

### Забыл пароль БД
```bash
# Смотрите в .env
cat /var/www/aurelle/current/.env | grep DATABASE_URL
```

### Проверить все сервисы
```bash
pm2 status
systemctl status nginx
systemctl status postgresql@14-main
```

---

## 🛑 Экстренная остановка

### Остановить всё
```bash
pm2 stop all
systemctl stop nginx
```

### Перезапустить всё
```bash
systemctl restart postgresql@14-main
pm2 restart all
systemctl restart nginx
```

---

## 📊 Системные ресурсы

### Использование диска
```bash
df -h
```

### Использование памяти
```bash
free -h
```

### Топ процессов
```bash
top
# или
htop
```

### Использование порта 5000
```bash
netstat -tlnp | grep 5000
```

---

## 🔐 Безопасность

### Проверить активные подключения
```bash
netstat -tn | grep ESTABLISHED
```

### Последние логины
```bash
last -n 10
```

### Активные SSH сессии
```bash
who
```

---

## 📝 .env параметры

```bash
# Посмотреть .env
cat /var/www/aurelle/current/.env

# Редактировать .env
nano /var/www/aurelle/current/.env

# После изменения .env:
pm2 restart aurelle-production
```

---

## 🔄 Откат к предыдущей версии

```bash
cd /var/www/aurelle/current
git log --oneline -5  # Посмотреть последние коммиты
git reset --hard <commit_hash>
npm ci
npm run build
pm2 restart aurelle-production
```

---

## 📞 Полезные команды

### Узнать версию Node.js
```bash
node --version
```

### Узнать версию npm
```bash
npm --version
```

### Узнать версию PM2
```bash
pm2 --version
```

### Узнать IP сервера
```bash
hostname -I
```

### Узнать uptime сервера
```bash
uptime
```

---

## 🆘 Если ничего не помогает

1. Посмотрите логи:
   ```bash
   pm2 logs aurelle-production --lines 100
   ```

2. Проверьте .env файл:
   ```bash
   cat /var/www/aurelle/current/.env
   ```

3. Пересоберите проект:
   ```bash
   cd /var/www/aurelle/current
   rm -rf node_modules dist
   npm ci
   npm run build
   pm2 restart aurelle-production
   ```

4. Перезапустите все сервисы:
   ```bash
   systemctl restart postgresql@14-main
   pm2 restart aurelle-production
   systemctl restart nginx
   ```

---

**Сервер**: 89.39.94.194
**URL**: http://89.39.94.194
**База**: aurelle_production (порт 5433)
**Приложение**: /var/www/aurelle/current
**PM2**: aurelle-production
