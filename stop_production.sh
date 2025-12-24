#!/bin/bash

# Скрипт для полной остановки и очистки production окружения
# Запускать на сервере: ssh root@178.128.206.254 'bash -s' < stop_production.sh

echo "🛑 Останавливаю production контейнеры..."

# Останавливаем все контейнеры проекта
docker stop beauty_frontend_prod beauty_backend_prod beauty_db_prod 2>/dev/null || true

# Удаляем контейнеры
docker rm beauty_frontend_prod beauty_backend_prod beauty_db_prod 2>/dev/null || true

# Показываем статус
echo ""
echo "✅ Production контейнеры остановлены"
echo ""
echo "📊 Текущие запущенные контейнеры:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "💾 Сохранённые образы:"
docker images | grep -E "(aurelle|beauty)" || echo "Нет образов проекта"

echo ""
echo "🌐 Сайт aurelle.uz теперь НЕДОСТУПЕН до следующего деплоя"
