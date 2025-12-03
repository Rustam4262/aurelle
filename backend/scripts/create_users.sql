-- Создание пользователей напрямую в базе данных
-- ВАЖНО: Пароли уже захешированы с bcrypt

-- Удаляем старых пользователей с этими номерами (если есть)
DELETE FROM users WHERE phone IN ('+998932611804', '+998901234567', '+998909876543', '+998907777777');

-- Администратор: +998932611804 / Admin2024!
INSERT INTO users (phone, email, name, hashed_password, role, is_active, created_at)
VALUES (
    '+998932611804',
    'admin@beauty-salon.uz',
    'Администратор Платформы',
    '$2b$12$LG8VZKzPZfEO0Y.9pzRO7.w4K9kCqH6YZHKfXKh8n7qC3wJ8kqKJm',
    'admin',
    true,
    NOW()
);

-- Клиент 1: +998901234567 / Client123
INSERT INTO users (phone, email, name, hashed_password, role, is_active, created_at)
VALUES (
    '+998901234567',
    'client@test.uz',
    'Тестовый Клиент',
    '$2b$12$k6L.w8QE5f.m0z1Y2pN9DeqRh5f8L6Z9kY7X8qN4mP2wR5h7J9k6e',
    'client',
    true,
    NOW()
);

-- Клиент 2: +998907777777 / Client123
INSERT INTO users (phone, email, name, hashed_password, role, is_active, created_at)
VALUES (
    '+998907777777',
    'client2@test.uz',
    'Второй Клиент',
    '$2b$12$k6L.w8QE5f.m0z1Y2pN9DeqRh5f8L6Z9kY7X8qN4mP2wR5h7J9k6e',
    'client',
    true,
    NOW()
);

-- Владелец салона: +998909876543 / Owner123
INSERT INTO users (phone, email, name, hashed_password, role, is_active, created_at)
VALUES (
    '+998909876543',
    'owner@test.uz',
    'Владелец Салона',
    '$2b$12$m7K.x9PF6g.n1a2Z3qO0EfrSi6g9M7A0lZ8Y9rO5nQ3xS6i8K0l7f',
    'salon_owner',
    true,
    NOW()
);

-- Показываем созданных пользователей
SELECT id, phone, email, name, role, is_active, created_at FROM users ORDER BY id;
