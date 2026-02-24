# AURELLE — Project Map

> Этот документ — "карта проекта". Любой новый человек должен за 10 минут понять, где что.

## Stack

| Слой | Технология |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| UI Kit | Radix UI + shadcn/ui + custom components |
| State | TanStack Query (React Query) |
| i18n | i18next (ru/en/uz) |
| Backend | Express + TypeScript (tsx) |
| DB | PostgreSQL + Drizzle ORM |
| Auth | Passport (Google, Yandex, GitHub OAuth + phone/SMS) |
| Mobile | Capacitor (iOS/Android) |
| Monitoring | Sentry (frontend + backend) |
| Security | Helmet (CSP), express-rate-limit |
| Email | Nodemailer (SMTP) |

## Directory Structure

```
AURELLE/
├── client/                    # Frontend (Vite root)
│   ├── index.html             # Entry HTML (GTM, fonts, meta)
│   ├── public/                # Static assets (images, manifest)
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── App.tsx            # Root component (Router, ErrorBoundary)
│       ├── components/        # React components
│       ├── pages/             # Page components (client, owner, admin, etc.)
│       ├── locales/           # i18n JSON (en.json, ru.json, uz.json)
│       ├── lib/               # Utilities (sentry.ts, i18n.ts, queryClient.ts)
│       ├── hooks/             # Custom React hooks
│       └── types/             # TypeScript types
├── server/
│   ├── index.ts               # Express server entry (helmet, cors, routes)
│   ├── routes/                # API routes (/api/*)
│   ├── middleware/            # Express middleware
│   ├── lib/                   # Server utilities (logger, sentry, etc.)
│   ├── auth/                  # Passport strategies
│   ├── jobs/                  # Cron jobs (sanction expiry)
│   ├── email.ts               # Email service (Nodemailer)
│   └── static.ts              # Static file serving in production
├── shared/
│   └── schema.ts              # Shared DB schema + types (Drizzle)
├── db/                        # Database migrations/config
├── scripts/                   # Utility scripts
├── vite.config.ts             # Vite config (aliases, Sentry plugin)
├── tailwind.config.ts         # Tailwind config
├── package.json               # Dependencies & scripts
├── .env                       # Environment variables (NOT in git)
└── .env.example               # Template for .env
```

## Key Commands

```bash
# Development
npm run dev              # Start dev server (tsx watch + Vite HMR)

# Build
npm run build            # Production build (Vite + esbuild)
npm run start            # Start production server

# Database
npm run db:push          # Push schema to DB (Drizzle Kit)
npm run db:seed          # Seed database

# Quality
npm run check            # TypeScript type check
npm run lint             # ESLint
npm run format           # Prettier
```

## Ports

| Port | Service | Notes |
|------|---------|-------|
| 5000 | Express (API + Static) | Default, configurable via PORT env |
| 80 | nginx (HTTP) | Redirects to 443 |
| 443 | nginx (HTTPS) | Proxy pass to :5000 |

## Environment Variables

Все переменные описаны в `.env.example`. Ключевые:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Cookie session secret (min 32 chars) |
| `NODE_ENV` | Yes | `development` / `production` |
| `PORT` | No | Default: 5000 |
| `VITE_SENTRY_DSN` | Prod | Frontend Sentry DSN |
| `SENTRY_DSN` | Prod | Backend Sentry DSN |
| `GOOGLE_CLIENT_ID/SECRET` | No | Google OAuth |
| `YANDEX_CLIENT_ID/SECRET` | No | Yandex OAuth |
| `VITE_YANDEX_MAPS_API_KEY` | Yes | Yandex Maps on homepage |

## Production Architecture

```
User → CloudFlare/DNS → nginx (443/SSL)
                           ↓ proxy_pass
                        Node.js (Express :5000)
                           ├── /api/* → API routes
                           └── /* → Static files (dist/public/)
                                     ↓
                                  PostgreSQL
```

## Deployment (Production)

Server: `89.39.94.194` (aurelle.uz)

```bash
ssh user@89.39.94.194
cd /path/to/aurelle          # TODO: заполнить после диагностики сервера
git pull origin main
npm ci
npm run build
# Перезапуск зависит от способа запуска (pm2/systemd/docker)
# TODO: заполнить после диагностики
```

## Database

- **Provider**: PostgreSQL (connection string в DATABASE_URL)
- **ORM**: Drizzle
- **Schema**: `shared/schema.ts`
- **Migrations**: `npm run db:push` (schema push, не migration files)

## Monitoring

- **Sentry** (frontend + backend): ошибки, performance, session replay
- **Sourcemaps**: загружаются в Sentry при production build (если `SENTRY_AUTH_TOKEN` задан)
- Sourcemap файлы удаляются после загрузки (не публично доступны)

## External Dependencies

| Service | Used For | CSP Domain |
|---------|----------|------------|
| Google Fonts | Inter, Cormorant Garamond | fonts.googleapis.com, fonts.gstatic.com |
| GTM | Analytics | www.googletagmanager.com |
| Google Analytics | GA4 | www.google-analytics.com |
| Yandex Maps | Homepage map | api-maps.yandex.ru |
| Sentry | Error monitoring | *.sentry.io |
