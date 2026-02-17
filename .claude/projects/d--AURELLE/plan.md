# План исправления проекта AURELLE и деплоймента

## 🎯 Цель
Исправить все найденные проблемы, закоммитить на GitHub и автоматически задеплоить на production.

## 📋 Текущее состояние

### ✅ Что уже настроено:
- GitHub repo: https://github.com/Rustam4262/aurelle.git
- GitHub Actions: deploy-production.yml (автодеплой на push в main)
- Production сервер: 89.39.94.194 (aurelle.uz)
- PM2 process manager: aurelle-production
- Sentry мониторинг
- Health checks и smoke tests
- Telegram/Slack уведомления

### 🚨 Критические проблемы:
1. **Конфликт package managers** (npm + pnpm lock files)
2. **376 console.log** в production коде
3. **Отсутствует helmet.js** для безопасности
4. **182 использования @ts-ignore/any**
5. **36 TODO/FIXME** комментариев
6. **Устаревший Capacitor** (v8 вместо v6)

---

## 🔧 План исправления

### Фаза 1: Критические исправления безопасности (15 мин)

#### 1.1. Выбрать npm как единственный package manager
- **Действие**: Удалить `pnpm-lock.yaml`
- **Причина**: В GitHub Actions используется npm, конфликт приведет к проблемам
- **Файлы**: `pnpm-lock.yaml`

#### 1.2. Добавить helmet.js для безопасности
- **Действие**:
  - Установить helmet: `npm install helmet`
  - Добавить в server/index.ts после CORS
- **Файлы**: `package.json`, `server/index.ts`

#### 1.3. Добавить .gitignore для Android/iOS build артефактов
- **Действие**: Обновить .gitignore
- **Файлы**: `.gitignore`

---

### Фаза 2: Создать unified logger систему (20 мин)

#### 2.1. Создать logger утилиту (server/lib/logger.ts)
```typescript
// Структурированный logger с уровнями
// - info, warn, error, debug
// - Интеграция с Sentry для production errors
// - Форматирование с timestamp и source
// - Отключение debug в production
```

#### 2.2. Создать client logger (client/src/lib/logger.ts)
```typescript
// Client-side logger
// - Интеграция с Sentry
// - Отключение console.log в production
```

#### 2.3. Заменить server/index.ts log() функцию
- Использовать новый logger
- Обратная совместимость

---

### Фаза 3: Массовая замена console.log (30 мин)

#### 3.1. Server-side замена (51 файл, 376 вхождений)
**Приоритет HIGH (критичные файлы):**
1. server/routes/owner.routes.ts (63)
2. server/routes/client.routes.ts (30)
3. server/setup-demo.ts (28)
4. server/routes/push.routes.ts (16)
5. server/routes/soloMaster.routes.ts (16)

**Паттерн замены:**
```typescript
// ДО:
console.log("Message");
console.error("Error:", error);
console.warn("Warning");

// ПОСЛЕ:
import { logger } from '@/lib/logger';
logger.info("Message");
logger.error("Error", error);
logger.warn("Warning");
```

