# 🚀 Запуск БЕЗ Docker (локально)

## Если Docker не работает - запускаем напрямую!

### 📋 Требования:
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

---

## ⚡ Быстрый старт

### 1. Установите PostgreSQL

**Windows:**
- Скачайте: https://www.postgresql.org/download/windows/
- Или через Chocolatey: `choco install postgresql`

**После установки:**
```bash
# Создайте базу данных
psql -U postgres
CREATE DATABASE aurelle;
CREATE USER aurelle WITH PASSWORD 'aurelle_password';
GRANT ALL PRIVILEGES ON DATABASE aurelle TO aurelle;
\q
```

---

### 2. Настройте Backend

```bash
# Перейдите в папку backend
cd backend

# Создайте виртуальное окружение
python -m venv venv

# Активируйте его (Windows)
venv\Scripts\activate

# Установите зависимости
pip install -r requirements.txt

# Создайте .env файл
copy .env.example .env

# Отредактируйте .env:
# DATABASE_URL=postgresql://aurelle:aurelle_password@localhost:5432/aurelle
# SECRET_KEY=dev_secret_key_change_in_production_min_32_chars

# Применить миграции
alembic upgrade head

# Создать тестовые данные
python init_db.py

# Запустить backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend будет доступен на: **http://localhost:8000**

---

### 3. Настройте Frontend

Откройте **новое окно терминала**:

```bash
# Перейдите в папку frontend
cd frontend

# Установите зависимости
npm install

# Создайте .env файл
copy .env.example .env

# Отредактируйте .env:
# VITE_API_URL=http://localhost:8000
# VITE_YANDEX_MAPS_API_KEY=your_key_here

# Запустить frontend
npm run dev
```

Frontend будет доступен на: **http://localhost:5173**

---

## 🔑 Учетные данные

| Роль | Телефон | Пароль |
|------|---------|--------|
| Администратор | `+998901234567` | `admin123` |
| Владелец салона | `+998901234568` | `salon123` |
| Мастер | `+998901234569` | `master123` |
| Клиент | `+998901234570` | `client123` |

---

## 🐛 Возможные проблемы

### PostgreSQL не запускается

```bash
# Windows - запустите службу
net start postgresql-x64-15

# Или через Services (services.msc)
```

### Порт 8000 или 5173 занят

```bash
# Проверить что занимает порт
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Убить процесс (замените PID на ваш)
taskkill /PID 1234 /F
```

### Ошибка при установке Python пакетов

```bash
# Обновите pip
python -m pip install --upgrade pip

# Переустановите
pip install -r requirements.txt --force-reinstall
```

---

## ✅ Проверка

После запуска:
- ✅ Backend: http://localhost:8000/health
- ✅ API Docs: http://localhost:8000/docs
- ✅ Frontend: http://localhost:5173

---

**Готово! Теперь можно тестировать! 🎉**
