# New Stream Logistics - Execution Plan

## Overview

This plan transforms the V1 MVP into a production-ready, scalable platform. Organized into 4 phases with clear deliverables.

---

## Phase 1: Security & Foundation (Critical - Before Launch)

### 1.1 Rate Limiting
**Goal:** Prevent spam and abuse on API routes

**Steps:**
1. Install `@upstash/ratelimit` and `@upstash/redis`
   ```bash
   pnpm add @upstash/ratelimit @upstash/redis
   ```
2. Create Upstash Redis account at https://upstash.com
3. Add environment variables:
   ```env
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
   ```
4. Create rate limiter utility at `lib/rate-limit.ts`:
   - 5 requests per minute for quote submissions
   - 3 requests per minute for contact form
5. Apply middleware to `/api/quote` and `/api/contact` routes
6. Return 429 status with retry-after header when limited

**Files to create/modify:**
- `lib/rate-limit.ts` (new)
- `app/api/quote/route.ts` (modify)
- `app/api/contact/route.ts` (modify)

---

### 1.2 Input Sanitization
**Goal:** Prevent XSS and injection attacks

**Steps:**
1. Install sanitization library:
   ```bash
   pnpm add isomorphic-dompurify
   ```
2. Create sanitization utility at `lib/sanitize.ts`
3. Sanitize all user inputs before:
   - Storing in database (future)
   - Including in emails
   - Rendering in admin views
4. Add input length limits to prevent DoS

**Files to create/modify:**
- `lib/sanitize.ts` (new)
- `app/api/quote/route.ts` (modify)
- `app/api/contact/route.ts` (modify)

---

### 1.3 Form Validation with Zod
**Goal:** Type-safe validation on client and server

**Steps:**
1. Install dependencies:
   ```bash
   pnpm add zod react-hook-form @hookform/resolvers
   ```
2. Create validation schemas at `lib/validations/`:
   - `quote.ts` - Quote form schema
   - `contact.ts` - Contact form schema
3. Update quote form to use react-hook-form + zod
4. Update contact form to use react-hook-form + zod
5. Add server-side validation in API routes using same schemas

**Files to create/modify:**
- `lib/validations/quote.ts` (new)
- `lib/validations/contact.ts` (new)
- `app/quote/quote-form.tsx` (modify)
- `app/contact/contact-form.tsx` (modify - check if exists)
- `app/api/quote/route.ts` (modify)
- `app/api/contact/route.ts` (modify)

---

### 1.4 Error Boundaries & Loading States
**Goal:** Graceful error handling and better UX

**Steps:**
1. Create global error boundary at `app/error.tsx`
2. Create global not-found page at `app/not-found.tsx` (if not exists)
3. Create loading states:
   - `app/loading.tsx` - Global loading
   - `app/quote/loading.tsx` - Quote page loading
4. Add Suspense boundaries around dynamic content
5. Create reusable error component at `components/ui/error-state.tsx`

**Files to create:**
- `app/error.tsx`
- `app/not-found.tsx`
- `app/loading.tsx`
- `app/quote/loading.tsx`
- `components/ui/error-state.tsx`

---

### 1.5 Error Monitoring (Sentry)
**Goal:** Track and alert on production errors

**Steps:**
1. Create Sentry account at https://sentry.io
2. Install Sentry SDK:
   ```bash
   pnpm add @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```
3. Configure `sentry.client.config.ts`
4. Configure `sentry.server.config.ts`
5. Configure `sentry.edge.config.ts`
6. Add environment variables:
   ```env
   SENTRY_DSN=
   SENTRY_AUTH_TOKEN=
   ```
7. Update `next.config.js` with Sentry webpack plugin
8. Test error capture with intentional error

**Files to create/modify:**
- `sentry.client.config.ts` (new)
- `sentry.server.config.ts` (new)
- `sentry.edge.config.ts` (new)
- `next.config.js` (modify)
- `.env.local` (modify)

