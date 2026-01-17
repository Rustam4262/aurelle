# 🧪 Phase 10 Testing Guide: Breaks & Exceptions Management

**Date**: 2026-01-17
**Purpose**: Руководство по тестированию управления перерывами и исключениями
**User**: Salon Owner
**URL**: https://aurelle.uz/owner

---

## 📋 Pre-requisites

Перед началом тестирования убедитесь:
- [x] Вы залогинены как владелец салона
- [x] У вас есть хотя бы 1 салон
- [x] У салона есть хотя бы 1 мастер
- [x] У салона есть хотя бы 1 услуга
- [x] Dashboard загружается без ошибок

---

## 🎯 Test Cases

### Test Suite 1: Break Times Management

#### Test 1.1: Navigate to Breaks Section
**Steps**:
1. Откройте Owner Dashboard
2. Перейдите в раздел "Мои салоны"
3. Выберите ваш салон
4. Перейдите на таб "Рабочие часы" (Working Hours)
5. Прокрутите вниз до секции "Перерывы" (Break Times)

**Expected Result**:
- ✅ Секция "Break Times" видна
- ✅ Заголовок: "Break Times" (EN) / "Перерывы" (RU) / "Tanaffus vaqtlari" (UZ)
- ✅ Описание: "Define break periods when the salon is not accepting bookings"
- ✅ Кнопка "Add Break" присутствует
- ✅ Карточки для каждого дня недели (Sunday - Saturday)
- ✅ По умолчанию: "No breaks defined" для всех дней

---

#### Test 1.2: Create Break - Monday Lunch Break
**Steps**:
1. Нажмите кнопку "Add Break"
2. В диалоге выберите:
   - Day of Week: **Monday**
   - Start Time: **13:00**
   - End Time: **14:00**
   - Label: **Lunch Break**
3. Нажмите "Save"

**Expected Result**:
- ✅ Диалог закрывается
- ✅ Toast notification: "Break created" / "Перерыв создан"
- ✅ В карточке Monday появляется:
  ```
  🕐 13:00 - 14:00
     (Lunch Break)
     [Edit] [Delete]
  ```
- ✅ Нет ошибок в консоли браузера

**Screenshot Location**: `screenshots/phase10_test_1_2_break_created.png`

---

#### Test 1.3: Create Multiple Breaks - Same Day
**Steps**:
1. Нажмите "Add Break" снова
2. Выберите:
   - Day of Week: **Monday**
   - Start Time: **18:00**
   - End Time: **18:30**
   - Label: **Cleaning**
3. Сохраните

**Expected Result**:
- ✅ В карточке Monday теперь 2 перерыва:
  ```
  🕐 13:00 - 14:00 (Lunch Break)  [Edit] [Delete]
  🕐 18:00 - 18:30 (Cleaning)     [Edit] [Delete]
  ```
- ✅ Оба перерыва отсортированы по времени начала

---

#### Test 1.4: Edit Break
**Steps**:
1. Нажмите "Edit" на первом перерыве (13:00-14:00)
2. Измените End Time на **14:30**
3. Сохраните

**Expected Result**:
- ✅ Toast: "Break updated" / "Перерыв обновлен"
- ✅ Время обновилось: `13:00 - 14:30`
- ✅ Label остался "Lunch Break"

---

#### Test 1.5: Delete Break
**Steps**:
1. Нажмите "Delete" на втором перерыве (18:00-18:30)
2. Подтвердите удаление в браузерном confirm dialog

**Expected Result**:
- ✅ Confirm dialog появляется с текстом: "Are you sure you want to delete this break?"
- ✅ После подтверждения - toast: "Break deleted"
- ✅ Перерыв исчезает из списка
- ✅ Остается только 13:00-14:30

---

#### Test 1.6: Validation - Invalid Time Range
**Steps**:
1. Нажмите "Add Break"
2. Выберите:
   - Day of Week: Tuesday
   - Start Time: **15:00**
   - End Time: **14:00** (раньше чем start!)
3. Попытайтесь сохранить

**Expected Result**:
- ✅ Toast error появляется
- ✅ Текст: "End time must be after start time"
- ✅ Диалог НЕ закрывается
- ✅ Данные НЕ сохраняются

---

#### Test 1.7: Create Breaks for Multiple Days
**Steps**:
1. Создайте перерывы для Tuesday, Wednesday, Thursday (13:00-14:00)
2. Проверьте, что все дни отображаются корректно

**Expected Result**:
- ✅ Каждый день имеет свою карточку
- ✅ Перерывы отображаются под соответствующим днем
- ✅ Дни без перерывов показывают "No breaks defined"

