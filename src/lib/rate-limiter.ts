import Redis from "ioredis";
import { logger } from "./logger";

const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const MAX_REQUESTS = 20; // Maximum requests per window

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

// Configure Redis with TLS for Upstash in production
const redis = new Redis(process.env.REDIS_URL, {
  tls: process.env.NODE_ENV === "production" ? {} : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    logger.info("Redis retry", { times, delay });
    return delay;
  },
});

redis.on("error", (error) => {
  logger.error("Redis connection error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });
});

redis.on("connect", () => {
  logger.info("Redis connected successfully");
});

export interface RateLimitInfo {
  isAllowed: boolean;
  timeToReset: number;
  remaining?: number;
}

export async function getRateLimitInfo(ip: string): Promise<RateLimitInfo> {
  const key = `rate_limit:${ip}`;

  try {
    // Get the current count
    const count = await redis.incr(key);

    // If this is the first request, set expiry
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    // Get TTL
    const ttl = await redis.ttl(key);
    const timeToReset = ttl < 0 ? RATE_LIMIT_WINDOW : ttl;
    const isAllowed = count <= MAX_REQUESTS;
    const remaining = Math.max(0, MAX_REQUESTS - count);

    logger.info("Rate limit check", { ip, count, remaining, timeToReset });

    return {
      isAllowed,
      timeToReset,
      remaining,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Rate limit check failed", {
      errorMessage,
      ip,
      timestamp: new Date().toISOString(),
    });
    // If Redis fails, allow the request but log the error
    return {
      isAllowed: true,
      timeToReset: RATE_LIMIT_WINDOW,
      remaining: MAX_REQUESTS,
    };
  }
}
