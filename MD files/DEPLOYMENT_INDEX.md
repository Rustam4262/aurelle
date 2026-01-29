# 📚 AURELLE - Deployment Documentation Index

Полный список всей документации по развертыванию проекта AURELLE на production сервере.

---

## 🚀 START HERE (Начните отсюда!)

### 1️⃣ [READY_TO_DEPLOY.md](./READY_TO_DEPLOY.md)

**⭐ ГЛАВНЫЙ ФАЙЛ - НАЧНИТЕ С НЕГО!**

Содержит:

- ✅ Полную сводку готовности проекта
- ✅ Что было сделано
- ✅ Данные сервера и credentials
- ✅ Пошаговые инструкции (что делать прямо сейчас)
- ✅ Ссылки на всю остальную документацию

**Рекомендация**: Прочитайте этот файл первым!

---

## 📖 Quick Start Guides (Быстрый старт)

### 2️⃣ [DEPLOY_QUICK_START.md](./DEPLOY_QUICK_START.md)

**Быстрое руководство по деплою**

Содержит:

- 🚀 Вариант 1: Автоматический деплой (РЕКОМЕНДУЕТСЯ)
  - Загрузка файлов на сервер
  - Запуск автоматической установки
  - Настройка SSL
  - Обновление OAuth
- 📝 Вариант 2: Ссылка на ручной деплой
- 🔧 Полезные команды для управления
- 🆘 Troubleshooting

**Когда использовать**: После прочтения READY_TO_DEPLOY.md, если хотите быстро развернуть проект.

### 3️⃣ [DEPLOYMENT_FILES_SUMMARY.txt](./DEPLOYMENT_FILES_SUMMARY.txt)

**Текстовая сводка всех файлов деплоя**

Содержит:

- 📋 Краткий чек-лист действий
- 📁 Список всех файлов для деплоя
- 🔐 Все credentials в одном месте
- 📊 Полезные команды
- 🆘 Troubleshooting

**Когда использовать**: Для быстрого просмотра или печати чек-листа.

---

## 📘 Detailed Guides (Детальные руководства)

### 4️⃣ [DEPLOY_TO_SERVER.md](./DEPLOY_TO_SERVER.md)

**15 шагов ручного деплоя на сервер**

Содержит:

- 🖥️ Данные сервера (IP, логин, пароль)
- 📋 Шаг 1: Подключение к серверу
- 🧹 Шаг 2: Полная очистка сервера
- 📦 Шаг 3: Установка ПО (Node.js, PostgreSQL, Nginx, Certbot, PM2)
- 🗄️ Шаг 4: Настройка PostgreSQL
- 📁 Шаг 5: Клонирование проекта (Git или архив)
- 📚 Шаг 6: Установка зависимостей
- ⚙️ Шаг 7: Создание .env файла
- 🔨 Шаг 8: Сборка проекта
- 🗃️ Шаг 9: Инициализация БД
- 🌐 Шаг 10: Настройка Nginx
- 🚀 Шаг 11: Запуск с PM2
- 🧪 Шаг 12: Проверка работы
- 🔥 Шаг 13: Настройка firewall
- 🔐 Шаг 14: Настройка SSL
- 🔑 Шаг 15: Обновление OAuth Redirect URIs
- 🔧 Полезные команды
- 🔄 Обновление приложения в будущем
- 🆘 Troubleshooting

**Когда использовать**: Если автоматический скрипт не сработал или вы хотите понять каждый шаг детально.

### 5️⃣ [DEPLOYMENT.md](./DEPLOYMENT.md)

**Полное руководство по развертыванию (самое детальное)**

Содержит:

- 📋 Системные требования
- 🔧 Пошаговая установка всех зависимостей
- 🗄️ Настройка PostgreSQL
- 🌐 Конфигурация Nginx
- 🔐 SSL/HTTPS настройка
- 🚀 PM2 setup
- 🔑 OAuth настройка
- 📊 Мониторинг
- 🔄 CI/CD опции
- 🆘 Troubleshooting

**Когда использовать**: Для глубокого понимания всей инфраструктуры и процесса деплоя.

---

## ✅ Checklists (Чек-листы)

### 6️⃣ [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

**Полный чек-лист деплоя (100+ пунктов)**

Разделы:

