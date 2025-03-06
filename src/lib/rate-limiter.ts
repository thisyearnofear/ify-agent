import Redis from "ioredis";
import { logger } from "./logger";

const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const MAX_REQUESTS = 20; // Maximum requests per window

const url = new URL(process.env.REDIS_URL || "");
const redis = new Redis({
  host: url.hostname,
  port: parseInt(url.port),
  username: "default",
  password: url.password,
  lazyConnect: true,
  retryStrategy(times: number): number {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 5,
  enableOfflineQueue: true,
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on("error", (err: Error) => {
  logger.error("Redis Rate Limiter Error:", {
    message: err.message,
    name: err.name,
    stack: err.stack || "No stack trace",
  });
});

redis.on("connect", () => {
  logger.info("Redis Rate Limiter connected");
});

redis.on("reconnecting", () => {
  logger.warn("Redis Rate Limiter reconnecting");
});

export interface RateLimitInfo {
  isAllowed: boolean;
  timeToReset: number;
  remaining?: number;
}

export async function getRateLimitInfo(ip: string): Promise<RateLimitInfo> {
  const key = `rate_limit:${ip}`;

  try {
    // Get the current count and TTL
    const [count, ttl] = await Promise.all([redis.incr(key), redis.ttl(key)]);

    // If this is the first request, set expiry
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

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
