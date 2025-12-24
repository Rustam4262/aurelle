import psycopg2
import os

# ⚠️ ВАЖНО: НЕ храните реальные пароли, хэши или учетные данные в git!
# Используйте переменные окружения или безопасное хранилище

# Подключение к БД (используйте переменные окружения!)
conn = psycopg2.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "5432")),
    dbname=os.getenv("DB_NAME", "beauty_salon_db"),
    user=os.getenv("DB_USER", "beauty_user"),
    password=os.getenv("DB_PASSWORD", "CHANGE_THIS")
)

# Хэш пароля должен быть сгенерирован во время выполнения, не храните в коде!
password_hash = os.getenv("ADMIN_PASSWORD_HASH", "CHANGE_THIS")
phone = os.getenv("ADMIN_PHONE", "CHANGE_THIS")

if password_hash == "CHANGE_THIS" or phone == "CHANGE_THIS":
    raise ValueError("⚠️ ОШИБКА: Установите ADMIN_PASSWORD_HASH и ADMIN_PHONE в переменных окружения!")

cursor = conn.cursor()
cursor.execute(
    "UPDATE users SET hashed_password = %s WHERE phone = %s RETURNING id, phone",
    (password_hash, phone)
)
result = cursor.fetchone()
conn.commit()

print(f"Updated user ID {result[0]}, phone {result[1]}")
print(f"Password hash: {password_hash}")

cursor.close()
conn.close()
