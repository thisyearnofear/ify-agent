import { logger } from "./logger";
import { getRedisClient, executeWithTimeout } from "./redis";

const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const MAX_REQUESTS = 20; // Maximum requests per window

export interface RateLimitInfo {
  isAllowed: boolean;
  timeToReset: number;
  remaining?: number;
}

export async function getRateLimitInfo(ip: string): Promise<RateLimitInfo> {
  const key = `rate_limit:${ip}`;

  try {
    const redis = getRedisClient();

    // Get the current count with timeout
    const count = await executeWithTimeout(
      () => redis.incr(key),
      2000, // 2 second timeout
      1 // Default to 1 if timeout
    );

    // If this is the first request, set expiry
    if (count === 1) {
      await executeWithTimeout(
        () => redis.expire(key, RATE_LIMIT_WINDOW),
        2000 // 2 second timeout
      );
    }

    // Get TTL with timeout
    const ttl = await executeWithTimeout(
      () => redis.ttl(key),
      2000, // 2 second timeout
      RATE_LIMIT_WINDOW // Default to full window if timeout
    );

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
