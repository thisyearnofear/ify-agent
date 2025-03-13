import { logger } from "./logger";
import {
  getRedisClient,
  executeWithTimeout,
  getInMemoryData,
  setInMemoryData,
} from "./redis";

// In-memory storage for image history (used as fallback when Redis is unavailable)
const imageHistory: Record<
  string,
  { resultUrl: string; groveUri?: string; groveUrl?: string; timestamp: number }
> = {};

// Redis key prefix for image history
const IMAGE_HISTORY_PREFIX = "image_history:";

/**
 * Store an image URL in the history
 */
export async function storeImageUrl(
  id: string,
  resultUrl: string,
  groveUri?: string,
  groveUrl?: string
): Promise<void> {
  const data = {
    resultUrl,
    groveUri,
    groveUrl,
    timestamp: Date.now(),
  };

  try {
    // Try to store in Redis first
    if (process.env.REDIS_URL) {
      const redis = getRedisClient();
      const key = `${IMAGE_HISTORY_PREFIX}${id}`;

      await executeWithTimeout(
        () => redis.set(key, JSON.stringify(data), "EX", 86400), // Expire after 24 hours
        2000 // 2 second timeout
      );

      logger.info(`Stored image URL in Redis history: ${id}`);
    } else {
      // Fallback to in-memory storage
      imageHistory[id] = data;

      // Clean up old entries (older than 24 hours)
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      Object.keys(imageHistory).forEach((key) => {
        if (now - imageHistory[key].timestamp > oneDayMs) {
          delete imageHistory[key];
        }
      });

      logger.info(`Stored image URL in memory history: ${id}`);
    }
  } catch (error) {
    // Fallback to in-memory storage if Redis fails
    imageHistory[id] = data;
    logger.warn(
      `Failed to store image URL in Redis, using memory fallback: ${id}`,
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Get an image URL from the history
 */
export async function getImageUrl(id: string): Promise<{
  resultUrl: string;
  groveUri?: string;
  groveUrl?: string;
} | null> {
  try {
    // Try to get from Redis first
    if (process.env.REDIS_URL) {
      const redis = getRedisClient();
      const key = `${IMAGE_HISTORY_PREFIX}${id}`;

      const data = await executeWithTimeout(
        () => redis.get(key),
        2000, // 2 second timeout
        null
      );

      if (data) {
        logger.info(`Retrieved image URL from Redis history: ${id}`);
        return JSON.parse(data);
      }
    }

    // Fallback to in-memory storage
    const entry = imageHistory[id];
    if (entry) {
      logger.info(`Retrieved image URL from memory history: ${id}`);
      return {
        resultUrl: entry.resultUrl,
        groveUri: entry.groveUri,
        groveUrl: entry.groveUrl,
      };
    }

    return null;
  } catch (error) {
    // Fallback to in-memory storage if Redis fails
    logger.warn(
      `Failed to get image URL from Redis, using memory fallback: ${id}`,
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );

    const entry = imageHistory[id];
    if (!entry) {
      return null;
    }

    return {
      resultUrl: entry.resultUrl,
      groveUri: entry.groveUri,
      groveUrl: entry.groveUrl,
    };
  }
}
