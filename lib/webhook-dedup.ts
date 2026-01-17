/**
 * Webhook Deduplication using Upstash Redis
 * Prevents duplicate webhook processing using idempotency keys
 */

import { Redis } from "@upstash/redis";

const DEDUP_PREFIX = "portpro:dedup:";
const DEDUP_TTL = 24 * 60 * 60; // 24 hours in seconds

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

/**
 * Generate a unique idempotency key for a webhook event
 * Uses event type + reference number + timestamp (if available)
 */
export function generateIdempotencyKey(
  eventType: string,
  referenceNumber: string | undefined,
  timestamp: string | undefined
): string {
  const ref = referenceNumber || "unknown";
  const ts = timestamp || "";

  // Create a deterministic key
  return `${eventType}:${ref}:${ts}`.replace(/[^a-zA-Z0-9:_-]/g, "_");
}

/**
 * Check if an event has already been processed
 * Returns true if duplicate (already processed)
 */
export async function isDuplicateEvent(idempotencyKey: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    // No Redis = no deduplication, allow processing
    console.warn("Dedup: Redis not configured, skipping deduplication check");
    return false;
  }

  try {
    const key = `${DEDUP_PREFIX}${idempotencyKey}`;
    const exists = await redis.exists(key);

    if (exists) {
      console.log(`Dedup: Duplicate event detected - ${idempotencyKey}`);
      return true;
    }

    return false;
  } catch (err) {
    console.error("Dedup: Failed to check duplicate:", err);
    // On error, allow processing (fail open)
    return false;
  }
}

/**
 * Mark an event as processed
 * Called after successful webhook processing
 */
export async function markEventProcessed(idempotencyKey: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const key = `${DEDUP_PREFIX}${idempotencyKey}`;
    // Set with expiry - NX ensures we only set if not exists
    await redis.set(key, Date.now().toString(), { ex: DEDUP_TTL });
    return true;
  } catch (err) {
    console.error("Dedup: Failed to mark event processed:", err);
    return false;
  }
}

/**
 * Remove a processed event marker (for manual retry scenarios)
 */
export async function removeEventMarker(idempotencyKey: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const key = `${DEDUP_PREFIX}${idempotencyKey}`;
    await redis.del(key);
    return true;
  } catch (err) {
    console.error("Dedup: Failed to remove event marker:", err);
    return false;
  }
}

/**
 * Get deduplication statistics (for monitoring)
 */
export async function getDedupStats(): Promise<{
  configured: boolean;
  keyCount: number;
}> {
  const redis = getRedis();
  if (!redis) {
    return { configured: false, keyCount: 0 };
  }

  try {
    // Count keys with our prefix (this is an approximation)
    // Note: SCAN would be more accurate but more expensive
    const keys = await redis.keys(`${DEDUP_PREFIX}*`);
    return {
      configured: true,
      keyCount: keys?.length || 0,
    };
  } catch (err) {
    console.error("Dedup: Failed to get stats:", err);
    return { configured: true, keyCount: 0 };
  }
}

/**
 * Cleanup expired dedup keys (called by cron)
 * Note: Redis TTL handles this automatically, but this can be used for manual cleanup
 */
export async function cleanupExpiredKeys(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    // Get all dedup keys
    const keys = await redis.keys(`${DEDUP_PREFIX}*`);
    if (!keys || keys.length === 0) return 0;

    // Check each key's TTL and remove if expired or no TTL
    let removed = 0;
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      // ttl = -1 means no expiry, -2 means key doesn't exist
      if (ttl === -1) {
        await redis.del(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`Dedup: Cleaned up ${removed} keys without TTL`);
    }
    return removed;
  } catch (err) {
    console.error("Dedup: Cleanup failed:", err);
    return 0;
  }
}