---

### 1.6 CI/CD Pipeline
**Goal:** Automated testing and deployment

**Steps:**
1. Create GitHub Actions workflow at `.github/workflows/ci.yml`:
   - Lint check (`pnpm lint`)
   - Type check (`pnpm tsc --noEmit`)
   - Build check (`pnpm build`)
   - Run on PR and push to main
2. Create `.github/workflows/deploy.yml` for Vercel deployment
3. Add branch protection rules on GitHub:
   - Require CI to pass before merge
   - Require review approval

**Files to create:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

---

## Phase 2: Database & Persistence

### 2.1 Database Setup (Supabase)
**Goal:** Persistent storage for quotes, contacts, and tracking

**Steps:**
1. Create Supabase project at https://supabase.com
2. Install Supabase client:
   ```bash
   pnpm add @supabase/supabase-js
   ```
3. Add environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
4. Create database schema (SQL):
   ```sql
   -- Quotes table
   CREATE TABLE quotes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     status TEXT DEFAULT 'pending', -- pending, quoted, accepted, completed

     -- Contact info
     company_name TEXT NOT NULL,
     contact_name TEXT NOT NULL,
     email TEXT NOT NULL,
     phone TEXT,

     -- Container details
     container_number TEXT,
     container_size TEXT,
     container_type TEXT,
     weight_lbs INTEGER,
     is_hazmat BOOLEAN DEFAULT FALSE,
     is_overweight BOOLEAN DEFAULT FALSE,
     is_reefer BOOLEAN DEFAULT FALSE,

     -- Locations
     pickup_terminal TEXT,
     delivery_address TEXT,
     delivery_city TEXT,
     delivery_state TEXT,
     delivery_zip TEXT,

     -- Service details
     service_type TEXT, -- standard, expedited, pre-pull
     earliest_pickup DATE,
     latest_delivery DATE,
     special_instructions TEXT,

     -- Quote response (filled by admin)
     quoted_price DECIMAL(10,2),
     quoted_at TIMESTAMPTZ,
     quoted_by TEXT,
     quote_notes TEXT,
     quote_valid_until DATE
   );

   -- Contacts table
   CREATE TABLE contacts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     name TEXT NOT NULL,
     email TEXT NOT NULL,
     phone TEXT,
     company TEXT,
     subject TEXT,
     message TEXT NOT NULL,
     status TEXT DEFAULT 'new' -- new, read, replied
   );

   -- Shipments table (for tracking)
   CREATE TABLE shipments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     quote_id UUID REFERENCES quotes(id),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),

     container_number TEXT NOT NULL,
     status TEXT DEFAULT 'pending',
     -- pending, picked_up, in_transit, delivered, exception

     pickup_time TIMESTAMPTZ,
     delivery_time TIMESTAMPTZ,
     current_location TEXT,
     driver_name TEXT,
     truck_number TEXT,

     -- Customer can see these
     public_notes TEXT,
     -- Internal notes
     internal_notes TEXT
   );

   -- Status history for shipments
   CREATE TABLE shipment_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     status TEXT NOT NULL,
     location TEXT,
     notes TEXT,
     created_by TEXT
   );

   -- Enable RLS
   ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
   ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;
   ```

5. Create Supabase client at `lib/supabase/client.ts`
6. Create server client at `lib/supabase/server.ts`
7. Generate TypeScript types from schema

**Files to create:**
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `types/database.ts`

---

### 2.2 Update API Routes to Use Database
**Goal:** Store quotes and contacts in Supabase

**Steps:**
1. Update `/api/quote/route.ts`:
   - Insert quote into database
   - Generate unique quote reference number
   - Still send email notification
   - Return quote ID to client
2. Update `/api/contact/route.ts`:
   - Insert contact into database
   - Still send email notification
3. Create `/api/quotes/[id]/route.ts` for quote lookup
4. Update thank-you pages to show quote reference

