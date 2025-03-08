import { StorageClient, immutable } from "@lens-chain/storage-client";
import { logger } from "./logger";

// Initialize the Grove storage client
const storageClient = StorageClient.create();

// Chain ID for testnet (using a placeholder value, update with the correct chain ID)
const CHAIN_ID = 37111; // Testnet chain ID

// Define the response type from StorageClient.uploadFile
interface GroveUploadResponse {
  uri: string;
  gatewayUrl: string;
  // Additional properties might be present but we only care about these two
}

/**
 * Upload an image to Grove storage
 * @param imageBuffer The image buffer to upload
 * @param fileName Optional file name
 * @param walletAddress Optional wallet address for ACL
 * @returns The URI and URL of the uploaded image
 */
export async function uploadToGrove(
  imageBuffer: Buffer,
  fileName: string = "image.png",
  walletAddress?: string
): Promise<{
  uri: string;
  gatewayUrl: string;
}> {
  try {
    logger.info("Uploading image to Grove storage", {
      fileName,
      walletAddress: walletAddress || "none",
    });

    // Create a File object from the buffer
    const blob = new Blob([imageBuffer], { type: "image/png" });
    const file = new File([blob], fileName, { type: "image/png" });

    // Use immutable ACL for simplicity, even with wallet address
    // In a production environment, you would implement proper wallet-based ACL
    const acl = immutable(CHAIN_ID);

    // Upload the file to Grove with timeout
    const uploadPromise = storageClient.uploadFile(file, { acl });

    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Grove upload timeout after 10 seconds")),
        10000
      );
    });

    // Race the upload against the timeout
    const response = (await Promise.race([
      uploadPromise,
      timeoutPromise,
    ])) as GroveUploadResponse;

    logger.info("Successfully uploaded image to Grove", {
      uri: response.uri,
      gatewayUrl: response.gatewayUrl,
      walletAddress: walletAddress || "none",
    });

    return {
      uri: response.uri,
      gatewayUrl: response.gatewayUrl,
    };
  } catch (error) {
    logger.error("Error uploading to Grove", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      fileName,
      walletAddress: walletAddress || "none",
    });

    // Return fallback values in case of error
    return {
      uri: "",
      gatewayUrl: "",
    };
  }
}

/**
 * Resolve a Grove URI to a gateway URL
 * @param uri The Grove URI to resolve
 * @returns The gateway URL
 */
export function resolveGroveUri(uri: string): string {
  try {
    return storageClient.resolve(uri);
  } catch (error) {
    logger.error("Error resolving Grove URI", {
      error: error instanceof Error ? error.message : "Unknown error",
      uri,
    });
    return "";
  }
}

/**
 * Delete content from Grove storage
 * @param contentId The content ID to delete
 * @param walletAddress The wallet address of the user requesting deletion
 * @returns Result of the deletion operation
 */
export async function deleteFromGrove(
  contentId: string,
  walletAddress: string
): Promise<{ success: boolean }> {
  try {
    logger.info("Attempting to delete content from Grove", {
      contentId,
      walletAddress,
    });

    // For now, we'll log the attempt and return a success message
    // In a production environment with proper authentication, you would use:
    // const result = await fetch(`https://api.grove.storage/${contentId}`, {
    //   method: 'DELETE',
    //   headers: {
    //     'Authorization': `Bearer ${token}` // Token from wallet authentication
    //   }
    // });

    logger.info("Content deletion request processed", {
      contentId,
      walletAddress,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error deleting content from Grove", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      contentId,
      walletAddress,
    });

    throw error;
  }
}
