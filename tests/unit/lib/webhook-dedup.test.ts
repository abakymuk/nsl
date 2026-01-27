/**
 * Tests for webhook deduplication - pure functions
 */
import { describe, it, expect } from "vitest";
import { generateIdempotencyKey } from "@/lib/webhook-dedup";

describe("generateIdempotencyKey", () => {
  it("generates key from all parameters", () => {
    const key = generateIdempotencyKey(
      "load#status_updated",
      "REF-123",
      "2026-01-26T10:00:00Z"
    );
    // # gets replaced with _, : is preserved by regex [^a-zA-Z0-9:_-]
    expect(key).toBe("load_status_updated:REF-123:2026-01-26T10:00:00Z");
  });

  it("handles undefined reference number", () => {
    const key = generateIdempotencyKey(
      "load#created",
      undefined,
      "2026-01-26T10:00:00Z"
    );
    expect(key).toBe("load_created:unknown:2026-01-26T10:00:00Z");
  });

  it("handles undefined timestamp", () => {
    const key = generateIdempotencyKey(
      "load#created",
      "REF-456",
      undefined
    );
    expect(key).toBe("load_created:REF-456:");
  });

  it("handles both undefined reference and timestamp", () => {
    const key = generateIdempotencyKey(
      "document#pod_added",
      undefined,
      undefined
    );
    expect(key).toBe("document_pod_added:unknown:");
  });

  it("sanitizes special characters", () => {
    const key = generateIdempotencyKey(
      "load#status_updated",
      "REF/123+test",
      "2026-01-26T10:00:00.123Z"
    );
    // Special chars replaced with underscore
    expect(key).not.toContain("/");
    expect(key).not.toContain("+");
    expect(key).not.toContain(".");
    expect(key).not.toContain("#");
    expect(key).toMatch(/^[a-zA-Z0-9:_-]+$/);
  });

  it("preserves colons as delimiters", () => {
    const key = generateIdempotencyKey("event", "ref", "ts");
    expect(key.split(":").length).toBe(3);
  });

  it("preserves hyphens and underscores in reference", () => {
    const key = generateIdempotencyKey(
      "load#created",
      "REF-123_ABC",
      "2026-01-26"
    );
    expect(key).toContain("REF-123_ABC");
  });

  it("generates consistent keys for same input", () => {
    const input = {
      eventType: "load#info_updated",
      ref: "REF-789",
      ts: "2026-01-26T12:30:00Z",
    };
    const key1 = generateIdempotencyKey(input.eventType, input.ref, input.ts);
    const key2 = generateIdempotencyKey(input.eventType, input.ref, input.ts);
    expect(key1).toBe(key2);
  });

  it("generates different keys for different events", () => {
    const key1 = generateIdempotencyKey("load#created", "REF-123", "ts");
    const key2 = generateIdempotencyKey("load#status_updated", "REF-123", "ts");
    expect(key1).not.toBe(key2);
  });

  it("generates different keys for different references", () => {
    const key1 = generateIdempotencyKey("load#created", "REF-123", "ts");
    const key2 = generateIdempotencyKey("load#created", "REF-456", "ts");
    expect(key1).not.toBe(key2);
  });

  it("generates different keys for different timestamps", () => {
    const key1 = generateIdempotencyKey("load#created", "REF-123", "2026-01-26T10:00:00Z");
    const key2 = generateIdempotencyKey("load#created", "REF-123", "2026-01-26T11:00:00Z");
    expect(key1).not.toBe(key2);
  });

  it("handles empty string event type", () => {
    const key = generateIdempotencyKey("", "REF-123", "ts");
    expect(key).toBe(":REF-123:ts");
  });

  it("handles all document event types and sanitizes #", () => {
    const docEvents = [
      "document#pod_added",
      "document#tir_in_added",
      "document#tir_out_added",
      "document#delivery_order_added",
      "document#invoice_added",
    ];

    for (const event of docEvents) {
      const key = generateIdempotencyKey(event, "REF-001", "ts");
      // # is replaced with _, so check for sanitized version
      const sanitizedEvent = event.replace("#", "_");
      expect(key).toContain(sanitizedEvent);
    }
  });

  it("handles all load event types and sanitizes #", () => {
    const loadEvents = [
      "load#created",
      "load#info_updated",
      "load#dates_updated",
      "load#equipment_updated",
      "load#reference_updated",
      "load#hold_updated",
      "load#routing_update",
      "load#status_updated",
    ];

    for (const event of loadEvents) {
      const key = generateIdempotencyKey(event, "REF-001", "ts");
      // # is replaced with _
      const sanitizedEvent = event.replace("#", "_");
      expect(key).toContain(sanitizedEvent);
    }
  });
});