#### 3.2. Client-side замена (20+ файлов)
**Приоритет:**
1. client/src/lib/error-handler.ts
2. client/src/lib/queryClient.ts
3. client/src/hooks/*

**Особенность:** Service Worker (sw.js) оставить как есть (браузерный контекст)

---

### Фаза 4: Улучшение типизации (опционально, 15 мин)

#### 4.1. Исправить критичные @ts-ignore
**Top 5 файлов:**
1. client/src/components/service-management.tsx (9)
2. client/src/components/client/ClientProfile.tsx (8)
3. client/src/components/booking-manual-create-dialog.tsx (7)
4. server/routes/admin/users.routes.ts (7)
5. server/routes/admin/sanctions.routes.ts (7)

**Подход:**
- Заменить `any` на `unknown` где возможно
- Добавить proper type guards
- Использовать `@ts-expect-error` с комментарием вместо `@ts-ignore`

---

### Фаза 5: Очистка и оптимизация (10 мин)

#### 5.1. Закрыть TODO комментарии
- Создать GitHub issues для важных TODO
- Удалить устаревшие TODO

#### 5.2. Очистить временные файлы
```bash
# Удалить:
- test-*.ts в корне
- *.cjs временные скрипты
- старые .md документы (task_plan.md, implementation_plan.md, etc)
```

#### 5.3. Обновить .env.example
- Проверить все переменные актуальны
- Добавить комментарии для новых

---

### Фаза 6: Git коммит и push (5 мин)

#### 6.1. Git add и commit
```bash
git add .
git commit -m "🔧 Major refactoring and security improvements

- Add helmet.js for HTTP security headers
- Replace all console.log with structured logger
- Fix package manager conflict (npm only)
- Improve TypeScript typing
- Add production-ready logging with Sentry integration
- Clean up temporary files and outdated TODOs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

#### 6.2. Push to GitHub
```bash
git push origin main
```

**Результат:** GitHub Actions автоматически запустит deploy-production.yml

---

### Фаза 7: Мониторинг деплоймента (10 мин)

#### 7.1. Отслеживать GitHub Actions
- URL: https://github.com/Rustam4262/aurelle/actions
- Ожидать:
  1. ✅ Build & Prepare (npm ci, build, tests)
  2. ✅ Deploy to Production (SCP, extract, npm ci, migrations, PM2 reload)
  3. ✅ Health checks (PM2 status, HTTP 200, response time)
  4. ✅ Smoke tests (homepage, API endpoints)

#### 7.2. Проверить Telegram/Slack уведомления
- Успех: 🎉 Production Deployment Successful
- Ошибка: 🚨 CRITICAL: Production Deployment Failed

#### 7.3. Manual проверка (если нужно)
```bash
# SSH на сервер
ssh root@89.39.94.194

# Проверить PM2
pm2 list
pm2 logs aurelle-production --lines 50

# Проверить health
curl http://localhost:5000/api/health
curl https://aurelle.uz/

# Проверить Sentry
# https://sentry.io/
```

---

## 📊 Статистика изменений

### Файлы к изменению:
- **Создать новых**: 2 (logger.ts файлы)
- **Изменить**: ~70 файлов
- **Удалить**: ~10 временных файлов

### Строки кода:
- **Добавить**: ~200 строк (logger утилита)
- **Изменить**: ~376 строк (console.log замены)
- **Удалить**: ~50 строк (временный код)

### Время выполнения:
- **Автоматизированное**: 60 минут
- **Ручная проверка**: 15 минут
- **Деплоймент**: 10 минут (автоматический)
- **Всего**: ~85 минут

---

## ⚠️ Риски и митигация

### Риск 1: Массовая замена console.log может сломать функционал
**Митигация:**
- TypeScript check перед коммитом
- GitHub Actions CI запускает tests
- Health checks после деплоя
- Автоматический rollback если health check fails

### Риск 2: Production деплоймент может упасть
**Митигация:**
- Автоматический backup перед деплоем (/var/www/aurelle-production-backups)
- Zero-downtime reload через PM2
- Health checks и smoke tests
- Rollback workflow готов: `gh workflow run rollback.yml`

### Риск 3: Database migrations могут зависнуть
**Митигация:**
- Database backup перед migration
- Migration timeout в GitHub Actions
- Manual rollback через SSH если нужно

---

## 🎯 Критерии успеха

### ✅ Код качество:
- [ ] 0 console.log в production коде
- [ ] Helmet.js установлен
- [ ] TypeScript check проходит
- [ ] Единый package manager (npm)

### ✅ Деплоймент:
- [ ] GitHub Actions build success
- [ ] Production deployment success
- [ ] Health checks passed
- [ ] Smoke tests passed
- [ ] PM2 process online
- [ ] Response time < 2s
- [ ] Memory usage < 1GB

### ✅ Мониторинг:
- [ ] Sentry получает events
- [ ] Telegram уведомление получено
- [ ] Site доступен на https://aurelle.uz
- [ ] API endpoints работают

---

## 🚀 После деплоймента

### Immediate (день 1):
- [ ] Проверить Sentry dashboard на ошибки
- [ ] Мониторить PM2 logs первые 2 часа
- [ ] Проверить user reports/feedback

### Short-term (неделя 1):
- [ ] Анализ Sentry error rate
- [ ] Performance metrics (response times)
- [ ] Memory/CPU usage trends

### Long-term:
- [ ] Обновить Capacitor (v8 → v6)
- [ ] Исправить оставшиеся @ts-ignore
- [ ] Добавить unit tests

---

## 📝 Rollback план

Если что-то пойдет не так:

### Опция 1: Автоматический GitHub rollback
```bash
gh workflow run rollback.yml
```

### Опция 2: Manual SSH rollback
```bash
ssh root@89.39.94.194
cd /var/www/aurelle-production-backups
rm -rf /var/www/aurelle-production
cp -r latest /var/www/aurelle-production
pm2 restart aurelle-production
```

### Опция 3: Git revert
```bash
git revert HEAD
git push origin main
# GitHub Actions автоматически деплоит предыдущую версию
```

---

## ✅ Готов к выполнению

Все исследование завершено. План детальный и executable.

**Следующий шаг:** Выйти из plan mode и начать execution.
