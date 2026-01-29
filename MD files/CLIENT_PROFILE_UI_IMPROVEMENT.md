# Улучшение интерфейса профиля клиента

## Дата: 5 января 2026

## Проблема

Интерфейс профиля клиента показывал только минимальную информацию о бронированиях:

- Только ID бронирования
- Дата и время
- Статус без перевода
- Отсутствовала информация о салоне, услуге, мастере
- Не было возможности отменить бронирование
- Не отображалась цена

## Решение

### 1. Изменён источник данных

**Файл:** [client/src/pages/profile.tsx:33-36](client/src/pages/profile.tsx#L33-L36)

Вместо простого эндпоинта `/api/bookings` используем обогащённый `/api/client/bookings`, который возвращает:

- Полную информацию о салоне
- Данные об услуге
- Информацию о мастере (если назначен)
- Цену

```typescript
// БЫЛО:
const { data: bookings } = useQuery<Booking[]>({
  queryKey: ["/api/bookings"],
  enabled: !!user,
});

// СТАЛО:
const { data: bookings } = useQuery<any[]>({
  queryKey: ["/api/client/bookings"],
  enabled: !!user,
});
```

### 2. Добавлена функция отмены бронирования

**Файл:** [client/src/pages/profile.tsx:40-58](client/src/pages/profile.tsx#L40-L58)

```typescript
const cancelBookingMutation = useMutation({
  mutationFn: async (bookingId: string) => {
    return apiRequest("DELETE", `/api/client/bookings/${bookingId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
    toast({
      title: t("marketplace.profile.bookingCancelled"),
      description: t("marketplace.profile.bookingCancelledDescription"),
    });
  },
  onError: () => {
    toast({
      title: t("marketplace.profile.error"),
      description: t("marketplace.profile.cancelError"),
      variant: "destructive",
    });
  },
});
```

### 3. Улучшен UI карточки бронирования

**Файл:** [client/src/pages/profile.tsx:132-214](client/src/pages/profile.tsx#L132-L214)

**Теперь отображается:**

- ✅ Название салона (кликабельное, ведёт на страницу салона)
- ✅ Название услуги с иконкой ножниц
- ✅ Имя мастера с иконкой пользователя (если назначен)
- ✅ Дата и время с иконками
- ✅ Цена в формате "123 456 UZS"
- ✅ Статус в виде цветного Badge с переводом
- ✅ Кнопка "Отменить" для бронирований со статусом "pending"

**Цветовая схема статусов:**

- `confirmed` → зелёный Badge (default variant)
- `cancelled` → красный Badge (destructive variant)
- `pending` → серый Badge (secondary variant)

### 4. Добавлены импорты

**Файл:** [client/src/pages/profile.tsx:1-26](client/src/pages/profile.tsx#L1-L26)

```typescript
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Scissors, XCircle } from "lucide-react";
```

### 5. Добавлены переводы

**Файлы:**

- [client/src/locales/en.json](client/src/locales/en.json)
- [client/src/locales/ru.json](client/src/locales/ru.json)
- [client/src/locales/uz.json](client/src/locales/uz.json)

**Новые ключи:**

```json
{
  "marketplace.profile": {
    "cancelBooking": "Cancel" | "Отменить" | "Bekor qilish",
    "bookingCancelled": "Booking Cancelled" | "Запись отменена" | "Bron bekor qilindi",
    "bookingCancelledDescription": "..." | "..." | "...",
    "error": "Error" | "Ошибка" | "Xato",
    "cancelError": "..." | "..." | "..."
  },
  "marketplace.booking.status": {
    "pending": "Pending" | "Ожидается" | "Kutilmoqda",
    "confirmed": "Confirmed" | "Подтверждено" | "Tasdiqlangan",
    "cancelled": "Cancelled" | "Отменено" | "Bekor qilingan",
    "completed": "Completed" | "Завершено" | "Yakunlangan"
  }
}
```

## Визуальные улучшения

### До:

```
┌─────────────────────────────────────┐
│ Booking #9675d5b7                   │
│ 📅 05.01.2026  🕐 10:00    pending  │
└─────────────────────────────────────┘
```

### После:

```
┌─────────────────────────────────────────────────────────┐
│ Салон "Золотые ножницы" →                               │
│ ✂️ Мужская стрижка    👤 Иван Петров                     │
│ 📅 05.01.2026  🕐 10:00  💰 50 000 UZS    [Ожидается]   │
│                                          [Отменить ❌]   │
└─────────────────────────────────────────────────────────┘
```

## Функциональность

1. **Клик на название салона** → переход на страницу салона
2. **Кнопка "Отменить"** → отмена бронирования (только для pending)
3. **Статус Badge** → визуально показывает состояние бронирования
4. **Мультиязычность** → все тексты переведены на 3 языка
5. **Toast уведомления** → информирование об успешной/неуспешной отмене

## Затронутые файлы

1. ✅ [client/src/pages/profile.tsx](client/src/pages/profile.tsx) - основной компонент
2. ✅ [client/src/locales/en.json](client/src/locales/en.json) - английские переводы
3. ✅ [client/src/locales/ru.json](client/src/locales/ru.json) - русские переводы
4. ✅ [client/src/locales/uz.json](client/src/locales/uz.json) - узбекские переводы

## Backend эндпоинты

Используются существующие эндпоинты:

- `GET /api/client/bookings` - получение обогащённых данных о бронированиях
- `DELETE /api/client/bookings/:id` - отмена бронирования

## Следующие шаги

1. ⏳ Улучшить интерфейс панели владельца салона
2. ⏳ Улучшить интерфейс панели мастера
3. ⏳ Развернуть все улучшения в продакшен

## Статус

✅ **ГОТОВО К РАЗВЁРТЫВАНИЮ**
