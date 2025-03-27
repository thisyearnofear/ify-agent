import { logger } from "../logger";
import { downloadImage } from "../image-processor";
import { uploadToGrove } from "../grove-storage";

export class GhibliService {
  private baseUrl: string;

  constructor() {
    // Use environment variable for the base URL, fallback to localhost for development
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Log the base URL for debugging
    logger.info("Initialized GhibliService", {
      baseUrl: this.baseUrl,
    });
  }

  async processImage(
    imageUrl: string,
    walletAddress?: string
  ): Promise<{ resultUrl: string; groveUrl?: string }> {
    try {
      // Special handling for imagedelivery.net URLs (Farcaster images)
      const isFarcasterImage = imageUrl.includes("imagedelivery.net");
      const finalImageUrl =
        isFarcasterImage && !imageUrl.includes("/original")
          ? `${imageUrl.split("?")[0]}/original`
          : imageUrl;

      logger.info("Processing image with Ghibli style", {
        originalUrl: imageUrl.substring(0, 100),
        finalUrl: finalImageUrl.substring(0, 100),
        baseUrl: this.baseUrl,
      });

      // Process the image using our backend API with absolute URL
      const response = await fetch(`${this.baseUrl}/api/replicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: finalImageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        logger.error("Failed to process image", {
          status: response.status,
          statusText: response.statusText,
          error: error.error || "Unknown error",
        });
        throw new Error(
          error.error || `Failed to process image: ${response.statusText}`
        );
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error("No URL in response from Replicate API");
      }

      const resultUrl = data.url;

      // Download the processed image for Grove upload
      const processedImage = await downloadImage(resultUrl);

      // Upload to Grove if wallet address is provided
      let groveUrl: string | undefined;
      if (walletAddress) {
        const uploadResult = await uploadToGrove(processedImage, walletAddress);
        groveUrl = uploadResult.uri;
      }

      return {
        resultUrl,
        groveUrl,
      };
    } catch (error) {
      logger.error("Error in GhibliService.processImage", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        imageUrl: imageUrl.substring(0, 100),
        baseUrl: this.baseUrl,
      });
      throw error;
    }
  }
}

export const ghibliService = new GhibliService();
