# Test Coverage Audit - New Stream Logistics

**Audit Date:** January 2026
**Auditor:** Senior QA Engineer
**Project:** Next.js 16 Drayage Platform

---

## Executive Summary

### Current State: ZERO Test Coverage

| Metric | Value |
|--------|-------|
| Test Files | 0 |
| Test Frameworks | Not installed |
| Coverage Reports | None |
| CI Test Step | Missing |

**Risk Level: CRITICAL**

This production system handles:
- Real customer quote requests with financial data
- PortPro TMS integration via webhooks
- Multi-tenant organization data with RLS
- Super admin and employee permission systems
- Email/Slack notifications for business operations

All of this operates with **zero automated verification**.

### Codebase Size

| Category | Count | Coverage |
|----------|-------|----------|
| API Routes | 42 | 0% |
| Lib Modules | 40+ | 0% |
| Components (w/logic) | 20+ | 0% |
| Custom Hooks | 2 | 0% |
| DB Migrations | 17 | 0% |
| External Integrations | 7 | 0% |

### Critical Gaps

1. **Authentication/Authorization** - No tests for super admin, employee permissions, org membership
2. **Webhook Processing** - PortPro webhooks handle 8 event types with no verification
3. **Lead Scoring** - Business-critical algorithm untested
4. **Multi-tenancy** - RLS policies and org isolation untested
5. **Rate Limiting** - DoS protection unverified

---

## Priority Matrix

### P0 - CRITICAL (Must Test First)

| Module | Path | Risk | Impact |
|--------|------|------|--------|
| Auth System | `lib/auth.ts` | Data breach, unauthorized access | Super admin grants, employee module access |
| PortPro Client | `lib/portpro.ts` | Data loss, sync failures | Webhook signature verification, 700+ LOC |
| Webhook Handler | `app/api/webhooks/portpro/route.ts` | Data corruption | 8 event types, deduplication, DLQ |
| Quote Validation | `lib/validations/quote.ts` | Lost revenue | Lead scoring algorithm, urgency detection |
| Webhook Dedup | `lib/webhook-dedup.ts` | Duplicate processing | Idempotency critical |
| Webhook DLQ | `lib/webhook-dlq.ts` | Silent failures | Failed webhook recovery |

### P1 - HIGH (Core Business Logic)

| Module | Path | Risk | Impact |
|--------|------|------|--------|
| Quote Submission | `app/api/quote/route.ts` | Lost leads | Main customer entry point |
| Admin Quotes | `app/api/admin/quotes/*` | Broken workflows | 5 endpoints for quote management |
| Admin Loads | `app/api/admin/loads/*` | Tracking failures | 4 endpoints for load management |
| Priority Scoring | `lib/quotes/priority.ts` | SLA breaches | Quote queue ordering |
| Notifications | `lib/notifications/dispatcher.ts` | Missed alerts | Multi-channel orchestration |
| Organizations | `lib/organizations.ts` | Data leaks | Multi-tenancy isolation |
| Rate Limiting | `lib/rate-limit.ts` | DoS vulnerability | IP-based throttling |

### P2 - MEDIUM (Important)

| Module | Path | Risk | Impact |
|--------|------|------|--------|
| Quote Form | `app/quote/quote-form.tsx` | Poor UX | 3-step wizard, analytics |
| Quote Queue | `components/admin/quote-queue.tsx` | Admin inefficiency | Filtering, real-time |
| Notifications UI | `components/admin/notification-center.tsx` | Missed notifications | Preferences, display |
| Permissions Hook | `lib/hooks/use-permissions.ts` | UI auth bugs | Permission caching |
| Realtime Hook | `lib/hooks/use-realtime-loads.ts` | Stale data | Supabase subscriptions |
| Cron Jobs | `app/api/cron/*` | Silent degradation | 4 scheduled tasks |

### P3 - LOW (Nice to Have)

| Module | Path | Risk |
|--------|------|------|
| UI Components | `components/ui/*` | Visual only |
| Section Components | `components/sections/*` | Static content |
| Analytics | `lib/analytics.ts` | Missing metrics |
| Theme Provider | `components/theme-provider.tsx` | Visual only |

---

## Gap Analysis by Category

### API Routes (42 total)

