import { logger } from "./logger";

// In-memory storage for images
interface ImageData {
  buffer: Buffer;
  contentType: string;
  createdAt: number;
}

// Map to store images with their IDs
const imageStore = new Map<string, ImageData>();

// Maximum age for stored images (24 hours)
const MAX_IMAGE_AGE_MS = 24 * 60 * 60 * 1000;

// Cleanup interval (1 hour)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Store an image in memory
 */
export function storeImage(
  id: string,
  buffer: Buffer,
  contentType: string = "image/png"
): void {
  imageStore.set(id, {
    buffer,
    contentType,
    createdAt: Date.now(),
  });
  logger.info("Image stored in memory", { id, contentType });
}

/**
 * Retrieve an image from memory
 */
export function getImage(id: string): ImageData | undefined {
  return imageStore.get(id);
}

/**
 * Delete an image from memory
 */
export function deleteImage(id: string): boolean {
  const deleted = imageStore.delete(id);
  if (deleted) {
    logger.info("Image deleted from memory", { id });
  }
  return deleted;
}

/**
 * Clean up old images
 */
function cleanupOldImages(): void {
  const now = Date.now();
  let deletedCount = 0;

  imageStore.forEach((data, id) => {
    if (now - data.createdAt > MAX_IMAGE_AGE_MS) {
      imageStore.delete(id);
      deletedCount++;
    }
  });

  if (deletedCount > 0) {
    logger.info("Cleaned up old images", { count: deletedCount });
  }
}

// Run cleanup periodically
setInterval(cleanupOldImages, CLEANUP_INTERVAL_MS);

// Export the store size for metrics
export function getImageStoreSize(): number {
  return imageStore.size;
}
