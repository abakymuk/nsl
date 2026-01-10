import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// Create rate limiters only if Redis is configured
let quoteRateLimiter: Ratelimit | null = null;
let contactRateLimiter: Ratelimit | null = null;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

function getQuoteRateLimiter() {
  if (quoteRateLimiter) return quoteRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  quoteRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute
    analytics: true,
    prefix: "ratelimit:quote",
  });

  return quoteRateLimiter;
}

function getContactRateLimiter() {
  if (contactRateLimiter) return contactRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  contactRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 m"), // 3 requests per minute
    analytics: true,
    prefix: "ratelimit:contact",
  });

  return contactRateLimiter;
}

export type RateLimitType = "quote" | "contact";

export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType
): Promise<{ success: boolean; remaining?: number; reset?: number }> {
  const limiter = type === "quote" ? getQuoteRateLimiter() : getContactRateLimiter();

  // If no Redis configured, allow all requests (development mode)
  if (!limiter) {
    console.warn(`Rate limiting disabled: UPSTASH_REDIS not configured`);
    return { success: true };
  }

  // Get identifier: prefer IP, fallback to a header or generate one
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  const identifier = `${type}:${ip}`;

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // On error, allow the request but log it
    return { success: true };
  }
}

export function rateLimitResponse(reset?: number): NextResponse {
  const retryAfter = reset ? Math.ceil((reset - Date.now()) / 1000) : 60;

  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
