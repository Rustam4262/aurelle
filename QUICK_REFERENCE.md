# 🚀 AURELLE - Быстрая шпаргалка

## 🔑 Учетные данные

### Админ:
- **Телефон**: `+998901234567`
- **Email**: `admin@beautysalon.uz`
- **Пароль**: `admin123`

### Владелец салона:
- **Телефон**: `+998911234567`
- **Email**: `salon1@beautysalon.uz`
- **Пароль**: `salon123`

### Клиент:
- **Телефон**: `+998951234567`
- **Email**: `client1@example.uz`
- **Пароль**: `client123`

---

## 🌐 Доступ к системе

- **Сайт**: https://aurelle.uz
- **API**: https://api.aurelle.uz
- **API Docs**: https://api.aurelle.uz/docs
- **Сервер**: `ssh aurelle@89.39.94.194`

---

## 📝 Частые команды

### Управление приложением

```bash
# Перейти в директорию проекта
cd ~/projects/aurelle

# Посмотреть статус
docker-compose -f docker-compose.prod.yml ps

# Посмотреть логи
docker-compose -f docker-compose.prod.yml logs -f

# Перезапустить
docker-compose -f docker-compose.prod.yml restart

# Остановить
docker-compose -f docker-compose.prod.yml down

# Запустить
docker-compose -f docker-compose.prod.yml up -d
```

### Резервное копирование

```bash
# Создать бэкап
bash ./deploy/scripts/backup.sh

# Создать бэкап с ротацией
bash ./deploy/scripts/advanced_backup.sh

# Восстановить из бэкапа
bash ./deploy/scripts/restore.sh ./backups/backup_XXXXXX.sql.gz

# Посмотреть все бэкапы
ls -lh ./backups/daily/
```

### Обновление

```bash
# Подготовка git (один раз)
git config core.filemode false
echo "backups/" >> .git/info/exclude
echo "frontend/.env*" >> .git/info/exclude

# Безопасное обновление (с автоматическим бэкапом)
git fetch origin
git reset --hard origin/main
chmod +x deploy/scripts/*.sh
bash ./deploy/scripts/update.sh

# Ручное обновление
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### База данных

```bash
# Войти в PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U aurelle_user -d aurelle_db

# Выполнить миграции
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Создать бэкап БД
docker exec aurelle_db_prod pg_dump -U aurelle_user aurelle_db > backup.sql
```

### Логи и мониторинг

```bash
# Логи backend
docker-compose -f docker-compose.prod.yml logs backend

# Логи frontend
docker-compose -f docker-compose.prod.yml logs frontend

# Логи БД
docker-compose -f docker-compose.prod.yml logs postgres

# Использование ресурсов
docker stats

# Использование диска
df -h
du -sh ~/projects/aurelle/*
```

---

## 🔧 Решение проблем

### Сервис не работает

```bash
# Перезапустить конкретный сервис
docker-compose -f docker-compose.prod.yml restart backend

# Пересоздать контейнер
docker-compose -f docker-compose.prod.yml up -d --force-recreate backend

# Посмотреть логи для диагностики
docker-compose -f docker-compose.prod.yml logs backend --tail=100
```

### Нет места на диске

```bash
# Очистить Docker
docker system prune -a -f

# Очистить старые бэкапы
find ~/projects/aurelle/backups/daily -mtime +7 -delete

# Очистить логи
sudo journalctl --vacuum-size=100M
```

### SSL сертификат

```bash
# Обновить сертификат
sudo certbot renew

# Перезагрузить nginx
sudo systemctl reload nginx
```

---

## 📅 Расписание задач (crontab)

```bash
# Редактировать crontab
crontab -e

# Просмотреть crontab
crontab -l
```

**Рекомендуемые задачи:**

```cron
# Бэкап каждый день в 3:00
0 3 * * * cd ~/projects/aurelle && bash ./deploy/scripts/advanced_backup.sh

# Очистка старых бэкапов
0 4 * * * find ~/projects/aurelle/backups/daily -mtime +7 -delete

# Перезапуск раз в неделю
0 4 * * 0 cd ~/projects/aurelle && docker-compose -f docker-compose.prod.yml restart
```

---

## 📊 Мониторинг

### Проверка здоровья

```bash
# API health
curl https://api.aurelle.uz/health

# Frontend
curl https://aurelle.uz

# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Использование памяти
free -h

# Использование CPU
top
```

### Статистика бэкапов

```bash
# Количество бэкапов
find ./backups -name "*.sql.gz" | wc -l

# Размер бэкапов
du -sh ./backups

# Последние бэкапы
ls -lht ./backups/daily/ | head -5
```

---

## 🚨 Экстренные случаи

### Откат после неудачного обновления

```bash
# 1. Посмотреть последний бэкап
ls -lht ./backups/*.sql.gz | head -1

# 2. Восстановить
bash ./deploy/scripts/restore.sh ./backups/backup_XXXXXX.sql.gz
```

### База данных недоступна

```bash
# 1. Проверить статус
docker-compose -f docker-compose.prod.yml ps postgres

# 2. Перезапустить
docker-compose -f docker-compose.prod.yml restart postgres

# 3. Посмотреть логи
docker-compose -f docker-compose.prod.yml logs postgres
```

### Сайт недоступен

```bash
# 1. Проверить nginx
sudo systemctl status nginx
sudo nginx -t

# 2. Перезапустить nginx
sudo systemctl restart nginx

# 3. Проверить контейнеры
docker-compose -f docker-compose.prod.yml ps
```

---

## 📚 Документация

- [README.md](README.md) - Основная информация о проекте
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Пошаговое развёртывание
- [BACKUP_GUIDE.md](BACKUP_GUIDE.md) - Полное руководство по бэкапам
- [PAYMENT_INTEGRATION_GUIDE.md](PAYMENT_INTEGRATION_GUIDE.md) - Интеграция платежей

---

## 🎯 Контакты

- **Домен**: aurelle.uz
- **IP**: 89.39.94.194
- **SSH**: `aurelle@89.39.94.194`
- **Email**: admin@aurelle.uz

---

**Сохраните эту шпаргалку в закладки для быстрого доступа!** 🔖