- [ ] 🎯 Подготовка (локально)
- [ ] 🖥️ Сервер - базовая настройка
- [ ] 🗄️ База данных
- [ ] 📂 Проект (клонирование, .env, build)
- [ ] 🌐 Nginx
- [ ] 🔐 SSL сертификат
- [ ] 🚀 PM2 и запуск
- [ ] 🔑 OAuth провайдеры
- [ ] ✅ Тестирование
- [ ] 📊 Мониторинг
- [ ] 💾 Backup
- [ ] 🔄 Deployment процесс
- [ ] 📱 Дополнительно (Performance, Security, SEO)
- [ ] 📞 Post-deployment

**Когда использовать**: Распечатайте и отмечайте галочками по мере выполнения деплоя.

---

## 🔑 Authentication & OAuth

### 7️⃣ [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md)

**Настройка всех методов авторизации**

Содержит:

- ✅ Email/Password авторизация
- ✅ Google OAuth (получение credentials)
- ✅ Yandex OAuth (получение credentials)
- ✅ GitHub OAuth (опционально)
- ✅ Phone/SMS авторизация (Twilio)
- 🔧 Настройка каждого провайдера
- 🧪 Тестирование
- 🆘 Troubleshooting

**Когда использовать**: Если нужно получить новые OAuth credentials или понять, как работает каждый метод авторизации.

### 8️⃣ [OAUTH_SETUP_PRODUCTION.md](./OAUTH_SETUP_PRODUCTION.md)

**Обновление OAuth Redirect URIs для production**

Содержит:

- 🎯 Ваши текущие credentials
- 📝 Пошаговые инструкции для Google
- 📝 Пошаговые инструкции для Yandex
- 📝 Пошаговые инструкции для GitHub
- 🧪 Как проверить OAuth после обновления
- ✅ Контрольный список

**Когда использовать**: После развертывания на сервере, перед первым тестированием OAuth авторизации.

---

## 📊 Summary & Overview

### 9️⃣ [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)

**Полная сводка по подготовке к деплою**

Содержит:

- ✅ Что было сделано (детальный список)
  - Множественные методы авторизации
  - Обновленная UI
  - Локализация
  - Backend изменения
  - Установленные пакеты
  - Документация
  - Скрипты автоматизации
  - Environment файлы
  - Безопасность
- 📊 Текущий статус
- 🔧 Что нужно сделать перед продакшен деплоем
- 📋 Порядок деплоя
- 🎯 Следующие шаги

**Когда использовать**: Для понимания всех изменений, которые были сделаны в проекте для подготовки к деплою.

### 🔟 [README.md](./README.md)

**Обзор проекта AURELLE**

Содержит:

- 📖 Описание проекта
- 🚀 Технологический стек
- ⚡ Быстрый старт для разработки
- 📁 Структура проекта
- 🔑 API endpoints
- 🌍 Мультиязычность
- 🔐 Безопасность
- 📄 Лицензия

**Когда использовать**: Для общего понимания проекта и локальной разработки.

---

## 🔧 Automation Scripts (Скрипты)

### 1️⃣1️⃣ server-setup.sh

**Автоматический скрипт установки на сервер**

Что делает:

- 🧹 Очищает старую установку
- 📦 Устанавливает Node.js, PostgreSQL, Nginx, PM2, Certbot, Git
- 🗄️ Настраивает PostgreSQL (создает БД и пользователя)
- 📂 Распаковывает проект
- 📚 Устанавливает npm зависимости
- ⚙️ Создает .env файл с auto-generated SESSION_SECRET
- 🔨 Собирает проект (npm run build)
- 🗃️ Инициализирует БД (npm run db:push)
- 🌐 Настраивает Nginx
- 🚀 Запускает приложение через PM2
- 🔥 Настраивает UFW firewall

**Как использовать**:

```bash
# Загрузить на сервер:
scp server-setup.sh root@89.39.94.194:/root/

# На сервере:
chmod +x /root/server-setup.sh
bash /root/server-setup.sh
```

### 1️⃣2️⃣ deploy.sh

**Скрипт автоматического обновления приложения**

Что делает:

- 🔄 Git pull
- 📚 npm install
- 🔨 npm run build
- 🗃️ npm run db:push
- 🚀 pm2 restart aurelle

**Как использовать**:

```bash
cd /var/www/aurelle
./deploy.sh
```

### 1️⃣3️⃣ backup.sh

**Скрипт автоматического бэкапа БД**

Что делает:

- 💾 Создает SQL dump базы данных
- 🗜️ Сжимает gzip
- 🗂️ Сохраняет в /var/backups/aurelle/
- 🧹 Удаляет бэкапы старше 7 дней

