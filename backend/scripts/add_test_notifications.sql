-- Add test notifications for the first client user
-- First, get the client user ID
INSERT INTO notifications (user_id, booking_id, type, title, message, is_read, sent_at, scheduled_for)
SELECT
    u.id,
    NULL,
    'reminder',
    'Напоминание о записи',
    'Ваша запись в салон "Красота и Стиль" сегодня в 15:00. Не забудьте!',
    0,
    datetime('now', '-1 hour'),
    NULL
FROM users u
WHERE u.role = 'client'
LIMIT 1;

INSERT INTO notifications (user_id, booking_id, type, title, message, is_read, sent_at, scheduled_for)
SELECT
    u.id,
    NULL,
    'confirmation',
    'Запись подтверждена',
    'Ваша запись на стрижку завтра в 10:00 успешно подтверждена.',
    0,
    datetime('now', '-2 hours'),
    NULL
FROM users u
WHERE u.role = 'client'
LIMIT 1;

INSERT INTO notifications (user_id, booking_id, type, title, message, is_read, sent_at, scheduled_for)
SELECT
    u.id,
    NULL,
    'info',
    'Новые услуги',
    'В вашем любимом салоне появились новые услуги! Посмотрите.',
    1,
    datetime('now', '-1 day'),
    NULL
FROM users u
WHERE u.role = 'client'
LIMIT 1;

INSERT INTO notifications (user_id, booking_id, type, title, message, is_read, sent_at, scheduled_for)
SELECT
    u.id,
    NULL,
    'reminder',
    'Скоро запись',
    'Через 24 часа у вас запись на маникюр в салоне "Nails Studio".',
    0,
    datetime('now', '-30 minutes'),
    NULL
FROM users u
WHERE u.role = 'client'
LIMIT 1;

INSERT INTO notifications (user_id, booking_id, type, title, message, is_read, sent_at, scheduled_for)
SELECT
    u.id,
    NULL,
    'info',
    'Акция!',
    'Специальное предложение: скидка 20% на все услуги в эти выходные!',
    1,
    datetime('now', '-2 days'),
    NULL
FROM users u
WHERE u.role = 'client'
LIMIT 1;
