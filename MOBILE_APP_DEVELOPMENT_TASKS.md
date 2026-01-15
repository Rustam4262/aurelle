# AURELLE Mobile App - Полный список задач для команды разработчиков

**Проект**: Мобильное приложение AURELLE для iOS и Android
**Платформа**: React Native
**Дата**: 2026-01-10
**Версия**: 1.0
**Целевые маркеты**: Google Play Market & Apple App Store

---

## Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Команда и роли](#команда-и-роли)
3. [Технический стек](#технический-стек)
4. [Фазы разработки](#фазы-разработки)
5. [Детальные задачи по фазам](#детальные-задачи-по-фазам)
6. [Чек-листы для релиза](#чек-листы-для-релиза)
7. [Метрики успеха](#метрики-успеха)

---

## Обзор проекта

### Цели

**Бизнес-цели**:
- Запустить мобильное приложение AURELLE в Google Play Market и Apple App Store
- Обеспечить 70% мобильного трафика нативным приложением
- Увеличить конверсию бронирований на 30% через улучшенный UX
- Обеспечить push-уведомления для повышения вовлеченности

**Технические цели**:
- Создать кроссплатформенное приложение на React Native
- Обеспечить производительность: 60 FPS, запуск < 3 секунд
- Интеграция с существующим backend API
- Поддержка 3 языков: английский, русский, узбекский
- Соответствие Apple HIG и Material Design

### Основные функции (MVP)

1. **Аутентификация**: Регистрация, вход, OAuth (Google, Apple, Yandex)
2. **Поиск салонов**: По геолокации, категориям, рейтингу
3. **Просмотр салонов**: Детали, услуги, мастера, отзывы, фотогалереи
4. **Бронирование**: 5-шаговый процесс с выбором услуги, мастера, даты и времени
5. **Профиль пользователя**: Управление бронированиями, избранное, настройки
6. **Push-уведомления**: Напоминания о бронированиях, акции
7. **Многоязычность**: EN, RU, UZ
8. **Темная тема**: Поддержка светлой и темной темы
9. **Offline-режим**: Кеширование данных для просмотра оффлайн

### Дополнительные функции (Post-MVP)

- Платежи внутри приложения (Stripe, PayPal, Uzcard)
- Видео-портфолио мастеров
- Чат с салонами
- Программа лояльности
- Социальные функции (поделиться, пригласить друзей)
- AR примерка причесок

---

## Команда и роли

### Рекомендуемая структура команды

| Роль | Количество | Обязанности |
|------|-----------|-------------|
| **Project Manager** | 1 | Управление проектом, координация, сроки |
| **Tech Lead / Mobile Architect** | 1 | Архитектура, code review, технические решения |
| **React Native Developers** | 2-3 | Разработка компонентов, экранов, логики |
| **UI/UX Designer** | 1 | Figma дизайн, адаптация веб-дизайна под мобильный |
| **Backend Developer** | 1 | Адаптация API, push-уведомления, интеграции |
| **QA Engineer** | 1 | Тестирование iOS/Android, автотесты |
| **DevOps Engineer** | 0.5 | CI/CD, сборки, публикация в сторы |

**Итого**: 6.5-7.5 человек

### Альтернативная структура (стартап)

- 1 Full-Stack Lead (Tech + Backend)
- 2 React Native разработчика
- 1 Designer (UI/UX + graphic)
- 1 QA (manual testing)

**Итого**: 5 человек

---

## Технический стек

### Frontend (Mobile)

```json
{
  "react": "^18.2.0",
  "react-native": "^0.73.0",
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/bottom-tabs": "^6.5.0",
  "@react-navigation/stack": "^6.3.0",
  "react-native-gesture-handler": "^2.14.0",
  "react-native-reanimated": "^3.6.0",
  "react-native-safe-area-context": "^4.8.0",
  "react-native-screens": "^3.29.0",
  "react-native-svg": "^14.1.0",
  "axios": "^1.6.0",
  "@tanstack/react-query": "^5.17.0",
  "i18next": "^23.7.0",
  "react-i18next": "^14.0.0",
  "react-native-mmkv": "^2.11.0",
  "react-native-fast-image": "^8.6.3",
  "react-native-linear-gradient": "^2.8.3",
  "react-native-haptic-feedback": "^2.2.0",
  "react-native-splash-screen": "^3.3.0",
  "@react-native-firebase/app": "^19.0.0",
  "@react-native-firebase/messaging": "^19.0.0",
  "react-native-push-notification": "^8.1.1",
  "react-native-maps": "^1.10.0",
  "react-native-image-picker": "^7.1.0",
  "react-native-share": "^10.0.0",
  "react-native-calendar-events": "^2.2.0"
}
```

### Backend (Existing)

- Node.js + Express
- PostgreSQL
- Drizzle ORM
- Passport.js (OAuth)
- Redis (кеширование)

### DevOps & Tools

- **Version Control**: Git, GitHub
- **CI/CD**: GitHub Actions, Fastlane
- **Build**: EAS (Expo Application Services) или Fastlane
- **Testing**: Jest, React Native Testing Library, Detox
- **Code Quality**: ESLint, Prettier, TypeScript
- **Analytics**: Firebase Analytics, Sentry (crash reporting)
- **Push**: Firebase Cloud Messaging (FCM) + APNs
- **Design**: Figma

---

## Фазы разработки

### Обзор фаз (12 недель)

| Фаза | Длительность | Описание |
|------|-------------|----------|
| **Фаза 0: Подготовка** | 1 неделя | Настройка инфраструктуры, окружения |
| **Фаза 1: Основа** | 2 недели | Навигация, дизайн-система, базовые компоненты |
| **Фаза 2: Аутентификация** | 1 неделя | Экраны входа, регистрации, OAuth |
| **Фаза 3: Основные экраны** | 2 недели | Главный экран, список салонов, детали салона |
| **Фаза 4: Бронирование** | 2 недели | 5-шаговый процесс бронирования |
| **Фаза 5: Профиль и функции** | 1 неделя | Профиль, бронирования, избранное, уведомления |
| **Фаза 6: Полировка** | 2 недели | Анимации, оптимизация, тестирование |
| **Фаза 7: Релиз** | 1 неделя | Подготовка сторов, публикация, мониторинг |

**Итого**: 12 недель (3 месяца)

---

## Детальные задачи по фазам

---

## Фаза 0: Подготовка (1 неделя)

**Цель**: Настроить инфраструктуру, окружение, дизайн-систему

### Задачи

#### 0.1 Инициализация проекта

- [ ] **0.1.1** Создать React Native проект (TypeScript)
  - Использовать `npx react-native init AurelleApp --template react-native-template-typescript`
  - Или `expo init` если используется Expo
  - Настроить `.gitignore`, `.eslintrc`, `.prettierrc`
  - **Ответственный**: Tech Lead
  - **Оценка**: 4 часа

- [ ] **0.1.2** Настроить структуру папок
  ```
  aurelle-mobile/
  ├── src/
  │   ├── screens/         # Экраны приложения
  │   ├── components/      # Переиспользуемые компоненты
  │   ├── navigation/      # Навигация
  │   ├── theme/           # Дизайн-система
  │   ├── utils/           # Утилиты, хелперы
  │   ├── api/             # API клиент
  │   ├── hooks/           # Кастомные хуки
  │   ├── store/           # State management (Zustand или Context)
  │   ├── i18n/            # Локализация
  │   ├── types/           # TypeScript типы
  │   └── App.tsx
  ├── ios/
  ├── android/
  ├── assets/              # Изображения, шрифты, иконки
  └── package.json
  ```
  - **Ответственный**: Tech Lead
  - **Оценка**: 2 часа

- [ ] **0.1.3** Настроить окружения (dev, staging, production)
  - Установить `react-native-config`
  - Создать `.env.dev`, `.env.staging`, `.env.production`
  - Настроить переменные: `API_URL`, `GOOGLE_MAPS_KEY`, `FIREBASE_KEY`
  - **Ответственный**: DevOps / Tech Lead
  - **Оценка**: 4 часа

#### 0.2 Настройка зависимостей

- [ ] **0.2.1** Установить основные библиотеки
  - React Navigation (stack, tabs, drawer)
  - TanStack Query (React Query)
  - i18next
  - MMKV (storage)
  - Fast Image
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 2 часа

- [ ] **0.2.2** Настроить TypeScript
  - Настроить `tsconfig.json` с strict mode
  - Создать базовые типы в `src/types/index.ts`
  - **Ответственный**: Tech Lead
  - **Оценка**: 2 часа

- [ ] **0.2.3** Настроить линтеры и форматтеры
  - ESLint с правилами для React Native
  - Prettier
  - Husky для pre-commit hooks
  - **Ответственный**: Tech Lead
  - **Оценка**: 2 часа

#### 0.3 Дизайн-система

- [ ] **0.3.1** Создать Figma-прототип (по MOBILE_APP_UI_DESIGN.md)
  - 11 экранов: Splash, Onboarding (3), Login, Register, Home, Salon Detail, Booking, Profile, Notifications
  - Мобильные экраны (390x844px)
  - Адаптация для Android (Material Design)
  - **Ответственный**: UI/UX Designer
  - **Оценка**: 16 часов (2 дня)

- [ ] **0.3.2** Экспорт дизайн-токенов из Figma
  - Создать `src/theme/colors.ts` (из DESIGN_SYSTEM.md)
  - Создать `src/theme/typography.ts`
  - Создать `src/theme/spacing.ts`
  - **Ответственный**: UI/UX Designer + React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **0.3.3** Создать базовые UI-компоненты
  - Button (primary, secondary, outline, destructive)
  - Input (text, password, email)
  - Card
  - Badge
  - Avatar
  - Использовать React Native's `Pressable`, `TextInput`, `View`
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 8 часов

#### 0.4 Backend подготовка

- [ ] **0.4.1** Адаптация API для мобильного приложения
  - Проверить CORS для мобильных запросов
  - Добавить endpoint для проверки версии приложения: `GET /api/app/version`
  - Добавить endpoint для device tokens (push): `POST /api/users/device-token`
  - **Ответственный**: Backend Developer
  - **Оценка**: 4 часа

- [ ] **0.4.2** Настройка Firebase (для push-уведомлений)
  - Создать проект Firebase
  - Добавить iOS и Android приложения
  - Скачать `google-services.json` (Android) и `GoogleService-Info.plist` (iOS)
  - Настроить FCM (Firebase Cloud Messaging)
  - **Ответственный**: Backend Developer + DevOps
  - **Оценка**: 4 часа

- [ ] **0.4.3** API документация для мобильной команды
  - Документировать все endpoints (Swagger или Postman)
  - Примеры запросов/ответов
  - Коды ошибок
  - **Ответственный**: Backend Developer
  - **Оценка**: 4 часа

#### 0.5 DevOps & CI/CD

- [ ] **0.5.1** Настроить GitHub Actions для CI
  - Линтинг и тесты на каждый PR
  - Build проверка для iOS и Android
  - **Ответственный**: DevOps
  - **Оценка**: 4 часа

- [ ] **0.5.2** Настроить Fastlane (для автоматизации сборок)
  - iOS: Fastlane для сборки и загрузки в TestFlight
  - Android: Fastlane для сборки и загрузки в Google Play Internal Testing
  - **Ответственный**: DevOps
  - **Оценка**: 8 часов

**Итого Фаза 0**: ~68 часов (~1.5 недели для команды из 5 человек)

---

## Фаза 1: Основа и навигация (2 недели)

**Цель**: Создать навигацию, дизайн-систему в коде, базовые экраны

### Задачи

#### 1.1 Навигация

- [ ] **1.1.1** Настроить React Navigation
  - Stack Navigator для главной навигации
  - Bottom Tab Navigator (5 табов: Home, Search, Favorites, Bookings, Profile)
  - Modal для бронирования
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **1.1.2** Создать навигационную структуру
  ```typescript
  // Root Navigator
  - Splash Screen
  - Onboarding Stack (если первый запуск)
  - Auth Stack (Login, Register)
  - Main Tab Navigator
    - Home Stack (Home → Salon Detail → Booking)
    - Search Stack (Search → Results → Salon Detail)
    - Favorites Stack (Favorites → Salon Detail)
    - Bookings Stack (Bookings → Booking Detail)
    - Profile Stack (Profile → Settings → Edit Profile)
  ```
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 8 часов

- [ ] **1.1.3** Добавить deep linking
  - Схема URL: `aurelle://salon/:id`, `aurelle://booking/:id`
  - Настроить iOS Universal Links и Android App Links
  - **Ответственный**: React Native Developer 2 + DevOps
  - **Оценка**: 8 часов

#### 1.2 Дизайн-система в коде

- [ ] **1.2.1** Реализовать theme provider
  - Создать `ThemeProvider` с support светлой/темной темы
  - Использовать React Context для темы
  - Сохранять выбор темы в MMKV storage
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **1.2.2** Создать UI компоненты библиотеку
  - Button (все варианты)
  - Input, Textarea
  - Checkbox, Switch, Radio
  - Card (Header, Content, Footer)
  - Badge, Chip
  - Avatar (с fallback на инициалы)
  - Loader, Skeleton
  - Toast (уведомления)
  - **Ответственный**: React Native Developer 1 + Developer 2
  - **Оценка**: 16 часов

- [ ] **1.2.3** Создать типографику и spacing helpers
  - Утилиты для `fontSize`, `lineHeight`, `fontWeight`
  - Spacing helpers: `m-4`, `p-6` (аналог Tailwind)
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

#### 1.3 Splash Screen & Onboarding

- [ ] **1.3.1** Splash Screen
  - Статичный splash (нативный для быстрого старта)
  - Анимированный splash (JavaScript)
  - Проверка авторизации во время splash
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **1.3.2** Onboarding (3 экрана)
  - Экран 1: Welcome to AURELLE
  - Экран 2: Discover Nearby Salons
  - Экран 3: Book & Get Reminders
  - Пагинация (dots)
  - Кнопка "Skip" и "Next"/"Get Started"
  - Сохранить флаг "onboarding completed" в storage
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 8 часов

#### 1.4 Локализация (i18n)

- [ ] **1.4.1** Настроить i18next
  - Создать структуру переводов: `src/i18n/en.json`, `ru.json`, `uz.json`
  - Определить язык системы как дефолтный
  - Переключатель языка в настройках
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **1.4.2** Перевести базовые строки
  - Общие: "Cancel", "Save", "Next", "Back", "Loading"
  - Кнопки, лейблы форм
  - **Ответственный**: React Native Developer 2 + Переводчик (если есть)
  - **Оценка**: 4 часа

#### 1.5 API интеграция (базовая)

- [ ] **1.5.1** Создать API клиент (Axios)
  - Base URL из env
  - Interceptors для токенов
  - Обработка ошибок (401, 403, 500)
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **1.5.2** Настроить TanStack Query (React Query)
  - QueryClient provider
  - Кеширование
  - Retry логика
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 2 часа

**Итого Фаза 1**: ~70 часов (~2 недели для команды)

---

## Фаза 2: Аутентификация (1 неделя)

**Цель**: Реализовать регистрацию, вход, OAuth, управление сессией

### Задачи

#### 2.1 Экран входа (Login)

- [ ] **2.1.1** UI экрана входа
  - Email и Password поля
  - Кнопка "Sign In"
  - Чекбокс "Remember me"
  - Ссылка "Forgot password?"
  - Разделитель "or"
  - Кнопки OAuth: Google, Apple (iOS), Yandex
  - Ссылка "Don't have an account? Sign Up"
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 6 часов

- [ ] **2.1.2** Валидация формы
  - Real-time email validation
  - Password min 8 символов
  - Показ ошибок под полями
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 2 часа

- [ ] **2.1.3** Интеграция с API
  - POST `/api/auth/login`
  - Сохранение токена в secure storage (Keychain iOS, Keystore Android)
  - Перенаправление на главный экран
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

#### 2.2 Экран регистрации (Register)

- [ ] **2.2.1** UI экрана регистрации
  - Поля: Full Name, Email, Phone, Password, Confirm Password
  - Чекбокс "I agree to Terms of Service"
  - Кнопка "Create Account"
  - Ссылка на "Sign In"
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 6 часов

- [ ] **2.2.2** Валидация формы
  - Проверка email формата
  - Проверка телефона (с кодом страны)
  - Password strength indicator (weak/medium/strong)
  - Passwords must match
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **2.2.3** Интеграция с API
  - POST `/api/auth/register`
  - Обработка ошибок (email уже занят, etc.)
  - Автоматический вход после регистрации
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

#### 2.3 OAuth интеграция

- [ ] **2.3.1** Google Sign-In
  - Установить `@react-native-google-signin/google-signin`
  - Настроить OAuth credentials (iOS и Android)
  - Кнопка "Continue with Google"
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 6 часов

- [ ] **2.3.2** Apple Sign-In (iOS only)
  - Использовать `@invertase/react-native-apple-authentication`
  - Кнопка "Continue with Apple"
  - Обязательно для iOS (Apple requirement)
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **2.3.3** Yandex Sign-In (опционально)
  - Если требуется для рынка СНГ
  - Интеграция через WebView или SDK
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 6 часов

#### 2.4 Forgot Password / Reset Password

- [ ] **2.4.1** Forgot Password экран
  - Email поле
  - Кнопка "Send Reset Link"
  - POST `/api/auth/forgot-password`
  - Success message: "Check your email"
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **2.4.2** Reset Password (через deep link)
  - Deep link: `aurelle://reset-password?token=xxx`
  - Экран с новым паролем
  - POST `/api/auth/reset-password`
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

#### 2.5 Управление сессией

- [ ] **2.5.1** Auth Context/Provider
  - Хранить состояние: `isAuthenticated`, `user`, `token`
  - Методы: `login()`, `logout()`, `refreshToken()`
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **2.5.2** Refresh Token логика
  - Автоматическое обновление токена при истечении
  - Interceptor для 401 ошибок
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **2.5.3** Logout
  - Очистка токенов из storage
  - Перенаправление на экран входа
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 2 часа

**Итого Фаза 2**: ~60 часов (~1 неделя для команды)

---

## Фаза 3: Основные экраны (2 недели)

**Цель**: Главный экран, список салонов, поиск, детали салона

### Задачи

#### 3.1 Главный экран (Home)

- [ ] **3.1.1** UI главного экрана
  - Header: Logo + Notifications icon + Avatar
  - Search bar (нажатие открывает Search экран)
  - Location selector (City dropdown)
  - Category tabs (horizontal scroll): All, Haircuts, Nails, Spa, Makeup
  - Salon cards (вертикальный список)
  - Pull-to-refresh
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 8 часов

- [ ] **3.1.2** Salon Card компонент
  - Image (100x100), название, рейтинг, расстояние
  - Статус: Open Now / Closed
  - Часы работы
  - Сервисы (кратко)
  - Heart icon (favorite toggle)
  - Tap → открыть Salon Detail
  - Swipe right → add to favorites (haptic feedback)
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 6 часов

- [ ] **3.1.3** Интеграция с API
  - GET `/api/salons` с параметрами: `city`, `category`, `latitude`, `longitude`
  - Пагинация (infinite scroll)
  - Фильтрация по категориям
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 6 часов

- [ ] **3.1.4** Геолокация
  - Запрос разрешения на геолокацию
  - Определение ближайших салонов
  - Использовать `@react-native-community/geolocation`
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

#### 3.2 Поиск (Search Screen)

- [ ] **3.2.1** UI поиска
  - Search input с автофокусом
  - Recent searches (из storage)
  - Suggested searches
  - Результаты поиска (салоны + услуги)
  - Фильтры: Open Now, Price Range, Rating
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 8 часов

- [ ] **3.2.2** Поиск по салонам и услугам
  - GET `/api/search?q=haircut&type=service,salon`
  - Debouncing (500ms)
  - Highlighting найденных слов
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 6 часов

- [ ] **3.2.3** Фильтры
  - Bottom sheet с фильтрами
  - Open Now, Price (low to high), Rating (4+)
  - Apply filters → обновить результаты
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 6 часов

#### 3.3 Детали салона (Salon Detail)

- [ ] **3.3.1** UI Salon Detail
  - Photo gallery (horizontal swipe, pinch to zoom)
  - Salon info card: название, рейтинг, адрес, телефон, часы
  - Tab navigation: Services, Team, Reviews, About
  - Sticky "Book Now" button внизу
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 10 часов

- [ ] **3.3.2** Photo Gallery
  - Swipeable carousel
  - Page indicators (dots)
  - Fullscreen mode (tap photo)
  - Использовать `react-native-image-viewing` или `yet-another-react-lightbox`
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **3.3.3** Services Tab
  - Группировка по категориям (Haircuts, Nails, etc.)
  - Service card: название, duration, price, описание
  - Кнопка "Book" → открыть Booking flow с pre-selected service
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 6 часов

- [ ] **3.3.4** Team Tab
  - Grid мастеров (2 колонки на маленьких экранах)
  - Master card: фото, имя, рейтинг, специализация
  - "Book with [Master]" button
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **3.3.5** Reviews Tab
  - Список отзывов: аватар, имя, рейтинг, дата, комментарий, фото
  - "Write a Review" кнопка
  - Пагинация
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 6 часов

- [ ] **3.3.6** About Tab
  - Описание салона
  - Amenities (WiFi, Parking, Card Payment, etc.) с иконками
  - Working hours (все дни недели)
  - Embedded map (Google Maps / Yandex Maps)
  - Кнопка "Get Directions" → открыть Maps app
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 6 часов

- [ ] **3.3.7** Интеграция с API
  - GET `/api/salons/:id` (детали салона)
  - GET `/api/salons/:id/services`
  - GET `/api/salons/:id/masters`
  - GET `/api/salons/:id/reviews`
  - **Ответственный**: React Native Developer 1 + Developer 2
  - **Оценка**: 4 часа

#### 3.4 Maps интеграция

- [ ] **3.4.1** Map view на Salon Detail
  - Использовать `react-native-maps` (Google Maps для Android, Apple Maps для iOS)
  - Marker на локации салона
  - Кнопка "Open in Maps" → системное приложение карт
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 6 часов

- [ ] **3.4.2** Map view на Search/Home (опционально)
  - Переключатель List/Map view
  - Markers для всех салонов
  - Tap на marker → показать salon card
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 8 часов

**Итого Фаза 3**: ~98 часов (~2 недели для команды)

---

## Фаза 4: Бронирование (2 недели)

**Цель**: Реализовать 5-шаговый процесс бронирования

### Задачи

#### 4.1 Booking Flow структура

- [ ] **4.1.1** Создать Booking Flow Provider
  - State: salon, service, master, date, time, notes
  - Методы: selectService, selectMaster, selectDateTime, etc.
  - Persist в sessionStorage при переходе между шагами
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 6 часов

- [ ] **4.1.2** Progress Indicator компонент
  - Desktop: Horizontal stepper (1→2→3→4→5)
  - Mobile: Dots ●●○○○ + "Step 2 of 5"
  - Sticky top position
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **4.1.3** Навигация между шагами
  - Modal navigation или Stack Navigator
  - Back button → previous step
  - Continue button → next step
  - Swipe right gesture → go back
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

#### 4.2 Step 1: Select Salon (опционально)

- [ ] **4.2.1** UI выбора салона
  - Показывать только если салон не выбран
  - Search bar + список салонов
  - Tap → выбрать салон, перейти на Step 2
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

#### 4.3 Step 2: Select Service

- [ ] **4.3.1** UI выбора услуги
  - Категории (accordion/collapsible)
  - Service cards: название, duration, price, описание
  - Visual selection (checkmark)
  - Continue button активен только при выборе
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 8 часов

- [ ] **4.3.2** Интеграция с API
  - GET `/api/salons/:id/services`
  - Группировка по категориям
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 2 часа

#### 4.4 Step 3: Select Master (Optional)

- [ ] **4.4.1** UI выбора мастера
  - "Any Available Master" option (highlighted, selected by default)
  - Список мастеров: фото, имя, рейтинг, опыт, specialties, next available slot
  - "View Portfolio" → overlay с фотографиями работ
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 8 часов

- [ ] **4.4.2** Master Portfolio overlay
  - Photo grid
  - Lightbox для просмотра
  - Swipe to dismiss
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **4.4.3** Интеграция с API
  - GET `/api/salons/:id/masters?serviceId=xxx`
  - Фильтр мастеров по выбранной услуге
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 2 часа

#### 4.5 Step 4: Select Date & Time

- [ ] **4.5.1** Availability Calendar компонент
  - Monthly calendar view
  - Day indicators:
    - ● Green: Many slots (5+)
    - ◐ Yellow: Few slots (1-4)
    - ✕ Gray: No slots (disabled)
    - ◎ Blue: Today
  - Prev/Next month buttons
  - "Today" quick button
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 10 часов

- [ ] **4.5.2** Time Slot Picker компонент
  - Группировка по времени суток:
    - 🌅 Morning (9:00-12:00)
    - ☀️ Afternoon (12:00-17:00)
    - 🌙 Evening (17:00-20:00)
  - Pill-shaped buttons
  - Unavailable slots: disabled (grayed)
  - Popular slots: star badge
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 8 часов

- [ ] **4.5.3** Интеграция с API
  - GET `/api/salons/:id/availability?serviceId=xxx&masterId=yyy&date=2026-01-11`
  - Monthly availability (для календаря)
  - Daily time slots (для picker)
  - **Ответственный**: Backend Developer + React Native Developer 1
  - **Оценка**: 8 часов

- [ ] **4.5.4** Smart defaults
  - Calendar открывается на первый доступный день
  - Если сегодня есть слоты → show today
  - Highlight популярные слоты
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

#### 4.6 Step 5: Review & Confirm

- [ ] **4.6.1** UI Confirmation экрана
  - Summary card: Salon info, Service, Master, Date/Time, Duration, Price
  - [Edit] кнопки для каждой секции (навигация обратно)
  - Optional: Special requests (textarea)
  - Checkboxes: "Send reminders", "Notify if earlier slots open"
  - [Confirm Booking] кнопка (primary)
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 8 часов

- [ ] **4.6.2** Валидация перед подтверждением
  - Real-time availability check (slot might be taken)
  - Если слот занят → показать ошибку + suggest nearest time
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **4.6.3** Создание бронирования
  - POST `/api/client/bookings`
  - Body: salonId, serviceId, masterId, date, time, notes
  - Обработка ошибок (slot conflict, etc.)
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

#### 4.7 Success Screen

- [ ] **4.7.1** UI Success экрана
  - Success animation (checkmark или confetti)
  - Booking confirmation number
  - Summary: Date, Time, Salon, Master, Service
  - "Confirmation sent to: email@example.com"
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **4.7.2** Quick actions
  - [Add to Calendar] → использовать `react-native-calendar-events`
  - [View My Bookings] → navigate to Bookings tab
  - [Back to Home]
  - Share booking (optional)
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 6 часов

**Итого Фаза 4**: ~98 часов (~2 недели для команды)

---

## Фаза 5: Профиль и функции пользователя (1 неделя)

**Цель**: Профиль, бронирования, избранное, уведомления, настройки

### Задачи

#### 5.1 Profile Screen

- [ ] **5.1.1** UI Profile экрана
  - Header: Avatar (100pt), Name, Email, [Edit Profile] button
  - Menu sections:
    - My Bookings
    - Favorites
    - Reviews
    - Payment Methods (для будущего)
    - Notifications Settings
    - Help & Support
    - About AURELLE
    - Terms of Service
    - Privacy Policy
  - [Sign Out] button (destructive)
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 8 часов

- [ ] **5.1.2** Edit Profile экран
  - Avatar upload (camera или gallery)
  - Поля: Name, Email (read-only), Phone, Language
  - [Save] button
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 6 часов

- [ ] **5.1.3** Avatar upload
  - Использовать `react-native-image-picker`
  - Upload в API: POST `/api/users/avatar`
  - Crop/resize image перед upload
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

#### 5.2 My Bookings

- [ ] **5.2.1** UI My Bookings экрана
  - Tabs: Upcoming, Past, Cancelled
  - Booking cards: Salon, Service, Master, Date/Time, Status
  - Tap → Booking Detail
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 6 часов

- [ ] **5.2.2** Booking Detail экран
  - Full booking info
  - [Cancel Booking] button (if upcoming)
  - [Reschedule] button
  - [Write Review] (if past)
  - [Get Directions] to salon
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 6 часов

- [ ] **5.2.3** Cancel Booking
  - Confirmation dialog
  - DELETE `/api/client/bookings/:id`
  - Success toast
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 2 часа

- [ ] **5.2.4** Reschedule Booking
  - Открыть Booking Flow с pre-filled data
  - Изменить только Date/Time
  - PATCH `/api/client/bookings/:id`
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

#### 5.3 Favorites

- [ ] **5.3.1** UI Favorites экрана
  - Список избранных салонов (Salon cards)
  - Empty state: "No favorites yet"
  - Pull-to-refresh
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **5.3.2** Add/Remove Favorites
  - Heart icon на Salon Card и Salon Detail
  - POST `/api/users/favorites/:salonId` (add)
  - DELETE `/api/users/favorites/:salonId` (remove)
  - Haptic feedback
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

#### 5.4 Notifications

- [ ] **5.4.1** UI Notifications экрана
  - Группировка: Today, Yesterday, Earlier
  - Notification cards: icon, title, body, time
  - Unread indicator (dot)
  - Tap → открыть связанный экран (Booking Detail, Salon, etc.)
  - Swipe left → Delete (iOS) / Options (Android)
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 8 часов

- [ ] **5.4.2** Push Notifications (Firebase)
  - Установить `@react-native-firebase/messaging`
  - Запрос разрешения на уведомления
  - Получение FCM token → отправить на сервер
  - Обработка foreground/background/quit state notifications
  - **Ответственный**: React Native Developer 1 + Backend
  - **Оценка**: 8 часов

- [ ] **5.4.3** Notification Types
  - Booking reminder (1 hour before)
  - Booking confirmed
  - Booking cancelled
  - Review request (after booking)
  - Promotions (от салонов)
  - **Ответственный**: Backend Developer
  - **Оценка**: 8 часов

- [ ] **5.4.4** Notification Settings
  - Toggles: Booking Reminders, Promotions, Reviews Requests
  - Push vs Email vs SMS
  - Save в API: PATCH `/api/users/settings`
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

#### 5.5 Settings

- [ ] **5.5.1** UI Settings экрана
  - Language selection (EN, RU, UZ)
  - Theme toggle (Light/Dark/System)
  - Notification settings
  - Clear cache
  - App version
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **5.5.2** Theme toggle
  - Switch между Light/Dark/System
  - Сохранить в MMKV storage
  - Применить тему мгновенно (без перезагрузки)
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 2 часа

**Итого Фаза 5**: ~78 часов (~1.5 недели для команды)

---

## Фаза 6: Полировка и тестирование (2 недели)

**Цель**: Анимации, оптимизация, багфиксинг, тестирование

### Задачи

#### 6.1 Анимации и переходы

- [ ] **6.1.1** Screen transitions
  - Stack navigation: Slide from right (iOS), Fade (Android)
  - Modal: Slide up from bottom
  - Tab switch: Fade
  - Использовать `@react-navigation` transitions
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **6.1.2** Micro-interactions
  - Button press: scale down to 0.95
  - Checkbox: scale in checkmark
  - Heart favorite: scale pulse + color change
  - Использовать `react-native-reanimated`
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 8 часов

- [ ] **6.1.3** Skeleton loaders
  - Для списков салонов, услуг, отзывов
  - Shimmer effect
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **6.1.4** Haptic feedback
  - Favorite toggle
  - Booking confirmed
  - Error validation
  - Использовать `react-native-haptic-feedback`
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 2 часа

#### 6.2 Оптимизация производительности

- [ ] **6.2.1** Image optimization
  - Использовать `react-native-fast-image` для кеширования
  - Lazy loading для изображений
  - WebP формат (если возможно)
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **6.2.2** List optimization
  - FlatList с `windowSize`, `maxToRenderPerBatch`, `initialNumToRender`
  - `getItemLayout` для фиксированной высоты
  - Memo для list items
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **6.2.3** Code splitting и lazy loading
  - React.lazy для экранов
  - Suspense с fallback
  - **Ответственный**: Tech Lead
  - **Оценка**: 4 часа

- [ ] **6.2.4** Bundle size optimization
  - Анализ bundle с Metro bundler
  - Удаление неиспользуемых библиотек
  - Tree-shaking
  - **Ответственный**: Tech Lead
  - **Оценка**: 4 часа

#### 6.3 Обработка ошибок

- [ ] **6.3.1** Error Boundary
  - Global Error Boundary для crash handling
  - Fallback UI: "Something went wrong" + [Retry] button
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **6.3.2** Network error handling
  - Offline indicator (banner)
  - Retry logic для failed requests
  - User-friendly error messages
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **6.3.3** Validation errors
  - Form validation errors (inline)
  - API validation errors (toast или modal)
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 2 часа

#### 6.4 Accessibility (a11y)

- [ ] **6.4.1** Screen reader support
  - VoiceOver (iOS) и TalkBack (Android)
  - `accessibilityLabel` для всех interactive elements
  - `accessibilityRole` (button, header, link, etc.)
  - **Ответственный**: React Native Developer 1 + QA
  - **Оценка**: 8 часов

- [ ] **6.4.2** Color contrast
  - Проверка WCAG AA (4.5:1 для текста)
  - Использовать контрастные цвета для темной темы
  - **Ответственный**: UI/UX Designer + Developer 1
  - **Оценка**: 4 часа

- [ ] **6.4.3** Touch targets
  - Минимум 48x48px для всех кнопок
  - Достаточное spacing между tap targets
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 2 часа

#### 6.5 Тестирование

- [ ] **6.5.1** Unit tests (Jest)
  - Тесты для utils, helpers, hooks
  - API client tests (mock responses)
  - Покрытие: >70%
  - **Ответственный**: React Native Developer 1 + Developer 2
  - **Оценка**: 16 часов

- [ ] **6.5.2** Component tests (React Native Testing Library)
  - Тесты для UI компонентов (Button, Input, Card)
  - Snapshot tests
  - **Ответственный**: React Native Developer 1 + Developer 2
  - **Оценка**: 12 часов

- [ ] **6.5.3** E2E tests (Detox или Maestro)
  - Happy path: Onboarding → Login → Browse → Book
  - Critical flows: Booking creation, Cancellation
  - **Ответственный**: QA Engineer
  - **Оценка**: 16 часов

- [ ] **6.5.4** Manual QA (iOS и Android)
  - Тестирование на реальных устройствах
  - iPhone (iOS 15+), Android (API 24+)
  - Разные размеры экранов
  - **Ответственный**: QA Engineer
  - **Оценка**: 20 часов

- [ ] **6.5.5** Regression testing
  - После каждого bugfix
  - Smoke tests для основных функций
  - **Ответственный**: QA Engineer
  - **Оценка**: 8 часов

#### 6.6 Мониторинг и аналитика

- [ ] **6.6.1** Firebase Analytics
  - События: screen_view, booking_started, booking_completed
  - User properties: language, theme, location
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

- [ ] **6.6.2** Crash reporting (Sentry или Firebase Crashlytics)
  - Автоматическая отправка crash reports
  - Source maps для readable stack traces
  - **Ответственный**: DevOps + React Native Developer 1
  - **Оценка**: 4 часов

- [ ] **6.6.3** Performance monitoring
  - Firebase Performance Monitoring
  - Track: App start time, Screen load time, Network requests
  - **Ответственный**: React Native Developer 1
  - **Оценка**: 4 часа

#### 6.7 Offline support

- [ ] **6.7.1** Cache salon data
  - Сохранить список салонов в MMKV
  - Показывать кешированные данные при offline
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 4 часа

- [ ] **6.7.2** Offline indicator
  - Banner: "You're offline" вверху экрана
  - Disable booking creation при offline
  - **Ответственный**: React Native Developer 2
  - **Оценка**: 2 часа

**Итого Фаза 6**: ~148 часов (~2 недели для команды)

---

## Фаза 7: Подготовка к релизу и публикация (1 неделя)

**Цель**: Подготовка для App Store и Google Play, публикация

### Задачи

#### 7.1 App Store подготовка (iOS)

- [ ] **7.1.1** Apple Developer Account
  - Создать (если нет) Apple Developer Program ($99/год)
  - Создать App ID: `com.aurelle.app`
  - Provisioning profiles (development, distribution)
  - **Ответственный**: DevOps / Project Manager
  - **Оценка**: 2 часа

- [ ] **7.1.2** App Store Connect
  - Создать app в App Store Connect
  - Заполнить metadata:
    - App Name: "AURELLE - Beauty Marketplace"
    - Subtitle: "Book salons near you"
    - Description (англ, рус, узб)
    - Keywords
    - Category: Lifestyle
  - **Ответственный**: Project Manager + Marketing
  - **Оценка**: 4 часа

- [ ] **7.1.3** Screenshots и App Preview
  - 6.5" (iPhone 13 Pro Max): 5 screenshots
  - 5.5" (iPhone 8 Plus): 5 screenshots
  - App Preview video (30 sec)
  - Использовать реальные данные (staging)
  - **Ответственный**: UI/UX Designer + QA
  - **Оценка**: 8 часов

- [ ] **7.1.4** App Icon
  - 1024x1024px (без alpha channel)
  - Соответствие Apple HIG
  - **Ответственный**: UI/UX Designer
  - **Оценка**: 2 часа

- [ ] **7.1.5** Privacy Policy & Terms
  - Написать Privacy Policy (GDPR compliant)
  - Terms of Service
  - Разместить на сайте (aurelle.com/privacy, aurelle.com/terms)
  - **Ответственный**: Legal / Project Manager
  - **Оценка**: 8 часов

- [ ] **7.1.6** Build и Upload
  - Archive build (Xcode или Fastlane)
  - Upload в App Store Connect
  - TestFlight beta testing (10 internal testers)
  - **Ответственный**: DevOps
  - **Оценка**: 4 часа

- [ ] **7.1.7** App Review Submission
  - Submit for review
  - Ответить на вопросы Apple (если есть)
  - Ожидание: 1-3 дня
  - **Ответственный**: Project Manager
  - **Оценка**: 2 часа

#### 7.2 Google Play подготовка (Android)

- [ ] **7.2.1** Google Play Console Account
  - Создать (если нет) Google Play Developer Account ($25 one-time)
  - Создать app
  - **Ответственный**: DevOps / Project Manager
  - **Оценка**: 1 час

- [ ] **7.2.2** Store Listing
  - App name, short description, full description
  - Languages: EN, RU, UZ
  - Category: Lifestyle
  - **Ответственный**: Project Manager + Marketing
  - **Оценка**: 4 часа

- [ ] **7.2.3** Screenshots (Google Play)
  - Phone: 7" (1080 x 1920): min 2 screenshots
  - 10" Tablet (optional): 1200 x 1920
  - Feature Graphic: 1024 x 500
  - **Ответственный**: UI/UX Designer + QA
  - **Оценка**: 6 часов

- [ ] **7.2.4** App Icon (Google Play)
  - 512x512px (PNG)
  - **Ответственный**: UI/UX Designer
  - **Оценка**: 1 час

- [ ] **7.2.5** Content Rating
  - Заполнить questionnaire для IARC rating
  - Обычно: PEGI 3, ESRB Everyone
  - **Ответственный**: Project Manager
  - **Оценка**: 1 час

- [ ] **7.2.6** Build и Upload
  - Generate signed APK/AAB (Android App Bundle)
  - Upload в Internal Testing track
  - Beta testing (20 testers)
  - **Ответственный**: DevOps
  - **Оценка**: 4 часа

- [ ] **7.2.7** Production Release
  - Graduated release: 10% → 50% → 100%
  - Monitor crash reports, ANRs
  - **Ответственный**: DevOps + Project Manager
  - **Оценка**: 2 часа

#### 7.3 Финальная проверка

- [ ] **7.3.1** Pre-launch checklist
  - ✅ All critical bugs fixed
  - ✅ Performance: Lighthouse >85
  - ✅ Crash-free rate >99%
  - ✅ Load time <3s
  - ✅ Analytics working
  - ✅ Push notifications tested
  - ✅ Deep links working
  - ✅ Payment integration (if applicable)
  - ✅ Legal: Privacy Policy, Terms published
  - **Ответственный**: QA + Project Manager
  - **Оценка**: 4 часа

- [ ] **7.3.2** Rollback plan
  - Подготовить process для rollback (если критический баг)
  - Emergency contact list
  - **Ответственный**: DevOps
  - **Оценка**: 2 часа

#### 7.4 Пост-релиз

- [ ] **7.4.1** Мониторинг (первые 48 часов)
  - Crash reports (Sentry, Firebase Crashlytics)
  - User reviews (App Store, Google Play)
  - Analytics: DAU, retention, conversion
  - **Ответственный**: DevOps + Product Manager
  - **Оценка**: Continuous

- [ ] **7.4.2** Hotfix plan
  - Если критические баги → hotfix release
  - Expedited review (App Store)
  - **Ответственный**: Tech Lead + DevOps
  - **Оценка**: As needed

- [ ] **7.4.3** User feedback collection
  - Мониторить reviews
  - Ответить на отзывы (особенно негативные)
  - Собрать feature requests
  - **Ответственный**: Product Manager + Support
  - **Оценка**: Continuous

**Итого Фаза 7**: ~55 часов (~1 неделя)

---

## Чек-листы для релиза

### iOS App Store Checklist

- [ ] ✅ Apple Developer Account активен
- [ ] ✅ App ID создан
- [ ] ✅ Provisioning profiles настроены
- [ ] ✅ App Store Connect: app создано, metadata заполнено
- [ ] ✅ Screenshots (5 per size)
- [ ] ✅ App Preview video (опционально)
- [ ] ✅ App Icon 1024x1024
- [ ] ✅ Privacy Policy URL
- [ ] ✅ Terms of Service URL
- [ ] ✅ Build uploaded в TestFlight
- [ ] ✅ Beta testing завершено (10+ testers)
- [ ] ✅ App Review submission
- [ ] ✅ Crash-free rate >99%
- [ ] ✅ No rejection reasons (content, bugs, crashes)

### Google Play Checklist

- [ ] ✅ Google Play Developer Account активен
- [ ] ✅ App создано в Console
- [ ] ✅ Store listing заполнено (EN, RU, UZ)
- [ ] ✅ Screenshots (2+)
- [ ] ✅ Feature Graphic 1024x500
- [ ] ✅ App Icon 512x512
- [ ] ✅ Content Rating получен
- [ ] ✅ Privacy Policy URL
- [ ] ✅ AAB uploaded в Internal Testing
- [ ] ✅ Beta testing завершено (20+ testers)
- [ ] ✅ Pre-launch report reviewed (Google Play Console)
- [ ] ✅ Staged rollout plan готов

### Технический Checklist

- [ ] ✅ Production API endpoint настроен
- [ ] ✅ Firebase project настроен (iOS + Android)
- [ ] ✅ Push notifications работают
- [ ] ✅ Deep links настроены и протестированы
- [ ] ✅ Analytics events отправляются
- [ ] ✅ Crash reporting настроено
- [ ] ✅ Performance monitoring активно
- [ ] ✅ Локализация завершена (EN, RU, UZ)
- [ ] ✅ Dark mode работает
- [ ] ✅ Offline mode работает (basic caching)
- [ ] ✅ Все критические тесты проходят
- [ ] ✅ Code coverage >70%
- [ ] ✅ No console errors/warnings

---

## Метрики успеха

### KPI для первого месяца

| Метрика | Целевое значение |
|---------|-----------------|
| **Downloads** | 5,000+ (iOS + Android) |
| **Daily Active Users (DAU)** | 1,000+ |
| **User Retention (Day 1)** | >40% |
| **User Retention (Day 7)** | >20% |
| **User Retention (Day 30)** | >10% |
| **Booking Completion Rate** | >60% (mobile) |
| **Crash-free Rate** | >99% |
| **App Store Rating** | >4.0 ★ |
| **Google Play Rating** | >4.0 ★ |
| **Average Session Duration** | >3 min |
| **Push Notification Opt-in** | >50% |

### Performance Metrics

| Метрика | Целевое значение |
|---------|-----------------|
| **App Start Time** | <3s (cold start) |
| **Screen Load Time** | <1s (avg) |
| **API Response Time** | <500ms (p95) |
| **Frame Rate** | 60 FPS (stable) |
| **Bundle Size** | <50 MB (iOS), <40 MB (Android) |
| **Memory Usage** | <150 MB (avg) |

### Business Metrics

| Метрика | Целевое значение |
|---------|-----------------|
| **Mobile vs Web Booking Ratio** | 50/50 (к концу Q1) |
| **Mobile Booking Conversion** | +30% vs web |
| **Average Booking Value** | Эквивалентно web |
| **Push Notification CTR** | >10% |
| **In-App Review Rate** | >5% |

---

## Дополнительные задачи (Post-MVP)

### Приоритет: P1 (3-6 месяцев после релиза)

- [ ] **Платежи внутри приложения**
  - Stripe, PayPal, Uzcard
  - Prepayment для бронирований
  - Сохранение карт

- [ ] **Чат с салонами**
  - Real-time messaging (Firebase или Socket.io)
  - Отправка фотографий

- [ ] **Видео-портфолио мастеров**
  - Видео-галереи
  - Inline video player

- [ ] **Программа лояльности**
  - Баллы за бронирования
  - Cashback, скидки

### Приоритет: P2 (6-12 месяцев)

- [ ] **AR примерка**
  - ARKit (iOS), ARCore (Android)
  - Virtual hair try-on

- [ ] **Социальные функции**
  - Поделиться салоном/мастером
  - Invite friends (referral program)

- [ ] **Групповые бронирования**
  - Несколько услуг одновременно
  - Несколько людей

- [ ] **Recurring bookings**
  - "Каждую субботу в 10:00"

---

## Риски и митигации

| Риск | Вероятность | Воздействие | Митигация |
|------|------------|-----------|----------|
| **App Store rejection** | Medium | High | Следовать Apple HIG, pre-review checklist |
| **Performance issues на старых устройствах** | Medium | Medium | Тестирование на iPhone 7, Android API 24 |
| **Push notifications не работают** | Low | High | Тщательное тестирование, fallback на email |
| **API недоступно** | Low | High | Retry logic, offline mode, error handling |
| **Превышение бюджета** | Medium | Medium | Agile подход, MVP сначала |
| **Задержка релиза** | Medium | Medium | Buffer time (+2 недели), ежедневные standups |
| **Low adoption rate** | Medium | High | Marketing campaign, ASO, PR |

---

## Контакты и ресурсы

### Команда (пример)

- **Project Manager**: [Имя] - [email]
- **Tech Lead**: [Имя] - [email]
- **React Native Dev 1**: [Имя] - [email]
- **React Native Dev 2**: [Имя] - [email]
- **UI/UX Designer**: [Имя] - [email]
- **Backend Dev**: [Имя] - [email]
- **QA Engineer**: [Имя] - [email]
- **DevOps**: [Имя] - [email]

### Инструменты и доступы

- **GitHub**: https://github.com/aurelle/aurelle-mobile
- **Figma**: [Ссылка на дизайн]
- **Firebase Console**: [Ссылка]
- **App Store Connect**: https://appstoreconnect.apple.com
- **Google Play Console**: https://play.google.com/console
- **Jira / Linear**: [Ссылка на проект]
- **Slack / Discord**: [Канал команды]

### Документация

- [MOBILE_APP_UI_DESIGN.md](MOBILE_APP_UI_DESIGN.md) - UI/UX спецификация
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) - Дизайн-система
- [BOOKING_FLOW_REDESIGN.md](BOOKING_FLOW_REDESIGN.md) - Booking flow
- API Documentation: [Swagger/Postman link]

---

## Итого: Суммарная оценка

| Фаза | Длительность | Часы (оценка) |
|------|-------------|---------------|
| **Фаза 0: Подготовка** | 1 неделя | ~68 часов |
| **Фаза 1: Основа** | 2 недели | ~70 часов |
| **Фаза 2: Аутентификация** | 1 неделя | ~60 часов |
| **Фаза 3: Основные экраны** | 2 недели | ~98 часов |
| **Фаза 4: Бронирование** | 2 недели | ~98 часов |
| **Фаза 5: Профиль** | 1 неделя | ~78 часов |
| **Фаза 6: Полировка** | 2 недели | ~148 часов |
| **Фаза 7: Релиз** | 1 неделя | ~55 часов |

**Общая оценка**: ~675 часов (~3.5 месяца для команды из 5 человек при 40-часовой рабочей неделе)

**Рекомендуемый timeline**: 12 недель (3 месяца) с буфером

---

## Заключение

Этот документ предоставляет полный список задач для разработки мобильного приложения AURELLE. Все задачи структурированы по фазам, с оценками времени и ответственными.

**Следующие шаги**:

1. ✅ Review этого документа командой
2. ✅ Настройка project management tool (Jira, Linear, Notion)
3. ✅ Создание sprint plan (bi-weekly sprints)
4. ✅ Kickoff meeting
5. ✅ Старт Фазы 0

**Дата создания**: 2026-01-10
**Версия**: 1.0
**Автор**: Claude (AI Assistant)
**Статус**: Ready for Team Review

---

**Удачи команде AURELLE! 🚀**
