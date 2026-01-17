/**
 * Dead Letter Queue for failed PortPro webhooks
 * Uses Upstash Redis for storage with 7-day TTL
 */

import { Redis } from "@upstash/redis";

const DLQ_KEY = "portpro:dlq";
const DLQ_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const MAX_RETRIES = 5;

export interface DLQItem {
  id: string;
  eventType: string;
  payload: string;
  error: string;
  attempts: number;
  firstFailedAt: string;
  lastAttempt: string;
  nextRetryAt?: string;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

/**
 * Calculate exponential backoff delay
 * 1st retry: 1 min, 2nd: 5 min, 3rd: 15 min, 4th: 1 hour, 5th: 4 hours
 */
function getBackoffDelay(attempts: number): number {
  const delays = [60, 300, 900, 3600, 14400]; // seconds
  return delays[Math.min(attempts, delays.length - 1)] * 1000;
}

/**
 * Push a failed webhook to the dead letter queue
 */
export async function pushToDeadLetterQueue(
  eventType: string,
  payload: string,
  error: string
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    console.warn("DLQ: Redis not configured, cannot queue failed webhook");
    return false;
  }

  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const item: DLQItem = {
    id,
    eventType,
    payload,
    error,
    attempts: 1,
    firstFailedAt: now,
    lastAttempt: now,
    nextRetryAt: new Date(Date.now() + getBackoffDelay(1)).toISOString(),
  };

  try {
    // Store item with TTL
    await redis.hset(DLQ_KEY, { [id]: JSON.stringify(item) });
    await redis.expire(DLQ_KEY, DLQ_TTL);

    console.log(`DLQ: Queued failed webhook ${id} (${eventType})`);
    return true;
  } catch (err) {
    console.error("DLQ: Failed to queue webhook:", err);
    return false;
  }
}

/**
 * Get all items from the dead letter queue
 */
export async function getDeadLetterItems(limit?: number): Promise<DLQItem[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const items = await redis.hgetall<Record<string, string>>(DLQ_KEY);
    if (!items) return [];

    const parsed = Object.values(items)
      .map((item) => {
        try {
          return JSON.parse(item) as DLQItem;
        } catch {
          return null;
        }
      })
      .filter((item): item is DLQItem => item !== null)
      .sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime());

    return limit ? parsed.slice(0, limit) : parsed;
  } catch (err) {
    console.error("DLQ: Failed to fetch items:", err);
    return [];
  }
}

/**
 * Get items ready for retry (nextRetryAt has passed and attempts < MAX_RETRIES)
 */
export async function getItemsReadyForRetry(): Promise<DLQItem[]> {
  const items = await getDeadLetterItems();
  const now = Date.now();

  return items.filter((item) => {
    if (item.attempts >= MAX_RETRIES) return false;
    if (!item.nextRetryAt) return true;
    return new Date(item.nextRetryAt).getTime() <= now;
  });
}

/**
 * Update item after a retry attempt
 */
export async function updateRetryAttempt(
  id: string,
  success: boolean,
  error?: string
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    if (success) {
      // Remove from DLQ on success
      await redis.hdel(DLQ_KEY, id);
      console.log(`DLQ: Removed ${id} after successful retry`);
      return true;
    }

    // Get current item
    const itemStr = await redis.hget<string>(DLQ_KEY, id);
    if (!itemStr) return false;

    const item: DLQItem = JSON.parse(itemStr);
    item.attempts += 1;
    item.lastAttempt = new Date().toISOString();
    item.error = error || item.error;

    if (item.attempts >= MAX_RETRIES) {
      // Max retries reached - keep in DLQ for manual review
      item.nextRetryAt = undefined;
      console.warn(`DLQ: ${id} reached max retries (${MAX_RETRIES})`);
    } else {
      // Schedule next retry with backoff
      item.nextRetryAt = new Date(Date.now() + getBackoffDelay(item.attempts)).toISOString();
    }

    await redis.hset(DLQ_KEY, { [id]: JSON.stringify(item) });
    return true;
  } catch (err) {
    console.error("DLQ: Failed to update retry attempt:", err);
    return false;
  }
}

/**
 * Remove an item from the DLQ (manual removal)
 */
export async function removeFromDeadLetterQueue(id: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.hdel(DLQ_KEY, id);
    console.log(`DLQ: Manually removed ${id}`);
    return true;
  } catch (err) {
    console.error("DLQ: Failed to remove item:", err);
    return false;
  }
}

/**
 * Get DLQ statistics
 */
export async function getDeadLetterStats(): Promise<{
  count: number;
  byEventType: Record<string, number>;
  maxRetriesReached: number;
  oldestItem: string | null;
}> {
  const items = await getDeadLetterItems();

  const byEventType: Record<string, number> = {};
  let maxRetriesReached = 0;
  let oldestItem: string | null = null;
  let oldestTime = Infinity;

  for (const item of items) {
    byEventType[item.eventType] = (byEventType[item.eventType] || 0) + 1;

    if (item.attempts >= MAX_RETRIES) {
      maxRetriesReached++;
    }

    const itemTime = new Date(item.firstFailedAt).getTime();
    if (itemTime < oldestTime) {
      oldestTime = itemTime;
      oldestItem = item.firstFailedAt;
    }
  }

  return {
    count: items.length,
    byEventType,
    maxRetriesReached,
    oldestItem,
  };
}

/**
 * Check if DLQ size exceeds threshold (for alerting)
 */
export async function isDLQOverThreshold(threshold = 50): Promise<boolean> {
  const stats = await getDeadLetterStats();
  return stats.count >= threshold;
}
