import Redis from "ioredis";
import { logger } from "./logger";

let redisClient: Redis | null = null;

// Redis connection options with timeouts and retry strategy
const redisOptions = {
  connectTimeout: 5000, // 5 seconds
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000); // Exponential backoff with max 2s delay
    return delay;
  },
  reconnectOnError(err: Error) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
};

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      logger.error("REDIS_URL environment variable is not set");
      throw new Error("REDIS_URL environment variable is not set");
    }

    try {
      redisClient = new Redis(redisUrl, redisOptions);

      // Handle connection events
      redisClient.on("connect", () => {
        logger.info("Redis client connected");
      });

      redisClient.on("error", (err) => {
        logger.error("Redis client error", {
          error: err.message,
          stack: err.stack,
        });
        // Don't throw here, just log the error
      });

      redisClient.on("close", () => {
        logger.warn("Redis connection closed");
      });

      logger.info("Redis client initialized");
    } catch (error) {
      logger.error("Failed to initialize Redis client", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info("Redis connection closed");
    } catch (error) {
      logger.error("Error closing Redis connection", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// Wrapper function to execute Redis operations with timeout
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 3000, // 3 seconds default timeout
  fallbackValue?: T
): Promise<T> {
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(new Error(`Redis operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
    });

    // Race the operation against the timeout
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    logger.error("Redis operation failed or timed out", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Return fallback value if provided
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }

    throw error;
  }
}
