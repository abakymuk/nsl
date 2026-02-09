/**
 * Tests for webhook deduplication
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateIdempotencyKey,
  isDuplicateEvent,
  markEventProcessed,
  removeEventMarker,
  getDedupStats,
} from "@/lib/webhook-dedup";

// Mock @upstash/redis
const mockExists = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();
const mockTtl = vi.fn();

vi.mock("@upstash/redis", () => {
  return {
    Redis: class MockRedis {
      exists = mockExists;
      set = mockSet;
      del = mockDel;
      keys = mockKeys;
      ttl = mockTtl;
    },
  };
});

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
    // Note: produces key starting with ":", which means the Redis key will have
    // a double colon ("portpro:dedup::REF-123:ts"). This is valid but unusual.
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

describe("dedup lifecycle (Redis-backed)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure Redis env vars are set so getRedis() returns a client
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake-redis.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
  });

  describe("isDuplicateEvent", () => {
    it("returns false when key does not exist", async () => {
      mockExists.mockResolvedValue(0);
      const result = await isDuplicateEvent("test-key");
      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith("portpro:dedup:test-key");
    });

    it("returns true when key already exists", async () => {
      mockExists.mockResolvedValue(1);
      const result = await isDuplicateEvent("test-key");
      expect(result).toBe(true);
    });

    it("fails open on Redis error", async () => {
      mockExists.mockRejectedValue(new Error("Redis connection failed"));
      const result = await isDuplicateEvent("test-key");
      expect(result).toBe(false);
    });
  });

  describe("markEventProcessed", () => {
    it("sets key with TTL and returns true", async () => {
      mockSet.mockResolvedValue("OK");
      const result = await markEventProcessed("test-key");
      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        "portpro:dedup:test-key",
        expect.any(String),
        { ex: 86400 }
      );
    });

    it("returns false on Redis error", async () => {
      mockSet.mockRejectedValue(new Error("Redis write failed"));
      const result = await markEventProcessed("test-key");
      expect(result).toBe(false);
    });
  });

  describe("removeEventMarker", () => {
    it("deletes key and returns true", async () => {
      mockDel.mockResolvedValue(1);
      const result = await removeEventMarker("test-key");
      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith("portpro:dedup:test-key");
    });

    it("returns false on Redis error", async () => {
      mockDel.mockRejectedValue(new Error("Redis delete failed"));
      const result = await removeEventMarker("test-key");
      expect(result).toBe(false);
    });
  });

  describe("getDedupStats", () => {
    it("returns key count from Redis", async () => {
      mockKeys.mockResolvedValue(["portpro:dedup:k1", "portpro:dedup:k2"]);
      const stats = await getDedupStats();
      expect(stats).toEqual({ configured: true, keyCount: 2 });
    });

    it("returns zero on Redis error", async () => {
      mockKeys.mockRejectedValue(new Error("Redis scan failed"));
      const stats = await getDedupStats();
      expect(stats).toEqual({ configured: true, keyCount: 0 });
    });
  });

  describe("full dedup lifecycle", () => {
    it("first event is not duplicate, second is", async () => {
      // First check: key doesn't exist
      mockExists.mockResolvedValueOnce(0);
      expect(await isDuplicateEvent("event-1")).toBe(false);

      // Mark as processed
      mockSet.mockResolvedValueOnce("OK");
      expect(await markEventProcessed("event-1")).toBe(true);

      // Second check: key now exists
      mockExists.mockResolvedValueOnce(1);
      expect(await isDuplicateEvent("event-1")).toBe(true);
    });

    it("removing marker allows reprocessing", async () => {
      // Key exists (duplicate)
      mockExists.mockResolvedValueOnce(1);
      expect(await isDuplicateEvent("event-1")).toBe(true);

      // Remove marker
      mockDel.mockResolvedValueOnce(1);
      expect(await removeEventMarker("event-1")).toBe(true);

      // Key no longer exists
      mockExists.mockResolvedValueOnce(0);
      expect(await isDuplicateEvent("event-1")).toBe(false);
    });
  });
});
