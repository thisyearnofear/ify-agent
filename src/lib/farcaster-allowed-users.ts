import { logger } from "./logger";
import { Redis } from "ioredis";

// Redis key for storing allowed users
const ALLOWED_USERS_KEY = "farcaster:allowed-users";

// Default allowed users (owner)
const DEFAULT_ALLOWED_USERS = [5254]; // @papa's FID

// Initialize Redis client
const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is not defined");
  }
  return new Redis(redisUrl);
};

// Get allowed users from Redis
export async function getAllowedUsers(): Promise<number[]> {
  try {
    const redis = getRedisClient();
    const allowedUsersStr = await redis.get(ALLOWED_USERS_KEY);
    await redis.quit();

    if (!allowedUsersStr) {
      // Initialize with default allowed users if not set
      await setAllowedUsers(DEFAULT_ALLOWED_USERS);
      return DEFAULT_ALLOWED_USERS;
    }

    return JSON.parse(allowedUsersStr);
  } catch (error) {
    logger.error("Error getting allowed users", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fall back to default allowed users
    return DEFAULT_ALLOWED_USERS;
  }
}

// Set allowed users in Redis
export async function setAllowedUsers(users: number[]): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.set(ALLOWED_USERS_KEY, JSON.stringify(users));
    await redis.quit();
    return true;
  } catch (error) {
    logger.error("Error setting allowed users", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