**Files to modify/create:**
- `app/api/quote/route.ts` (modify)
- `app/api/contact/route.ts` (modify)
- `app/api/quotes/[id]/route.ts` (new)
- `app/quote/thank-you/page.tsx` (modify)

---

### 2.3 Real Tracking Implementation
**Goal:** Allow customers to track shipments by container number

**Steps:**
1. Update `/app/track/page.tsx`:
   - Add search form for container number
   - Query shipments table
   - Display status timeline from shipment_events
2. Create tracking result component showing:
   - Current status with visual indicator
   - Timeline of all status updates
   - Estimated delivery (if available)
   - Contact info for questions
3. Create `/api/track/route.ts` endpoint:
   - Lookup by container number
   - Return shipment + events
   - Rate limit to prevent scraping

**Files to modify/create:**
- `app/track/page.tsx` (modify)
- `app/api/track/route.ts` (new)
- `components/tracking/status-timeline.tsx` (new)
- `components/tracking/tracking-result.tsx` (new)

---

## Phase 3: Customer Experience Enhancements

### 3.1 Testimonials Section
**Goal:** Add social proof to homepage

**Steps:**
1. Create testimonials data at `lib/data/testimonials.ts`:
   ```typescript
   export const testimonials = [
     {
       quote: "Finally, a drayage company that doesn't play games with pricing.",
       author: "Sarah Chen",
       title: "Logistics Manager",
       company: "Pacific Import Co.",
       rating: 5
     },
     // Add 4-5 more
   ];
   ```
2. Update `components/sections/testimonials.tsx` with real content
3. Add testimonials to Services page
4. Add mini-testimonial to Quote page (builds confidence)

**Files to modify:**
- `lib/data/testimonials.ts` (new)
- `components/sections/testimonials.tsx` (modify)
- `app/services/page.tsx` (modify)
- `app/quote/page.tsx` (modify)

---

### 3.2 Ballpark Price Estimator
**Goal:** Give instant price range before full quote

**Steps:**
1. Create pricing zones data at `lib/data/pricing-zones.ts`:
   ```typescript
   // Zone-based pricing (simplified)
   export const zones = {
     zone1: { // LA Basin
       zips: ['90001-90899'],
       standardRange: [350, 450],
       expeditedRange: [450, 600]
     },
     zone2: { // Inland Empire
       zips: ['91701-92899'],
       standardRange: [450, 600],
       expeditedRange: [600, 800]
     },
     // etc.
   };
   ```
2. Create estimator component at `components/quote/price-estimator.tsx`:
   - Input: ZIP code + container size + service type
   - Output: Price range with disclaimer
3. Add to quote page as Step 0 (before full form)
4. CTA: "Get exact quote" leads to full form

**Files to create:**
- `lib/data/pricing-zones.ts`
- `components/quote/price-estimator.tsx`
- `app/quote/page.tsx` (modify)

---

### 3.3 Document Upload
**Goal:** Allow BOL/customs docs with quote request

**Steps:**
1. Set up file storage in Supabase:
   - Create `documents` bucket
   - Set up RLS policies
2. Create upload component at `components/ui/file-upload.tsx`:
   - Drag and drop support
   - File type validation (PDF, images)
   - Size limit (10MB)
   - Upload progress indicator
3. Add to quote form as optional step
4. Store file references in quotes table

**Files to create/modify:**
- `components/ui/file-upload.tsx` (new)
- `app/quote/quote-form.tsx` (modify)
- `lib/supabase/storage.ts` (new)

---

### 3.4 SEO Enhancements
**Goal:** Improve search visibility

**Steps:**
1. Create dynamic sitemap at `app/sitemap.ts`:
   ```typescript
   export default function sitemap() {
     return [
       { url: 'https://newstreamlogistics.com', lastModified: new Date() },
       { url: 'https://newstreamlogistics.com/services', lastModified: new Date() },
       // All static pages
     ];
   }
   ```