| Category | Routes | Status | Test Types Needed |
|----------|--------|--------|-------------------|
| **Public** | | | |
| Quote submission | `POST /api/quote` | ❌ Not tested | Integration, rate limit, validation |
| Quote validate | `GET /api/quote/validate` | ❌ Not tested | Unit (token validation) |
| Quote track | `GET /api/quote/track` | ❌ Not tested | Integration |
| Quote accept | `POST /api/quote/accept` | ❌ Not tested | Integration (token, state machine) |
| Quote activity | `POST /api/quote/activity` | ❌ Not tested | Unit |
| Contact | `POST /api/contact` | ❌ Not tested | Integration, rate limit |
| Track | `GET /api/track` | ❌ Not tested | Integration |
| Health | `GET /api/health` | ❌ Not tested | Unit |
| **Webhooks** | | | |
| PortPro | `POST /api/webhooks/portpro` | ❌ Not tested | Integration (signature, events, DLQ) |
| **Auth** | | | |
| Signup | `POST /api/auth/signup` | ❌ Not tested | Integration (org creation) |
| Permissions | `GET /api/auth/permissions` | ❌ Not tested | Unit |
| Callback | `GET /api/auth/callback` | ❌ Not tested | Integration |
| **Admin Quotes** | | | |
| List | `GET /api/admin/quotes` | ❌ Not tested | Integration (auth, pagination) |
| Get/Update | `GET/PATCH /api/admin/quotes/[id]` | ❌ Not tested | Integration (auth, state) |
| Assign | `POST /api/admin/quotes/[id]/assign` | ❌ Not tested | Integration |
| Activity | `GET /api/admin/quotes/[id]/activity` | ❌ Not tested | Unit |
| Metrics | `GET /api/admin/quotes/metrics` | ❌ Not tested | Unit |
| **Admin Loads** | | | |
| List/Create | `GET/POST /api/admin/loads` | ❌ Not tested | Integration |
| Get | `GET /api/admin/loads/[id]` | ❌ Not tested | Unit |
| Events | `GET /api/admin/loads/[id]/events` | ❌ Not tested | Unit |
| **Organizations** | | | |
| Admin list | `GET /api/admin/organizations` | ❌ Not tested | Integration (super admin) |
| Members | `*/api/admin/organizations/[id]/members` | ❌ Not tested | Integration |
| User org | `GET/PATCH /api/organization` | ❌ Not tested | Integration |
| **Invitations** | | | |
| CRUD | `/api/invitations/*` | ❌ Not tested | Integration (tokens) |
| Accept | `POST /api/invitations/[token]/accept` | ❌ Not tested | Integration |
| **Cron** | | | |
| Quote expiration | `POST /api/cron/quote-expiration` | ❌ Not tested | Integration (auth, batch) |
| DLQ retry | `GET /api/cron/dlq-retry` | ❌ Not tested | Integration |
| Reconcile | `GET /api/cron/portpro-reconcile` | ❌ Not tested | Integration |
| Cleanup | `GET /api/cron/cleanup-logs` | ❌ Not tested | Integration |
| **Other** | | | |
| QStash poll | `POST /api/qstash/portpro-poll` | ❌ Not tested | Integration (signature) |
| DLQ mgmt | `/api/admin/dlq/*` | ❌ Not tested | Integration |
| Sync PortPro | `POST /api/admin/sync-portpro` | ❌ Not tested | Integration |
| Users/Employees | `/api/admin/users`, `/api/admin/employees` | ❌ Not tested | Integration |

### Business Logic Modules

| File | LOC | Complexity | Status | Test Priority |
|------|-----|------------|--------|---------------|
| `lib/portpro.ts` | 537 | High | ❌ | P0 |
| `lib/auth.ts` | 677 | High | ❌ | P0 |
| `lib/notifications/dispatcher.ts` | 379 | High | ❌ | P1 |
| `lib/validations/quote.ts` | 254 | Medium | ❌ | P0 |
| `lib/webhook-dlq.ts` | 237 | Medium | ❌ | P0 |
| `lib/organizations.ts` | 234 | Medium | ❌ | P1 |
| `lib/quotes/priority.ts` | 193 | Medium | ❌ | P1 |
| `lib/webhook-dedup.ts` | 161 | Medium | ❌ | P0 |
| `lib/rate-limit.ts` | 106 | Low | ❌ | P1 |
| `lib/load-helpers.ts` | ~150 | Medium | ❌ | P2 |

### Components with Business Logic

| Component | Logic Type | Status | Priority |
|-----------|-----------|--------|----------|
| `app/quote/quote-form.tsx` | Multi-step wizard, validation, analytics | ❌ | P2 |
| `components/admin/quote-queue.tsx` | Filtering, pagination, real-time | ❌ | P2 |
| `components/admin/notification-center.tsx` | Preferences, real-time updates | ❌ | P2 |
| `app/admin/loads/[id]/tracking-timeline.tsx` | Timeline visualization | ❌ | P3 |
| `app/admin/loads/new/load-creation-form.tsx` | Form state, API calls | ❌ | P2 |

