# 🔄 Принудительная Пересборка Frontend (Cache Bust)

**Когда использовать:** Если браузер упорно не загружает новый код даже после всех способов очистки кэша.

---

## Что Изменено

### `frontend/vite.config.ts`

Добавлена секция `build` с принудительной генерацией нового хэша:

```typescript
build: {
  rollupOptions: {
    output: {
      // Force new hash for cache busting
      entryFileNames: `assets/[name]-[hash]-v${Date.now()}.js`,
      chunkFileNames: `assets/[name]-[hash]-v${Date.now()}.js`,
      assetFileNames: `assets/[name]-[hash]-v${Date.now()}.[ext]`
    }
  }
}
```

**Результат:**
- Старый файл: `index-CtKj3eRr.js`
- Новый файл: `index-CtKj3eRr-v1735048912345.js` (с timestamp в конце)
- Браузер **ТОЧНО** не сможет использовать старый кэш

---

## 🚀 Команды для Пересборки и Деплоя

### Шаг 1: Локальная Сборка и Отправка на Сервер

```bash
# Переходим в папку frontend
cd frontend

# Пересобираем с новым хэшем
docker build -f Dockerfile.prod \
  --build-arg VITE_API_URL=/api \
  -t aurelle_frontend:cachebust \
  .

# Сохраняем image в tar
docker save aurelle_frontend:cachebust | gzip > ../frontend_cachebust.tar.gz

# Загружаем на сервер
scp ../frontend_cachebust.tar.gz root@178.128.206.254:/root/

# Возвращаемся в корень проекта
cd ..
```

### Шаг 2: Деплой на Сервере

```bash
# Подключаемся к серверу
ssh root@178.128.206.254

# Загружаем image
docker load < /root/frontend_cachebust.tar.gz

# Останавливаем старый контейнер
docker stop beauty_frontend_prod
docker rm beauty_frontend_prod

# Запускаем новый
docker run -d \
  --name beauty_frontend_prod \
  --network aurelle_default \
  -p 80:80 \
  -p 443:443 \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  -v /var/www/certbot:/var/www/certbot:ro \
  --restart unless-stopped \
  aurelle_frontend:cachebust

# Проверяем логи
docker logs beauty_frontend_prod --tail 20

# Проверяем какие файлы задеплоились
docker exec beauty_frontend_prod ls -lh /usr/share/nginx/html/assets/
```

### Шаг 3: Проверка

```bash
# Проверяем что nginx отдаёт index.html с новым хэшем
docker exec beauty_frontend_prod cat /usr/share/nginx/html/index.html | grep -o 'index-.*\.js'

# Должно вывести новое имя файла с timestamp:
# index-CtKj3eRr-v1735048912345.js
```

---

## ✅ После Деплоя

1. Откройте браузер в режиме Инкогнито (Ctrl+Shift+N)
2. Перейдите на `https://aurelle.uz/register`
3. Нажмите Ctrl+Shift+R (Hard Reload)
4. Проверьте в Network tab:
   - Должен загрузиться файл с новым именем (например `index-CtKj3eRr-v1735048912345.js`)
   - Запрос `register` должен идти на `https://aurelle.uz/api/auth/register`

---

## 🧪 Тест Регистрации

После деплоя протестируйте:

```
URL: https://aurelle.uz/register
Телефон: +998909999999
Имя: Cache Bust Test
Пароль: Test123456
```

**Ожидаемый результат:**
- ✅ Запрос уходит на правильный URL: `https://aurelle.uz/api/auth/register`
- ✅ Response 201 Created
- ✅ Автоматический редирект на `/client/dashboard`

---

## 📝 Откат (Если Что-то Пошло Не Так)

```bash
# Вернуться на предыдущую версию
ssh root@178.128.206.254

docker stop beauty_frontend_prod
docker rm beauty_frontend_prod

docker run -d \
  --name beauty_frontend_prod \
  --network aurelle_default \
  -p 80:80 \
  -p 443:443 \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  -v /var/www/certbot:/var/www/certbot:ro \
  --restart unless-stopped \
  aurelle_frontend:final
```

---

## 🎯 Итого

Эта пересборка гарантирует:
- ✅ Новое имя JS файла с timestamp
- ✅ Браузер **ТОЧНО** не сможет использовать старый кэш
- ✅ Все пользователи получат свежий код

**Используйте только если:**
- Браузер упорно не загружает новый код
- Очистка кэша не помогла
- Даже инкогнито режим показывает старые файлы
