# New Stream Logistics

Public logistics website with one quote form. Existing marketing pages and copy are preserved. No customer accounts, admin dashboard, price estimator, tracking portal, chat widget, email delivery, or PortPro integration runs in this application.

## Request delivery

`/quote` validates and saves each request in Supabase. A database trigger queues its Slack notification in the same transaction. The server attempts immediate delivery; an authenticated scheduled job retries pending notifications every five minutes. A temporary Slack failure does not discard the saved request. Slack delivery is at least once: a provider timeout or acknowledgement failure can produce a duplicate message.

Submission keys prevent duplicate database requests on retries. A server-side database rate limit allows five attempts per minute per hashed IP address. Only the server service role accesses business data. Historical quotes, loads, accounts and migrations remain in the database; browser access to public tables and functions is revoked by the retirement migration.

## Configuration

Required production variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `SLACK_WEBHOOK_URL` (server only; existing destination)
- `CRON_SECRET` (server only)
- `NEXT_PUBLIC_SITE_URL`

Sentry remains available for error monitoring. No customer login, email provider, Redis, Intercom, Mixpanel or PortPro credentials are needed. Never commit credentials.

## Development and verification

```sh
pnpm install
pnpm dev
pnpm test:run
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

`python3 scripts/test-database.py` replays migrations and regression checks against a disposable local PostgreSQL database named `nsl_test`. It resets its schemas and rejects remote hosts or other database names. Configure `NSL_TEST_DATABASE_URL` for the local test instance.

Build with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=test-service-key pnpm build`, then run `node scripts/test-production-runtime.mjs` for a built-server check using a local database/Slack fixture. No external notification is sent. Add `--serve` to keep the fixture running for browser verification.

## Release

Apply `supabase/migrations/20261014012439_simplify_quote_delivery.sql` before promoting the simplified site. It preserves historical data, retires browser data access, queues only Slack messages and adds the database rate limiter. Keep a private backup before migration.

GitHub Actions runs CI before staging the production deployment with `--skip-domain`. Required environment names are checked before build. Verify the staged commit and migration before promoting it to the public domain. The hosting plan must support the five-minute notification retry schedule.

Old portal URLs redirect to Contact; retired API endpoints return HTTP 410. External subscriptions to retired endpoints should be disabled in their source services. Existing credentials in those services are not deleted by this repository change.

For a live delivery check, submit one clearly labelled TEST request through `/quote`, verify its Slack message and stored delivery acknowledgement, and leave real customer records intact.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Zod, Supabase PostgreSQL and Slack incoming webhooks.

Private — all rights reserved.