**Как использовать**:

```bash
cd /var/www/aurelle
./backup.sh

# Или настроить cron (автоматический запуск каждый день в 2:00):
0 2 * * * /var/www/aurelle/backup.sh >> /var/log/aurelle_backup.log 2>&1
```

---

## ⚙️ Configuration Files (Конфигурации)

### 1️⃣4️⃣ ecosystem.config.cjs

**PM2 конфигурация для production**

Содержит:

- 📝 Имя приложения
- 📂 Путь к скрипту
- 🔢 Кластерный режим (instances)
- 🔄 Auto-restart
- 📊 Logging configuration
- ⚙️ Environment variables

**Как использовать**:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

### 1️⃣5️⃣ nginx.conf

**Готовая конфигурация Nginx**

Содержит:

- 🌐 Server blocks для HTTP и HTTPS
- 🔐 SSL настройки
- 🔄 Reverse proxy к Node.js (порт 5000)
- 🗜️ Gzip compression
- 💾 Static files caching
- 🔒 Security headers
- 📊 Logging

**Как использовать**: Копируется автоматически через server-setup.sh

### 1️⃣6️⃣ .env.example

**Шаблон .env для development**

Содержит:

- 🗄️ DATABASE_URL (пример)
- 🔑 SESSION_SECRET (пример)
- ⚙️ NODE_ENV, PORT
- 🔐 OAuth credentials (пустые места для заполнения)

### 1️⃣7️⃣ .env.production.example

**Шаблон .env для production**

Содержит:

- 🗄️ DATABASE_URL для production
- 🔑 Инструкции по генерации SESSION_SECRET
- ⚙️ NODE_ENV=production
- 🔐 OAuth credentials для production

---

## 📦 Deployment Package

### 1️⃣8️⃣ aurelle-deploy.tar.gz

**Архив проекта для развертывания**

Содержит:

- ✅ Весь исходный код проекта
- ✅ package.json и package-lock.json
- ✅ Конфигурационные файлы
- ✅ Скрипты автоматизации (deploy.sh, backup.sh)

Исключено (не в архиве):

- ❌ node_modules (будет установлено на сервере)
- ❌ dist (будет собрано на сервере)
- ❌ .git (не нужно на сервере)
- ❌ .env (создается на сервере)
- ❌ server/uploads (пользовательские файлы)

**Размер**: ~331 KB

---

## 🎯 Рекомендуемый порядок чтения

Для успешного деплоя рекомендуем следующий порядок:

### Перед деплоем:

1. [READY_TO_DEPLOY.md](./READY_TO_DEPLOY.md) - Общий обзор
2. [DEPLOYMENT_FILES_SUMMARY.txt](./DEPLOYMENT_FILES_SUMMARY.txt) - Сводка файлов
3. [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Распечатать

### Во время деплоя:

4. [DEPLOY_QUICK_START.md](./DEPLOY_QUICK_START.md) - Следовать инструкциям

### Если возникли проблемы:

5. [DEPLOY_TO_SERVER.md](./DEPLOY_TO_SERVER.md) - Ручной деплой
6. [DEPLOYMENT.md](./DEPLOYMENT.md) - Детальная информация

### После деплоя:

7. [OAUTH_SETUP_PRODUCTION.md](./OAUTH_SETUP_PRODUCTION.md) - Обновить OAuth URIs
8. [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) - При необходимости настройки

### Для справки:

9. [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) - Что было сделано
10. [README.md](./README.md) - Информация о проекте

---

## 📞 Получение помощи

Если у вас возникли проблемы:

1. **Проверьте раздел Troubleshooting** в соответствующем файле документации
2. **Проверьте логи**:
   ```bash
   pm2 logs aurelle --lines 100
   tail -f /var/log/nginx/error.log
   ```
3. **Обратитесь к чек-листу** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

## 🎉 Итого

Вся документация организована для максимального удобства:

- 📚 **18 файлов** документации и конфигураций
- 🚀 **3 скрипта** автоматизации
- ✅ **1 архив** проекта готов к деплою
- 🎯 **Все credentials** подготовлены

**НАЧНИТЕ С**: [READY_TO_DEPLOY.md](./READY_TO_DEPLOY.md)

---

**Версия документации**: 1.0.0
**Дата**: 26 декабря 2024
**Статус**: ✅ READY TO DEPLOY

Удачного деплоя! 🚀
