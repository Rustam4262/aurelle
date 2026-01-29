# Owner Dashboard - Complete Implementation Specification

**Дата:** 16 января 2026
**Статус:** В разработке
**Приоритет:** P0 - Критический

---

## 📋 Executive Summary

Полная переработка панели владельца салона (Owner Dashboard) с исправлением текущих багов и реализацией полноценного функционала управления салоном, услугами, мастерами, бронированиями и аналитикой.

**Ключевые цели:**

- Исправить все текущие баги (i18n, API errors, empty states)
- Добавить RBAC и audit logging
- Реализовать 7 полноценных вкладок с всем необходимым функционалом
- Обеспечить безопасность, производительность и UX

---

## 🚨 0. Критические исправления (Priority 0)

### 0.1 Исправить i18n ошибки ✅

**Проблемы:**

- ✅ `analytics.title` показывается как текст вместо перевода - **ИСПРАВЛЕНО**
- ✅ `bookingWindow` возвращает object вместо string - **ИСПРАВЛЕНО**

**Решение:**

- ✅ Добавлены переводы `dashboard.title`, `bookings.title`, `services.title`, `masters.title`
- ✅ Исправлено использование `calendar.bookingWindow` → `calendar.bookingWindow.maxDaysAdvance`

**Файлы:**

- [x] `client/src/locales/en.json`
- [x] `client/src/locales/ru.json`
- [x] `client/src/locales/uz.json`
- [x] `client/src/components/booking-calendar.tsx`

---

### 0.2 Исправить "Failed to load dashboard data"

**Проблемы:**

- ✅ Ошибка при загрузке данных dashboard - **ИСПРАВЛЕНО** (apiRequest не парсил JSON)
- Нет graceful error handling
- Нет retry механизма
- Нет различия между "ошибка API" и "нет данных"

**Решение:**

- [x] Добавить `.json()` парсинг во все apiRequest вызовы
- [ ] Создать компонент `ErrorBoundary` с retry
- [ ] Создать компонент `EmptyState` с CTA кнопками
- [ ] Добавить различные состояния: loading, error, empty, success

---

### 0.3 Добавить RBAC (Role-Based Access Control)

**Таблица permissions:**

```sql
CREATE TABLE owner_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id VARCHAR NOT NULL,
  permission VARCHAR NOT NULL, -- 'owner.read_dashboard', 'owner.manage_bookings', etc.
  granted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_id, permission)
);
```

**Permissions список:**

- `owner.read_dashboard`
- `owner.read_bookings` / `owner.manage_bookings`
- `owner.read_services` / `owner.manage_services`
- `owner.read_masters` / `owner.manage_masters`
- `owner.read_salons` / `owner.manage_salons`
- `owner.read_calendar` / `owner.manage_calendar`
- `owner.read_analytics`

**Backend middleware:**

```typescript
// server/middleware/rbac.ts
export function requirePermission(permission: string) {
  return async (req, res, next) => {
    const ownerId = req.session.ownerId;
    const hasPermission = await checkPermission(ownerId, permission);
    if (!hasPermission) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    next();
  };
}
```

---

### 0.4 Добавить Audit Logging

