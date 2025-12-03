# 🗺️ План миграции на Yandex Maps API v3

**Дата создания:** 1 декабря 2025
**API ключ:** `99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0`
**Статус:** 📋 В планировании

---

## 📊 Анализ текущего состояния

### 1. Используемые технологии (TO BE REMOVED)

**Frontend Dependencies:**
```json
"leaflet": "^1.9.4",
"react-leaflet": "^4.2.1",
"@types/leaflet": "^1.9.21"
```

**Tile Provider:**
- OpenStreetMap (https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png)

---

## 🎯 Компоненты использующие карты

### Frontend Components

#### 1. **SalonsMap.tsx** (ГЛАВНЫЙ КОМПОНЕНТ)
**Файл:** `frontend/src/components/SalonsMap.tsx`

**Функционал:**
- Отображение интерактивной карты с маркерами салонов
- Динамический центр карты (вычисляется по салонам или фокус на выбранном)
- Popup окна с информацией о салоне (название, адрес, рейтинг, количество отзывов)
- Клик по маркеру вызывает callback `onMarkerClick(salonId)`
- Ссылка "Открыть салон" в popup
- Автоматическое центрирование при выборе салона
- Управление зумом (11 по умолчанию, 14 при фокусе на салоне)

**Props:**
```typescript
interface SalonsMapProps {
  salons: SalonMapData[]
  selectedSalonId?: number | null
  onMarkerClick?: (salonId: number) => void
}
```

**Используемые Leaflet компоненты:**
- `MapContainer` - основной контейнер карты
- `TileLayer` - слой тайлов OpenStreetMap
- `Marker` - маркеры салонов
- `Popup` - информационные окна
- `useMap` hook - управление центром/зумом карты
- `L.Icon.Default` - настройка иконок маркеров

**Координаты по умолчанию:**
- Центр: `[55.751244, 37.618423]` (Москва)
- Zoom: `11` (обзорный), `14` (детальный)

---

#### 2. **SalonsPage.tsx** (ИСПОЛЬЗУЕТ КАРТУ)
**Файл:** `frontend/src/pages/client/SalonsPage.tsx`
**Строка:** 7, 246

**Функционал:**
- Страница списка салонов с фильтрами
- Импортирует `SalonsMap` компонент
- Передает массив салонов в карту
- Обрабатывает клики по маркерам для выбора салона

**Использование:**
```tsx
<SalonsMap
  salons={filteredSalons}
  selectedSalonId={selectedSalon?.id}
  onMarkerClick={handleMarkerClick}
/>
```

---

### Backend API

#### 1. **GET /api/salons/for-map**
**Файл:** `backend/app/api/salons.py:46-50`

**Функционал:**
- Возвращает список салонов для отображения на карте
- Поддерживает поиск по названию/адресу
- Схема: `SalonMapResponse`

**Response Schema:**
```python
class SalonMapResponse(BaseModel):
    id: int
    name: str
    address: str
    latitude: float   # ← координаты
    longitude: float  # ← координаты
    rating: float
    reviews_count: int
    external_photo_url: Optional[str]
    logo_url: Optional[str]
```

#### 2. **Haversine Distance Calculation**
**Файл:** `backend/app/api/salons.py:15-23`

**Функционал:**
- Функция `haversine(lon1, lat1, lon2, lat2)` - расчет расстояния между точками
- Используется для фильтрации салонов по радиусу
- Формула: Haversine для расчета расстояния по координатам (в км)

---

### Database Models

#### **Salon Model**
**Файл:** `backend/app/models/salon.py`

**Поля с координатами:**
```python
latitude: Optional[float]   # Широта (-90 to 90)
longitude: Optional[float]  # Долгота (-180 to 180)
```

**Валидация:**
- Широта: `-90 ≤ latitude ≤ 90`
- Долгота: `-180 ≤ longitude ≤ 180`

---

## 📁 Полный список файлов с геолокацией