### Custom Hooks

| Hook | Purpose | Status | Priority |
|------|---------|--------|----------|
| `lib/hooks/use-permissions.ts` | Authorization checks, caching | ❌ | P2 |
| `lib/hooks/use-realtime-loads.ts` | Supabase realtime subscriptions | ❌ | P2 |

---

## Specific Test Cases

### P0: `lib/auth.ts` - Authentication & Authorization

```typescript
// Unit Tests
describe('isSuperAdmin', () => {
  it('returns true for super_admin role')
  it('returns false for regular user')
  it('returns false when profile not found')
  it('handles null userId by using current session')
})

describe('hasModuleAccess', () => {
  it('grants super admin access to all modules')
  it('restricts employees to assigned modules only')
  it('denies super-admin-only modules for regular employees')
  it('returns false for unauthenticated users')
  it('returns false for inactive employees')
})

describe('getUserOrgMembership', () => {
  it('returns org and role for valid member')
  it('returns null for non-member')
  it('handles multiple org memberships')
})

describe('createOrganization', () => {
  it('creates org with user as admin')
  it('handles slug collisions by appending numbers')
  it('rolls back on member creation failure')
  it('waits for profile trigger before creating membership')
})

// Edge Cases
describe('edge cases', () => {
  it('handles race condition in profile creation')
  it('handles deleted profiles gracefully')
  it('caches permission checks appropriately')
})
```

### P0: `lib/portpro.ts` - PortPro Integration

```typescript
// Unit Tests
describe('verifyWebhookSignature', () => {
  it('accepts valid HMAC-SHA1 signature')
  it('rejects invalid signature')
  it('rejects wrong algorithm in header')
  it('uses timing-safe comparison')
  it('returns false for missing signature')
  it('returns false for missing secret')
})

describe('mapPortProStatus', () => {
  it('maps DISPATCHED to dispatched')
  it('maps COMPLETED to completed')
  it('maps EN_ROUTE to in_transit')
  it('maps DELIVERED to delivered')
  it('defaults to booked for unknown status')
})

describe('extractLookupValue', () => {
  it('returns string as-is')
  it('extracts label from {label: x} object')
  it('falls back to name if no label')
  it('returns null for null/undefined input')
})

describe('formatLocation', () => {
  it('formats full address correctly')
  it('handles missing fields gracefully')
  it('returns null for empty location')
})

describe('calculateLoadMargin', () => {
  it('calculates margin as revenue - costs')
  it('sums all expense items')
  it('sums all vendor pay items')
  it('sums all driver pay items')
  it('returns null when totalAmount missing')
  it('handles empty cost arrays')
})

describe('convertLoadToShipment', () => {
  it('maps all required fields correctly')
  it('handles optional fields being null')
  it('calculates margin from costs')
  it('generates correct tracking number format')
})
```

### P0: `app/api/webhooks/portpro/route.ts` - Webhook Handler

```typescript
// Integration Tests
describe('POST /api/webhooks/portpro', () => {
  describe('signature verification', () => {
    it('rejects request with invalid signature')
    it('rejects request with missing signature header')
    it('accepts request with valid signature')
    it('skips signature check when PORTPRO_WEBHOOK_SECRET not set')
  })

  describe('deduplication', () => {
    it('detects duplicate events via idempotency key')
    it('processes first occurrence of event')
    it('returns 200 for duplicate (idempotent)')
  })

  describe('event: load#created', () => {
    it('creates new load record in database')
    it('generates tracking number')
    it('creates initial load_event')
    it('skips if load already exists by portpro_load_id')
  })

  describe('event: load#status_updated', () => {
    it('updates load status')
    it('creates status_update event')
    it('handles non-existent load gracefully')
  })

  describe('event: load#equipment_changed', () => {
    it('updates container/chassis info')
    it('creates equipment_changed event')
  })

  describe('event: document#pod_added', () => {
    it('marks load as delivered')
    it('creates document event with URL')
  })

  describe('error handling', () => {
    it('pushes to DLQ on processing failure')
    it('returns 200 even on error (prevent retries)')
    it('logs error to portpro_webhook_logs')
    it('marks event as processed after success')
  })
})
```

### P0: `lib/validations/quote.ts` - Quote Validation & Lead Scoring

