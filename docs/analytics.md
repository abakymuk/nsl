# Website analytics

Mixpanel project: New Stream Logistics (3977890), US region.

The public project ingestion token lives in `lib/analytics.ts`. It is intended for browser use and is not an API secret. Tracking runs only in production builds on newstreamlogistics.com / www.newstreamlogistics.com; preview and localhost visits are excluded.

## Events and metrics

| Event | Meaning |
| --- | --- |
| NSL: Page Viewed | Initial page or client-side route change; only known page paths |
| NSL: Quote CTA Clicked | Click on a link to the quote page; placement identifies navigation, footer, content or floating controls |
| NSL: Quote Form Viewed | Visit to /quote |
| NSL: Quote Form Started | First changed field, or first submission attempt, once per form mount |
| NSL: Quote Validation Failed | Client validation rejected the form; field names only |
| NSL: Quote Submit Attempted | Valid form sent to the API |
| NSL: Quote Submit Succeeded | API confirmed the quote was saved, before navigation; deterministic insert ID from the submission key |
| NSL: Quote Submit Failed | Failed API request: validation, rate_limit, conflict, server, network or timeout |
| NSL: Contact Clicked | Phone or email link clicked; not proof of a completed call/email |

Use `is_test = false` and `schema_version = 2` in all business reports, last 30 days by default.

Primary funnel: Quote Form Viewed → Quote Form Started → Quote Submit Attempted → Quote Submit Succeeded, unique users, 1-hour conversion window. Review its conversion and drop-off by device_type. A broader acquisition funnel begins with Page Viewed.

Operational metrics: daily successful quotes (total events), daily visitors (unique Page Viewed), failures by error_type, validation failures by invalid_fields, contact clicks by channel, and successful quotes' average duration_seconds. Source breakdown is a coarse direct/search/social/referral classification; no raw referring URLs or ad identifiers are collected.

Mixpanel tracks anonymous browser identities, not named customers. It cannot observe blocked analytics, completed calls/emails, Slack delivery, actual dispatcher response time, booked shipments or revenue. Saved quotes in the database remain the authoritative lead count. Reloading the thank-you page does not count another successful submission. There is no separate abandonment event; measure drop-off through the funnel.

## Privacy and reliability

No names, company names, emails, phone numbers, ZIP codes, container details, notes, quote references, complete URLs, query strings, or raw server errors are sent. Autocapture, session replay, heatmaps, automatic marketing capture and IP geolocation are disabled. A final property allowlist removes unexpected SDK defaults. Do Not Track and Global Privacy Control prevent initialization and event delivery. The SDK uses anonymous localStorage identity and its normal batching/retry mechanism; SDK failures cannot block the form.

## Verification

Visit a production URL with `?analytics_test=1` to mark all subsequent events in that browser tab as test traffic (the marker persists in sessionStorage across route changes). Use a fresh tab/session for normal traffic. Test form submissions must be explicitly labelled TEST ONLY; they still create a saved quote and Slack notification. Production browser events can be inspected in Mixpanel Events filtered to is_test = true. Do not send real customer details in analytics debugging payloads.