---

### Test Suite 2: Exceptions Management

#### Test 2.1: Navigate to Exceptions Section
**Steps**:
1. На той же странице "Working Hours"
2. Прокрутите вниз до секции "Exceptions & Holidays"

**Expected Result**:
- ✅ Секция "Exceptions & Holidays" видна
- ✅ Заголовок: "Exceptions & Holidays"
- ✅ Описание: "Define special dates when salon is closed or has custom hours"
- ✅ Кнопка "Add Exception"
- ✅ По умолчанию: "No exceptions defined for the next 6 months"

---

#### Test 2.2: Create Exception - Full Closure (Holiday)
**Steps**:
1. Нажмите "Add Exception"
2. В диалоге:
   - Click "Pick a date" → выберите **January 25, 2026** (ближайшая дата)
   - Убедитесь что checkbox "Salon is fully closed on this date" **отмечен**
   - Reason: **Test Holiday**
3. Сохраните

**Expected Result**:
- ✅ Toast: "Exception created" / "Исключение создано"
- ✅ В списке появляется карточка:
  ```
  📅 January 25, 2026
     🔴 Closed
     Test Holiday
     [Edit] [Delete]
  ```
- ✅ Дата отображается в формате PPP (Pretty Print)

---

#### Test 2.3: Create Exception - Custom Hours
**Steps**:
1. Нажмите "Add Exception"
2. Выберите дату: **January 31, 2026**
3. **Снимите** checkbox "Salon is fully closed"
4. Появятся поля Open Time и Close Time:
   - Open Time: **10:00**
   - Close Time: **15:00**
5. Reason: **Early Closing - Test**
6. Сохраните

**Expected Result**:
- ✅ Toast: "Exception created"
- ✅ В списке появляется:
  ```
  📅 January 31, 2026
     ⚠️ Custom Hours: 10:00 - 15:00
     Early Closing - Test
     [Edit] [Delete]
  ```
- ✅ Иконка и текст отличаются от полного закрытия

---

#### Test 2.4: Edit Exception
**Steps**:
1. Нажмите "Edit" на исключении January 31
2. Измените Close Time на **16:00**
3. Сохраните

**Expected Result**:
- ✅ Toast: "Exception updated"
- ✅ Время обновилось: "10:00 - 16:00"

---

#### Test 2.5: Delete Exception
**Steps**:
1. Нажмите "Delete" на исключении January 25
2. Подтвердите

**Expected Result**:
- ✅ Confirm dialog: "Are you sure you want to delete this exception?"
- ✅ Toast: "Exception deleted"
- ✅ Исключение исчезло из списка

---

#### Test 2.6: Validation - Invalid Custom Hours
**Steps**:
1. Создайте новое исключение
2. Снимите checkbox "fully closed"
3. Установите:
   - Open Time: **16:00**
   - Close Time: **15:00** (раньше!)
4. Попытайтесь сохранить

**Expected Result**:
- ✅ Toast error: "Close time must be after open time"
- ✅ Диалог НЕ закрывается
- ✅ Данные НЕ сохраняются

---

#### Test 2.7: Calendar Picker - Past Date Prevention
**Steps**:
1. Нажмите "Add Exception"
2. Откройте calendar picker
3. Попытайтесь выбрать вчерашнюю дату

**Expected Result**:
- ✅ Прошлые даты disabled (серые, не кликабельные)
- ✅ Можно выбрать только сегодня или будущие даты

---

### Test Suite 3: Slot Calculation Integration

#### Test 3.1: Verify Slots Exclude Break Times
**Prerequisite**: У вас есть перерыв Monday 13:00-14:00

**Steps**:
1. Перейдите на страницу вашего салона как клиент:
   - URL: `https://aurelle.uz/salons/{your-salon-id}`
2. Выберите услугу (любую)
3. Выберите мастера (любого)
4. Выберите дату: **Monday** (ближайший понедельник)
5. Посмотрите на доступные слоты

**Expected Result**:
- ✅ Слоты с 09:00 до 13:00 - доступны (зелёные)
- ✅ Слоты 13:00-14:00 - НЕ доступны или помечены как "break"
- ✅ Слоты с 14:00 до 20:00 - доступны (зелёные)
- ✅ В API response (проверьте в Network tab):
  ```json
  {
    "breaks": [
      { "startTime": "13:00", "endTime": "14:00", "label": "Lunch Break" }
    ],
    "slots": [
      { "startTime": "13:00", "endTime": "14:00", "isAvailable": false, "conflictReason": "break" }
    ]
  }
  ```