```typescript
// Unit Tests
describe('quoteFormSchema', () => {
  describe('required fields', () => {
    it('requires fullName min 2 chars')
    it('requires companyName min 2 chars')
    it('requires containerType')
    it('requires deliveryZip')
    it('requires pickupTerminal')
  })

  describe('format validation', () => {
    it('validates phone format (10 digits)')
    it('validates email format')
    it('validates container number format')
    it('validates ZIP code format (5 digits)')
  })

  describe('transformations', () => {
    it('transforms container number to uppercase')
    it('trims whitespace from text fields')
  })

  describe('optional fields', () => {
    it('allows empty email')
    it('allows empty phone')
    it('allows empty specialInstructions')
  })
})

describe('calculateLeadScore', () => {
  it('returns 0 for minimal data')
  it('adds 2 points for urgent_lfd request type')
  it('adds 2 points for rolled request type')
  it('adds 1 point for timeSensitive flag')
  it('adds 1 point for phone provided')
  it('adds 1 point for container number provided')
  it('adds urgency points when LFD within 48 hours')
  it('caps score at maximum value')
})

describe('isUrgentLead', () => {
  it('returns true for score >= 3')
  it('returns true for urgent_lfd request type regardless of score')
  it('returns true for rolled request type regardless of score')
  it('returns false for standard request with low score')
})
```

### P1: `lib/quotes/priority.ts` - Priority & SLA

```typescript
// Unit Tests
describe('calculateQuotePriority', () => {
  it('calculates lead score factor (0-30 points)')
  it('calculates urgency factor based on hours pending')
  it('calculates customer value factor for repeat customers')
  it('calculates time-sensitive factor')
  it('caps total score at 100')
  it('returns 0 for completed/cancelled quotes')
})

describe('getSLAStatus', () => {
  it('returns "overdue" when pending > 2x threshold')
  it('returns "warning" when pending > threshold')
  it('returns "ok" when within threshold')
  it('uses 2 hour threshold for urgent quotes')
  it('uses 4 hour threshold for normal quotes')
  it('returns "ok" for non-active statuses')
})

describe('sortByPriority', () => {
  it('sorts highest priority first')
  it('maintains stable sort for equal priorities')
  it('handles empty array')
})
```

### P1: `lib/notifications/dispatcher.ts` - Notification System

```typescript
// Unit Tests
describe('buildNotification', () => {
  it('interpolates {quote_reference} in title')
  it('interpolates {company_name} in body')
  it('sets correct priority from event type')
})

// Integration Tests
describe('dispatch', () => {
  it('sends to all employees for quote_submitted')
  it('sends only to assignee for quote_assigned')
  it('includes super admins for critical events')
  it('respects employee notification preferences')
  it('sends to all enabled channels')
  it('handles channel failures gracefully')
  it('queues emails for digest when preference set')
})

describe('channel integration', () => {
  it('sends email via Resend')
  it('sends Slack message to webhook')
  it('creates in-app notification record')
})
```

### P2: Quote Form Component

```typescript
// Component Tests
describe('QuoteForm', () => {
  it('renders step 1 (contact info) initially')
  it('shows validation errors on empty submit')
  it('proceeds to step 2 after valid step 1')
  it('shows step 2 (container info)')
  it('proceeds to step 3 after valid step 2')
  it('shows summary on step 3')
  it('allows navigation back to previous steps')
  it('submits form data to API')
  it('shows success message after submission')
  it('shows error message on API failure')
  it('tracks analytics events on step changes')
  it('disables submit button while loading')
})
```

---

## Quick Wins (No Mocking Needed)

These pure functions can be tested immediately:

| Function | File | Estimated Time |
|----------|------|----------------|
| `calculateLeadScore()` | `lib/validations/quote.ts` | 30 min |
| `isUrgentLead()` | `lib/validations/quote.ts` | 15 min |
| `mapPortProStatus()` | `lib/portpro.ts` | 20 min |
| `extractLookupValue()` | `lib/portpro.ts` | 15 min |
| `formatLocation()` | `lib/portpro.ts` | 20 min |
| `calculateLoadMargin()` | `lib/portpro.ts` | 30 min |
| `calculateQuotePriority()` | `lib/quotes/priority.ts` | 30 min |
| `getSLAStatus()` | `lib/quotes/priority.ts` | 20 min |
| `generateIdempotencyKey()` | `lib/webhook-dedup.ts` | 15 min |
| `getBackoffDelay()` | `lib/webhook-dlq.ts` | 15 min |
| `quoteFormSchema` validation | `lib/validations/quote.ts` | 45 min |
| `contactFormSchema` validation | `lib/validations/contact.ts` | 20 min |
| `cn()` utility | `lib/utils.ts` | 10 min |

**Total Quick Win Time: ~5 hours**

---

## Recommended Test Stack

### Framework Selection

