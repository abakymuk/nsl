"use client";

import type { Config, Mixpanel } from "mixpanel-browser";

// Public ingestion token, not an API secret. Project 3977890, US residency.
const PROJECT_TOKEN = "9d4d60016566185a21bb67d818849b18";
export const EVENTS = [
  "NSL: Page Viewed", "NSL: Quote CTA Clicked", "NSL: Contact Clicked",
  "NSL: Quote Form Viewed", "NSL: Quote Form Started", "NSL: Quote Validation Failed",
  "NSL: Quote Submit Attempted", "NSL: Quote Submit Succeeded", "NSL: Quote Submit Failed",
] as const;
type EventName = typeof EVENTS[number];
type EventProperties = {
  page?: string;
  placement?: "navigation" | "footer" | "content" | "floating";
  channel?: "phone" | "email";
  port?: "la" | "lb";
  invalid_fields?: string[];
  error_type?: "validation" | "rate_limit" | "conflict" | "server" | "network" | "timeout";
  duration_seconds?: number;
  $insert_id?: string;
};
const PAGES = new Set(["/", "/services", "/process", "/compliance", "/about", "/contact", "/quote", "/quote/thank-you"]);
const ALLOWED_PROPERTIES = new Set([
  "token", "time", "distinct_id", "$device_id", "$insert_id", "mp_lib", "$lib_version",
  "$browser", "$browser_version", "$os", "page", "placement", "channel", "port",
  "invalid_fields", "error_type", "duration_seconds", "device_type", "traffic_source",
  "schema_version", "is_test",
]);
let client: Promise<Mixpanel> | undefined;
let testSession = false;

function isTestSession() {
  testSession ||= new URLSearchParams(window.location.search).get("analytics_test") === "1";
  try {
    testSession ||= sessionStorage.getItem("nsl_analytics_test") === "1";
    if (testSession) sessionStorage.setItem("nsl_analytics_test", "1");
  } catch { /* In-memory flag still protects tests with storage disabled. */ }
  return testSession;
}

export function analyticsAllowed() {
  return typeof window !== "undefined" && process.env.NODE_ENV === "production"
    && ["www.newstreamlogistics.com", "newstreamlogistics.com"].includes(window.location.hostname)
    && navigator.doNotTrack !== "1"
    && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
}

export function safePage(path: string) {
  const page = path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  return PAGES.has(page) ? page : "other";
}

export function trafficSource(referrer: string) {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname;
    if (host === "newstreamlogistics.com" || host === "www.newstreamlogistics.com") return "internal";
    if (/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com)$/.test(host)) return "search";
    if (/(^|\.)(facebook\.com|instagram\.com|linkedin\.com|t\.co|x\.com)$/.test(host)) return "social";
    return "referral";
  } catch { return "direct"; }
}

// Final allowlist also strips SDK defaults such as full URLs, query strings,
// referrers and old super-properties persisted by an earlier integration.
export function filterEvent(payload: { event: string; properties: Record<string, unknown> }) {
  if (!analyticsAllowed() || !EVENTS.includes(payload.event as EventName)) return null;
  return { event: payload.event, properties: Object.fromEntries(
    Object.entries(payload.properties).filter(([key]) => ALLOWED_PROPERTIES.has(key)),
  ) };
}

function getClient() {
  client ??= import("mixpanel-browser").then(({ default: mixpanel }) => {
    // track_marketing is supported by the SDK but missing from its bundled types.
    const config: Partial<Config> & { track_marketing: boolean } = {
      api_host: "https://api-js.mixpanel.com",
      persistence: "localStorage", persistence_name: "nsl_website_v2",
      autocapture: false, track_pageview: false, track_marketing: false,
      store_google: false, stop_utm_persistence: true, save_referrer: false,
      record_sessions_percent: 0, record_heatmap_data: false, record_console: false,
      ip: false, ignore_dnt: false, batch_flush_interval_ms: 2000,
      hooks: { before_send_events: filterEvent },
    };
    mixpanel.init(PROJECT_TOKEN, config);
    return mixpanel;
  }).catch(error => { client = undefined; throw error; });
  return client;
}

export function track(event: EventName, properties: EventProperties = {}) {
  // Tracking is always best effort and must never interrupt navigation or a quote.
  try {
    if (!analyticsAllowed()) return;
    const context = {
      ...properties,
      page: safePage(properties.page ?? window.location.pathname),
      device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
      traffic_source: trafficSource(document.referrer), schema_version: 2,
      is_test: isTestSession(),
    };
    void getClient().then(mixpanel => {
      if (analyticsAllowed()) mixpanel.track(event, context);
    }).catch(() => { /* Analytics failure must not affect the site. */ });
  } catch { /* Includes restricted browser storage and unavailable browser APIs. */ }
}
