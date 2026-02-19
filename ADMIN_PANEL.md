# Admin Panel Documentation

## Overview

Полнофункциональная админ панель для управления платформой AURELLE с поддержкой модерации, управления пользователями, салонами и аналитикой.

## Доступ

**URL:** `/admin`
**Права:** Требуется роль администратора (super_admin, admin, moderator)

## Основные разделы

### 1. Dashboard (`/admin`)
**Описание:** Главная панель с ключевыми метриками платформы

**Функции:**
- Статистика пользователей (total, new this week)
- Статистика салонов (total, verified)
- Статистика мастеров (active)
- Статистика бронирований (all time)
- Открытые жалобы (requiring attention)
- Активные санкции (currently enforced)
- Показатели здоровья платформы (verification rate, complaint resolution)

**API:** `GET /api/admin/dashboard`

---

### 2. Users (`/admin/users`)
**Описание:** Управление всеми пользователями платформы

**Функции:**
- ✅ Поиск по имени, email, телефону
- ✅ Фильтрация по роли (client/owner/master/admin)
- ✅ Фильтрация по статусу (active/blocked)
- ✅ Сортировка по различным полям
- ✅ Пагинация (20 пользователей на страницу)
- ✅ Блокировка пользователя с указанием причины
- ✅ Разблокировка пользователя
- ✅ Удаление пользователя

**API Endpoints:**
```
GET    /api/admin/users?search=&role=&status=&sortBy=&sortOrder=&page=&pageSize=
POST   /api/admin/users/:id/block
POST   /api/admin/users/:id/unblock
DELETE /api/admin/users/:id
```

---

### 3. Salons & Masters (`/admin/salons`)
**Описание:** Управление салонами и мастерами

**Функции:**
- ✅ Просмотр всех салонов
- ✅ Поиск салонов по названию
- ✅ Верификация салонов
- ✅ Снятие верификации

**API Endpoints:**
```
GET   /api/admin/salons?limit=50
PATCH /api/admin/salons/:id/verify
PATCH /api/admin/salons/:id/unverify
```

---

### 4. User Activity (`/admin/activity`)

**Описание:** Мониторинг активности пользователей в реальном времени

**Функции:**

- ✅ Просмотр онлайн пользователей (обновление каждые 30 секунд)
- ✅ Список всех сессий пользователей с фильтрацией
- ✅ Информация о входе/выходе, устройстве, браузере, IP
- ✅ Длительность сессии и количество действий
- ✅ История активности (последняя активность, время онлайн)
- ✅ Фильтр активных/завершенных сессий

**API Endpoints:**

```
GET /api/admin/activity/online - Пользователи онлайн сейчас
GET /api/admin/activity/sessions?activeOnly=&userId=&limit= - Сессии пользователей
GET /api/admin/activity/stats?userId= - Статистика активности пользователя
```

**Автоматическое отслеживание:**

- Вход пользователя → создается новая сессия
- Каждый API запрос → обновляется lastActivityAt
- Выход пользователя → закрывается сессия, считается длительность
- Пользователи онлайн = активность в последние 10 минут

---

### 5. Complaints (`/admin/complaints`)
**Описание:** Модерация жалоб пользователей

**Функции:**
- ✅ Фильтрация по статусу (open/in_review/resolved/rejected)
- ✅ Фильтрация по категории (spam/fraud/abuse/quality/other)
- ✅ Назначение жалобы себе (Assign to me)
- ✅ Разрешение жалобы (Resolve) с выбором решения:
  - No Action - никаких действий
  - Warning - предупреждение выдано
  - Sanction Applied - санкция применена
- ✅ Отклонение жалобы (Reject) с указанием причины
- ✅ Комментарий к резолюции

**Workflow:**
1. Жалоба создается со статусом `open`
2. Админ назначает жалобу себе → статус меняется на `in_review`
3. Админ разрешает или отклоняет жалобу → статус `resolved` или `rejected`

**API Endpoints:**
```
GET   /api/admin/complaints?status=&category=&limit=100
GET   /api/admin/complaints/:id
PATCH /api/admin/complaints/:id/assign
PATCH /api/admin/complaints/:id/resolve
PATCH /api/admin/complaints/:id/reject
```

---

