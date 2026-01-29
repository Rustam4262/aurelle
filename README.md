# 💅 AURELLE - Beauty Salon Marketplace

Современная платформа для бронирования услуг в салонах красоты по всему Узбекистану.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![Status](https://img.shields.io/badge/status-ready%20to%20deploy-success.svg)

## 🎉 Текущий статус: ГОТОВ К ДЕПЛОЮ!

✅ **5 методов авторизации** реализованы
✅ **Полная документация** на русском языке
✅ **Автоматизация** (deploy.sh, backup.sh)
✅ **Безопасность** (HTTPS, rate limiting, CSRF)
✅ **Мультиязычность** (EN/RU/UZ)
✅ **Готовые конфигурации** (Nginx, PM2)

📘 **[Начать деплой →](./DEPLOY_FROM_GITHUB.md)**

---

## 🌟 Возможности

### Для клиентов:

- 🔍 Поиск салонов по городу и услугам
- 📅 Онлайн бронирование записей
- ⭐ Отзывы и рейтинги салонов
- ❤️ Избранные салоны и мастера
- 📱 Адаптивный дизайн для всех устройств

### Для владельцев салонов:

- 🏪 Регистрация и управление салонами
- 👥 Управление командой мастеров
- 📊 Календарь записей
- 💰 Управление услугами и ценами
- 📈 Аналитика и статистика

### Технические возможности:

- 🔐 **Множественные методы авторизации**:
  - Email + Password
  - Google OAuth
  - Yandex OAuth
  - GitHub OAuth (опционально)
  - Phone + SMS (опционально, через Twilio)

- 🌍 **Мультиязычность**: Английский, Русский, Узбекский
- 🎨 **Современный UI**: React + shadcn/ui + Tailwind CSS
- ⚡ **Высокая производительность**: Vite + TypeScript
- 🗄️ **PostgreSQL** с Drizzle ORM
- 🔒 **Безопасность**: Rate limiting, CSRF protection, helmet

---

## 🚀 Быстрый старт

### Локальная разработка

#### 1. Требования

- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm или yarn

#### 2. Установка

```bash
# Клонирование репозитория
git clone https://github.com/your-username/aurelle.git
cd aurelle

# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Отредактируйте .env файл с вашими данными
```

#### 3. Настройка базы данных

```bash
# Создайте базу данных PostgreSQL
createdb aurelle

# Обновите DATABASE_URL в .env:
# DATABASE_URL=postgresql://user:password@localhost:5432/aurelle

# Push схемы
npm run db:push

# Опционально: загрузка тестовых данных
npm run db:seed
```

#### 4. Запуск

```bash
# Development mode
npm run dev

# Откройте http://localhost:5000
```

---

## 📦 Деплой на сервер

### 🚀 Деплой с GitHub (РЕКОМЕНДУЕТСЯ)

**Готов к деплою!** Проект полностью настроен и загружен в GitHub.

#### Быстрый старт:

```bash
# 1. Подключитесь к серверу
ssh root@your-server-ip

# 2. Клонируйте репозиторий
git clone https://github.com/Rustam4262/aurelle.git
cd aurelle

# 3. Следуйте инструкции
```

#### Документация по деплою:

- 📘 **[DEPLOY_FROM_GITHUB.md](./DEPLOY_FROM_GITHUB.md)** - ⭐ Деплой с GitHub (НАЧНИТЕ ОТСЮДА!)
- 📗 **[QUICK_DEPLOY_COMMANDS.txt](./QUICK_DEPLOY_COMMANDS.txt)** - Все команды в одном файле
- 📙 **[READY_TO_DEPLOY.md](./READY_TO_DEPLOY.md)** - Полная информация о готовности

### Альтернативные методы деплоя:

- **[DEPLOY_QUICK_START.md](./DEPLOY_QUICK_START.md)** - Быстрый деплой (архив)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Детальная документация
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Чек-лист на 100+ пунктов

### Настройка OAuth для продакшена:

- **[OAUTH_SETUP_PRODUCTION.md](./OAUTH_SETUP_PRODUCTION.md)** - Обновление Redirect URIs

### Настройка Яндекс.Карт:

- **[YANDEX_MAPS_SETUP.md](./YANDEX_MAPS_SETUP.md)** - ⭐ Настройка интерактивной карты салонов

---

## 🔐 Настройка авторизации

Платформа поддерживает 5 методов авторизации. Все провайдеры опциональны.

### Подробная инструкция

См. **[AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md)**

### Быстрая настройка OAuth

#### Google OAuth:

1. [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте OAuth Client ID
3. Добавьте redirect URI: `http://localhost:5000/api/auth/google/callback`
4. Добавьте credentials в `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

#### Yandex OAuth:

1. [Яндекс OAuth](https://oauth.yandex.ru/)
2. Создайте приложение
3. Добавьте callback URI: `http://localhost:5000/api/auth/yandex/callback`
4. Добавьте credentials в `.env`:
   ```env
   YANDEX_CLIENT_ID=your-client-id
   YANDEX_CLIENT_SECRET=your-client-secret
   ```

#### Yandex Maps API (для карты на главной странице):

1. [Yandex Developer](https://developer.tech.yandex.ru/)
2. Получите API ключ для JavaScript API
3. Добавьте в `.env`:
   ```env
   VITE_YANDEX_MAPS_API_KEY=your-maps-api-key
   ```
4. Подробная инструкция: **[YANDEX_MAPS_SETUP.md](./YANDEX_MAPS_SETUP.md)**

---

## 🛠️ Разработка

### Структура проекта

```
aurelle/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Переиспользуемые компоненты
│   │   ├── pages/         # Страницы приложения
│   │   ├── hooks/         # Кастомные React hooks
│   │   ├── lib/           # Утилиты
│   │   └── locales/       # Переводы (en, ru, uz)
│   └── index.html
├── server/                # Express backend
│   ├── routes/            # API маршруты
│   ├── middleware/        # Express middleware
│   ├── auth/              # Авторизация
│   └── index.ts           # Точка входа
├── shared/                # Общий код
│   ├── models/            # Модели данных
│   └── schema.ts          # DB схемы (Drizzle)
└── dist/                  # Production build
```

### Основные команды

```bash
# Development
npm run dev              # Запуск dev сервера

# Build
npm run build           # Production build
npm run check           # TypeScript проверка

# Database
npm run db:push         # Push схемы в БД
npm run db:seed         # Загрузка тестовых данных

# Production
npm start               # Запуск production сервера
```

### Технологический стек

**Frontend:**

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Wouter (routing)
- TanStack Query
- i18next (переводы)

**Backend:**

- Node.js
- Express
- TypeScript
- PostgreSQL
- Drizzle ORM
- Passport.js (auth)
- Express Session

**DevOps:**

- PM2 (process manager)
- Nginx (reverse proxy)
- Let's Encrypt (SSL)

---

## 🔒 Безопасность

- 🛡️ CSRF Protection
- 🚦 Rate Limiting
- 🔐 Secure sessions (PostgreSQL backed)
- 🔑 Password hashing (bcrypt)
- 📝 Input validation (zod)
- 🌐 HTTPS обязателен в продакшене
- 🚫 XSS Protection headers

---

## 📝 Скрипты деплоя

### Автоматический деплой

```bash
./deploy.sh
```

### Автоматический бэкап БД

```bash
./backup.sh
```

Настройте cron для автоматического бэкапа:

```bash
crontab -e
# Добавьте: 0 2 * * * /var/www/aurelle/backup.sh
```

---

## 🌍 Мультиязычность

Поддерживаемые языки:

- 🇬🇧 English
- 🇷🇺 Русский
- 🇺🇿 O'zbek

Переводы находятся в `client/src/locales/`.

---

## 📊 API Endpoints

### Авторизация

```
GET  /api/auth/providers        # Статус провайдеров
POST /api/auth/register         # Регистрация (email)
POST /api/auth/login            # Вход (email)
GET  /api/auth/logout           # Выход
GET  /api/auth/user             # Текущий user
GET  /api/auth/google           # Google OAuth
GET  /api/auth/yandex           # Yandex OAuth
GET  /api/auth/github           # GitHub OAuth
POST /api/auth/phone/send-code  # Отправка SMS кода
POST /api/auth/phone/verify     # Проверка SMS кода
```

### Профиль

```
GET  /api/profile               # Профиль пользователя
POST /api/profile               # Создание/обновление профиля
```

### Салоны

```
GET    /api/salons              # Список салонов
GET    /api/salons/:id          # Детали салона
POST   /api/salons              # Создание салона
PUT    /api/salons/:id          # Обновление салона
DELETE /api/salons/:id          # Удаление салона
```

### Записи

```
GET    /api/bookings            # Список записей
POST   /api/bookings            # Создание записи
PUT    /api/bookings/:id        # Обновление записи
DELETE /api/bookings/:id        # Отмена записи
```

Полная документация API: [API.md](./API.md) _(создать при необходимости)_

---

## 🧪 Тестирование

```bash
# Unit tests (будет добавлено)
npm run test

# E2E tests (будет добавлено)
npm run test:e2e
```

---

## 📈 Производительность

### Мониторинг

```bash
# PM2 мониторинг
pm2 monit

# Логи
pm2 logs aurelle

# Статус
pm2 status
```

### Оптимизация

- ⚡ Lazy loading компонентов
- 🗜️ Gzip compression (Nginx)
- 💾 Static files caching
- 🔄 Database connection pooling
- 📦 Code splitting (Vite)

---

## 🤝 Contribution

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) _(создать при необходимости)_

### Development workflow:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - _Initial work_ - [GitHub](https://github.com/your-username)

---

## 🙏 Acknowledgments

- shadcn/ui для прекрасных компонентов
- Drizzle ORM за отличную работу с БД
- Сообщество React и Node.js

---

## 📞 Поддержка

- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/aurelle/issues)
- 💬 Telegram: @your-telegram

---

## 📸 Скриншоты

_(Добавить скриншоты приложения)_

---

**Made with ❤️ in Uzbekistan** 🇺🇿
