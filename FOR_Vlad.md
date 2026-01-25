# New Stream Logistics: The Complete Story

Hey Vlad! This document explains everything about the NSL codebase - how it works, why we built it this way, and the lessons we learned along the way. Grab a coffee, this is going to be good.

---

## What We Built

New Stream Logistics is a drayage company website with three main parts:

1. **Public Website** - Where customers learn about services and request quotes
2. **Customer Portal** - Where customers track their shipments and view quotes
3. **Admin Dashboard** - Where your team manages everything

Think of it like a restaurant: the public website is your menu and storefront, the customer portal is the table where customers sit, and the admin dashboard is the kitchen where all the magic happens.

---

## The Tech Stack (And Why)

### Next.js 16 with App Router
We're using the latest Next.js because it gives us:
- **Server Components** - Pages load fast because we render HTML on the server
- **API Routes** - Backend endpoints live alongside the frontend (no separate server needed)
- **Vercel Deployment** - Push to GitHub, and it's live in 60 seconds

### Supabase (PostgreSQL + Auth + Realtime)
Instead of building auth from scratch (which would take weeks), Supabase gives us:
- **Authentication** - Email/password login, magic links, session management
- **PostgreSQL Database** - Rock-solid relational database
- **Row Level Security (RLS)** - Database-level permissions (more on this later - it's important)
- **Realtime Subscriptions** - Live updates when data changes

### Tailwind CSS 4 + shadcn/ui + Aceternity UI
- **Tailwind** - Write CSS inline, never context-switch to a stylesheet
- **shadcn/ui** - Beautiful, accessible components (buttons, dialogs, forms)
- **Aceternity UI** - Fancy animations that make the site feel premium

### TypeScript Everywhere
No JavaScript in this codebase. TypeScript catches bugs before they hit production. If you pass the wrong type to a function, the code won't even compile.

---

## How The Codebase Is Organized

```
app/                    # All pages and API routes
├── (auth)/             # Login, signup, password reset
├── admin/              # Internal dashboard
│   ├── quotes/         # Quote management
│   ├── loads/          # Load/shipment tracking
│   ├── notifications/  # Notification center
│   └── ...
├── dashboard/          # Customer portal
├── quote/              # Public quote form + status pages
├── api/                # Backend endpoints
│   ├── quote/          # Quote submission
│   ├── notifications/  # Notification CRUD
│   └── webhooks/       # PortPro webhooks

components/             # Reusable UI pieces
├── ui/                 # shadcn components
├── admin/              # Admin-specific components
└── dashboard/          # Customer components

lib/                    # Business logic
├── supabase/           # Database clients
├── notifications/      # Notification system
├── portpro.ts          # TMS integration
└── validations/        # Form schemas
```

**The key insight**: In Next.js App Router, the `app/` folder structure IS your URL structure. `app/admin/quotes/page.tsx` = `/admin/quotes`.

---

## The Three Supabase Clients

This is crucial to understand. We have THREE different ways to talk to the database:

### 1. Browser Client (`lib/supabase/client.ts`)
```typescript
const supabase = createClient();
```
- Runs in the user's browser
- Uses their logged-in session
- **RLS enforced** - They only see data they're allowed to see

### 2. Server Client (`lib/supabase/server.ts`)
```typescript
const supabase = await createClient();
```
- Runs on Vercel's servers during page rendering
- Uses the user's session (from cookies)
- **RLS enforced**

### 3. Admin Client (`lib/supabase/server.ts`)
```typescript
const supabase = createUntypedAdminClient();
```
- Runs on Vercel's servers
- Uses the **service role key** (God mode)
- **RLS BYPASSED** - Can do anything

**When to use which?**
- Browser/Server client: When the user is doing something (viewing their data)
- Admin client: When the SYSTEM is doing something (creating notifications, syncing with PortPro)

---

## The Notification System (We Just Built This!)

This is fresh - let me walk you through how it works.

### The Problem
When a customer submits a quote, opens their email, or accepts a quote, we want employees to know immediately. Not in 5 minutes. Not when they refresh the page. *Immediately*.

### The Solution: Multi-Channel Notifications

```
Customer Action → Dispatcher → Channels
                      │
                      ├── In-App (database + realtime)
                      ├── Email (Resend)
                      └── Slack (webhook)
```

### How Realtime Works

This is the cool part. Here's the flow when a customer submits a quote:

1. **Quote submitted** → `POST /api/quote`
2. **API calls** `notify("quote_submitted", quoteId, data)`
3. **Dispatcher** figures out who should be notified (employees with "quotes" permission + super admins)
4. **For each recipient**, insert a row into `notifications` table
5. **Supabase Realtime** broadcasts "hey, new row in notifications!"
6. **Admin sidebar** (listening via subscription) hears this, fetches new count
7. **Badge updates** - "3" becomes "4"

The magic is that Supabase handles the WebSocket connection, reconnection, and broadcasting. We just subscribe.

### The Gotcha: RLS + Realtime

Here's something that tripped us up. Supabase Realtime respects RLS policies. So when we broadcast "new notification", only users who can SELECT that row will receive the event.

This is actually perfect for us:
- Employees only hear about THEIR notifications
- Super admins hear about ALL notifications (their RLS policy allows it)

### Key Files
- `lib/notifications/dispatcher.ts` - Routes notifications to recipients
- `lib/notifications/channels/in-app.ts` - Database inserts
- `components/admin/sidebar.tsx` - `useUnreadCount` hook with realtime subscription
- `app/api/notifications/route.ts` - API for fetching/updating

---

## The Quote Journey (Customer Lifecycle)

Understanding this flow is key to understanding the whole app:

```
1. Customer visits /quote
2. Fills out form → POST /api/quote
3. We save to DB, send email to dispatch, send Slack notification
4. Customer gets "thank you" page with status URL
5. Admin sees new quote in /admin/quotes
6. Admin fills in pricing, clicks "Send Quote"
7. Customer receives email with accept/decline link
8. Customer clicks link → /quote/accept/[token]
9. Customer accepts → we update status, notify admin
10. Admin converts to load → syncs with PortPro
```

Every step here generates notifications. The customer's journey is tracked, and employees see it in real-time.

---

## Bugs We Encountered (And How We Fixed Them)

### Bug 1: The Serverless Function That Quit Early

**Symptom**: Notifications weren't being created when quotes were submitted.

**Investigation**: Added logging. Saw "Starting notification dispatch..." but never saw "Notification created".

**Root Cause**: We were using fire-and-forget:
```typescript
// BAD - function returns before notification completes
notify("quote_submitted", quoteId, data).catch(console.error);
```

Vercel serverless functions terminate as soon as the response is sent. Our async `notify()` was getting killed.

**Fix**: Await the notification:
```typescript
// GOOD - function waits for notification
await notify("quote_submitted", quoteId, data);
```

**Lesson**: In serverless, you can't fire-and-forget. Everything must complete before you return the response.

### Bug 2: The Hydration Mismatch

**Symptom**: React error on /services page - "Hydration failed because server HTML didn't match client".

**Root Cause**: The Nav component was rendering auth-dependent UI differently on server vs client:
```typescript
// Server: user = null (not logged in yet)
// Client: user = { email: "..." } (after auth check)
```

**Fix**: Added a `mounted` state that only enables auth UI after client-side hydration:
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <SkeletonNav />;
```

**Lesson**: Any UI that depends on client-only state (auth, localStorage, etc.) must handle the server render gracefully.

### Bug 3: The AbortError Spam

**Symptom**: Sentry flooded with "AbortError: signal is aborted without reason".

**Root Cause**: Supabase Auth uses the browser's Web Locks API. When you have multiple tabs, or the tab is in the background, the lock can timeout and throw an AbortError.

**Fix**: Two-pronged:
1. Handle the error in our subscription callback (log as debug, not error)
2. Add "AbortError" to Sentry's ignore list

**Lesson**: Third-party libraries can throw errors that aren't actually problems. Know what's benign and filter it.

### Bug 4: Super Admin Without Employee Record

**Symptom**: Super admin could access /admin but saw "0 notifications" and got 403 on the API.

**Root Cause**: The notification system requires an `employee` record to route notifications. Super admins without employee records fell through the cracks.

**Fix**: Updated the API to allow super admins to see ALL notifications even without an employee record. They're admins - they should see everything.

**Lesson**: Your data model assumptions might not match reality. Super admins are a special case - don't force them into the employee mold.

---

## Best Practices We Learned

### 1. Use RLS, Not Application Logic
Instead of checking `if (user.org_id === quote.org_id)` in every query, define it once in RLS:
```sql
CREATE POLICY "Users see their org's quotes"
  ON quotes FOR SELECT
  USING (organization_id = auth.jwt() -> 'user_metadata' ->> 'org_id');
```

Now every query automatically filters. You literally cannot fetch data you shouldn't see.

### 2. Type Everything
```typescript
// BAD
const data = await supabase.from("quotes").select("*");

// GOOD
const data = await supabase.from("quotes").select("*").returns<Quote[]>();
```

Now TypeScript knows what `data` contains. Autocomplete works. Typos are caught.

### 3. Validate at the Boundary
Use Zod schemas to validate ALL incoming data:
```typescript
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
});

