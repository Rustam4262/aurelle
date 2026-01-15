# 🗺️ Yandex Maps API Key Setup

## ✅ Текущий статус

- ✅ **Yandex Maps интегрированы** - компонент LocationPicker работает
- ⚠️ **API Key не установлен** - карты работают с ограничениями
- ⏳ **Требуется получить ключ** для production

---

## 🚀 Быстрая настройка (10 минут)

### Шаг 1: Получить API ключ

```
1. Открыть: https://developer.tech.yandex.ru/
2. Войти с Yandex аккаунтом
3. Перейти: Мои сервисы → JavaScript API и HTTP Геокодер
4. Нажать "Получить ключ"
5. Заполнить:
   - Название: AURELLE Production
   - Тип: Браузерный JavaScript API
   - Домены: aurelle.uz, www.aurelle.uz
6. Скопировать API ключ
```

### Шаг 2: Добавить в production .env

```bash
ssh root@89.39.94.194
nano /opt/aurelle/.env

# Добавить в конец:
VITE_YANDEX_MAPS_API_KEY=ваш-api-ключ-здесь

# Сохранить: Ctrl+O, Enter, Ctrl+X
```

### Шаг 3: Rebuild клиента

```bash
cd /opt/aurelle
docker compose down
docker compose up -d --build
```

### Шаг 4: Проверить

```
1. Открыть: https://aurelle.uz
2. Создать салон или мастера
3. Location Picker должен работать полностью:
   - ✅ Поиск адреса
   - ✅ Reverse geocoding
   - ✅ Drag маркера
```

---

## 📊 Без API ключа (текущее состояние)

### Что работает:
- ✅ Отображение карты
- ✅ Zoom и pan
- ✅ Маркеры

### Что НЕ работает:
- ❌ Поиск адреса (geocoding)
- ❌ Получение адреса по координатам (reverse geocoding)
- ⚠️ Низкие rate limits

---

## 💰 Лимиты Yandex Maps API

- **Бесплатно**: 25,000 запросов/день
- **Платно**: $0.50 за 1,000 запросов

Для AURELLE: 25,000 запросов/день более чем достаточно ✅

---

## 🔗 Ссылки

- [Получить ключ](https://developer.tech.yandex.ru/)
- [Документация API](https://yandex.ru/dev/jsapi-v2-1/)
- [Компонент LocationPicker](client/src/components/location-picker.tsx:32)
