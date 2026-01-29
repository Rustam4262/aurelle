# 🚀 AURELLE - Быстрый старт

## Шаг 1: Настройка подключения к базе данных

### Вариант A: Используя Database Client в VS Code

Я вижу, что у вас открыт **Database Client** в VS Code. Давайте используем его:

1. **Подключитесь к вашей PostgreSQL базе** через Database Client
2. **Узнайте ваш пароль PostgreSQL** из настроек подключения
3. **Обновите `.env` файл**:

```bash
# Откройте файл .env и измените DATABASE_URL:
DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/aurelle
```

Замените `ВАШ_ПАРОЛЬ` на реальный пароль из Database Client.

### Вариант B: Создание новой базы через Database Client

Если база данных `aurelle` еще не существует:

1. Откройте Database Client в VS Code
2. Подключитесь к PostgreSQL серверу
3. Создайте новую базу данных с именем `aurelle`:
   ```sql
   CREATE DATABASE aurelle;
   ```

---

## Шаг 2: Применение схемы базы данных

После настройки подключения запустите:

```bash
npm run db:push
```

Это создаст все необходимые таблицы в базе данных.

---

## Шаг 3: Создание тестовых пользователей

Запустите скрипт создания тестовых пользователей:

```bash
npx tsx scripts/create-test-users.ts
```

Это создаст:

- ✅ 1 администратор
- ✅ 2 владельца салонов (с салонами и услугами)
- ✅ 3 специалиста
- ✅ 3 клиента

---

## Шаг 4: Запуск сервера разработки

```bash
npm run dev
```

Сервер запустится на: **http://localhost:5000**

---

## 🔐 Тестовые учетные данные

**Все пользователи имеют пароль**: `password123`

| Роль                | Email                  | Описание                |
| ------------------- | ---------------------- | ----------------------- |
| **Администратор**   | admin@aurelle.uz       | Полный доступ к системе |
| **Владелец салона** | salon1@aurelle.uz      | Beauty Lounge Tashkent  |
| **Владелец салона** | salon2@aurelle.uz      | Elegant Salon Tashkent  |
| **Специалист**      | specialist1@aurelle.uz | Maria Ivanova           |
| **Специалист**      | specialist2@aurelle.uz | Anna Petrova            |
| **Специалист**      | specialist3@aurelle.uz | Elena Sidorova          |
| **Клиент**          | client1@aurelle.uz     | John Doe                |
| **Клиент**          | client2@aurelle.uz     | Jane Smith              |
| **Клиент**          | client3@aurelle.uz     | Alice Johnson           |

---

## 🎯 Быстрое тестирование

### Тест 1: Вход как клиент и поиск салона

1. Откройте http://localhost:5000
2. Войдите как **client1@aurelle.uz** / **password123**
3. Найдите салон "Beauty Lounge Tashkent"
4. Просмотрите услуги

### Тест 2: Вход как владелец салона

1. Выйдите и войдите как **salon1@aurelle.uz** / **password123**
2. Перейдите в раздел "Мой салон"
3. Просмотрите услуги и бронирования
4. Попробуйте добавить новую услугу

### Тест 3: Вход как администратор

1. Выйдите и войдите как **admin@aurelle.uz** / **password123**
2. Откройте "Admin Panel"
3. Просмотрите всех пользователей
4. Просмотрите статистику платформы

---

## ❌ Troubleshooting

### Ошибка: "Password authentication failed"

**Решение**: Обновите пароль в `.env`:

```bash
DATABASE_URL=postgresql://postgres:ПРАВИЛЬНЫЙ_ПАРОЛЬ@localhost:5432/aurelle
```

Посмотрите пароль в настройках Database Client.

### Ошибка: "Database aurelle does not exist"

**Решение**: Создайте базу через Database Client:

```sql
CREATE DATABASE aurelle;
```

Или через командную строку:

```bash
createdb aurelle
```

### Ошибка: "Cannot connect to database"

**Проверьте**:

1. ✅ PostgreSQL запущен
2. ✅ Порт 5432 открыт
3. ✅ Пароль в `.env` правильный
4. ✅ База данных `aurelle` существует

### Ошибка: "Port 5000 already in use"

**Решение**: Измените порт в `.env`:

```bash
PORT=5001
```

---

## 📖 Полная документация

См. [LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md) для подробной информации.

---

## 🆘 Нужна помощь?

1. Проверьте логи сервера в консоли
2. Откройте DevTools в браузере (F12)
3. Проверьте подключение к БД через Database Client

---

**Готово! Теперь вы можете начать тестирование платформы AURELLE! 🎉**
