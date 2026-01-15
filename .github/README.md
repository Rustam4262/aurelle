# GitHub Workflows

Этот каталог содержит GitHub Actions workflows для CI/CD процессов проекта AURELLE.

## Workflows

### 1. CI - Continuous Integration (`ci.yml`)
- **Триггер**: Push и PR в ветки `main`, `develop`, `feature/**`
- **Задачи**: TypeScript проверка, тесты, линтинг

### 2. Deploy to Production (`deploy-production.yml`)
- **Триггер**: Push в ветку `main` или manual dispatch
- **Задачи**: Сборка, деплой на продакшн сервер, smoke tests

### 3. Deploy to Staging (`deploy-staging.yml`)
- **Триггер**: Push в ветку `develop` или manual dispatch
- **Задачи**: Сборка, деплой на staging сервер

### 4. Rollback Deployment (`rollback.yml`)
- **Триггер**: Manual dispatch только
- **Задачи**: Откат деплоя на предыдущую версию

## Рекомендуемые VS Code расширения

Для правильной валидации и подсветки синтаксиса workflow файлов рекомендуется установить:

1. **GitHub Actions** (`github.vscode-github-actions`)
   - Валидация workflow файлов
   - Автодополнение
   - Inline документация

2. **YAML** (`redhat.vscode-yaml`)
   - Поддержка YAML синтаксиса
   - Форматирование

## Примечания по валидации

- Файлы workflows используют специфичный синтаксис GitHub Actions
- В проекте настроена валидация через расширение GitHub Actions
- YAML schema validation отключена для избежания ложных ошибок
- Используйте `actionlint` для CLI валидации (опционально)

## Установка actionlint (опционально)

```bash
# macOS
brew install actionlint

# Linux
bash <(curl https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)

# Windows (Scoop)
scoop install actionlint

# Использование
actionlint .github/workflows/*.yml
```

## Проверка workflows локально

```bash
# С помощью act (запуск workflows локально)
act -l  # Показать все workflows
act pull_request  # Запустить PR workflow
act push -b main  # Симулировать push в main
```

## Troubleshooting

Если вы видите ошибки валидации в VS Code:

1. Убедитесь, что установлено расширение `github.vscode-github-actions`
2. Перезагрузите VS Code
3. Проверьте, что `.vscode/settings.json` содержит правильные настройки
4. Если ошибки остались - это могут быть ложные срабатывания валидатора, проверьте workflows через `actionlint` или GitHub UI

## Секреты и переменные окружения

Все секреты настраиваются в GitHub Settings → Secrets and variables → Actions:

- `PRODUCTION_*` - секреты для продакшн сервера
- `STAGING_*` - секреты для staging сервера
- `SENTRY_*` - токены Sentry
- `TELEGRAM_*` - токены Telegram бота
- `SLACK_*` - webhook URLs Slack (опционально)

См. документацию в `/docs/deployment/` для полного списка требуемых секретов.
