FROM node:20-alpine

# Установка переменных окружения
ENV NODE_ENV=development

WORKDIR /app

# Копирование package файлов (для кеширования слоя)
COPY package*.json ./

# Установка зависимостей
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Копирование исходного кода
COPY . .

# Создание непривилегированного пользователя (без фиксированных UID/GID)
RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5173

# Запуск dev сервера
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
