import Redis from "ioredis";
import { logger } from "./logger";

let redisClient: Redis | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

// In-memory fallback storage for when Redis is unavailable
const inMemoryStorage: Record<string, unknown[]> = {
  image_history: [],
};

// Redis connection options with improved timeouts and retry strategy
const redisOptions = {
  connectTimeout: 10000, // 10 seconds
  maxRetriesPerRequest: 5,
  enableOfflineQueue: true,
  retryStrategy(times: number) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  tls: {}, // Enable TLS for Upstash
  enableReadyCheck: true,
  maxLoadingRetryTime: 5000,
  reconnectOnError(err: Error) {
    logger.warn("Redis reconnect on error triggered", {
      error: err.message,
      willReconnect: true,
    });
    return true;
  },
};

// Helper function to parse Redis URL and handle special cases like Upstash
function parseRedisUrl(redisUrl: string): {
  host: string;
  port: string;
  username: string;
  password: string;
} {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: url.port || "6379",
      username: url.username || "default",
      password: url.password || "",
    };
  } catch (error) {
    logger.error("Failed to parse Redis URL", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      logger.error("REDIS_URL environment variable is not set");
      throw new Error("REDIS_URL environment variable is not set");
    }

    try {
      connectionAttempts++;
      logger.info("Initializing Redis client", {
        attempt: connectionAttempts,
        maxAttempts: MAX_CONNECTION_ATTEMPTS,
      });

      // Parse the Redis URL components
      const { host, port, username, password } = parseRedisUrl(redisUrl);

      // Log connection attempt (without sensitive data)
      logger.info("Attempting Redis connection", {
        host,
        port,
        username,
        passwordLength: password.length,
      });

      // Create Redis client with explicit configuration
      redisClient = new Redis({
        host,
        port: parseInt(port, 10),
        username,
        password,
        ...redisOptions,
      });

      // Handle connection events
      redisClient.on("connect", () => {
        logger.info("Redis client connected");
        connectionAttempts = 0;
      });

      redisClient.on("ready", () => {
        logger.info("Redis client ready");
      });

      redisClient.on("error", (err) => {
        logger.error("Redis client error", {
          error: err.message,
          stack: err.stack,
          connectionAttempts,
        });
      });

      redisClient.on("close", () => {
        logger.warn("Redis connection closed");
      });

      redisClient.on("reconnecting", (ms: number) => {
        logger.info("Redis client reconnecting", { delayMs: ms });
      });

      logger.info("Redis client initialized");
    } catch (error) {
      logger.error("Failed to initialize Redis client", {
        error: error instanceof Error ? error.message : String(error),
        connectionAttempts,
      });

      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        logger.error("Max Redis connection attempts reached, giving up");
      } else {
        throw error;
      }
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

// Wrapper function to execute Redis operations with timeout and fallback
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 5000, // 5 seconds default timeout
  fallbackValue?: T
): Promise<T> {
  try {
    // Check if Redis client exists and is ready
    if (!redisClient || !redisClient.status || redisClient.status !== "ready") {
      logger.warn("Redis client not ready, using fallback", {
        status: redisClient?.status || "null",
      });
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw new Error("Redis client not ready");
    }

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

// Helper functions for in-memory fallback storage
export function getInMemoryData<T>(key: string): T[] {
  return (inMemoryStorage[key] as T[]) || [];
}

export function setInMemoryData<T>(key: string, value: T[]): void {
  inMemoryStorage[key] = value;
}
