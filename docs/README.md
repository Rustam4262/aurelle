# AURELLE — Документация по эксплуатации

## Быстрый старт (что читать первым)

| Документ | Когда читать |
|----------|-------------|
| [PROJECT_MAP.md](./PROJECT_MAP.md) | Первый раз на проекте — узнать структуру |
| [OPS_COMMANDS.md](./OPS_COMMANDS.md) | Нужно посмотреть логи / перезапустить / проверить |
| [RECOVERY.md](./RECOVERY.md) | Нужно восстановить данные или поднять с нуля |
| [CSP.md](./CSP.md) | Проблемы с внешними скриптами / шрифтами |

## Runbooks (боевые инструкции)

| Сценарий | Документ |
|----------|---------|
| Сайт полностью недоступен | [RUNBOOK_OUTAGE.md](./RUNBOOK_OUTAGE.md) |
| API отдаёт 500/502/4xx | [RUNBOOK_API.md](./RUNBOOK_API.md) |
| SSL ошибка / сертификат | [RUNBOOK_SSL.md](./RUNBOOK_SSL.md) |

## История инцидентов

| Дата | Инцидент |
|------|---------|
| 2026-02-23 | [ErrorBoundary на всех кабинетах (CSP + i18n)](./RCA_20260223.md) |

## Скрипты

```bash
# Деплой
./scripts/deploy.sh

# Откат
./scripts/rollback.sh [COMMIT_HASH]

# Диагностика сервера (запустить на сервере)
bash scripts/diagnose-server.sh

# Smoke-тесты
npm run test:smoke                              # против localhost:5000
BASE_URL=https://aurelle.uz npm run test:smoke  # против прода
```

## Экзамен: 5 фраз — 5 ответов

| Фраза | Где смотреть |
|-------|-------------|
| "В проде ErrorBoundary на всех кабинетах" | CSP → логи → [RUNBOOK_OUTAGE.md](./RUNBOOK_OUTAGE.md) |
| "Клиент показывает i18n ключи вместо текста" | `client/src/locales/*.json` + [RCA_20260223.md](./RCA_20260223.md) |
| "CSP блокирует GTM/fonts" | [CSP.md](./CSP.md) → `server/index.ts` |
| "После деплоя пошли 500 на /api" | [RUNBOOK_API.md](./RUNBOOK_API.md) → логи → откат |
| "Сертификат скоро истекает" | [RUNBOOK_SSL.md](./RUNBOOK_SSL.md) → `certbot renew` |
