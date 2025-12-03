"""Генерация SQL с правильными bcrypt хешами"""
import bcrypt

passwords = {
    "Admin2024!": "admin",
    "Client123": "client",
    "Owner123": "owner"
}

print("-- SQL для создания пользователей с bcrypt хешами")
print("-- Сгенерировано автоматически\n")

for pwd, role in passwords.items():
    hashed = bcrypt.hashpw(pwd.encode('utf-8'), bcrypt.gensalt())
    print(f"-- Пароль: {pwd}")
    print(f"-- Хеш: {hashed.decode('utf-8')}")
    print()