2. Create robots.txt at `app/robots.ts`:
   ```typescript
   export default function robots() {
     return {
       rules: { userAgent: '*', allow: '/' },
       sitemap: 'https://newstreamlogistics.com/sitemap.xml',
     };
   }
   ```
3. Add JSON-LD structured data to layout:
   - LocalBusiness schema
   - Service schema
4. Add canonical URLs to all pages
5. Verify meta tags on all pages

**Files to create:**
- `app/sitemap.ts`
- `app/robots.ts`
- `components/structured-data.tsx`

---

### 3.5 Phone Number Prominence
**Goal:** Make phone number unmissable

**Steps:**
1. Add sticky phone banner for mobile (shows on scroll up)
2. Add phone to hero section prominently
3. Add click-to-call tracking (GA4 event)
4. Update nav to show phone on tablet+

**Files to modify:**
- `components/sections/hero.tsx`
- `components/nav.tsx`
- `components/phone-banner.tsx` (new)

---

## Phase 4: Customer Portal & Authentication

### 4.1 Authentication Setup (Clerk)
**Goal:** Customer login for portal access

**Steps:**
1. Create Clerk account at https://clerk.com
2. Install Clerk SDK:
   ```bash
   pnpm add @clerk/nextjs
   ```
3. Add environment variables:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```
4. Create middleware at `middleware.ts`:
   - Public routes: /, /services, /quote, /track, etc.
   - Protected routes: /dashboard/*
5. Add ClerkProvider to layout
6. Create sign-in page at `app/sign-in/[[...sign-in]]/page.tsx`
7. Create sign-up page at `app/sign-up/[[...sign-up]]/page.tsx`
8. Add login/signup buttons to nav

**Files to create/modify:**
- `middleware.ts` (new)
- `app/layout.tsx` (modify)
- `app/sign-in/[[...sign-in]]/page.tsx` (new)
- `app/sign-up/[[...sign-up]]/page.tsx` (new)
- `components/nav.tsx` (modify)

---

### 4.2 Customer Dashboard
**Goal:** Self-service portal for customers

**Steps:**
1. Create dashboard layout at `app/dashboard/layout.tsx`
2. Create dashboard home at `app/dashboard/page.tsx`:
   - Quick stats (active shipments, pending quotes)
   - Recent activity
3. Create quotes page at `app/dashboard/quotes/page.tsx`:
   - List all quotes with status
   - Filter by status
   - View quote details
4. Create shipments page at `app/dashboard/shipments/page.tsx`:
   - List all shipments
   - Filter by status
   - Track individual shipment
5. Create profile page at `app/dashboard/profile/page.tsx`:
   - Company info
   - Contact preferences
   - Notification settings

**Files to create:**
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/quotes/page.tsx`
- `app/dashboard/quotes/[id]/page.tsx`
- `app/dashboard/shipments/page.tsx`
- `app/dashboard/shipments/[id]/page.tsx`
- `app/dashboard/profile/page.tsx`
- `components/dashboard/sidebar.tsx`
- `components/dashboard/stats-card.tsx`

---

### 4.3 Admin Panel
**Goal:** Internal tool for managing quotes and shipments

**Steps:**
1. Create admin layout at `app/admin/layout.tsx`:
   - Role check (admin users only)
   - Sidebar navigation
2. Create admin dashboard at `app/admin/page.tsx`:
   - Pending quotes count
   - Active shipments
   - Today's stats
3. Create quotes management at `app/admin/quotes/page.tsx`:
   - List all quotes
   - Filter/search
   - Update status
   - Add quoted price
4. Create shipments management at `app/admin/shipments/page.tsx`:
   - Create shipment from quote
   - Update status
   - Add events/notes
5. Add role-based access control:
   - Regular customers: dashboard only
   - Admin users: dashboard + admin

