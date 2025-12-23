import psycopg2

# Подключение к БД
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="beauty_salon_db",
    user="beauty_user",
    password="beauty_pass"
)

# Хэш пароля "AurelleAdmin2025"
password_hash = "$2b$12$8UxBtGiLqfhkTi7p8ELFMOWKswOWyunVgleB7ybfM66119s70IjpC"

cursor = conn.cursor()
cursor.execute(
    "UPDATE users SET hashed_password = %s WHERE phone = %s RETURNING id, phone",
    (password_hash, "+998932611804")
)
result = cursor.fetchone()
conn.commit()

print(f"Updated user ID {result[0]}, phone {result[1]}")
print(f"Password hash: {password_hash}")

cursor.close()
conn.close()