### 6. Sanctions (`/admin/sanctions`)
**Описание:** Управление санкциями (блокировками и ограничениями)

**Функции:**
- ✅ Фильтрация по статусу (active/expired/revoked)
- ✅ Фильтрация по типу цели (user/salon/master/client)
- ✅ Детальный просмотр санкции:
  - Target Type & ID
  - Sanction Type (temp_block/perm_block/feature_restrict)
  - Reason Text
  - Comment to User (видимый пользователю)
  - Internal Note (внутренняя заметка)
  - Даты начала и окончания
- ✅ Отзыв активной санкции (Revoke) с указанием причины

**Типы санкций:**
- `temp_block` - Временная блокировка
- `perm_block` - Постоянная блокировка
- `feature_restrict` - Ограничение функционала

**API Endpoints:**
```
GET   /api/admin/sanctions?status=&targetType=&limit=100
POST  /api/admin/sanctions
PATCH /api/admin/sanctions/:id/revoke
GET   /api/admin/sanctions/check/:targetType/:targetId
GET   /api/admin/sanctions/reasons
POST  /api/admin/sanctions/reasons
```

---

### 7. Audit Logs (`/admin/audit`)
**Описание:** Полная история всех действий администраторов

**Функции:**
- ✅ Поиск по типу действия (search)
- ✅ Фильтрация по типу сущности (user/salon/master/complaint/sanction/booking)
- ✅ Просмотр до 200 последних записей
- ✅ Детальный просмотр лога с:
  - Информация об актере (кто выполнил действие)
  - Тип действия и сущности
  - IP адрес и User Agent
  - Previous State (oldData) - JSON
  - New State (newData) - JSON
  - Metadata (meta) - дополнительная информация

**Цветовая кодировка действий:**
- 🟢 Create - зеленый
- 🔵 Update - синий
- 🔴 Delete - красный
- 🟠 Block - оранжевый
- 🟢 Unblock - зеленый

**API Endpoints:**
```
GET /api/admin/audit?action=&entityType=&actorUserId=&startDate=&endDate=&limit=200
GET /api/admin/audit/:id
GET /api/admin/audit/entity/:entityType/:entityId
```

---

### 8. Support Chat (`/admin/chat`)
**Описание:** Система поддержки с чатом в реальном времени

**Функции:**
- ✅ Фильтрация по статусу (open/closed)
- ✅ Список всех чат-тредов с пользователями
- ✅ Назначение треда себе (Assign)
- ✅ Открытие чата с просмотром истории сообщений
- ✅ Отправка сообщений администратором
  - Enter - отправить
  - Shift+Enter - новая строка
- ✅ Закрытие треда с указанием причины
- ✅ Дизайн в стиле мессенджера:
  - Сообщения пользователя - слева, серый фон
  - Сообщения админа - справа, синий фон

**API Endpoints:**
```
GET   /api/admin/chat/threads?status=&assignedToMe=&limit=100
GET   /api/admin/chat/threads/:id/messages
POST  /api/admin/chat/threads/:id/messages
PATCH /api/admin/chat/threads/:id/assign
PATCH /api/admin/chat/threads/:id/close
```

---

## Permissions System

### Доступные роли:
1. **super_admin** - полный доступ ко всему
2. **admin** - доступ ко всем разделам кроме системных настроек
3. **moderator** - модерация контента, поддержка пользователей

### Права доступа (permissions):
```
- users.read, users.write, users.block
- salons.read, salons.write, salons.verify
- masters.read, masters.write, masters.verify
- bookings.read, bookings.write, bookings.cancel
- services.read, services.write
- reviews.read, reviews.moderate
- complaints.read, complaints.resolve
- sanctions.read, sanctions.create, sanctions.revoke
- chat.read, chat.write
- analytics.read
- audit.read
```

---

## Database Schema