**Screenshot Location**: `screenshots/phase10_test_3_1_slots_exclude_breaks.png`

---

#### Test 3.2: Verify Exception - Full Closure
**Prerequisite**: У вас есть exception для January 25 (closed)

**Steps**:
1. На странице бронирования салона
2. Выберите услугу и мастера
3. Выберите дату: **January 25, 2026**
4. Посмотрите на слоты

**Expected Result**:
- ✅ **Нет доступных слотов**
- ✅ Сообщение: "Salon closed on this date" или "No slots available"
- ✅ В API response:
  ```json
  {
    "closed": true,
    "reason": "Test Holiday",
    "slots": [],
    "totalSlots": 0,
    "availableSlots": 0
  }
  ```

---

#### Test 3.3: Verify Exception - Custom Hours
**Prerequisite**: У вас есть exception для January 31 (10:00-16:00)

**Steps**:
1. На странице бронирования
2. Выберите дату: **January 31, 2026**
3. Посмотрите на слоты

**Expected Result**:
- ✅ Слоты доступны только с 10:00 до 16:00
- ✅ Слоты до 10:00 - НЕ отображаются
- ✅ Слоты после 16:00 - НЕ отображаются
- ✅ В API response:
  ```json
  {
    "workingHours": {
      "openTime": "10:00",
      "closeTime": "16:00",
      "source": "exception"
    },
    "exception": {
      "date": "2026-01-31",
      "isClosed": false,
      "hasCustomHours": true,
      "reason": "Early Closing - Test"
    }
  }
  ```

---

### Test Suite 4: Multi-Language Support

#### Test 4.1: Test Russian Language
**Steps**:
1. Переключите язык на Русский (RU)
2. Откройте Working Hours tab
3. Проверьте все тексты

**Expected Texts** (Russian):
- ✅ "Перерывы" (Break Times)
- ✅ "Добавить перерыв" (Add Break)
- ✅ "Исключения и праздники" (Exceptions & Holidays)
- ✅ "Добавить исключение" (Add Exception)
- ✅ "Салон полностью закрыт в этот день"
- ✅ "Перерывы не определены"
- ✅ Toast: "Перерыв создан", "Исключение удалено", etc.

---

#### Test 4.2: Test Uzbek Language
**Steps**:
1. Переключите язык на Uzbek (UZ)
2. Проверьте все тексты

**Expected Texts** (Uzbek):
- ✅ "Tanaffus vaqtlari" (Break Times)
- ✅ "Tanaffus qo'shish" (Add Break)
- ✅ "Istisnolar va bayramlar" (Exceptions & Holidays)
- ✅ "Istisno qo'shish" (Add Exception)
- ✅ "Ushbu kunda salon butunlay yopiq"
- ✅ "Tanaffuslar belgilanmagan"

---

### Test Suite 5: Edge Cases & Error Handling

#### Test 5.1: Network Error Handling
**Steps**:
1. Откройте DevTools → Network tab
2. Включите "Offline" mode
3. Попытайтесь создать break
4. Выключите offline mode

**Expected Result**:
- ✅ Toast error: "Failed to create break"
- ✅ Диалог остается открытым
- ✅ После восстановления сети - можно повторить попытку

---

#### Test 5.2: Overlapping Breaks (No Validation Yet)
**Steps**:
1. Создайте break: Monday 13:00-14:00
2. Создайте break: Monday 13:30-15:00 (перекрывается!)

**Current Behavior**:
- ⚠️ Backend НЕ проверяет пересечения
- ⚠️ Оба перерыва будут созданы
- ⚠️ В слотах оба периода будут помечены как "break"

**Note**: Это known limitation, будет улучшено в будущем

---

#### Test 5.3: Refresh & Data Persistence
**Steps**:
1. Создайте несколько breaks и exceptions
2. Обновите страницу (F5)
3. Перейдите в другой таб и вернитесь обратно

**Expected Result**:
- ✅ Все данные сохранены
- ✅ Breaks отображаются корректно
- ✅ Exceptions отображаются корректно
- ✅ Никакие данные не потеряны

---

## 📊 Expected API Endpoints

Проверьте в Network tab браузера:

### Breaks Endpoints
```
GET    /api/owner/salons/{id}/breaks
POST   /api/owner/salons/{id}/breaks
PATCH  /api/owner/salons/{salonId}/breaks/{breakId}
DELETE /api/owner/salons/{salonId}/breaks/{breakId}
```

