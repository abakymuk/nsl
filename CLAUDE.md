# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

New Stream Logistics drayage website - a Next.js 16 app with customer-facing pages, admin dashboard, and PortPro TMS integration. Uses Supabase for auth/database, Resend for emails.

## Development Commands

```bash
# Development
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm start            # Run production build
pnpm lint             # Run ESLint

# Database (Supabase)
# Run migrations in supabase/migrations/ via Supabase CLI or dashboard
```

## Architecture

### App Structure (Next.js 16 App Router)

- **Public pages**: `/`, `/quote`, `/track`, `/services`, `/process`, `/compliance`, `/about`, `/contact`
- **Customer portal**: `/dashboard/*` - authenticated customer views (quotes, loads)
- **Admin portal**: `/admin/*` - internal dashboard for managing quotes, loads, syncing with PortPro
- **Auth**: `/(auth)/*` - Supabase auth callback routes

### Key Directories

```
app/
├── (auth)/          # Route group for auth callbacks
├── admin/           # Admin dashboard (loads, quotes, sync, analytics)
├── dashboard/       # Customer portal
├── api/
│   ├── admin/       # Admin endpoints (quotes, loads, PortPro sync)
│   ├── webhooks/    # PortPro webhook handlers
│   └── [public]/    # Contact, quote, track endpoints
components/
├── ui/              # shadcn components
├── admin/           # Admin-specific components
├── dashboard/       # Customer dashboard components
├── nav.tsx          # Main navigation (hides on admin pages)
└── footer.tsx       # Footer (hides on admin pages)
lib/
├── supabase/        # Supabase client (browser, server, admin)
├── portpro.ts       # PortPro TMS API integration
├── organizations.ts # Multi-tenant org management
├── data/            # Static data (pricing, zones, testimonials)
└── validations/     # Zod schemas for forms
types/
└── database.ts      # Generated Supabase types
```

### Data Layer

- **Supabase**: PostgreSQL with RLS for multi-tenant data isolation
  - Tables: `quotes`, `loads`, `load_events`, `organizations`, `organization_members`, `profiles`
  - Auth: Email/password with magic links
  - Multi-tenancy: Users belong to organizations via `organization_members` join table

- **PortPro Integration**:
  - `lib/portpro.ts` handles API client, auth, webhook processing
  - Webhooks sync load/load data to `loads` and `load_events` tables
  - Status mapping: PortPro statuses → internal load lifecycle states
  - Two-way sync: Admin can create/update loads in PortPro

### Authentication & Authorization

- Supabase Auth with email/password
- Three client patterns:
  - `lib/supabase/client.ts` - browser client with RLS
  - `lib/supabase/server.ts` - server client for SSR/API routes
  - `lib/supabase/admin.ts` - service role for admin operations (bypasses RLS)
- Organization-based access: Users see only their org's data via RLS policies
- Admin pages: Check user role in `organization_members.role` for admin access

### UI/Styling

- **Tailwind CSS 4**: Utility-first styling
- **Component Libraries**:
  - **shadcn/ui**: Base component library in `components/ui/`
  - **Aceternity UI**: Premium UI components for modern effects and animations
  - **Magic UI**: Additional animated components and effects
- **Theme**: Dark/light mode via `components/theme-provider.tsx`
- **Fonts**: Inter (body), DM Sans (headings), JetBrains Mono (monospace)
- **Icons**: lucide-react
- **Forms**: react-hook-form + Zod validation
- **Animations**: framer-motion

### Email & Rate Limiting

- **Resend**: Transactional emails via `app/api/quote` and `app/api/contact`
- **Rate limiting**: Upstash Redis (optional) in `lib/rate-limit.ts`
  - Quote form: 5 req/min per IP
  - Contact form: 3 req/min per IP
  - Falls back gracefully if UPSTASH_REDIS not configured

## Environment Setup

Required variables (see `.env.example`):
```env
# Email
RESEND_API_KEY=
EMAIL_TO=dispatcher@newstreamlogistics.com
EMAIL_FROM=noreply@newstreamlogistics.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# PortPro TMS
PORTPRO_API_URL=https://api1.app.portpro.io/v1
PORTPRO_ACCESS_TOKEN=
PORTPRO_REFRESH_TOKEN=

# Optional
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=https://newstreamlogistics.com
```

## Important Patterns

### Multi-Tenancy

All queries must filter by organization. Use helpers in `lib/organizations.ts`:
- `getUserOrganization(userId)` - Get user's org
- `getOrganizationByEmail(email)` - Match org by email domain
- RLS policies enforce org isolation at DB level

### Admin vs Customer Views

- Admin layout (`app/admin/layout.tsx`): Hides nav/footer, shows admin sidebar
- Customer layout (`app/dashboard/layout.tsx`): Shows nav/footer
- Check organization role before rendering admin UI

### PortPro Webhook Handling

Webhooks arrive at `app/api/webhooks/portpro/route.ts`:
- Validates signature
- Processes load/document events
- Creates/updates loads and events in Supabase
- Maps PortPro statuses to internal states using `PORTPRO_STATUS_MAP`

### Form Handling

Standard pattern:
1. Define Zod schema in `lib/validations/`
2. Use `react-hook-form` with `@hookform/resolvers/zod`
3. POST to API route
4. API validates, processes, sends email
5. Return success/error response

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **React**: 19.2.3
- **TypeScript**: 5.9.3
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS 4, shadcn/ui, Aceternity UI, Magic UI
- **Animations**: framer-motion
- **Email**: Resend
- **Forms**: react-hook-form, Zod
- **External API**: PortPro TMS
- **Package Manager**: pnpm

## Documentation Requirements

For every project, write a detailed `FOR_Vlad.md` file that explains the whole project in plain language.

Include:
- **Technical architecture**: How the system is designed and why
- **Codebase structure**: How the various parts are connected
- **Technologies used**: What tools/libraries and why we chose them
- **Technical decisions**: The reasoning behind key choices
- **Lessons learned**:
  - Bugs we ran into and how we fixed them
  - Potential pitfalls and how to avoid them
  - New technologies used and what we learned
  - How good engineers think and work
  - Best practices discovered

**Writing style**: Make it engaging to read - not boring technical documentation. Use analogies and anecdotes to make concepts understandable and memorable. Write like you're explaining to a smart friend over coffee, not writing a textbook.