**Таблица audit_logs:**

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR NOT NULL,
  action VARCHAR NOT NULL, -- 'booking.cancel', 'service.create', 'master.update'
  entity_type VARCHAR NOT NULL, -- 'booking', 'service', 'master', 'salon'
  entity_id VARCHAR,
  salon_id VARCHAR, -- для фильтрации по салону
  details JSONB, -- детали изменений
  ip_address VARCHAR,
  user_agent TEXT,
  result VARCHAR, -- 'success' / 'failure'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_salon ON audit_logs(salon_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

**Helper функция:**

```typescript
// server/lib/audit.ts
export async function logAudit(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  salonId?: string;
  details?: any;
  ip?: string;
  userAgent?: string;
  result: "success" | "failure";
  error?: string;
}) {
  await db.insert(auditLogs).values(params);
}
```

---

## 🎯 1. Dashboard (Главная панель)

### Цель

Дать владельцу "пульс салона" за 10 секунд: KPI, графики, топы, алерты.

### UI Компоненты

#### 1.1 KPI Cards (верхний ряд)

```tsx
<KpiCard title="Выручка" value="1,250,000 UZS" change="+12.5%" trend="up" period="за 30 дней" />
```

**Метрики:**

- Выручка (сумма оплаченных)
- Кол-во записей (всего / подтверждено / отменено)
- Средний чек
- Заполняемость слотов (%)
- Средний рейтинг салона
- Кол-во отзывов

#### 1.2 Графики

```tsx
<Chart type="line" title="Записи по дням" data={bookingsTrend} />
<Chart type="bar" title="Выручка по дням" data={revenueTrend} />
```

#### 1.3 Топы

```tsx
<TopList title="Топ услуги" items={topServices} />
<TopList title="Топ мастера" items={topMasters} />
```

#### 1.4 Алерты

```tsx
<Alert severity="warning">
  <AlertTitle>Нет услуг</AlertTitle>
  <AlertDescription>Создайте услуги, чтобы клиенты могли записываться</AlertDescription>
  <Button onClick={() => navigate("/owner?tab=services")}>Создать услугу</Button>
</Alert>
```

**Типы алертов:**

- `NO_SERVICES` - нет услуг
- `NO_MASTERS` - нет мастеров
- `SALON_NOT_PUBLISHED` - салон не опубликован
- `NO_WORKING_HOURS` - не заполнены часы работы
- `LOW_RATING` - низкий рейтинг
- `HIGH_CANCELLATION_RATE` - много отмен

### API Endpoints

#### GET /api/owner/dashboard/overview

```typescript
Response: {
  kpi: {
    revenue: number;
    bookings_total: number;
    bookings_confirmed: number;
    bookings_cancelled: number;
    avg_check: number;
    occupancy: number; // 0-1
    rating_avg: number;
    reviews_count: number;
  }
  timeseries: {
    bookings: Array<{ date: string; value: number }>;
    revenue: Array<{ date: string; value: number }>;
  }
  tops: {
    services: Array<{
      service_id: string;
      name: MultiLang;
      count: number;
      revenue: number;
    }>;
    masters: Array<{
      master_id: string;
      name: string;
      bookings: number;
      revenue: number;
      rating: number;
    }>;
  }
  alerts: Array<{
    code: AlertCode;
    severity: "info" | "warning" | "error";
    cta: string; // navigation target
  }>;
}
```

### Фильтры

- Выбор салона (All / конкретный)
- Период: Today / 7d / 30d / Custom

### Acceptance Criteria

- [ ] Если нет данных - показывать empty state с причиной, не ошибку
- [ ] Ошибка API - понятный блок + кнопка Retry
- [ ] Все KPI считаются только по салонам владельца
- [ ] Графики обновляются при смене фильтров
- [ ] Клик на алерт ведет на нужную страницу
- [ ] Loading состояние для каждого блока отдельно

---

## 📅 2. Bookings (Управление бронированиями)

### Цель

Полный контроль записей: просмотр, подтверждение, перенос, отмена, оплата, общение с клиентом.

### UI Компоненты

#### 2.1 Таблица записей

**Колонки:**

- Checkbox (для массовых операций)
- Дата/время
- Клиент (имя, телефон)
- Салон
- Мастер
- Услуга
- Длительность
- Статус (badge)
- Цена
- Оплата (paid/unpaid)
- Действия (dropdown menu)

#### 2.2 Фильтры

```tsx
<BookingFilters>
  <Select label="Статус" options={statusOptions} />
  <Select label="Салон" options={salons} />
  <Select label="Мастер" options={masters} />
  <DateRangePicker label="Период" />
  <Input label="Поиск" placeholder="Клиент, телефон, ID" />
  <Select label="Оплата" options={["all", "paid", "unpaid"]} />
</BookingFilters>
```

#### 2.3 Действия на запись

**Single Actions:**

- View Details (drawer с полной информацией)
- Confirm
- Cancel (модалка с выбором причины)
- Reschedule (выбор нового слота)
- Mark as Completed
- Mark as No-show
- Mark as Paid / Request Refund
- Send Message (чат/шаблоны)

**Bulk Actions:**

- Confirm Selected
- Cancel Selected (с причиной)
- Export CSV

#### 2.4 Детали записи (Drawer/Modal)

```tsx
<BookingDetails booking={booking}>
  <Section title="Клиент">
    <ClientInfo client={booking.client} />
    <ClientHistory clientId={booking.clientId} />
  </Section>

  <Section title="Услуга">
    <ServiceInfo service={booking.service} />
  </Section>

  <Section title="Оплата">
    <PaymentInfo payment={booking.payment} />
  </Section>

  <Section title="История">
    <Timeline events={booking.history} />
  </Section>

  <Section title="Внутренние заметки">
    <Notes bookingId={booking.id} />
  </Section>
</BookingDetails>
```

### API Endpoints

#### GET /api/owner/bookings/advanced

```typescript
Query params:
- salon_id?: string
- master_id?: string
- status?: BookingStatus[]
- payment_status?: 'paid' | 'unpaid'
- from?: Date
- to?: Date
- search?: string // client name/phone/booking_id
- page?: number
- limit?: number

Response:
{
  bookings: Array<Booking & {
    client: { name, phone, email },
    salon: { name },
    master: { name },
    service: { name },
  }>;
  total: number;
  page: number;
  limit: number;
}
```

#### POST /api/owner/bookings/:id/confirm

```typescript
Body: {}
Response: { success: boolean; booking: Booking }
Audit: logs 'booking.confirm'
Notification: клиенту "Ваша запись подтверждена"
```

#### POST /api/owner/bookings/:id/cancel

```typescript
Body: {
  cancel_reason: string; // required
  cancel_category: 'client_request' | 'salon_issue' | 'master_unavailable' | 'other';
  notify_client: boolean;
}
Response: { success: boolean }
Audit: logs 'booking.cancel'
Notification: клиенту если notify_client=true
```

#### POST /api/owner/bookings/:id/reschedule

```typescript
Body: {
  new_date: Date;
  new_time: string;
  master_id?: string;
  notify_client: boolean;
}
Response: { success: boolean; booking: Booking }
Audit: logs 'booking.reschedule'
```

#### POST /api/owner/bookings/:id/complete

```typescript
Body: {}
Response: { success: boolean }
Audit: logs 'booking.complete'
Side effect: обновляет статистику мастера
```

#### POST /api/owner/bookings/:id/no-show

```typescript
Body: {
  penalty_applied: boolean;
}
Response: { success: boolean }
Audit: logs 'booking.no_show'
```

#### POST /api/owner/bookings/:id/mark-paid

```typescript
Body: {
  payment_method: string;
  amount: number;
}
Response: { success: boolean }
Audit: logs 'booking.mark_paid'
```

#### GET /api/owner/bookings/export

```typescript
Query: same as /bookings/advanced
Response: CSV file
```

### Бизнес-правила статусов

**State Machine:**

```
pending → confirmed | cancelled
confirmed → completed | cancelled | no_show | rescheduled
rescheduled → confirmed | cancelled
completed → [final]
cancelled → [final]
no_show → [final]
```

**Отмена:**

- Требует обязательного указания причины
- Отправляет уведомление клиенту
- Освобождает слот в календаре
- Логируется в audit

**Перенос:**

- Проверяет доступность нового слота
- Отправляет уведомление клиенту
- Обновляет календарь

### Acceptance Criteria

- [ ] Любое действие меняет запись и отражается в календаре
- [ ] Все изменения логируются в audit_logs
- [ ] Экспорт выгружает ровно то, что видно по фильтрам
- [ ] Массовые операции работают транзакционно
- [ ] Pagination работает на сервере
- [ ] Фильтры применяются на сервере
- [ ] Уведомления отправляются клиентам

---

## ✂️ 3. Services (Управление услугами)

### Цель

Создавать, редактировать, сортировать, включать/выключать услуги, назначать мастерам.

### Структура услуги

```typescript
type Service = {
  id: string;
  salon_id: string;
  name: MultiLang; // {en, ru, uz}
  description: MultiLang;
  category: ServiceCategory;
  duration_minutes: number;
  price_type: "fixed" | "range";
  price_min: number;
  price_max?: number;
  currency: "UZS";
  image_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
};
```

### UI Компоненты

#### 3.1 Список услуг

```tsx
<ServiceList>
  {services.map((service, index) => (
    <DraggableServiceCard
      key={service.id}
      service={service}
      index={index}
      onMove={handleReorder}
      onEdit={handleEdit}
      onDuplicate={handleDuplicate}
      onToggle={handleToggle}
    />
  ))}
</ServiceList>
```

**Drag & Drop:**

- Использовать `@dnd-kit/core` и `@dnd-kit/sortable`
- Сохранять новый порядок на сервер после каждого перетаскивания

#### 3.2 Фильтры

- Салон (dropdown)
- Категория (multi-select)
- Статус (Active / Inactive / All)
- Поиск по названию

#### 3.3 Форма создания/редактирования

```tsx
<ServiceForm>
  <Tabs defaultValue="ru">
    <Tab value="ru">Русский</Tab>
    <Tab value="en">English</Tab>
    <Tab value="uz">O'zbek</Tab>
  </Tabs>

  <TabPanel value="ru">
    <Input label="Название" name="name.ru" required />
    <Textarea label="Описание" name="description.ru" />
  </TabPanel>

  {/* аналогично для en, uz */}

  <Select label="Категория" options={categories} />

  <Input type="number" label="Длительность (минут)" name="duration_minutes" step={15} required />

  <RadioGroup label="Тип цены">
    <Radio value="fixed">Фиксированная</Radio>
    <Radio value="range">Диапазон</Radio>
  </RadioGroup>

  {priceType === "fixed" ? (
    <Input label="Цена" name="price_min" type="number" required />
  ) : (
    <>
      <Input label="Цена от" name="price_min" type="number" required />
      <Input label="Цена до" name="price_max" type="number" required />
    </>
  )}

  <MultiSelect
    label="Салоны"
    options={salons}
    value={selectedSalons}
    onChange={setSelectedSalons}
  />

  <MultiSelect
    label="Мастера"
    options={masters}
    value={selectedMasters}
    onChange={setSelectedMasters}
  />

  <ImageUpload label="Фото услуги" value={imageUrl} onChange={setImageUrl} />
</ServiceForm>
```

### API Endpoints

#### GET /api/owner/services/stats

```typescript
Query: salon_id?, category?, status?, search?
Response: Array<Service & {
  booking_count: number;
  total_revenue: number;
  assigned_masters: Array<{id, name}>;
}>
```

#### POST /api/owner/services

```typescript
Body: {
  salon_id: string;
  name: MultiLang;
  description?: MultiLang;
  category: string;
  duration_minutes: number;
  price_type: 'fixed' | 'range';
  price_min: number;
  price_max?: number;
  image_url?: string;
  master_ids: string[];
}
Audit: 'service.create'
```

#### PUT /api/owner/services/:id

```typescript
Body: Partial<Service>;
Audit: "service.update";
```

#### POST /api/owner/services/:id/duplicate

```typescript
Response: {
  service: Service;
}
Audit: "service.duplicate";
```

#### POST /api/owner/services/:id/toggle

```typescript
Body: {
  is_active: boolean;
}
Audit: "service.toggle";
```

#### POST /api/owner/services/reorder

```typescript
Body: {
  service_ids: string[]; // новый порядок
}
Audit: 'service.reorder'
```

### Правила валидации

- Услуга не может быть active без:
  - Названия на всех языках
  - Цены
  - Длительности
  - Хотя бы одного мастера (опционально, зависит от бизнес-логики)
- При выключении услуги (is_active=false):
  - Она не видна клиентам
  - Не доступна в бронировании
  - Существующие записи остаются

### Acceptance Criteria

- [ ] Drag-drop сохраняет порядок на сервер
- [ ] Мульти-язычные поля работают корректно
- [ ] Услуга отображается в клиентском бронировании
- [ ] Фильтр по мастерам работает (только те мастера, кто назначен)
- [ ] Дублирование создает копию с " (Copy)" в названии
- [ ] Валидация работает на фронте и бэкенде

---

## 👥 4. Masters (Управление мастерами)

### Цель

Добавлять мастеров, управлять профилем, услугами, графиком, видеть производительность.

### Структура мастера

```typescript
type Master = {
  id: string;
  salon_id: string;
  user_id?: string; // если у мастера есть аккаунт
  name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  bio: MultiLang;
  specialties: string[]; // ['hair', 'nails']
  is_active: boolean;
  rating_avg: number;
  review_count: number;
  commission_rate?: number; // процент с услуг
  created_at: Date;
  updated_at: Date;
};
```

### UI Компоненты

#### 4.1 Список мастеров

```tsx
<MasterList>
  {masters.map((master) => (
    <MasterCard
      key={master.id}
      master={master}
      onEdit={handleEdit}
      onToggle={handleToggle}
      onViewSchedule={handleSchedule}
      onViewStats={handleStats}
    />
  ))}
</MasterList>
```

**MasterCard показывает:**

- Фото
- Имя
- Специализации (badges)
- Рейтинг и кол-во отзывов
- Статус (active/inactive)
- Кол-во записей за 30 дней
- Выручка за 30 дней
- Кнопки действий

#### 4.2 Фильтры

- Салон
- Статус (Active / Inactive)
- Услуга (показать мастеров, кто делает эту услугу)
- Поиск по имени

#### 4.3 Форма мастера

```tsx
<MasterForm>
  <Input label="ФИО" name="name" required />
  <Input label="Телефон" name="phone" />
  <Input label="Email" name="email" />
  <ImageUpload label="Фото" value={avatarUrl} onChange={setAvatarUrl} />

  <Tabs>
    <Tab value="ru">Описание (RU)</Tab>
    <Tab value="en">Описание (EN)</Tab>
    <Tab value="uz">Описание (UZ)</Tab>
  </Tabs>

  <TagInput
    label="Специализации"
    value={specialties}
    onChange={setSpecialties}
    suggestions={["hair", "nails", "makeup", "spa"]}
  />

  <MultiSelect
    label="Услуги"
    options={services}
    value={selectedServices}
    onChange={setSelectedServices}
  />

  <Select label="Салон" options={salons} value={salonId} onChange={setSalonId} />

  <Input label="Комиссия (%)" type="number" name="commission_rate" min={0} max={100} />
</MasterForm>
```

#### 4.4 График работы мастера

```tsx
<MasterSchedule masterId={master.id}>
  <WeeklySchedule>
    {daysOfWeek.map((day) => (
      <DaySchedule key={day} day={day}>
        <Checkbox label="Рабочий день" />
        <TimeInput label="Начало" />
        <TimeInput label="Конец" />
        <Input label="Буфер (мин)" type="number" />
      </DaySchedule>
    ))}
  </WeeklySchedule>

  <Exceptions>
    <Button onClick={handleAddException}>Добавить исключение (отпуск/больничный)</Button>
    <ExceptionList exceptions={exceptions} />
  </Exceptions>
</MasterSchedule>
```

#### 4.5 Статистика мастера (мини-аналитика)

```tsx
<MasterStats master={master}>
  <Stat label="Записей за 7 дней" value={stats.bookings_7d} />
  <Stat label="Записей за 30 дней" value={stats.bookings_30d} />
  <Stat label="Выручка за 30 дней" value={formatCurrency(stats.revenue_30d)} />
  <Stat label="Отмены" value={stats.cancellations} />
  <Stat label="Неявки" value={stats.no_shows} />
  <Stat label="Средняя оценка" value={stats.rating_avg} />
</MasterStats>
```

### API Endpoints

#### GET /api/owner/masters/stats

```typescript
Query: salon_id?, service_id?, status?, search?
Response: Array<Master & {
  bookings_7d: number;
  bookings_30d: number;
  revenue_30d: number;
  cancellations_30d: number;
  no_shows_30d: number;
  services: Array<{id, name}>;
}>
```

#### POST /api/owner/masters

```typescript
Body: {
  salon_id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  bio?: MultiLang;
  specialties?: string[];
  service_ids: string[];
  commission_rate?: number;
}
Audit: 'master.create'
```

#### PUT /api/owner/masters/:id

```typescript
Body: Partial<Master>;
Audit: "master.update";
```

#### POST /api/owner/masters/:id/toggle

```typescript
Body: { is_active: boolean }
Audit: 'master.toggle'
Effect: если is_active=false, отменяет будущие записи мастера
```

#### GET /api/owner/masters/:id/schedule

```typescript
Response: {
  weekly: Array<{
    day_of_week: number;
    is_working: boolean;
    start_time: string;
    end_time: string;
    buffer_minutes: number;
  }>;
  exceptions: Array<{
    date: Date;
    type: "vacation" | "sick" | "other";
    reason: string;
  }>;
}
```

#### PUT /api/owner/masters/:id/schedule

```typescript
Body: {
  (weekly, exceptions);
}
Audit: "master.schedule_update";
```

### Правила

- Мастер не может быть active без:
  - Имени
  - Хотя бы одной услуги
  - Графика работы (хотя бы один рабочий день)
- При деактивации мастера:
  - Будущие записи переносятся или отменяются (спросить владельца)
  - Прошедшие записи остаются

### Acceptance Criteria

- [ ] Мастер появляется в выборе только если active + есть услуги + есть слоты
- [ ] График работы применяется при генерации слотов в календаре
- [ ] Исключения (отпуск) блокируют слоты
- [ ] Статистика обновляется в real-time
- [ ] Услуги мастера синхронизируются с услугами салона

---

## 🏪 5. Мои салоны (Salon Management)

### Цель

Управление салонами: создание, редактирование, публикация, настройки бронирования.

### UI Компоненты

#### 5.1 Список салонов (Grid)

```tsx
<SalonGrid>
  {salons.map((salon) => (
    <SalonCard
      key={salon.id}
      salon={salon}
      onManage={() => navigate(`/owner/salon/${salon.id}`)}
      onPublish={handlePublish}
      onPreview={() => window.open(`/salon/${salon.id}`, "_blank")}
    />
  ))}
  <AddSalonCard onClick={handleAddSalon} />
</SalonGrid>
```

**SalonCard:**

- Обложка
- Название
- Статус (draft / published / suspended)
- Рейтинг и отзывы
- Записей за 30 дней
- Адрес
- CTA buttons

#### 5.2 Создание салона (Multi-step wizard)

```tsx
<CreateSalonWizard>
  <Step1_BasicInfo>
    <Tabs>
      <Tab value="ru">Русский</Tab>
      <Tab value="en">English</Tab>
      <Tab value="uz">O'zbek</Tab>
    </Tabs>
    <Input label="Название салона" name="name[ru]" />
    <Textarea label="Описание" name="description[ru]" />
  </Step1_BasicInfo>

  <Step2_Contacts>
    <Input label="Телефон" name="phone" type="tel" />
    <Input label="Email" name="email" type="email" />
    <Input label="Instagram" name="social.instagram" />
    <Input label="Telegram" name="social.telegram" />
  </Step2_Contacts>

  <Step3_Location>
    <Input label="Город" name="city" />
    <Input label="Адрес" name="address" />
    <MapPicker
      value={{ lat, lng }}
      onChange={({ lat, lng }) => {
        setLatitude(lat);
        setLongitude(lng);
      }}
    />
  </Step3_Location>

  <Step4_Photos>
    <ImageUpload label="Обложка" value={coverPhoto} onChange={setCoverPhoto} />
    <MultiImageUpload label="Галерея" value={photos} onChange={setPhotos} max={10} />
  </Step4_Photos>

  <Step5_WorkingHours>
    <WeeklySchedule />
  </Step5_WorkingHours>

  <Step6_Policies>
    <Input
      label="Окно отмены (часов)"
      name="cancellation_window_hours"
      type="number"
      help="За сколько часов до записи клиент может отменить"
    />
    <Input
      label="Минимальное уведомление (часов)"
      name="min_notice_hours"
      type="number"
      help="За сколько часов минимум нужно записываться"
    />
    <Input
      label="Максимальное окно записи (дней)"
      name="max_advance_booking_days"
      type="number"
      help="На сколько дней вперед можно записываться"
    />
    <Checkbox label="Требовать депозит" name="require_deposit" />
  </Step6_Policies>

  <Step7_Review>
    <SalonPreview salon={formData} />
    <Button onClick={handlePublish}>Опубликовать салон</Button>
  </Step7_Review>
</CreateSalonWizard>
```

#### 5.3 Manage Salon (Settings page)

```tsx
<SalonSettings salonId={salonId}>
  <Tabs>
    <Tab value="profile">Профиль</Tab>
    <Tab value="media">Медиа</Tab>
    <Tab value="location">Локация</Tab>
    <Tab value="hours">Часы работы</Tab>
    <Tab value="booking">Настройки бронирования</Tab>
    <Tab value="team">Команда</Tab>
    <Tab value="services">Услуги</Tab>
  </Tabs>

  <TabPanel value="profile">
    <ProfileForm salon={salon} onSave={handleSaveProfile} />
  </TabPanel>

  <TabPanel value="media">
    <MediaManager salon={salon} />
  </TabPanel>

  {/* ... остальные табы */}
</SalonSettings>
```

### API Endpoints

#### POST /api/owner/salons

```typescript
Body: {
  name: MultiLang;
  description: MultiLang;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  email?: string;
  photos: string[];
  working_hours: Array<WorkingHour>;
  cancellation_window_hours: number;
  min_notice_hours: number;
  max_advance_booking_days: number;
  require_deposit: boolean;
}
Audit: 'salon.create'
```

#### PUT /api/owner/salons/:id

```typescript
Body: Partial<Salon>;
Audit: "salon.update";
```

#### POST /api/owner/salons/:id/publish

```typescript
Validation:
- Должен быть адрес
- Должны быть часы работы
- Должна быть хотя бы 1 услуга
- Должен быть хотя бы 1 мастер
Response: { success: boolean; errors?: string[] }
Audit: 'salon.publish'
```

#### GET /api/owner/salons/:id/settings

```typescript
Response: Salon & {
  salon_settings: SalonSettings;
  masters_count: number;
  services_count: number;
  bookings_30d: number;
}
```

### Acceptance Criteria

- [ ] Wizard сохраняет прогресс (можно вернуться к незавершенному)
- [ ] Нельзя опубликовать салон без обязательных полей
- [ ] После публикации салон виден в клиентском маркетплейсе
- [ ] Настройки бронирования применяются при создании записей
- [ ] Map picker работает корректно

---

## 📆 6. Календарь (Calendar)

### Цель

Визуальное управление расписанием: просмотр слотов, записей, блокировок, быстрые действия.

### UI Компоненты

#### 6.1 Layout

```tsx
<CalendarLayout>
  <Sidebar>
    <CalendarMonth onDateSelect={handleDateSelect} />
    <Filters>
      <Select label="Салон" options={salons} />
      <MultiSelect label="Мастера" options={masters} />
    </Filters>
  </Sidebar>

  <Main>
    <Toolbar>
      <Button onClick={() => setDate(new Date())}>Сегодня</Button>
      <Button onClick={handleCreateBlock}>Заблокировать время</Button>
    </Toolbar>

    <TimeSlotGrid>
      {timeSlots.map((slot) => (
        <TimeSlot
          key={slot.time}
          time={slot.time}
          masters={filteredMasters}
          bookings={getBookingsForSlot(slot)}
          onSlotClick={handleSlotClick}
        />
      ))}
    </TimeSlotGrid>
  </Main>
</CalendarLayout>
```

#### 6.2 TimeSlot component

```tsx
<TimeSlot time="09:00">
  {masters.map((master) => {
    const booking = getBookingForMasterAtTime(master, time);
    const isBlocked = isTimeBlocked(master, time);

    return (
      <MasterSlot key={master.id} master={master}>
        {booking ? (
          <BookingChip booking={booking} onClick={() => handleViewBooking(booking)} />
        ) : isBlocked ? (
          <BlockedChip reason={blockReason} />
        ) : (
          <FreeSlot onClick={() => handleQuickBook(master, time)} />
        )}
      </MasterSlot>
    );
  })}
</TimeSlot>
```

#### 6.3 Блокировки

```tsx
<CreateBlockDialog>
  <Select label="Мастер" options={masters} />
  <DatePicker label="Дата" />
  <TimeRangePicker label="Время" from="start" to="end" />
  <Textarea label="Причина" name="reason" />
  <Select label="Тип" options={["перерыв", "обед", "выходной", "отпуск", "другое"]} />
</CreateBlockDialog>
```

### API Endpoints

#### GET /api/owner/calendar

```typescript
Query:
- date: YYYY-MM-DD
- salon_id?: string
- master_ids?: string[]

Response: {
  slots: Array<{
    time: string; // "09:00"
    masters: Array<{
      master_id: string;
      master_name: string;
      status: 'free' | 'booked' | 'blocked';
      booking?: Booking;
      block?: Block;
    }>;
  }>;
}
```

#### POST /api/owner/calendar/blocks

```typescript
Body: {
  master_id: string;
  date: Date;
  start_time: string;
  end_time: string;
  type: string;
  reason: string;
}
Audit: "calendar.block_create";
```

#### DELETE /api/owner/calendar/blocks/:id

```typescript
Audit: "calendar.block_delete";
```

### Логика генерации слотов

```typescript
function generateSlots(params: {
  date: Date;
  salonId: string;
  masterIds: string[];
}): TimeSlot[] {
  // 1. Получить часы работы салона для этого дня недели
  const salonHours = getSalonWorkingHours(salonId, date.getDay());

  // 2. Получить расписания мастеров
  const masterSchedules = getMasterSchedules(masterIds, date.getDay());

  // 3. Получить исключения (отпуска, больничные)
  const exceptions = getMasterExceptions(masterIds, date);

  // 4. Получить существующие записи
  const bookings = getBookings(masterIds, date);

  // 5. Получить блокировки
  const blocks = getBlocks(masterIds, date);

  // 6. Сгенерировать слоты с шагом (например, 15 мин)
  const slots = [];
  for (let time = salonHours.start; time < salonHours.end; time += 15min) {
    slots.push({
      time,
      masters: masterIds.map(masterId => ({
        master_id: masterId,
        status: calculateSlotStatus(masterId, time, {
          schedule: masterSchedules[masterId],
          exceptions: exceptions[masterId],
          bookings: bookings[masterId],
          blocks: blocks[masterId],
        }),
      })),
    });
  }

  return slots;
}
```

### Acceptance Criteria

- [ ] Слоты генерируются с учетом графика салона и мастеров
- [ ] Исключения (отпуск) блокируют слоты
- [ ] Блокировки отображаются корректно
- [ ] Клик на занятый слот открывает детали записи
- [ ] Клик на свободный слот позволяет создать запись
- [ ] Изменения в записях отражаются без перезагрузки

---

## 📊 7. Analytics (Аналитика)

### Цель

Показать владельцу данные для принятия решений: финансы, операционка, клиенты.

### UI Компоненты

#### 7.1 Фильтры

```tsx
<AnalyticsFilters>
  <DateRangePicker
    presets={["7d", "30d", "90d", "custom"]}
    value={dateRange}
    onChange={setDateRange}
  />
  <Select label="Салон" options={salons} />
  <Select label="Мастер" options={masters} />
  <Select label="Услуга" options={services} />
</AnalyticsFilters>
```

#### 7.2 Секции

**Финансы:**

```tsx
<FinanceSection>
  <KpiRow>
    <Kpi label="Выручка" value={formatCurrency(revenue)} />
    <Kpi label="Потенциальная выручка" value={formatCurrency(potential)} />
    <Kpi label="Средний чек" value={formatCurrency(avgCheck)} />
  </KpiRow>

  <Chart type="line" title="Выручка по дням" data={revenueTimeseries} />

  <Chart type="bar" title="Выручка по услугам" data={revenueByService} />

  <Chart type="bar" title="Выручка по мастерам" data={revenueByMaster} />
</FinanceSection>
```

**Операционка:**

```tsx
<OperationsSection>
  <KpiRow>
    <Kpi label="Всего записей" value={totalBookings} />
    <Kpi label="% отмен" value={`${cancellationRate}%`} trend="down" />
    <Kpi label="% неявок" value={`${noShowRate}%`} trend="down" />
    <Kpi label="Загрузка" value={`${occupancy}%`} trend="up" />
  </KpiRow>

  <Chart type="donut" title="Распределение по статусам" data={bookingsByStatus} />

  <Chart type="bar" title="Топ услуги по записям" data={topServices} />
</OperationsSection>
```

**Клиенты:**

```tsx
<ClientsSection>
  <KpiRow>
    <Kpi label="Новые клиенты" value={newClients} />
    <Kpi label="Вернувшиеся" value={returningClients} />
    <Kpi label="% возврата" value={`${retentionRate}%`} />
  </KpiRow>

  <Table title="ТОП клиенты" columns={["Имя", "Визиты", "Выручка"]} data={topClients} />
</ClientsSection>
```

#### 7.3 Экспорт

```tsx
<ExportToolbar>
  <Button onClick={handleExportCSV}>Экспорт CSV</Button>
  <Button onClick={handleExportPDF}>Экспорт PDF</Button>
</ExportToolbar>
```

### API Endpoints

#### GET /api/owner/analytics

```typescript
Query:
- from: Date
- to: Date
- salon_id?: string
- master_id?: string
- service_id?: string

Response: {
  finance: {
    revenue: number;
    potential_revenue: number;
    avg_check: number;
    revenue_timeseries: Array<{date: string; value: number}>;
    revenue_by_service: Array<{service_id, name, revenue}>;
    revenue_by_master: Array<{master_id, name, revenue}>;
  };
  operations: {
    total_bookings: number;
    by_status: {
      confirmed: number;
      completed: number;
      cancelled: number;
      no_show: number;
    };
    cancellation_rate: number;
    no_show_rate: number;
    occupancy: number;
    top_services: Array<{service_id, name, count}>;
  };
  clients: {
    new_clients: number;
    returning_clients: number;
    retention_rate: number;
    top_clients: Array<{
      client_id: string;
      name: string;
      visits: number;
      revenue: number;
    }>;
  };
}
```

#### GET /api/owner/analytics/export.csv

```typescript
Query: same as /analytics
Response: CSV file
```

#### GET /api/owner/analytics/export.pdf

```typescript
Query: same as /analytics
Response: PDF file
```

### Acceptance Criteria

- [ ] Если нет данных - показать empty state с объяснением
- [ ] Переводы корректные, нет "analytics.title"
- [ ] Фильтры применяются ко всем графикам
- [ ] Экспорт содержит все видимые данные
- [ ] Графики интерактивные (tooltips, zoom)
- [ ] Данные кешируются (не пересчитываются каждый раз)

---

## 🔐 Security & Performance

### Authentication

- JWT токены с refresh
- Session хранится в PostgreSQL
- CSRF protection
- Rate limiting (100 req/min per owner)

### Authorization

- Все endpoints проверяют `owner_id` из сессии
- RBAC middleware на всех роутах
- Запрещено видеть/редактировать чужие данные

### Performance

- Server-side pagination (limit=50 default)
- Server-side фильтры и сортировка
- Indexes на все foreign keys
- Кеширование аналитики (Redis, TTL 5 мин)
- Query optimization (select only needed fields)

### Observability

- Все ошибки API логируются в Sentry
- Метрики запросов (latency, error rate)
- Audit logs для всех изменений
- Health check endpoint: `/api/health`

---

## 📝 Testing Strategy

### Unit Tests

- Все helper функции
- Валидаторы (Zod schemas)
- Бизнес-логика (state machine для bookings)

### Integration Tests

- API endpoints (request/response)
- Database queries
- RBAC проверки
- Audit logging

### E2E Tests (Playwright)

```typescript
test("Owner can create and publish salon", async ({ page }) => {
  await page.goto("/auth");
  await login(page, OWNER_CREDENTIALS);
  await page.goto("/owner?tab=salons");
  await page.click("text=Добавить салон");

  // Fill wizard
  await fillSalonWizard(page, salonData);

  // Publish
  await page.click("text=Опубликовать");

  // Verify
  await expect(page.locator("text=Салон опубликован")).toBeVisible();

  // Check in marketplace
  await page.goto("/");
  await expect(page.locator(`text=${salonData.name.ru}`)).toBeVisible();
});

test("Owner can manage bookings", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/owner?tab=bookings");

  // Filter
  await page.selectOption("select[name=status]", "pending");

  // Confirm booking
  await page.click("text=Подтвердить >> nth=0");
  await expect(page.locator(".status-badge >> text=Подтверждено")).toBeVisible();

  // Check audit log
  const logs = await getAuditLogs(ownerId);
  expect(logs[0].action).toBe("booking.confirm");
});
```

---

## 🚀 Deployment Plan

### Phase 1: Critical Fixes (Week 1)

- [x] Fix i18n errors
- [x] Fix apiRequest JSON parsing
- [ ] Add error boundaries
- [ ] Add empty states
- [ ] Deploy to production

### Phase 2: RBAC & Audit (Week 2)

- [ ] Create database tables (permissions, audit_logs)
- [ ] Implement RBAC middleware
- [ ] Implement audit logging
- [ ] Test and deploy

### Phase 3: Dashboard (Week 3)

- [ ] Implement KPI cards
- [ ] Implement charts
- [ ] Implement alerts
- [ ] Test and deploy

### Phase 4: Bookings (Week 4-5)

- [ ] Implement advanced table
- [ ] Implement filters
- [ ] Implement actions (confirm, cancel, reschedule)
- [ ] Implement bulk actions
- [ ] Test and deploy

### Phase 5: Services (Week 6)

- [ ] Implement service CRUD
- [ ] Implement drag-drop reordering
- [ ] Implement multi-language forms
- [ ] Test and deploy

### Phase 6: Masters (Week 7)

- [ ] Implement master CRUD
- [ ] Implement schedule management
- [ ] Implement stats
- [ ] Test and deploy

### Phase 7: Salons (Week 8)

- [ ] Implement salon wizard
- [ ] Implement salon settings
- [ ] Implement publish flow
- [ ] Test and deploy

### Phase 8: Calendar (Week 9)

- [ ] Implement calendar layout
- [ ] Implement slot generation
- [ ] Implement blocking
- [ ] Test and deploy

### Phase 9: Analytics (Week 10)

- [ ] Implement finance charts
- [ ] Implement operations metrics
- [ ] Implement client stats
- [ ] Implement export
- [ ] Test and deploy

### Phase 10: Polish & Optimization (Week 11)

- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] E2E tests
- [ ] Final deployment

---

## ✅ Definition of Done

Для каждой вкладки:

- [ ] UI реализован согласно спецификации
- [ ] Все состояния работают (loading, empty, error, success)
- [ ] API endpoints реализованы
- [ ] Валидация работает на фронте и бэкенде
- [ ] RBAC проверки добавлены
- [ ] Audit logs записываются
- [ ] Unit/Integration тесты написаны
- [ ] i18n покрытие (RU/EN/UZ) + проверка ключей
- [ ] Документация API обновлена
- [ ] Код ревьюнут
- [ ] Деплой на staging
- [ ] QA тестирование
- [ ] Деплой на production

---

**Последнее обновление:** 16 января 2026
**Статус:** Начата разработка - Phase 1 (Critical Fixes)
