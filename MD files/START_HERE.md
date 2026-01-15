# ⚡ AURELLE - СТАРТ ЗДЕСЬ!

## 🔴 ВАЖНО: Настройка подключения к базе данных

Я вижу, что у вас возникла ошибка подключения к PostgreSQL.

### Решение (выберите один из вариантов):

---

### ✅ ВАРИАНТ 1: Использование Database Client в VS Code (РЕКОМЕНДУЕТСЯ)

Вы уже открыли Database Client! Отлично, давайте используем его:

1. **Откройте Database Client** (уже открыт)

2. **Найдите ваше подключение PostgreSQL** в боковой панели

3. **Скопируйте пароль** из настроек подключения

4. **Обновите файл `.env`**:
   ```bash
   DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/aurelle
   ```

5. **Создайте базу `aurelle`** (если еще не создана):
   - Щелкните правой кнопкой на сервере → "New Query"
   - Выполните: `CREATE DATABASE aurelle;`

6. **Подключитесь к базе `aurelle`** в Database Client

7. **Выполните SQL скрипт** для создания таблиц и пользователей:
   - Откройте файл `scripts/create-test-users.sql`
   - Выполните весь скрипт через Database Client
   - Или скопируйте и вставьте в "New Query" и выполните

---

### ✅ ВАРИАНТ 2: Через командную строку

Если Database Client не работает, используйте команды:

```bash
# 1. Обновите пароль в .env
# Отредактируйте файл .env и укажите правильный пароль PostgreSQL

# 2. Примените схему базы данных
npm run db:push

# 3. Создайте тестовых пользователей
npx tsx scripts/create-test-users.ts
```

---

## 🚀 После настройки БД - Запуск сервера

```bash
npm run dev
```

Откройте браузер: **http://localhost:5000**

---

## 🔐 Учетные данные для входа

**Пароль для всех**: `password123`

| Email | Роль |
|-------|------|
| admin@aurelle.uz | Администратор |
| salon1@aurelle.uz | Владелец салона #1 |
| salon2@aurelle.uz | Владелец салона #2 |
| specialist1@aurelle.uz | Специалист #1 |
| specialist2@aurelle.uz | Специалист #2 |
| specialist3@aurelle.uz | Специалист #3 |
| client1@aurelle.uz | Клиент #1 |
| client2@aurelle.uz | Клиент #2 |
| client3@aurelle.uz | Клиент #3 |

---

## 📋 Что будет создано

После выполнения SQL скрипта у вас будет:

✅ 9 тестовых пользователей (1 админ, 2 владельца, 3 специалиста, 3 клиента)
✅ 2 салона красоты:
   - Beauty Lounge Tashkent (6 услуг)
   - Elegant Salon Tashkent (6 услуг)
✅ 12 услуг (по 6 на салон)
✅ 3 специалиста, назначенных в Beauty Lounge

---

## 🎯 Быстрый тест после запуска

1. **Откройте** http://localhost:5000
2. **Войдите как клиент**: client1@aurelle.uz / password123
3. **Найдите салон** "Beauty Lounge Tashkent"
4. **Посмотрите услуги** и цены

Затем попробуйте другие роли!

---

## ❓ Проблемы?

### "Password authentication failed"
→ Проверьте пароль в `.env`

### "Database aurelle does not exist"
→ Создайте через Database Client: `CREATE DATABASE aurelle;`

### "Cannot connect to database"
→ Убедитесь, что PostgreSQL запущен

### "Port 5000 already in use"
→ Измените `PORT=5001` в `.env`

---

## 📚 Больше информации

- [QUICK_START.md](./QUICK_START.md) - Пошаговая инструкция
- [LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md) - Полное руководство

---

**Удачи! 🎉**