### Exceptions Endpoints
```
GET    /api/owner/salons/{id}/exceptions?from=2026-01-17&to=2026-07-17
POST   /api/owner/salons/{id}/exceptions
PATCH  /api/owner/salons/{salonId}/exceptions/{exceptionId}
DELETE /api/owner/salons/{salonId}/exceptions/{exceptionId}
```

### Slot Calculation
```
GET    /api/salons/masters/{masterId}/availability?date=2026-01-20&serviceId={serviceId}
```

**Response должен включать**:
- `breaks: []` - список перерывов для дня
- `exception: {...}` или `null` - исключение для даты
- `slots: [...]` - слоты с учётом breaks и exceptions

---

## ✅ Success Criteria

Phase 10 считается успешно протестированным если:

### Breaks Management
- [x] Создание break работает
- [x] Редактирование break работает
- [x] Удаление break работает
- [x] Валидация времени работает
- [x] Множественные breaks на один день работают
- [x] Breaks отображаются для всех дней недели

### Exceptions Management
- [x] Создание exception (closed) работает
- [x] Создание exception (custom hours) работает
- [x] Редактирование exception работает
- [x] Удаление exception работает
- [x] Валидация работает
- [x] Calendar picker блокирует прошлые даты
- [x] Список показывает exceptions на 6 месяцев

### Slot Calculation
- [x] Слоты исключают break times
- [x] Exception (closed) возвращает пустые слоты
- [x] Exception (custom hours) использует кастомные часы
- [x] API response содержит breaks и exception info

### Multi-Language
- [x] Все тексты на английском корректны
- [x] Все тексты на русском корректны
- [x] Все тексты на узбекском корректны

### UX & Error Handling
- [x] Toast notifications работают
- [x] Confirm dialogs появляются
- [x] Errors отображаются корректно
- [x] Данные персистентны после refresh
- [x] No console errors

---

## 🐛 Known Issues & Limitations

1. **No Overlap Detection**: Backend не проверяет пересекающиеся breaks
2. **No Break Templates**: Нельзя скопировать breaks с одного дня на другой
3. **No Recurring Exceptions**: Нельзя создать "каждое воскресенье"
4. **Calendar Range**: Exceptions показывают только 6 месяцев вперед

**Future Enhancements** (not in Phase 10):
- Detect and warn about overlapping breaks
- Copy breaks functionality
- Recurring exception patterns
- Conflict detection with existing bookings
- Master-specific breaks

---

## 📸 Screenshots to Capture

Пожалуйста, сделайте скриншоты:

1. `dashboard_working.png` - Dashboard без ошибок
2. `breaks_empty.png` - Breaks section (empty state)
3. `break_create_dialog.png` - Dialog создания break
4. `break_created.png` - Break отображается в списке
5. `exceptions_empty.png` - Exceptions section (empty)
6. `exception_create_dialog.png` - Dialog создания exception
7. `exception_created_closed.png` - Exception (closed) в списке
8. `exception_created_custom.png` - Exception (custom hours) в списке
9. `slots_with_breaks.png` - Booking page со слотами (break excluded)
10. `slots_exception_closed.png` - Booking page с exception (no slots)

---

## 🎯 Quick Test Checklist

**5-Minute Smoke Test**:
- [ ] Dashboard loads ✅
- [ ] Navigate to Working Hours tab ✅
- [ ] Create 1 break (Monday 13:00-14:00) ✅
- [ ] Create 1 exception (tomorrow, closed) ✅
- [ ] Edit break time ✅
- [ ] Delete exception ✅
- [ ] Switch to Russian - check translations ✅
- [ ] Refresh page - data persists ✅

**15-Minute Full Test**:
- Complete Test Suite 1 (Breaks) ✅
- Complete Test Suite 2 (Exceptions) ✅
- Complete Test Suite 3 (Slot Calculation) ✅

**30-Minute Comprehensive Test**:
- All 5 test suites ✅
- Capture all screenshots ✅
- Test in 3 languages ✅
- Document any issues ✅

---

## 📝 Bug Reporting Template

Если найдете баг, пожалуйста сообщите в формате:

```
**Bug Title**: [Краткое описание]

**Priority**: P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Result**:
...

**Actual Result**:
...

**Screenshots**:
[Attach screenshots]

**Browser**: Chrome / Firefox / Safari / Edge
**Language**: EN / RU / UZ
**Console Errors**: [Paste errors from DevTools Console]
```

---

**Prepared by**: Claude Sonnet 4.5
**Date**: 2026-01-17
**Status**: Ready for User Testing
**Estimated Time**: 5-30 minutes depending on thoroughness