const result = schema.safeParse(req.body);
if (!result.success) return { error: result.error };
```

If it passes validation, you KNOW it's the right shape. No more `if (data?.email?.length > 0)`.

### 4. Fail Loud in Dev, Quiet in Prod
```typescript
if (process.env.NODE_ENV !== "production") {
  console.error("[DEBUG]", error);
} else {
  Sentry.captureException(error);
}
```

In development, you want stack traces in your face. In production, you want clean error handling and alerts to your monitoring system.

### 5. The "Service Role" is Dangerous
The admin client bypasses all security. Use it ONLY for system operations:
- ✅ Creating notifications (system → user)
- ✅ Processing webhooks (external system → our DB)
- ❌ User-initiated actions (use their session instead)

---

## Architecture Decisions Explained

### Why Supabase Instead of Firebase?
- PostgreSQL > NoSQL for relational data (quotes, loads, customers are all related)
- RLS is more powerful than Firestore rules
- SQL is a skill that transfers; Firebase query syntax doesn't

### Why Next.js Instead of Separate Frontend/Backend?
- One codebase, one deployment
- Server components make data fetching simple
- API routes are just files in the `app/api` folder
- Vercel deployment is zero-config

### Why shadcn/ui Instead of Material UI?
- shadcn components are copy-pasted into your codebase (you own them)
- Fully customizable (we modified several)
- Works perfectly with Tailwind
- No massive bundle size hit

### Why Resend Instead of SendGrid?
- Modern API, great DX
- Built by former Vercel folks (they understand Next.js)
- Reasonable pricing

---

## What's Next?

The notification system is the foundation for several features:

1. **Email Tracking Pixel** - Know when customers open quote emails
2. **Quote Activity Timeline** - Show admins exactly what customers did (viewed page, started form, accepted)
3. **Daily Digest** - Batch low-priority notifications into one email
4. **Push Notifications** - Browser notifications when tab is in background

---

## Final Thoughts

This codebase is built for growth. The patterns we've established - RLS for security, Zod for validation, TypeScript for type safety, notifications for real-time updates - will scale as the business grows.

When you add new features, follow the existing patterns:
1. Define your types
2. Write your Zod schema
3. Create RLS policies
4. Use the appropriate Supabase client
5. Add notifications where it makes sense

The architecture does the heavy lifting. You just add the business logic.

Questions? The code is the documentation. Start with `CLAUDE.md` for the overview, then dive into specific files. The patterns repeat everywhere - once you understand one flow, you understand them all.

Happy coding! 🚀
