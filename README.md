# New Stream Logistics

LA/LB port drayage website with customer portal, admin dashboard, and PortPro TMS integration.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS 4, shadcn/ui, Aceternity UI, Magic UI
- **Animations**: framer-motion
- **Email**: Resend
- **Forms**: react-hook-form + Zod
- **External API**: PortPro TMS
- **Package Manager**: pnpm

## Features

### Public Website
- Hero with stats and trust indicators
- Quote request form (15 min response)
- Container tracking
- Services, Process, Compliance pages
- Contact form with Slack notifications

### Customer Portal (`/dashboard`)
- View quotes and loads
- Track shipments in real-time
- Organization/team management

### Admin Panel (`/admin`)
- Manage quotes and loads
- Customer management
- PortPro TMS sync
- Analytics dashboard
- Employee RBAC system

## Getting Started

```bash
# Install
pnpm install

# Development
pnpm dev

# Build
pnpm build
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=
EMAIL_TO=info@newstreamlogistics.com
EMAIL_FROM=noreply@newstreamlogistics.com

# PortPro TMS
PORTPRO_API_URL=https://api1.app.portpro.io/v1
PORTPRO_ACCESS_TOKEN=
PORTPRO_REFRESH_TOKEN=

# Slack
SLACK_WEBHOOK_URL=

# Optional
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Project Structure

```
app/
├── (auth)/           # Auth callbacks
├── admin/            # Admin dashboard
├── dashboard/        # Customer portal
├── api/              # API routes
├── quote/            # Quote form
├── track/            # Container tracking
├── services/         # Services page
├── process/          # Process page
├── compliance/       # Compliance info
├── contact/          # Contact form
└── about/            # About page

components/
├── ui/               # shadcn components
├── admin/            # Admin components
├── dashboard/        # Dashboard components
├── sections/         # Landing page sections
├── nav.tsx           # Navigation
└── footer.tsx        # Footer

lib/
├── supabase/         # Supabase clients
├── portpro.ts        # PortPro API
├── auth.ts           # Auth helpers
├── validations/      # Zod schemas
└── data/             # Static data
```

## Company Info

- **USDOT**: 4403165
- **MC**: 1728721
- **SCAC**: NFLS
- **Phone**: (888) 533-0302
- **Location**: 18501 South Main Street, Gardena, CA 90248

## License

Private - All rights reserved

## Reliability and access changes (October 2026)

Apply migrations `020_access_boundaries.sql`, `021_quote_reliability.sql`, and
`022_portpro_transactions.sql` **before deploying this version**. They are
transactional individually. Review a staging copy and take a database backup
before applying to production. This repository change does not run migrations
against your hosted Supabase project.

- Browser roles cannot write core business tables, read quote tokens, or call
  legacy invitation RPCs. Customers only read rows belonging to their verified
  organization; internal notes and financial fields stay server-side.
- Registration uses Supabase confirmation email and PKCE. Enable email
  confirmation, configure SMTP, set `NEXT_PUBLIC_SITE_URL`, and allow that URL's
  `/auth/callback` in Supabase. Joining a team requires an invitation; guessing an
  organization ID or using the same email domain no longer grants membership.
- Quotes and loads in the customer portal must have an explicit `organization_id`.
  Review legacy memberships and unassigned records before release. Do **not**
  backfill by company name. Authorized staff can assign a quote with
  `PATCH /api/admin/quotes/:id` and `{ "organization_id": "<verified-org-id>" }`.
  A load created from an accepted quote inherits that organization. Independently
  imported PortPro loads require a reviewed organization assignment in the DB.
- Check duplicate non-null `loads.portpro_reference` values before migration 022;
  resolve them manually. The migration deliberately refuses to silently merge
  or delete existing deliveries.
- `lifecycle_status` is canonical; a DB trigger keeps legacy `status` in sync.
  Completion is tracked on the load. Quote acceptance and token consumption are
  one transaction, and retrying the same acceptance returns its committed result.
- The quote form sends `Idempotency-Key`. A persisted outbox retries notification
  failures. Email delivery uses the outbox ID as Resend's idempotency key. Slack
  and employee notifications are at-least-once; provider failures can cause repeat
  notifications. A stored quote remains accepted even while delivery is pending.
- All PortPro entry points share transactional snapshot/webhook processing.
  Events arriving before their load are retried. Older timestamped changes do not
  overwrite newer data. Polling advances a durable cursor through 50-load pages.
- Enable Supabase Realtime for `loads` (migration 014). Load screens subscribe to
  changes and also refresh once a minute as a fallback. Public tracking polls its
  limited HTTP response every 30 seconds while visible.
- Configure `CRON_SECRET` and Redis for retries. Vercel schedules include quote
  expiration hourly, quote notification retries every five minutes, and webhook
  retries every fifteen minutes. The hosting plan must support these schedules;
  alternatively use the existing QStash scheduling approach with authenticated
  requests. The PortPro polling schedule is still provisioned separately.
- Production deployment depends on the same commit's CI checks. Configure the
  GitHub `production` environment and set repository variable
  `VERCEL_CLI_VERSION` to a reviewed exact CLI version. If Vercel Git integration
  is configured not to auto-deploy `main`, avoiding an unchecked duplicate release.
  The workflow stages production with `--skip-domain`; verify the staged deployment
  and apply pending migrations before promoting it to the public domains.

### Local verification

`pnpm test:run`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` check the
application. `python3 scripts/test-database.py` replays all migrations and SQL
regressions on a **disposable local database named `nsl_test`**. It resets that
database's public/auth schemas. Set `NSL_TEST_DATABASE_URL` to the local test
PostgreSQL URL; the script rejects remote hosts and other database names.
The harness stubs Supabase auth functions; it tests PostgreSQL grants, policies
and transactions, not the hosted Auth, Realtime or email services.
