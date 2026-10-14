import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { analyticsAllowed, filterEvent, safePage, trafficSource } from "@/lib/analytics";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubGlobal("window", { location: { hostname: "www.newstreamlogistics.com" } });
  vi.stubGlobal("navigator", { doNotTrack: "0", globalPrivacyControl: false });
});
afterEach(() => { vi.unstubAllGlobals(); vi.stubEnv("NODE_ENV", "test"); });

describe("analytics privacy boundary", () => {
  it("removes customer data, full URLs, referrers and unknown SDK properties", () => {
    const result = filterEvent({ event: "NSL: Quote Submit Succeeded", properties: {
      token: "public-token", distinct_id: "anonymous-device", page: "/quote", port: "la",
      $current_url: "https://site/quote?email=private@example.com", $referrer: "https://private/path",
      email: "private@example.com", phone: "5551234567", notes: "private shipment", referenceNumber: "NSL-123",
      $initial_referrer: "https://private/path", utm_campaign: "private@example.com", arbitrary: "secret",
    } });
    expect(result?.properties).toEqual({ token: "public-token", distinct_id: "anonymous-device", page: "/quote", port: "la" });
  });
  it("blocks unknown or automatically captured events", () => {
    expect(filterEvent({ event: "$mp_click", properties: {} })).toBeNull();
  });
  it.each([{ doNotTrack: "1" }, { globalPrivacyControl: true }])("respects browser privacy signal %j", privacy => {
    vi.stubGlobal("navigator", privacy);
    expect(analyticsAllowed()).toBe(false);
    expect(filterEvent({ event: "NSL: Page Viewed", properties: {} })).toBeNull();
  });
  it("does not send development or preview activity to production analytics", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(analyticsAllowed()).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("window", { location: { hostname: "preview.vercel.app" } });
    expect(analyticsAllowed()).toBe(false);
  });
  it("drops query strings, fragments and unknown paths", () => {
    expect(safePage("/quote/thank-you?ref=NSL-123#secret")).toBe("/quote/thank-you");
    expect(safePage("/customer/private@example.com")).toBe("other");
  });
  it("classifies acquisition without sending referring URLs", () => {
    expect(trafficSource("https://www.google.com/search?q=private")).toBe("search");
    expect(trafficSource("https://www.linkedin.com/private")).toBe("social");
    expect(trafficSource("https://customer.example/private")).toBe("referral");
    expect(trafficSource("")).toBe("direct");
  });
});