**Files to create:**
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/quotes/page.tsx`
- `app/admin/quotes/[id]/page.tsx`
- `app/admin/shipments/page.tsx`
- `app/admin/shipments/[id]/page.tsx`
- `app/admin/shipments/new/page.tsx`
- `components/admin/sidebar.tsx`
- `components/admin/quote-form.tsx`
- `components/admin/shipment-form.tsx`

---

### 4.4 Email Notifications (Enhanced)
**Goal:** Beautiful, branded emails for all touchpoints

**Steps:**
1. Install react-email:
   ```bash
   pnpm add @react-email/components react-email
   ```
2. Create email templates at `emails/`:
   - `quote-received.tsx` - Confirmation to customer
   - `quote-ready.tsx` - Price quote notification
   - `shipment-update.tsx` - Status change notification
   - `welcome.tsx` - New account welcome
3. Update API routes to use new templates
4. Add preview script to package.json:
   ```json
   "email:dev": "email dev -p 3001"
   ```

**Files to create:**
- `emails/quote-received.tsx`
- `emails/quote-ready.tsx`
- `emails/shipment-update.tsx`
- `emails/welcome.tsx`
- `emails/components/header.tsx`
- `emails/components/footer.tsx`

---

### 4.5 SMS Notifications (Twilio)
**Goal:** Opt-in SMS for critical updates

**Steps:**
1. Create Twilio account at https://twilio.com
2. Install Twilio SDK:
   ```bash
   pnpm add twilio
   ```
3. Add environment variables:
   ```env
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_PHONE_NUMBER=
   ```
4. Create SMS utility at `lib/sms.ts`
5. Add SMS opt-in checkbox to quote form
6. Send SMS for:
   - Quote received confirmation
   - Quote ready notification
   - Shipment picked up
   - Shipment delivered
   - Delivery exceptions

**Files to create:**
- `lib/sms.ts`
- Modify `app/quote/quote-form.tsx`
- Modify database schema (add sms_optin, phone fields)

---

## Implementation Priority Order

### Week 1-2: Foundation
1. Rate limiting (1.1)
2. Input sanitization (1.2)
3. Error boundaries (1.4)
4. CI/CD pipeline (1.6)

### Week 3-4: Database
5. Supabase setup (2.1)
6. Update API routes (2.2)
7. Real tracking (2.3)

### Week 5-6: Customer Experience
8. Testimonials (3.1)
9. SEO enhancements (3.4)
10. Phone prominence (3.5)
11. Price estimator (3.2)

### Week 7-8: Portal
12. Authentication (4.1)
13. Customer dashboard (4.2)
14. Email templates (4.4)

### Week 9-10: Admin & Polish
15. Admin panel (4.3)
16. Document upload (3.3)
17. SMS notifications (4.5)
18. Sentry monitoring (1.5)

---

## Environment Variables Checklist

```env
# Existing
RESEND_API_KEY=

# Rate Limiting (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Monitoring (Sentry)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Site
NEXT_PUBLIC_SITE_URL=https://newstreamlogistics.com
```

---

## Success Metrics

### Phase 1
- [ ] 0 critical security vulnerabilities
- [ ] <3s page load time
- [ ] 100% uptime during testing

### Phase 2
- [ ] 100% of quotes stored in database
- [ ] Tracking lookup works for all shipments
- [ ] <500ms API response time

### Phase 3
- [ ] 5+ testimonials displayed
- [ ] Sitemap indexed by Google
- [ ] Phone click-through rate tracked

### Phase 4
- [ ] 50%+ of repeat customers using portal
- [ ] <10min to process quote (admin)
- [ ] 90%+ email open rate

---

## Notes

- All timeline estimates assume 1-2 developers working full-time
- Phases can overlap where dependencies allow
- Each phase should be tested thoroughly before moving to next
- Consider staging environment for each phase deployment
