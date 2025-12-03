-- Создание тестовых пользователей напрямую через SQL
-- Пароль для всех: password123
-- Hash получен через: passlib.hash.bcrypt.hash("password123")

-- Удаляем старых тестовых пользователей если есть
DELETE FROM users WHERE phone IN ('+998901111111', '+998902222222', '+998903333333');

-- Клиент
INSERT INTO users (phone, name, hashed_password, role, is_active, created_at)
VALUES (
    '+998901111111',
    'Тестовый Клиент',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqW.7o/Lxu',
    'client',
    true,
    NOW()
);

-- Владелец салона
INSERT INTO users (phone, name, password, role, is_active, created_at)
VALUES (
    '+998902222222',
    'Владелец Салона',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqW.7o/Lxu',
    'salon_owner',
    true,
    NOW()
);

-- Администратор
INSERT INTO users (phone, name, hashed_password, role, is_active, created_at)
VALUES (
    '+998903333333',
    'Администратор',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqW.7o/Lxu',
    'admin',
    true,
    NOW()
);

-- Проверяем созданных пользователей
SELECT id, phone, name, role, is_active FROM users WHERE phone IN ('+998901111111', '+998902222222', '+998903333333');