### Frontend (TypeScript/React)
1. `frontend/src/components/SalonsMap.tsx` - ГЛАВНЫЙ КОМПОНЕНТ КАРТЫ
2. `frontend/src/pages/client/SalonsPage.tsx` - страница использующая карту
3. `frontend/src/api/types.ts` - TypeScript типы (SalonMapData)
4. `frontend/src/api/salons.ts` - API клиент для получения данных салонов
5. `frontend/src/api/recommendations.ts` - рекомендации (может использовать координаты)

### Backend (Python/FastAPI)
1. `backend/app/api/salons.py` - API endpoints + haversine функция
2. `backend/app/schemas/salon.py` - Pydantic схемы (latitude/longitude)
3. `backend/app/models/salon.py` - SQLAlchemy модель Salon
4. `backend/app/api/recommendations.py` - рекомендации по расстоянию
5. `backend/init_db.py` - инициализация БД (тестовые координаты)
6. `backend/scripts/update_salon_coordinates.py` - скрипт обновления координат
7. `backend/scripts/create_demo_simple.py` - демо данные с координатами
8. `backend/scripts/create_demo_via_api.py` - создание демо через API
9. `backend/scripts/seed_data.py` - seed данные
10. `backend/alembic/versions/d523dcafc9db_initial_migration.py` - миграция БД

---

## 🔄 Что нужно мигрировать

### Заменить полностью:

#### 1. **SalonsMap.tsx**
**Текущий стек:** Leaflet + react-leaflet
**Новый стек:** Yandex Maps API v3

**Что заменить:**
- ❌ `MapContainer` → ✅ `YMap`
- ❌ `TileLayer` → ✅ `YMapDefaultSchemeLayer`
- ❌ `Marker` → ✅ `YMapMarker`
- ❌ `Popup` → ✅ Custom React компонент с абсолютным позиционированием
- ❌ `useMap` hook → ✅ Yandex Maps API методы (setLocation)

#### 2. **CSS импорты**
**Убрать:**
```typescript
import 'leaflet/dist/leaflet.css'
```

#### 3. **Иконки маркеров**
**Текущий подход:** CDN загрузка PNG иконок Leaflet
**Новый подход:**
- Использовать встроенные маркеры Yandex Maps
- Или кастомные SVG иконки через `YMapMarker`

---

## 🆕 Что добавить

### 1. **Environment Variables**

#### Backend `.env.example`:
```env
# Yandex Maps
YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0
```

#### Frontend `.env.example`:
```env
# Yandex Maps
VITE_YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0
```

#### Docker Compose:
```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - YANDEX_MAPS_API_KEY=${YANDEX_MAPS_API_KEY}

  frontend:
    environment:
      - VITE_YANDEX_MAPS_API_KEY=${VITE_YANDEX_MAPS_API_KEY}
```

---

### 2. **Yandex Maps Loader Module**

**Файл:** `frontend/src/lib/yandexMapsLoader.ts`

**Функционал:**
- Асинхронная загрузка Yandex Maps API скрипта
- Singleton паттерн (загружать только один раз)
- Обработка ошибок загрузки
- TypeScript типизация

**Пример:**
```typescript
let ymapsPromise: Promise<typeof ymaps3> | null = null

export async function loadYandexMaps(): Promise<typeof ymaps3> {
  if (ymapsPromise) return ymapsPromise

  ymapsPromise = new Promise((resolve, reject) => {
    if (window.ymaps3) {
      resolve(window.ymaps3)
      return
    }

    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${import.meta.env.VITE_YANDEX_MAPS_API_KEY}&lang=ru_RU`
    script.async = true

    script.onload = () => {
      window.ymaps3.ready.then(() => resolve(window.ymaps3))
    }

    script.onerror = () => reject(new Error('Не удалось загрузить Yandex Maps'))

    document.head.appendChild(script)
  })

  return ymapsPromise
}
```

---

### 3. **YandexMap React Component**

**Файл:** `frontend/src/components/map/YandexMap.tsx`

**Props:**
```typescript
interface YandexMapProps {
  center: [number, number]      // [latitude, longitude]
  zoom: number                  // 0-19
  markers: MarkerData[]
  selectedMarkerId?: number | null
  onMarkerClick?: (id: number) => void
  className?: string
  style?: React.CSSProperties
}

