import { logger } from "./logger";
import { Redis } from "ioredis";

// Redis key for storing allowed users (kept for backward compatibility)
const ALLOWED_USERS_KEY = "farcaster:allowed-users";

// Note: This module is kept for backward compatibility and admin functionality,
// but the bot is now open to all Farcaster users.

// Get allowed users from Redis or cache
export async function getAllowedUsers(): Promise<number[]> {
  // Return an empty array since we're now open to all users
  return [];
}

// Set allowed users in Redis (kept for backward compatibility)
export async function setAllowedUsers(users: number[]): Promise<boolean> {
  try {
    const redis = getRedisClient();

    // Set a timeout for the Redis operation
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Redis operation timed out"));
      }, 2000);
    });

    try {
      // Store the list in Redis for backward compatibility
      await Promise.race([
        redis.set(ALLOWED_USERS_KEY, JSON.stringify(users)),
        timeoutPromise,
      ]);

      // Close the Redis connection
      await redis.quit().catch((err) => {
        logger.error("Error closing Redis connection", {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      return true;
    } catch (error) {
      // Close the Redis connection on error
      redis.quit().catch((err) => {
        logger.error("Error closing Redis connection after error", {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      throw error;
    }
  } catch (error) {
    logger.error("Error setting allowed users", {
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

// Initialize Redis client with timeout and retry options
const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is not defined");
  }

  return new Redis(redisUrl, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 2) {
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    enableOfflineQueue: false,
    enableReadyCheck: false,
  });
};
