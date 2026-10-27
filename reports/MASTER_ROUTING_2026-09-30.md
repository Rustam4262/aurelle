# Переход сотрудника салона в кабинет — 2026-09-30

Причина: resolvePostLoginPath в auth.tsx отправлял role=master и role=solo_master в /solo-master. Сотруднику салона нужен /master.

Исправлено локально: роли разделены в переходе после входа; /solo-master при role=master перенаправляет в /master и не запускает solo-master API-запросы. В тип User добавлена роль, возвращаемая API.

Проверено: tsc и production build; Chromium scripts/verify-master-routing.cjs с моделированием авторизованного сотрудника (Service Worker отключён только в тестовом контексте, чтобы сетевые моки работали). /auth открывает /master, неправильный /solo-master также открывает /master, запросов к solo API нет, имя мастера отображается.

НЕ опубликовано: 30 сентября SSH 62.113.58.208:22 несколько раз завершился timeout; внешний HTTPS /api/health также timeout. DNS домена по-прежнему 62.113.58.208. Прод не изменён, пароли и данные Malika не менялись. Последний подтверждённый прод /var/www/aurelle-release-20260929-audience, порт5005. Для завершения нужен доступ к серверу. Временный правильный адрес пользователя https://aurelle.uz/master.
