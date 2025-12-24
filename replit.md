# Lumiere Beauty Salon

## Overview

A premium beauty salon website built with React and Express. The application serves as a marketing and contact platform for a luxury beauty salon, featuring service showcases, team profiles, testimonials, and contact/newsletter functionality. The design emphasizes sophisticated minimalism with a warm, elegant aesthetic inspired by premium wellness brands.

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
- **master**: Staff accounts created by owners with personal dashboards (route: /master)

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