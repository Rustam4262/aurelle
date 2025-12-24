# AURELLE - Beauty Salon Marketplace

## Overview

A marketplace platform for beauty salons in Uzbekistan where salon owners can register salons (with location, photos, services, staff, working hours) and clients can browse salons on Yandex Map, view services/prices, book appointments, and leave reviews. Multi-language support (English, Russian, Uzbek) with all prices in Uzbek Sum (UZS). Features universal authentication (Replit Auth, Yandex OAuth, local email/password) with role-based access (client, owner, master). Both masters and clients have comprehensive personal dashboards.

**Platform Branding**: AURELLE (used throughout the UI)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for a luxury beauty aesthetic
- **Build Tool**: Vite with hot module replacement

**Design System**:
- Typography: Cormorant Garamond (headings) + Inter (body)
- Color palette: Rose/pink primary (#c81e5b), neutral backgrounds
- CSS variables for theming support (light/dark modes defined)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **HTTP Server**: Node.js http module wrapping Express
- **API Pattern**: RESTful JSON API under `/api` prefix
- **Authentication**: Multiple auth providers (Replit OAuth, Yandex OAuth, Local email/password)
- **Key Endpoints**:
  - `POST /api/owner/salons/:salonId/masters` - Add staff with optional login credentials (bcrypt password hashing)
  - `GET /api/master/me` - Master dashboard data (requires role="master")
  - Various salon, booking, and review endpoints

### User Roles
- **client**: Can browse salons, book appointments, leave reviews
- **owner**: Can register and manage salons, add staff with login credentials
- **master**: Staff accounts created by owners with comprehensive personal dashboards (route: /master)

### Master Dashboard Features
The master dashboard (`/master`) provides staff members with complete work management:
- **Overview Tab**: Stats summary, upcoming appointments, recent reviews
- **Schedule Tab**: Working hours management by day of week with enable/disable toggles
- **Bookings Tab**: Manage appointments (confirm, complete, cancel with reason), filter by status
- **Portfolio Tab**: Upload and manage work gallery images
- **Analytics Tab**: Earnings charts, popular services breakdown, booking status pie charts, client retention metrics
- **Calendar Tab**: Visual calendar showing booked/free time slots for each date
- **Notifications**: Bell icon with unread count, real-time notifications for new bookings

### Client Dashboard Features
The client dashboard (`/client`) provides clients with booking and review management:
- **Profile Tab**: Edit personal info (name, phone, avatar, city)
- **Bookings Tab**: View and cancel upcoming appointments
- **Favorites Tab**: Manage saved salons
- **Reviews Tab**: View/edit/delete reviews (within 24h)
- **Calendar Tab**: Visual calendar showing all booked appointments

### Owner Dashboard Features
The owner dashboard (`/owner`) provides salon owners with salon management:
- **Salons Tab**: List and manage registered salons
- **Calendar Tab**: Visual calendar showing all bookings across all owned salons

### Data Storage
- **Current**: In-memory storage (MemStorage class) using JavaScript Maps
- **Schema Definition**: Drizzle ORM with PostgreSQL dialect configured
- **Database Ready**: Schema defined in `shared/schema.ts` with users table; Drizzle config expects `DATABASE_URL` environment variable
- **Validation**: Zod schemas for contact forms and newsletter subscriptions

### Project Structure
```
client/           # React frontend
  src/
    components/ui/  # shadcn/ui components
    pages/          # Route components
    hooks/          # Custom React hooks
    lib/            # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route handlers
  storage.ts      # Data storage layer
  static.ts       # Static file serving
  vite.ts         # Vite dev server integration
shared/           # Shared TypeScript types and schemas
  schema.ts       # Drizzle schema and Zod validators
```

### Build System
- Development: Vite dev server with HMR, proxied through Express
- Production: Vite builds to `dist/public`, esbuild bundles server to `dist/index.cjs`
- TypeScript compilation with path aliases (`@/` for client, `@shared/` for shared)

## External Dependencies

### UI Component Libraries
- Radix UI primitives (dialog, dropdown, tabs, toast, etc.)
- Embla Carousel for carousels
- Vaul for drawer components
- cmdk for command palette
- react-day-picker for calendar
- recharts for charts

### Database & ORM
- Drizzle ORM (configured for PostgreSQL)
- drizzle-zod for schema-to-validator generation
- connect-pg-simple for session storage (available but not active)

### Form & Validation
- react-hook-form with @hookform/resolvers
- Zod for runtime validation

### Development Tools
- Replit-specific plugins (error overlay, cartographer, dev banner)
- esbuild for production server bundling