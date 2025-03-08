import { logger } from "./logger";

/**
 * Interface for NFT metadata
 */
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * Generates metadata for a Mantleify NFT
 *
 * @param imageUrl The URL of the image
 * @param groveUrl The Grove URL of the image
 * @param prompt The prompt used to generate the image
 * @param creator The creator's username or address
 * @param timestamp The timestamp when the image was created
 * @returns NFT metadata object
 */
export function generateMantleifyMetadata(
  imageUrl: string,
  groveUrl: string,
  prompt: string,
  creator: string,
  timestamp: number = Date.now()
): NFTMetadata {
  try {
    const creationDate = new Date(timestamp).toISOString();

    const metadata: NFTMetadata = {
      name: `Mantleify: ${truncatePrompt(prompt, 40)}`,
      description: `This image was created using the Mantleify overlay with the prompt: "${prompt}". Created by ${creator} on ${creationDate}.`,
      image: imageUrl,
      external_url: groveUrl,
      attributes: [
        {
          trait_type: "Overlay",
          value: "Mantleify",
        },
        {
          trait_type: "Creator",
          value: creator,
        },
        {
          trait_type: "Creation Date",
          value: creationDate,
        },
      ],
    };

    return metadata;
  } catch (error) {
    logger.error("Error generating NFT metadata", {
      error: error instanceof Error ? error.message : String(error),
      imageUrl,
      groveUrl,
    });

    // Return a basic metadata object in case of error
    return {
      name: "Mantleify Creation",
      description: "An image created with the Mantleify overlay.",
      image: imageUrl,
      attributes: [
        {
          trait_type: "Overlay",
          value: "Mantleify",
        },
      ],
    };
  }
}

/**
 * Uploads metadata to IPFS or another storage solution
 * This is a placeholder function that should be implemented based on your storage solution
 *
 * @param metadata The NFT metadata
 * @returns The URI of the uploaded metadata
 */
export async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
  try {
    // This is a placeholder. You would implement your actual upload logic here.
    // For example, using NFT.Storage, Pinata, or your own IPFS node

    // For now, we'll just log the metadata
    logger.info("Would upload metadata to IPFS", {
      metadataStr: JSON.stringify(metadata),
    });

    // Return a placeholder URI
    // In a real implementation, this would be the IPFS URI of the uploaded metadata
    return `ipfs://placeholder/${Date.now()}`;
  } catch (error) {
    logger.error("Error uploading metadata", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Truncates a prompt to a specified length
 *
 * @param prompt The prompt to truncate
 * @param maxLength The maximum length
 * @returns The truncated prompt
 */
function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }

  return prompt.substring(0, maxLength - 3) + "...";
}
