import { logger } from "./logger";
import { getRedisClient, executeWithTimeout } from "./redis";

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

    const redis = getRedisClient();

    // Create a record with timestamp and URLs
    const imageRecord = JSON.stringify({
      id: imageId,
      resultUrl,
      groveUri: groveUri || "",
      groveUrl: groveUrl || "",
      timestamp: new Date().toISOString(),
    });

    logger.info("Storing image URL in history", {
      imageId,
      hasGroveUri: !!groveUri,
      hasGroveUrl: !!groveUrl,
    });

    // Store in a Redis list with timeout - this allows us to retrieve in order
    await executeWithTimeout(
      () => redis.lpush("image_history", imageRecord),
      5000 // 5 second timeout
    );

    // Optional: Set a max length to prevent unlimited growth
    await executeWithTimeout(
      () => redis.ltrim("image_history", 0, 999), // Keep the most recent 1000 images
      3000 // 3 second timeout
    );

    logger.info("Successfully stored image URL in history", { imageId });
  } catch (error) {
    logger.error("Failed to store image URL in history", {
      error: error instanceof Error ? error.message : String(error),
      imageId,
    });
    // Don't rethrow - we don't want to fail the request if Redis fails
  }
}

// Function to retrieve image history
export async function getImageHistory(limit: number = 100): Promise<
  Array<{
    id: string;
    resultUrl: string;
    groveUri?: string;
    groveUrl?: string;
    timestamp: string;
  }>
> {
  try {
    const redis = getRedisClient();

    // Get the most recent entries with timeout
    const records = await executeWithTimeout(
      () => redis.lrange("image_history", 0, limit - 1),
      5000, // 5 second timeout
      [] // Return empty array as fallback if timeout
    );

    logger.info("Raw image history retrieved", { count: records.length });

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