### Admin Tables:
```sql
-- Роли администраторов
admin_roles (id, name, display_name, description, permissions, is_active)

-- Назначение ролей пользователям
admin_users (id, user_id, role_id, is_active)

-- Коды причин санкций
sanction_reason_codes (id, code, title, description, is_active)

-- Санкции
sanctions (id, target_type, target_id, sanction_type, reason_text,
          comment_to_user, internal_note, starts_at, ends_at, status,
          revoked_at, revoked_by, revoke_reason, created_by)

-- Жалобы
complaints (id, complainant_user_id, target_type, target_id, category,
           description, attachments, status, assigned_admin_id,
           resolution_comment, decision, sanction_id, resolved_at)

-- Аудит логи
audit_logs (id, actor_user_id, actor_role, action, entity_type, entity_id,
           ip, user_agent, request_id, old_data, new_data, meta, created_at)

-- Чат треды
chat_threads (id, type, user_id, assigned_admin_id, status, last_message_at,
             closed_at, closed_by, close_reason)

-- Сообщения чата
chat_messages (id, thread_id, sender_type, sender_user_id, message_type,
              text, attachments, is_deleted, created_at)
```

---

## UI Components

Все страницы используют единообразные компоненты:

### Фильтры и поиск:
- `Input` с иконкой Search - поиск по ключевым словам
- `Select` - выпадающие списки для фильтрации
- Фильтры обновляют query параметры автоматически

### Таблицы:
- `Table` - основная таблица с данными
- Сортировка по кликабельным заголовкам
- Пагинация для больших наборов данных
- Бейджи для статусов с цветовой кодировкой

### Диалоги:
- `Dialog` - модальные окна для действий
- Формы с валидацией
- Toast уведомления об успехе/ошибках
- Кнопки с состоянием loading (disabled + текст "Loading...")

### Цветовая схема:
- **Primary** - основные действия (синий)
- **Destructive** - опасные действия (красный)
- **Outline** - вторичные действия
- **Ghost** - минимальные действия
- Поддержка Dark Mode для всех компонентов

---

## Best Practices

### 1. Безопасность:
- ✅ Все действия логируются в audit_logs
- ✅ Проверка прав доступа на бэкенде (requirePermission middleware)
- ✅ Обязательные причины для блокировок и санкций
- ✅ IP и User Agent сохраняются для отслеживания

### 2. UX:
- ✅ Подтверждение опасных действий через диалоги
- ✅ Toast уведомления о результатах операций
- ✅ Loading states для асинхронных операций
- ✅ Валидация форм перед отправкой
- ✅ Debounced поиск для производительности

### 3. Производительность:
- ✅ Пагинация больших списков
- ✅ React Query для кэширования
- ✅ Optimistic updates где возможно
- ✅ Lazy loading для тяжелых компонентов

---

## Локализация

Поддержка 3 языков: English (en), Русский (ru), O'zbek (uz)

Ключи переводов в `client/src/locales/{lang}.json`:
```json
{
  "marketplace": {
    "admin": {
      "dashboard": { ... },
      "users": { ... },
      "salons": { ... },
      "complaints": { ... },
      "sanctions": { ... },
      "audit": { ... },
      "chat": { ... }
    }
  }
}
```

---

## Future Enhancements

Возможные улучшения для будущих версий:

1. **User Activity Tracking:**
   - Отслеживание сессий пользователей
   - Online/offline статус
   - История действий пользователей

2. **Advanced Analytics:**
   - Графики и диаграммы по метрикам
   - Экспорт отчетов (CSV, PDF)
   - Real-time обновления статистики

3. **Bulk Operations:**
   - Массовые действия над пользователями
   - Импорт/экспорт данных
   - Batch processing

4. **Advanced Search:**
   - Полнотекстовый поиск
   - Сохраненные фильтры
   - Экспорт результатов поиска

5. **Notifications:**
   - Push уведомления для админов
   - Email алерты для критичных событий
   - Webhook интеграции

---

## Troubleshooting

### Проблема: Не загружаются данные
**Решение:** Проверить права доступа пользователя в таблице `admin_users`

### Проблема: Ошибка при блокировке пользователя
**Решение:** Убедиться что указана причина блокировки (required field)

### Проблема: Audit logs не записываются
**Решение:** Проверить middleware `logAuditAction` в server/middleware/admin.ts

### Проблема: Chat сообщения не отправляются
**Решение:** Проверить queryKey invalidation после отправки сообщения

---

## Contacts

Для вопросов по админ панели обращайтесь к команде разработки.

**Последнее обновление:** 2026-02-19
**Версия:** 2.0.0
