import { logger } from "./logger";
import {
  getRedisClient,
  executeWithTimeout,
  getInMemoryData,
  setInMemoryData,
} from "./redis";

let totalRequests = 0;
let failedRequests = 0;
let lastReset = new Date().toISOString();

// Reset counters every 24 hours
const resetInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Reset counters periodically
setInterval(() => {
  totalRequests = 0;
  failedRequests = 0;
  lastReset = new Date().toISOString();

  logger.info("Metrics counters reset", {
    totalRequests,
    failedRequests,
    lastReset,
  });
}, resetInterval);

// Function to increment total requests
export function incrementTotalRequests(): void {
  totalRequests++;
  logger.info("Total requests incremented", { totalRequests });
}

// Function to increment failed requests
export function incrementFailedRequests(): void {
  failedRequests++;
  logger.info("Failed requests incremented", { failedRequests });
}

// Function to get metrics
export function getMetrics(): {
  totalRequests: number;
  failedRequests: number;
  lastReset: string;
} {
  return {
    totalRequests,
    failedRequests,
    lastReset,
  };
}

// Define an interface for the image record
export interface ImageRecord {
  id: string;
  resultUrl: string;
  groveUri?: string;
  groveUrl?: string;
  timestamp: string;
}

// Function to store image URLs in Redis
export async function storeImageUrl(
  imageId: string,
  resultUrl: string,
  groveUri?: string,
  groveUrl?: string
): Promise<void> {
  try {
    // Skip if both resultUrl and groveUrl are empty
    if (!resultUrl && !groveUrl) {
      logger.warn(
        "Skipping storing image URL - both resultUrl and groveUrl are empty",
        { imageId }
      );
      return;
    }

    // Create a record with timestamp and URLs
    const imageRecord: ImageRecord = {
      id: imageId,
      resultUrl,
      groveUri: groveUri || "",
      groveUrl: groveUrl || "",
      timestamp: new Date().toISOString(),
    };

    logger.info("Storing image URL in history", {
      imageId,
      hasGroveUri: !!groveUri,
      hasGroveUrl: !!groveUrl,
    });

    try {
      const redis = getRedisClient();

      // Store in a Redis list with timeout - this allows us to retrieve in order
      await executeWithTimeout(
        () => redis.lpush("image_history", JSON.stringify(imageRecord)),
        5000, // 5 second timeout
        null // Return null as fallback if timeout
      );

      // Optional: Set a max length to prevent unlimited growth
      await executeWithTimeout(
        () => redis.ltrim("image_history", 0, 999), // Keep the most recent 1000 images
        3000, // 3 second timeout
        null // Return null as fallback if timeout
      );

      logger.info("Successfully stored image URL in Redis", { imageId });
    } catch (error) {
      // If Redis fails, store in memory as fallback
      logger.warn("Falling back to in-memory storage", {
        error: error instanceof Error ? error.message : String(error),
        imageId,
      });

      // Get current in-memory history
      const inMemoryHistory = getInMemoryData("image_history") || [];

      // Add new record to the beginning (like lpush)
      inMemoryHistory.unshift(imageRecord);

      // Trim to 1000 items max
      if (inMemoryHistory.length > 1000) {
        inMemoryHistory.length = 1000;
      }

      // Save back to in-memory storage
      setInMemoryData("image_history", inMemoryHistory);

      logger.info("Successfully stored image URL in memory", { imageId });
    }
  } catch (error) {
    logger.error("Failed to store image URL in history", {
      error: error instanceof Error ? error.message : String(error),
      imageId,
    });
    // Don't rethrow - we don't want to fail the request if storage fails
  }
}

// Function to retrieve image history
export async function getImageHistory(
  limit: number = 100
): Promise<ImageRecord[]> {
  try {
    let records: string[] = [];
    let useInMemory = false;

    try {
      const redis = getRedisClient();

      // Get the most recent entries with timeout
      records = await executeWithTimeout(
        () => redis.lrange("image_history", 0, limit - 1),
        5000, // 5 second timeout
        [] // Return empty array as fallback if timeout
      );

      logger.info("Raw image history retrieved from Redis", {
        count: records.length,
      });
    } catch (error) {
      logger.warn("Failed to retrieve from Redis, using in-memory fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
      useInMemory = true;
    }

    // If Redis failed or returned no results, try in-memory fallback
    if (useInMemory || records.length === 0) {
      const inMemoryHistory = getInMemoryData("image_history") || [];
      logger.info("Using in-memory history fallback", {
        count: inMemoryHistory.length,
      });

      // Return the in-memory records directly (they're already objects)
      const slicedHistory = inMemoryHistory.slice(0, limit) as ImageRecord[];

      // Log some stats about the in-memory data
      logger.info("Parsed in-memory history", {
        count: slicedHistory.length,
        withGroveUri: slicedHistory.filter(
          (r) => r && typeof r === "object" && "groveUri" in r && !!r.groveUri
        ).length,
        withGroveUrl: slicedHistory.filter(
          (r) => r && typeof r === "object" && "groveUrl" in r && !!r.groveUrl
        ).length,
      });

      return slicedHistory;
    }

    // Parse the JSON records and filter out invalid ones
    const parsedRecords = records
      .map((record: string) => {
        try {
          return JSON.parse(record);
        } catch (e) {
          logger.error("Failed to parse image record", {
            error: e instanceof Error ? e.message : String(e),
            record: record.substring(0, 100), // Log only the first 100 chars
          });
          return null;
        }
      })
      .filter(Boolean) // Remove null entries
      .filter((record) => {
        // Keep records that have either a valid resultUrl or a valid groveUrl
        return (
          record.id &&
          (record.resultUrl || (record.groveUri && record.groveUrl))
        );
      });

    // Sort records to prioritize those with Grove URLs
    parsedRecords.sort((a, b) => {
      // If a has Grove URL and b doesn't, a comes first
      if (a.groveUrl && !b.groveUrl) return -1;
      // If b has Grove URL and a doesn't, b comes first
      if (!a.groveUrl && b.groveUrl) return 1;
      // Otherwise sort by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    logger.info("Parsed image history", {
      count: parsedRecords.length,
      withGroveUri: parsedRecords.filter((r) => r.groveUri).length,
      withGroveUrl: parsedRecords.filter((r) => r.groveUrl).length,
    });

    return parsedRecords;
  } catch (error) {
    logger.error("Failed to retrieve image history", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
