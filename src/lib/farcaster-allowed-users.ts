import { logger } from "./logger";
import { Redis } from "ioredis";

// Redis key for storing allowed users
const ALLOWED_USERS_KEY = "farcaster:allowed-users";

// Default allowed users (owner)
const DEFAULT_ALLOWED_USERS = [5254]; // @papa's FID

// Cache the allowed users in memory to reduce Redis calls
let cachedAllowedUsers: number[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (increased from 5 minutes)

// Initialize Redis client with timeout and retry options
const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is not defined");
  }

  // Create a new Redis client with improved error handling
  const client = new Redis(redisUrl, {
    connectTimeout: 10000, // 10 seconds (increased from 5 seconds)
    maxRetriesPerRequest: 1, // Reduced from 2 to fail faster
    retryStrategy: (times) => {
      if (times > 2) {
        // Reduced from 3 to fail faster
        return null; // Stop retrying after 2 attempts
      }
      return Math.min(times * 200, 1000); // Exponential backoff
    },
    enableOfflineQueue: false, // Don't queue commands when disconnected
    enableReadyCheck: false, // Skip the ready check to improve performance
  });

  // Add error event handler to prevent unhandled errors
  client.on("error", (err) => {
    logger.error("Redis client error", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Don't crash the application, just log the error
  });

  return client;
};

// Get allowed users from Redis or cache
export async function getAllowedUsers(): Promise<number[]> {
  try {
    // Check if we have a valid cache
    const now = Date.now();
    if (cachedAllowedUsers && now - cacheTimestamp < CACHE_TTL) {
      logger.info("Using cached allowed users list");
      return cachedAllowedUsers;
    }

    // Try to get from Redis with a timeout
    let redis: Redis | null = null;
    try {
      redis = getRedisClient();

      // Set a timeout for the Redis operation
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Redis operation timed out"));
        }, 2000); // 2 seconds timeout
      });

      // Race the Redis operation against the timeout
      const allowedUsersStr = (await Promise.race([
        redis.get(ALLOWED_USERS_KEY),
        timeoutPromise,
      ])) as string | null;

      // Close the Redis connection
      if (redis) {
        await redis.quit().catch((err) => {
          logger.error("Error closing Redis connection", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      if (!allowedUsersStr) {
        // Initialize with default allowed users if not set
        await setAllowedUsers(DEFAULT_ALLOWED_USERS).catch((err) => {
          logger.error("Error setting default allowed users", {
            error: err instanceof Error ? err.message : String(err),
          });
        });

        // Update cache
        cachedAllowedUsers = DEFAULT_ALLOWED_USERS;
        cacheTimestamp = now;

        return DEFAULT_ALLOWED_USERS;
      }

      // Parse and cache the result
      const allowedUsers = JSON.parse(allowedUsersStr);
      cachedAllowedUsers = allowedUsers;
      cacheTimestamp = now;

      return allowedUsers;
    } catch (error) {
      // Close the Redis connection on error
      if (redis) {
        redis.quit().catch((err) => {
          logger.error("Error closing Redis connection after error", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      throw error; // Re-throw to be caught by the outer try/catch
    }
  } catch (error) {
    logger.error("Error getting allowed users", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // If we have a cache, use it even if it's expired
    if (cachedAllowedUsers) {
      logger.info("Using expired cache due to Redis error");
      return cachedAllowedUsers;
    }

    // Fall back to default allowed users
    return DEFAULT_ALLOWED_USERS;
  }
}

// Set allowed users in Redis
export async function setAllowedUsers(users: number[]): Promise<boolean> {
  try {
    // Update cache immediately
    cachedAllowedUsers = users;
    cacheTimestamp = Date.now();

    let redis: Redis | null = null;
    try {
      redis = getRedisClient();

      // Set a timeout for the Redis operation
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Redis operation timed out"));
        }, 2000); // 2 seconds timeout
      });

      // Race the Redis operation against the timeout
      await Promise.race([
        redis.set(ALLOWED_USERS_KEY, JSON.stringify(users)),
        timeoutPromise,
      ]);

      // Close the Redis connection
      if (redis) {
        await redis.quit().catch((err) => {
          logger.error("Error closing Redis connection", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      return true;
    } catch (error) {
      // Close the Redis connection on error
      if (redis) {
        redis.quit().catch((err) => {
          logger.error("Error closing Redis connection after error", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      throw error; // Re-throw to be caught by the outer try/catch
    }
  } catch (error) {
    logger.error("Error setting allowed users", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // We still return true because we've updated the cache
    // This ensures the API still works even if Redis fails
    return true;
  }
}