| Tool | Choice | Reason |
|------|--------|--------|
| Unit/Integration | **Vitest** | Native ESM, faster than Jest, TS support |
| Components | **@testing-library/react** | Best practices, accessibility |
| HTTP Mocking | **MSW** | Intercepts at network level |
| E2E | **Playwright** | Fast, reliable, multi-browser |
| Coverage | **@vitest/coverage-v8** | V8 native coverage |

### Why Vitest over Jest

1. **Native ESM Support** - Next.js 16 uses ESM, Jest struggles
2. **Faster Execution** - Up to 10x faster for large suites
3. **Compatible API** - Drop-in replacement, same syntax
4. **Built-in TypeScript** - No babel configuration
5. **Watch Mode** - Better DX with instant feedback

---

## Setup Commands

### 1. Install Dependencies

```bash
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom msw playwright @playwright/test
```

### 2. Create Configuration Files

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        '**/*.config.*',
        '.next'
      ],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70
      }
    },
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
```

**playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**tests/setup.ts:**
```typescript
import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'

// MSW server for API mocking
export const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
```

### 3. Add Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### 4. Create Directory Structure

```bash
mkdir -p tests/{unit,integration,e2e,fixtures,mocks}
```

### 5. Install Playwright Browsers

```bash
pnpm exec playwright install chromium
```

### 6. Update CI/CD

Add to `.github/workflows/ci.yml`:
```yaml
- name: Run tests
  run: pnpm test:run

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Install test infrastructure
- [ ] Create configs and setup files
- [ ] Write quick-win pure function tests
- [ ] **Target: 10% coverage**

### Phase 2: P0 Critical (Weeks 2-3)
- [ ] Auth module tests (50+ test cases)
- [ ] PortPro integration tests (40+ test cases)
- [ ] Webhook handler tests (30+ test cases)
- [ ] Validation schema tests (30+ test cases)
- [ ] **Target: 30% coverage**

### Phase 3: P1 Core Business (Weeks 4-5)
- [ ] API route tests (80+ test cases)
- [ ] Notification dispatcher tests (20+ test cases)
- [ ] Organization module tests (20+ test cases)
- [ ] **Target: 50% coverage**

### Phase 4: P2 Components (Weeks 6-7)
- [ ] Quote form component tests
- [ ] Admin component tests
- [ ] Hook tests
- [ ] **Target: 65% coverage**

### Phase 5: E2E (Week 8)
- [ ] Quote submission flow
- [ ] Admin quote management flow
- [ ] Customer tracking flow
- [ ] **Target: 70% coverage + critical E2E paths**

---

## Test File Structure

```
tests/
├── setup.ts
├── fixtures/
│   ├── quotes.ts          # Sample quote data
│   ├── loads.ts           # Sample load data
│   └── users.ts           # Sample user/profile data
├── mocks/
│   ├── handlers.ts        # MSW request handlers
│   ├── supabase.ts        # Supabase client mock
│   └── portpro.ts         # PortPro API mock
├── unit/
│   ├── lib/
│   │   ├── auth.test.ts
│   │   ├── portpro.test.ts
│   │   ├── validations/
│   │   │   └── quote.test.ts
│   │   └── quotes/
│   │       └── priority.test.ts
│   └── components/
│       └── quote-form.test.tsx
├── integration/
│   ├── api/
│   │   ├── quote.test.ts
│   │   ├── webhooks.test.ts
│   │   └── admin/
│   │       └── quotes.test.ts
│   └── hooks/
│       └── use-permissions.test.ts
└── e2e/
    ├── quote-flow.spec.ts
    ├── admin-quotes.spec.ts
    └── tracking.spec.ts
```

---

## Appendix: External Integration Testing

### Supabase

**Strategy:** Use real test database for integration tests, mock for unit tests.

```bash
# Start local Supabase for testing
supabase start
supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres
```

### PortPro

**Question:** Does PortPro provide sandbox/test environment?

If yes: Use sandbox for E2E tests
If no: Mock all PortPro calls with MSW

### Resend/Slack

**Strategy:** Mock in tests, verify calls were made with correct payload.

```typescript
// MSW handler example
http.post('https://api.resend.com/emails', () => {
  return HttpResponse.json({ id: 'test-email-id' })
})
```

---

## Conclusion

This project faces **critical risk** from zero test coverage. Recommended immediate actions:

1. **This week:** Install test infrastructure, write quick wins
2. **Next 2 weeks:** P0 critical module tests (auth, webhooks, validation)
3. **Month 1:** Reach 30% coverage on core business logic
4. **Month 2:** Reach 70% coverage with E2E critical paths

Estimated total effort: **6-8 weeks** for senior engineer to reach acceptable coverage.
