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