interface MarkerData {
  id: number
  position: [number, number]
  title: string
  subtitle?: string
  rating?: number
  reviewsCount?: number
  link?: string
}
```

**Функционал:**
- Загрузка Yandex Maps через `loadYandexMaps()`
- Инициализация карты с `YMap`
- Добавление слоя `YMapDefaultSchemeLayer`
- Рендеринг маркеров через `YMapMarker`
- Обработка кликов по маркерам
- Cleanup при unmount
- Поддержка кастомных popup

---

### 4. **Backend Geocoding Service**

**Файл:** `backend/app/services/yandex_geocoder.py`

**Функции:**

#### a) **geocode_address(address: str) → coordinates**
```python
import httpx
from typing import Optional, Tuple

async def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """
    Геокодирование адреса → координаты
    Возвращает (latitude, longitude) или None
    """
    api_key = settings.YANDEX_MAPS_API_KEY
    url = "https://geocode-maps.yandex.ru/1.x/"

    params = {
        "apikey": api_key,
        "geocode": address,
        "format": "json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()

        # Парсинг ответа Yandex Geocoder API
        # Формат: "longitude latitude"
        pos = data["response"]["GeoObjectCollection"]["featureMember"][0]["GeoObject"]["Point"]["pos"]
        lon, lat = map(float, pos.split())

        return (lat, lon)
```

#### b) **reverse_geocode(lat: float, lon: float) → address**
```python
async def reverse_geocode(lat: float, lon: float) -> Optional[str]:
    """
    Обратное геокодирование координат → адрес
    """
    api_key = settings.YANDEX_MAPS_API_KEY
    url = "https://geocode-maps.yandex.ru/1.x/"

    params = {
        "apikey": api_key,
        "geocode": f"{lon},{lat}",  # longitude,latitude
        "format": "json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()

        address = data["response"]["GeoObjectCollection"]["featureMember"][0]["GeoObject"]["metaDataProperty"]["GeocoderMetaData"]["text"]

        return address
```

---

### 5. **API Endpoints для геокодинга**

**Файл:** `backend/app/api/geocoding.py` (NEW)

```python
from fastapi import APIRouter, Query, HTTPException
from app.services.yandex_geocoder import geocode_address, reverse_geocode

router = APIRouter()

@router.get("/geocode")
async def geocode(address: str = Query(..., description="Адрес для геокодирования")):
    """Преобразовать адрес в координаты"""
    coords = await geocode_address(address)
    if not coords:
        raise HTTPException(status_code=404, detail="Адрес не найден")

    return {"latitude": coords[0], "longitude": coords[1]}


@router.get("/reverse-geocode")
async def reverse_geocode_endpoint(
    lat: float = Query(..., description="Широта"),
    lon: float = Query(..., description="Долгота")
):
    """Преобразовать координаты в адрес"""
    address = await reverse_geocode(lat, lon)
    if not address:
        raise HTTPException(status_code=404, detail="Адрес не найден")

    return {"address": address}
```

**Регистрация в main.py:**
```python
from app.api import geocoding

app.include_router(geocoding.router, prefix="/api/geocode", tags=["geocoding"])
```

---

## 🗑️ Что удалить

### NPM пакеты:
```bash
npm uninstall leaflet react-leaflet @types/leaflet
```

### Файлы:
- Удалить неиспользуемые CSS/assets для Leaflet (если были)

### Импорты:
```typescript
// Удалить из всех файлов:
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
```

---

## 📝 План реализации (10 шагов)

### ✅ Шаг 1: Анализ репозитория
**Статус:** ЗАВЕРШЁН
**Результат:** Создан этот файл с полным анализом

---

### ⏳ Шаг 2: Настройка переменных окружения

**Задачи:**
1. Добавить `YANDEX_MAPS_API_KEY` в `backend/.env.example`
2. Добавить `VITE_YANDEX_MAPS_API_KEY` в `frontend/.env.example`
3. Обновить `docker-compose.yml` для передачи env переменных
4. Обновить `backend/app/core/config.py` для загрузки API ключа

**Файлы:**
- `backend/.env.example`
- `frontend/.env.example`
- `docker-compose.yml`
- `backend/app/core/config.py`

---

### ⏳ Шаг 3: Создать модуль загрузки Yandex Maps

**Задачи:**
1. Создать `frontend/src/lib/yandexMapsLoader.ts`
2. Реализовать функцию `loadYandexMaps()`
3. Добавить типизацию TypeScript для `ymaps3`
4. Обработка ошибок и fallback

**Файлы:**
- `frontend/src/lib/yandexMapsLoader.ts` (NEW)
- `frontend/src/types/yandex-maps.d.ts` (NEW - для типов)

---

### ⏳ Шаг 4: Создать React компонент YandexMap

**Задачи:**
1. Создать `frontend/src/components/map/YandexMap.tsx`
2. Реализовать props: center, zoom, markers, onMarkerClick
3. Интеграция с `loadYandexMaps()`
4. Рендеринг маркеров и popup
5. Обработка событий клика
6. Cleanup при unmount

**Файлы:**
- `frontend/src/components/map/YandexMap.tsx` (NEW)

---

### ⏳ Шаг 5: Заменить SalonsMap на YandexMap

**Задачи:**
1. Создать новый `frontend/src/components/SalonsMap.tsx` (переписать полностью)
2. Использовать `YandexMap` компонент вместо Leaflet
3. Сохранить тот же интерфейс (Props) для обратной совместимости
4. Протестировать на `SalonsPage.tsx`

**Файлы:**
- `frontend/src/components/SalonsMap.tsx` (REWRITE)

---

### ⏳ Шаг 6: Реализовать Backend Geocoding

**Задачи:**
1. Создать `backend/app/services/yandex_geocoder.py`
2. Реализовать `geocode_address()`
3. Реализовать `reverse_geocode()`
4. Добавить в `requirements.txt`: `httpx` (для async HTTP)
5. Создать API endpoints в `backend/app/api/geocoding.py`
6. Зарегистрировать router в `main.py`

**Файлы:**
- `backend/app/services/yandex_geocoder.py` (NEW)
- `backend/app/api/geocoding.py` (NEW)
- `backend/app/core/config.py` (UPDATE)
- `backend/requirements.txt` (UPDATE)
- `backend/app/main.py` (UPDATE)

---

### ⏳ Шаг 7: Удалить старые зависимости

**Задачи:**
1. Удалить NPM пакеты: `npm uninstall leaflet react-leaflet @types/leaflet`
2. Удалить импорты Leaflet из кода
3. Проверить отсутствие упоминаний Leaflet в коде

**Команды:**
```bash
cd frontend
npm uninstall leaflet react-leaflet @types/leaflet
npm install
```

---

### ⏳ Шаг 8: Обновить документацию

**Задачи:**
1. Обновить `README.md` с инструкциями по Yandex Maps
2. Добавить раздел "Настройка API ключей"
3. Документировать новые компоненты
4. Добавить примеры использования

**Файлы:**
- `README.md` (UPDATE)
- `docs/API.md` (UPDATE - если есть)

---

### ⏳ Шаг 9: Тестирование

**Задачи:**
1. Запустить Docker контейнеры
2. Проверить страницу `/client/salons` с картой
3. Проверить отображение маркеров
4. Проверить popup и клики
5. Проверить отсутствие ошибок в консоли
6. Проверить API endpoints геокодинга
7. Тестировать на разных разрешениях

**Страницы для проверки:**
- `/client/salons` - главная карта с салонами

---

### ⏳ Шаг 10: Финальный отчёт

**Задачи:**
1. Обновить этот файл `docs/maps_migration_plan.md` с результатами
2. Добавить раздел "Результаты миграции"
3. Список изменённых файлов
4. Примеры использования новых компонентов
5. Known issues (если есть)

---

## 📊 Метрики миграции

### Текущее состояние:
- **Компонентов с картами:** 1 (SalonsMap.tsx)
- **Страниц использующих карты:** 1 (SalonsPage.tsx)
- **Backend функций с геолокацией:** 1 (haversine)
- **NPM зависимостей для удаления:** 3 (leaflet, react-leaflet, @types/leaflet)

### После миграции:
- **Новых компонентов:** 2 (YandexMap.tsx, SalonsMap.tsx - rewritten)
- **Новых модулей:** 1 (yandexMapsLoader.ts)
- **Новых backend сервисов:** 1 (yandex_geocoder.py)
- **Новых API endpoints:** 2 (geocode, reverse-geocode)

---

## 🔍 Детали Yandex Maps API v3

### Основные компоненты:

1. **YMap** - основной контейнер карты
```typescript
<YMap location={{ center: [lat, lon], zoom }} />
```

2. **YMapDefaultSchemeLayer** - слой карты (схема)
```typescript
<YMapDefaultSchemeLayer />
```

3. **YMapMarker** - маркер на карте
```typescript
<YMapMarker coordinates={[lat, lon]}>
  <div>Custom content</div>
</YMapMarker>
```

### Загрузка скрипта:
```html
<script src="https://api-maps.yandex.ru/v3/?apikey=YOUR_API_KEY&lang=ru_RU"></script>
```

### TypeScript типы:
Нужно будет создать `frontend/src/types/yandex-maps.d.ts` с определениями типов для `ymaps3`.

---

## ⚠️ Потенциальные проблемы

### 1. **Координаты в БД**
**Проблема:** Некоторые салоны могут не иметь координат (NULL)
**Решение:** Использовать геокодинг для автоматического получения координат из адресов

### 2. **Формат координат**
**Yandex Maps:** `[latitude, longitude]` (широта, долгота)
**Leaflet:** `[latitude, longitude]` (широта, долгота)
**Совпадает ✅** - миграция упрощается

### 3. **Popup реализация**
**Проблема:** Yandex Maps v3 не имеет встроенных Popup как в Leaflet
**Решение:** Использовать кастомные React компоненты с абсолютным позиционированием

### 4. **Центр карты по умолчанию**
**Текущий:** Москва `[55.751244, 37.618423]`
**Предложение:** Изменить на Ташкент `[41.311151, 69.279737]` для узбекского рынка

---

## 📚 Полезные ссылки

- [Yandex Maps API v3 Documentation](https://yandex.ru/dev/maps/jsapi/doc/3.0/)
- [Yandex Geocoder API](https://yandex.ru/dev/maps/geocoder/)
- [React + Yandex Maps примеры](https://yandex.ru/dev/maps/jsapi/doc/3.0/examples/)

---

## ✅ Чек-лист миграции

- [x] Анализ текущего кода с картами
- [x] Документирование компонентов и API
- [x] Создание плана миграции
- [ ] Настройка environment variables
- [ ] Создание yandexMapsLoader.ts
- [ ] Создание YandexMap.tsx компонента
- [ ] Переписывание SalonsMap.tsx
- [ ] Создание backend geocoding сервиса
- [ ] Создание API endpoints для геокодинга
- [ ] Удаление Leaflet зависимостей
- [ ] Обновление документации
- [ ] Тестирование всех функций
- [ ] Финальный отчёт

---

**Автор плана:** Claude (Anthropic)
**Дата:** 1 декабря 2025
**Версия:** 1.0
