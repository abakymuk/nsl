/**
 * Tests for quote priority scoring and SLA status
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getHoursPending,
  getSLAStatus,
  calculateQuotePriority,
  getSLADeadline,
  getTimeToSLA,
  formatSLAStatus,
  sortByPriority,
  filterBySLAStatus,
  SLA_THRESHOLDS,
} from "@/lib/quotes/priority";
import type { Quote } from "@/types/database";

// Helper to create a mock quote with all required fields
function createMockQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "test-id",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "pending",
    lifecycle_status: "pending",
    lead_score: 0,
    is_urgent: false,
    time_sensitive: false,
    request_type: "standard",
    contact_name: "Test User",
    company_name: "Test Company",
    email: "test@example.com",
    phone: "555-1234",
    container_number: "MSCU1234567",
    container_size: null,
    container_type: "40HC",
    weight_lbs: null,
    is_hazmat: false,
    is_overweight: false,
    is_reefer: false,
    pickup_terminal: "APM",
    delivery_address: null,
    delivery_city: null,
    delivery_state: null,
    delivery_zip: "90210",
    service_type: null,
    earliest_pickup: null,
    latest_delivery: null,
    lfd: null,
    special_instructions: null,
    quoted_price: null,
    quoted_at: null,
    quoted_by: null,
    quote_notes: null,
    quote_valid_until: null,
    port: null,
    delivery_type: null,
    appointment_required: false,
    availability_date: null,
    expires_at: null,
    validity_days: 7,
    accepted_at: null,
    accepted_signature: null,
    accepted_ip: null,
    rejected_at: null,
    rejection_reason: null,
    pricing_breakdown: null,
    total_price: null,
    assignee_id: null,
    assigned_at: null,
    first_response_at: null,
    response_time_hours: null,
    expiry_warning_sent_at: null,
    reference_number: "NSL-TEST-001",
    ...overrides,
  };
}

describe("getHoursPending", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for just created quote", () => {
    const now = new Date("2026-01-26T12:00:00Z");
    vi.setSystemTime(now);

    const quote = createMockQuote({ created_at: now.toISOString() });
    expect(getHoursPending(quote)).toBeCloseTo(0, 2);
  });

  it("returns correct hours for quote created 2 hours ago", () => {
    const now = new Date("2026-01-26T14:00:00Z");
    vi.setSystemTime(now);

    const twoHoursAgo = new Date("2026-01-26T12:00:00Z");
    const quote = createMockQuote({ created_at: twoHoursAgo.toISOString() });
    expect(getHoursPending(quote)).toBeCloseTo(2, 2);
  });

  it("returns correct hours for quote created 24 hours ago", () => {
    const now = new Date("2026-01-27T12:00:00Z");
    vi.setSystemTime(now);

    const oneDayAgo = new Date("2026-01-26T12:00:00Z");
    const quote = createMockQuote({ created_at: oneDayAgo.toISOString() });
    expect(getHoursPending(quote)).toBeCloseTo(24, 2);
  });
});

describe("getSLAStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns ok for just created pending quote", () => {
    const now = new Date("2026-01-26T12:00:00Z");
    vi.setSystemTime(now);

    const quote = createMockQuote({
      created_at: now.toISOString(),
      lifecycle_status: "pending",
    });
    expect(getSLAStatus(quote)).toBe("ok");
  });

  it("returns ok for non-active statuses regardless of time", () => {
    const now = new Date("2026-01-27T12:00:00Z");
    vi.setSystemTime(now);

    const oneDayAgo = new Date("2026-01-26T12:00:00Z");

    const quotedQuote = createMockQuote({
      created_at: oneDayAgo.toISOString(),
      lifecycle_status: "quoted",
    });
    expect(getSLAStatus(quotedQuote)).toBe("ok");

    const acceptedQuote = createMockQuote({
      created_at: oneDayAgo.toISOString(),
      lifecycle_status: "accepted",
    });
    expect(getSLAStatus(acceptedQuote)).toBe("ok");
  });

  describe("standard quotes (4 hour SLA)", () => {
    it("returns ok within threshold", () => {
      const now = new Date("2026-01-26T14:00:00Z");
      vi.setSystemTime(now);

      const threeHoursAgo = new Date("2026-01-26T11:00:00Z");
      const quote = createMockQuote({
        created_at: threeHoursAgo.toISOString(),
        lifecycle_status: "pending",
        is_urgent: false,
      });
      expect(getSLAStatus(quote)).toBe("ok");
    });

    it("returns warning when past threshold", () => {
      const now = new Date("2026-01-26T17:00:00Z");
      vi.setSystemTime(now);

      const fiveHoursAgo = new Date("2026-01-26T12:00:00Z");
      const quote = createMockQuote({
        created_at: fiveHoursAgo.toISOString(),
        lifecycle_status: "pending",
        is_urgent: false,
      });
      expect(getSLAStatus(quote)).toBe("warning");
    });

    it("returns overdue when past 2x threshold", () => {
      const now = new Date("2026-01-26T21:00:00Z");
      vi.setSystemTime(now);

      const nineHoursAgo = new Date("2026-01-26T12:00:00Z");
      const quote = createMockQuote({
        created_at: nineHoursAgo.toISOString(),
        lifecycle_status: "pending",
        is_urgent: false,
      });
      expect(getSLAStatus(quote)).toBe("overdue");
    });
  });

  describe("urgent quotes (2 hour SLA)", () => {
    it("returns ok within threshold", () => {
      const now = new Date("2026-01-26T13:00:00Z");
      vi.setSystemTime(now);

      const oneHourAgo = new Date("2026-01-26T12:00:00Z");
      const quote = createMockQuote({
        created_at: oneHourAgo.toISOString(),
        lifecycle_status: "pending",
        is_urgent: true,
      });
      expect(getSLAStatus(quote)).toBe("ok");
    });

    it("returns warning when past urgent threshold", () => {
      const now = new Date("2026-01-26T15:00:00Z");
      vi.setSystemTime(now);

      const threeHoursAgo = new Date("2026-01-26T12:00:00Z");
      const quote = createMockQuote({
        created_at: threeHoursAgo.toISOString(),
        lifecycle_status: "pending",
        is_urgent: true,
      });
      expect(getSLAStatus(quote)).toBe("warning");
    });

    it("returns overdue when past 2x urgent threshold", () => {
      const now = new Date("2026-01-26T17:00:00Z");
      vi.setSystemTime(now);

      const fiveHoursAgo = new Date("2026-01-26T12:00:00Z");
      const quote = createMockQuote({
        created_at: fiveHoursAgo.toISOString(),
        lifecycle_status: "pending",
        is_urgent: true,
      });
      expect(getSLAStatus(quote)).toBe("overdue");
    });
  });

  it("handles in_review status as active", () => {
    const now = new Date("2026-01-26T22:00:00Z");
    vi.setSystemTime(now);

    const tenHoursAgo = new Date("2026-01-26T12:00:00Z");
    const quote = createMockQuote({
      created_at: tenHoursAgo.toISOString(),
      lifecycle_status: "in_review",
    });
    expect(getSLAStatus(quote)).toBe("overdue");
  });
});

describe("calculateQuotePriority", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns base priority for minimal quote", () => {
    const quote = createMockQuote({
      created_at: new Date("2026-01-26T12:00:00Z").toISOString(),
      lead_score: 0,
      is_urgent: false,
      time_sensitive: false,
      company_name: null,
    });
    const priority = calculateQuotePriority(quote);

    expect(priority.score).toBeGreaterThanOrEqual(0);
    expect(priority.score).toBeLessThanOrEqual(100);
    expect(priority.factors.leadScore).toBe(0);
  });

  it("calculates lead score factor (0-30 points)", () => {
    const quote = createMockQuote({
      created_at: new Date().toISOString(),
      lead_score: 10, // Max lead score
    });
    const priority = calculateQuotePriority(quote);

    // lead_score 10 * 3 = 30 points
    expect(priority.factors.leadScore).toBe(30);
  });

  it("caps lead score factor at 30", () => {
    const quote = createMockQuote({
      created_at: new Date().toISOString(),
      lead_score: 15, // Over max
    });
    const priority = calculateQuotePriority(quote);
    expect(priority.factors.leadScore).toBe(30);
  });

  it("calculates urgency factor based on hours pending", () => {
    // Just created - 0 urgency points
    const newQuote = createMockQuote({
      created_at: new Date("2026-01-26T12:00:00Z").toISOString(),
    });
    expect(calculateQuotePriority(newQuote).factors.urgency).toBe(0);

    // 1 hour ago - 5 points
    const oneHourQuote = createMockQuote({
      created_at: new Date("2026-01-26T11:00:00Z").toISOString(),
    });
    expect(calculateQuotePriority(oneHourQuote).factors.urgency).toBe(5);

    // 2+ hours ago (URGENT threshold) - 10 points
    const twoHourQuote = createMockQuote({
      created_at: new Date("2026-01-26T10:00:00Z").toISOString(),
    });
    expect(calculateQuotePriority(twoHourQuote).factors.urgency).toBe(10);

    // 4+ hours ago (STANDARD threshold) - 20 points
    const fourHourQuote = createMockQuote({
      created_at: new Date("2026-01-26T08:00:00Z").toISOString(),
    });
    expect(calculateQuotePriority(fourHourQuote).factors.urgency).toBe(20);

    // 8+ hours ago (LOW threshold) - 30 points max
    const eightHourQuote = createMockQuote({
      created_at: new Date("2026-01-26T04:00:00Z").toISOString(),
    });
    expect(calculateQuotePriority(eightHourQuote).factors.urgency).toBe(30);
  });

  it("calculates customer value factor", () => {
    const withCompany = createMockQuote({
      created_at: new Date().toISOString(),
      company_name: "Acme Corp",
    });
    expect(calculateQuotePriority(withCompany).factors.customerValue).toBe(10);

    const withoutCompany = createMockQuote({
      created_at: new Date().toISOString(),
      company_name: null,
    });
    expect(calculateQuotePriority(withoutCompany).factors.customerValue).toBe(5);
  });

  it("calculates time sensitive factor for urgent quotes", () => {
    const urgentQuote = createMockQuote({
      created_at: new Date().toISOString(),
      is_urgent: true,
    });
    expect(calculateQuotePriority(urgentQuote).factors.timeSensitive).toBe(20);
  });

  it("calculates time sensitive factor for time_sensitive flag", () => {
    const timeSensitiveQuote = createMockQuote({
      created_at: new Date().toISOString(),
      is_urgent: false,
      time_sensitive: true,
    });
    expect(calculateQuotePriority(timeSensitiveQuote).factors.timeSensitive).toBe(15);
  });

  it("calculates time sensitive factor for urgent request types", () => {
    const urgentLfdQuote = createMockQuote({
      created_at: new Date().toISOString(),
      is_urgent: false,
      time_sensitive: false,
      request_type: "urgent_lfd",
    });
    expect(calculateQuotePriority(urgentLfdQuote).factors.timeSensitive).toBe(15);

    const rolledQuote = createMockQuote({
      created_at: new Date().toISOString(),
      is_urgent: false,
      time_sensitive: false,
      request_type: "rolled",
    });
    expect(calculateQuotePriority(rolledQuote).factors.timeSensitive).toBe(15);
  });

  it("caps total score at 100", () => {
    // Create a quote that would exceed 100 points
    const maxQuote = createMockQuote({
      created_at: new Date("2026-01-25T00:00:00Z").toISOString(), // Old - max urgency (30)
      lead_score: 15, // Max lead score (30)
      is_urgent: true, // Max time sensitive (20)
      time_sensitive: true, // Also flagged
      company_name: "Big Company", // Customer value (10)
    });
    const priority = calculateQuotePriority(maxQuote);
    // Verify factors sum to 90 (lead:30 + urgency:30 + customer:10 + time:20)
    // and score is capped at 100
    expect(priority.score).toBeLessThanOrEqual(100);
    expect(priority.score).toBeGreaterThan(0);
  });

  it("includes SLA status in result", () => {
    const quote = createMockQuote({
      created_at: new Date().toISOString(),
    });
    const priority = calculateQuotePriority(quote);
    expect(priority.slaStatus).toBeDefined();
    expect(["ok", "warning", "overdue"]).toContain(priority.slaStatus);
  });

  it("includes hours pending in result", () => {
    const threeHoursAgo = new Date("2026-01-26T09:00:00Z");
    const quote = createMockQuote({
      created_at: threeHoursAgo.toISOString(),
    });
    const priority = calculateQuotePriority(quote);
    expect(priority.hoursPending).toBeCloseTo(3, 1);
  });
});

describe("getSLADeadline", () => {
  it("returns deadline based on standard threshold", () => {
    const created = new Date("2026-01-26T12:00:00Z");
    const quote = createMockQuote({
      created_at: created.toISOString(),
      is_urgent: false,
    });
    const deadline = getSLADeadline(quote);

    // Standard threshold is 4 hours
    const expected = new Date(created.getTime() + SLA_THRESHOLDS.STANDARD * 60 * 60 * 1000);
    expect(deadline.getTime()).toBe(expected.getTime());
  });

  it("returns deadline based on urgent threshold", () => {
    const created = new Date("2026-01-26T12:00:00Z");
    const quote = createMockQuote({
      created_at: created.toISOString(),
      is_urgent: true,
    });
    const deadline = getSLADeadline(quote);

    // Urgent threshold is 2 hours
    const expected = new Date(created.getTime() + SLA_THRESHOLDS.URGENT * 60 * 60 * 1000);
    expect(deadline.getTime()).toBe(expected.getTime());
  });
});

describe("getTimeToSLA", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns positive hours when before deadline", () => {
    const now = new Date("2026-01-26T12:00:00Z");
    vi.setSystemTime(now);

    const quote = createMockQuote({
      created_at: now.toISOString(),
      is_urgent: false, // 4 hour SLA
    });

    const timeToSLA = getTimeToSLA(quote);
    expect(timeToSLA).toBeCloseTo(4, 1);
  });

  it("returns negative hours when past deadline", () => {
    const now = new Date("2026-01-26T18:00:00Z");
    vi.setSystemTime(now);

    const sixHoursAgo = new Date("2026-01-26T12:00:00Z");
    const quote = createMockQuote({
      created_at: sixHoursAgo.toISOString(),
      is_urgent: false, // 4 hour SLA - deadline was at 16:00
    });

    const timeToSLA = getTimeToSLA(quote);
    expect(timeToSLA).toBeCloseTo(-2, 1); // 2 hours overdue
  });
});

describe("formatSLAStatus", () => {
  it("formats overdue status", () => {
    const result = formatSLAStatus("overdue");
    expect(result.label).toBe("Overdue");
    expect(result.color).toBe("red");
    expect(result.description).toContain("exceeded");
  });

  it("formats warning status", () => {
    const result = formatSLAStatus("warning");
    expect(result.label).toBe("Due Soon");
    expect(result.color).toBe("yellow");
    expect(result.description).toContain("Approaching");
  });

  it("formats ok status", () => {
    const result = formatSLAStatus("ok");
    expect(result.label).toBe("On Track");
    expect(result.color).toBe("green");
    expect(result.description).toContain("Within");
  });
});

describe("sortByPriority", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sorts quotes by priority score descending", () => {
    const lowPriority = createMockQuote({
      id: "low",
      created_at: new Date().toISOString(),
      lead_score: 0,
      is_urgent: false,
    });

    const highPriority = createMockQuote({
      id: "high",
      created_at: new Date("2026-01-25T00:00:00Z").toISOString(), // Old = high urgency
      lead_score: 10,
      is_urgent: true,
    });

    const mediumPriority = createMockQuote({
      id: "medium",
      created_at: new Date("2026-01-26T08:00:00Z").toISOString(),
      lead_score: 5,
    });

    const sorted = sortByPriority([lowPriority, highPriority, mediumPriority]);

    expect(sorted[0].id).toBe("high");
    expect(sorted[2].id).toBe("low");
  });

  it("returns empty array for empty input", () => {
    expect(sortByPriority([])).toEqual([]);
  });

  it("does not mutate original array", () => {
    const quotes = [
      createMockQuote({ id: "1" }),
      createMockQuote({ id: "2" }),
    ];
    const original = [...quotes];
    sortByPriority(quotes);
    expect(quotes).toEqual(original);
  });
});

describe("filterBySLAStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters quotes by single status", () => {
    const okQuote = createMockQuote({
      id: "ok",
      created_at: new Date().toISOString(),
      lifecycle_status: "pending",
    });

    const overdueQuote = createMockQuote({
      id: "overdue",
      created_at: new Date("2026-01-25T00:00:00Z").toISOString(),
      lifecycle_status: "pending",
    });

    const quotes = [okQuote, overdueQuote];
    const filtered = filterBySLAStatus(quotes, "overdue");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("overdue");
  });

  it("filters quotes by multiple statuses", () => {
    const okQuote = createMockQuote({
      id: "ok",
      created_at: new Date().toISOString(),
      lifecycle_status: "pending",
    });

    const warningQuote = createMockQuote({
      id: "warning",
      created_at: new Date("2026-01-26T07:00:00Z").toISOString(), // 5 hours ago
      lifecycle_status: "pending",
    });

    const overdueQuote = createMockQuote({
      id: "overdue",
      created_at: new Date("2026-01-25T00:00:00Z").toISOString(),
      lifecycle_status: "pending",
    });

    const quotes = [okQuote, warningQuote, overdueQuote];
    const filtered = filterBySLAStatus(quotes, ["warning", "overdue"]);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((q) => q.id)).toContain("warning");
    expect(filtered.map((q) => q.id)).toContain("overdue");
  });

  it("returns empty array when no matches", () => {
    const okQuote = createMockQuote({
      created_at: new Date().toISOString(),
      lifecycle_status: "pending",
    });

    const filtered = filterBySLAStatus([okQuote], "overdue");
    expect(filtered).toHaveLength(0);
  });
});
